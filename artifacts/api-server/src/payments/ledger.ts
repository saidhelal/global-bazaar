/**
 * Ledger, audit trail and webhook idempotency.
 *
 * payment_transactions is append-only: this module exposes no update path, so
 * a correction is always a new entry. Balances are derived by summing entries.
 */
import { db } from "@workspace/db";
import { paymentTransactionsTable, paymentEventsTable, paymentAuditLogTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export type TransactionType = "charge" | "refund" | "payout" | "commission" | "adjustment";
export type TransactionStatus = "pending" | "succeeded" | "failed" | "cancelled";

export interface RecordTransactionInput {
  orderId?: number | null;
  vendorId?: number | null;
  type: TransactionType;
  status?: TransactionStatus;
  gateway: string;
  gatewayRef?: string | null;
  /** Signed: positive = money into the platform, negative = money out. */
  amount: number;
  currency: string;
  rawPayload?: Record<string, unknown> | null;
  failureReason?: string | null;
}

/** Appends one immutable ledger entry and returns it. */
export async function recordTransaction(input: RecordTransactionInput) {
  const [row] = await db.insert(paymentTransactionsTable).values({
    orderId: input.orderId ?? null,
    vendorId: input.vendorId ?? null,
    type: input.type,
    status: input.status ?? "succeeded",
    gateway: input.gateway,
    gatewayRef: input.gatewayRef ?? null,
    amount: input.amount.toFixed(2),
    currency: input.currency,
    baseAmount: input.amount.toFixed(2),
    rawPayload: input.rawPayload ?? null,
    failureReason: input.failureReason ?? null,
  }).returning();
  return row!;
}

export interface AuditInput {
  action: string;
  actorId?: number | null;
  orderId?: number | null;
  gateway?: string | null;
  severity?: "info" | "warning" | "critical";
  detail?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Writes a security/financial audit entry. Never throws: an audit failure must
 * not take down the payment path it is observing.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.insert(paymentAuditLogTable).values({
      action: input.action,
      actorId: input.actorId ?? null,
      orderId: input.orderId ?? null,
      gateway: input.gateway ?? null,
      severity: input.severity ?? "info",
      detail: input.detail ?? null,
      ipAddress: input.ipAddress ?? null,
    });
    if (input.severity === "critical" || input.severity === "warning") {
      logger.warn({ audit: input.action, orderId: input.orderId, detail: input.detail }, "payment audit");
    }
  } catch (err) {
    logger.error({ err, action: input.action }, "Failed to write payment audit entry");
  }
}

/**
 * Idempotency gate. Returns true when this event has not been seen before and
 * the caller should process it; false when it is a replay.
 *
 * The guarantee comes from the unique (gateway, event_id) index rather than a
 * read-then-write check, so concurrent deliveries cannot both win.
 */
export async function claimEvent(
  gateway: string,
  eventId: string,
  eventType?: string,
  orderId?: number | null,
  payload?: Record<string, unknown>,
): Promise<boolean> {
  try {
    const inserted = await db.insert(paymentEventsTable).values({
      gateway,
      eventId,
      eventType: eventType ?? null,
      orderId: orderId ?? null,
      payload: payload ?? null,
    }).onConflictDoNothing({ target: [paymentEventsTable.gateway, paymentEventsTable.eventId] }).returning();

    return inserted.length > 0;
  } catch (err) {
    logger.error({ err, gateway, eventId }, "Idempotency claim failed");
    return false; // fail closed: do not process when the guard is unavailable
  }
}

/**
 * Guards against a gateway (or a forged callback) confirming an amount that
 * differs from what was ordered. Tolerance covers minor-unit rounding only.
 */
export function amountMatches(expected: number, actual: number, tolerance = 0.01): boolean {
  return Math.abs(expected - actual) <= tolerance;
}

/** Sum of succeeded ledger entries for an order, by type. */
export async function sumTransactions(orderId: number, type: TransactionType): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${paymentTransactionsTable.amount}), 0)` })
    .from(paymentTransactionsTable)
    .where(and(
      eq(paymentTransactionsTable.orderId, orderId),
      eq(paymentTransactionsTable.type, type),
      eq(paymentTransactionsTable.status, "succeeded"),
    ));
  return Math.abs(parseFloat(row?.total ?? "0"));
}

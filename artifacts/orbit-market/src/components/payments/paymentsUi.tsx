/**
 * Shared presentational pieces for the payment screens.
 *
 * Extracted so the admin, vendor and customer pages share one implementation of
 * badges, money formatting, states, pagination and CSV export. Every class here
 * comes from the existing dashboard vocabulary — no new colours or tokens.
 */
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

/* ── Money ─────────────────────────────────────────────────────────────── */

export function formatMoney(amount: number | string | null | undefined, currency = 'USD'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(safe);
  } catch {
    return `${safe.toFixed(2)} ${currency}`;
  }
}

export function Money({ amount, currency, className = '' }: {
  amount: number | string | null | undefined;
  currency?: string;
  className?: string;
}) {
  const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const negative = n < 0;
  return (
    <span className={`font-semibold tabular-nums ${negative ? 'text-red-400' : 'text-white'} ${className}`}>
      {formatMoney(Math.abs(n), currency)}
      {negative ? '−' : ''}
    </span>
  );
}

/* ── Status badge ──────────────────────────────────────────────────────── */

/** Reuses the badge palette already used for order and product statuses. */
const BADGE: Record<string, string> = {
  succeeded: 'bg-green-500/15 text-green-400',
  paid: 'bg-green-500/15 text-green-400',
  refunded: 'bg-gray-500/15 text-gray-400',
  partially_refunded: 'bg-amber-500/15 text-amber-400',
  pending: 'bg-amber-500/15 text-amber-400',
  pending_payment: 'bg-amber-500/15 text-amber-400',
  pending_payout: 'bg-amber-500/15 text-amber-400',
  processing: 'bg-blue-500/15 text-blue-400',
  requested: 'bg-blue-500/15 text-blue-400',
  accrued: 'bg-blue-500/15 text-blue-400',
  failed: 'bg-red-500/15 text-red-400',
  rejected: 'bg-red-500/15 text-red-400',
  cancelled: 'bg-white/5 text-white/30',
  on_hold: 'bg-white/5 text-white/30',
  charge: 'bg-green-500/15 text-green-400',
  refund: 'bg-red-500/15 text-red-400',
  commission: 'bg-primary/15 text-primary',
  payout: 'bg-blue-500/15 text-blue-400',
  adjustment: 'bg-white/5 text-white/40',
  critical: 'bg-red-500/15 text-red-400',
  warning: 'bg-amber-500/15 text-amber-400',
  info: 'bg-white/5 text-white/40',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cls = BADGE[status] ?? 'bg-white/5 text-white/40';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${cls}`}>
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}

/* ── States ────────────────────────────────────────────────────────────── */

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse" data-testid="state-loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-20 bg-[#112240] rounded-xl" />
      ))}
    </div>
  );
}

export function EmptyState({ Icon, message }: {
  Icon: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className="text-center py-16" data-testid="state-empty">
      <Icon className="w-12 h-12 text-white/10 mx-auto mb-3" />
      <p className="text-white/40 text-sm">{message}</p>
    </div>
  );
}

export function ErrorState({ Icon, message, retryLabel, onRetry }: {
  Icon: React.ComponentType<{ className?: string }>;
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="text-center py-16" data-testid="state-error">
      <Icon className="w-12 h-12 text-red-400/30 mx-auto mb-3" />
      <p className="text-red-400/80 text-sm mb-4">{message}</p>
      <button onClick={onRetry}
        className="text-sm px-4 py-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
        data-testid="button-retry-load">
        {retryLabel}
      </button>
    </div>
  );
}

/* ── Stat tile ─────────────────────────────────────────────────────────── */

export function StatCard({ Icon, label, value, hint }: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-[#112240] border border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-white/40 text-xs">{label}</p>
          <p className="text-white font-bold text-lg leading-tight truncate">{value}</p>
          {hint && <p className="text-white/30 text-[11px] mt-0.5">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Panel ─────────────────────────────────────────────────────────────── */

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[#112240] border border-white/5 rounded-xl ${className}`}>{children}</div>
  );
}

/* ── Pagination ────────────────────────────────────────────────────────── */

export function Pagination({ page, limit, total, onPage, labels }: {
  page: number; limit: number; total: number;
  onPage: (p: number) => void;
  labels: { prev: string; next: string; of: string };
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) return null;
  return (
    <div className="flex items-center justify-between pt-3">
      <p className="text-white/30 text-xs">{page} / {pages} — {total} {labels.of}</p>
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          data-testid="button-page-prev">
          <ChevronLeft className="w-3.5 h-3.5" />{labels.prev}
        </button>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          data-testid="button-page-next">
          {labels.next}<ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── CSV export ────────────────────────────────────────────────────────── */

/** Client-side export — no new API is required for it. */
export function exportCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n');

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ label, onClick, disabled }: {
  label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      data-testid="button-export">
      <Download className="w-4 h-4" />{label}
    </button>
  );
}

/* ── Inputs (match the existing form vocabulary) ───────────────────────── */

export const inputCls =
  'w-full bg-[#0A1628] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-primary/50 transition-colors';

export const labelCls = 'block text-white/50 text-xs mb-1.5';

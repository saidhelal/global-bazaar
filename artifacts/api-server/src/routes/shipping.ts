import { Router } from "express";
import { db } from "@workspace/db";
import {
  shippingZonesTable,
  shippingRatesTable,
  shipmentsTable,
  shipmentEventsTable,
  ordersTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { notifyUser } from "../lib/notify";

const router = Router();

// ─── Helper: generate tracking number ────────────────────────────────────────
function generateTrackingNumber(): string {
  const digits = Math.floor(Math.random() * 9_000_000_000 + 1_000_000_000);
  return `ORB${digits}`;
}

// ─── Seed default zones (called at startup) ──────────────────────────────────
export async function seedShippingZones() {
  const existing = await db.select().from(shippingZonesTable).limit(1);
  if (existing.length > 0) return;

  const zones = [
    {
      name: "Gulf Countries",
      nameAr: "دول الخليج",
      countries: ["SA", "AE", "KW", "BH", "QA", "OM"],
      rate: { carrier: "Aramex", baseFee: "5.99", freeThreshold: "75.00", minDays: 3, maxDays: 7 },
    },
    {
      name: "Egypt",
      nameAr: "مصر",
      countries: ["EG"],
      rate: { carrier: "Aramex", baseFee: "3.99", freeThreshold: "50.00", minDays: 2, maxDays: 5 },
    },
    {
      name: "Levant",
      nameAr: "بلاد الشام",
      countries: ["JO", "LB", "SY", "IQ"],
      rate: { carrier: "DHL", baseFee: "8.99", freeThreshold: "100.00", minDays: 5, maxDays: 10 },
    },
    {
      name: "International",
      nameAr: "دولي",
      countries: [],
      rate: { carrier: "FedEx", baseFee: "14.99", freeThreshold: "150.00", minDays: 10, maxDays: 21 },
    },
  ];

  for (const z of zones) {
    const [zone] = await db.insert(shippingZonesTable).values({
      name: z.name,
      nameAr: z.nameAr,
      countries: z.countries,
      isActive: true,
    }).returning();
    await db.insert(shippingRatesTable).values({
      zoneId: zone.id,
      carrier: z.rate.carrier,
      baseFee: z.rate.baseFee,
      freeThreshold: z.rate.freeThreshold,
      minDays: z.rate.minDays,
      maxDays: z.rate.maxDays,
      isActive: true,
    });
  }
}

// ─── PUBLIC: GET /api/shipping/rates?country=XX ───────────────────────────────
router.get("/rates", async (req, res) => {
  try {
    const country = (req.query["country"] as string)?.toUpperCase();
    const zones = await db.select().from(shippingZonesTable).where(eq(shippingZonesTable.isActive, true));
    const rates = await db.select().from(shippingRatesTable).where(eq(shippingRatesTable.isActive, true));

    let matchedZone = zones.find(z =>
      country && (z.countries as string[]).includes(country)
    );
    // Fallback to International (empty countries = catch-all)
    if (!matchedZone) {
      matchedZone = zones.find(z => (z.countries as string[]).length === 0);
    }

    if (!matchedZone) {
      res.json({ zone: null, rate: null });
      return;
    }

    const rate = rates.find(r => r.zoneId === matchedZone!.id);
    res.json({ zone: matchedZone, rate: rate || null });
  } catch {
    res.status(500).json({ error: "Failed to fetch shipping rates" });
  }
});

// ─── PUBLIC: GET /api/shipping/zones ─────────────────────────────────────────
router.get("/zones", async (req, res) => {
  try {
    const zones = await db.select().from(shippingZonesTable).orderBy(shippingZonesTable.id);
    const rates = await db.select().from(shippingRatesTable);
    const result = zones.map(zone => ({
      ...zone,
      rate: rates.find(r => r.zoneId === zone.id) || null,
    }));
    res.json({ zones: result });
  } catch {
    res.status(500).json({ error: "Failed to fetch zones" });
  }
});

// ─── ADMIN: POST /api/shipping/zones ─────────────────────────────────────────
const ZoneSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().min(1),
  countries: z.array(z.string()),
  isActive: z.boolean().optional().default(true),
  rate: z.object({
    carrier: z.string().min(1),
    baseFee: z.string(),
    freeThreshold: z.string().nullable().optional(),
    minDays: z.number().int().min(1),
    maxDays: z.number().int().min(1),
  }).optional(),
});

router.post("/zones", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const data = ZoneSchema.parse(req.body);
    const [zone] = await db.insert(shippingZonesTable).values({
      name: data.name,
      nameAr: data.nameAr,
      countries: data.countries,
      isActive: data.isActive,
    }).returning();

    let rate = null;
    if (data.rate) {
      const [r] = await db.insert(shippingRatesTable).values({
        zoneId: zone.id,
        carrier: data.rate.carrier,
        baseFee: data.rate.baseFee,
        freeThreshold: data.rate.freeThreshold || null,
        minDays: data.rate.minDays,
        maxDays: data.rate.maxDays,
        isActive: true,
      }).returning();
      rate = r;
    }

    res.status(201).json({ zone: { ...zone, rate } });
  } catch (err: any) {
    if (err?.name === "ZodError") res.status(400).json({ error: "Invalid data", details: err.errors });
    else res.status(500).json({ error: "Failed to create zone" });
  }
});

// ─── ADMIN: PUT /api/shipping/zones/:id ──────────────────────────────────────
router.put("/zones/:id", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const id = parseInt(String(req.params["id"]));
    const data = ZoneSchema.partial().parse(req.body);
    // `rate` lives in a separate table (handled below), so it must be stripped
    // out rather than passed to the zones update.
    const { rate: _rate, ...zoneData } = data;
    const [zone] = await db.update(shippingZonesTable)
      .set({ ...zoneData, updatedAt: new Date() })
      .where(eq(shippingZonesTable.id, id))
      .returning();

    if (data.rate) {
      const existing = await db.select().from(shippingRatesTable).where(eq(shippingRatesTable.zoneId, id)).limit(1);
      if (existing.length > 0) {
        await db.update(shippingRatesTable).set({
          carrier: data.rate.carrier,
          baseFee: data.rate.baseFee,
          freeThreshold: data.rate.freeThreshold || null,
          minDays: data.rate.minDays,
          maxDays: data.rate.maxDays,
          updatedAt: new Date(),
        }).where(eq(shippingRatesTable.zoneId, id));
      } else {
        await db.insert(shippingRatesTable).values({
          zoneId: id,
          carrier: data.rate.carrier!,
          baseFee: data.rate.baseFee!,
          freeThreshold: data.rate.freeThreshold || null,
          minDays: data.rate.minDays!,
          maxDays: data.rate.maxDays!,
          isActive: true,
        });
      }
    }

    const rates = await db.select().from(shippingRatesTable).where(eq(shippingRatesTable.zoneId, id)).limit(1);
    res.json({ zone: { ...zone, rate: rates[0] || null } });
  } catch (err: any) {
    if (err?.name === "ZodError") res.status(400).json({ error: "Invalid data", details: err.errors });
    else res.status(500).json({ error: "Failed to update zone" });
  }
});

// ─── ADMIN: DELETE /api/shipping/zones/:id ───────────────────────────────────
router.delete("/zones/:id", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const id = parseInt(String(req.params["id"]));
    await db.delete(shippingZonesTable).where(eq(shippingZonesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete zone" });
  }
});

// ─── PUBLIC: GET /api/shipments/track/:trackingNumber ────────────────────────
router.get("/track/:trackingNumber", async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const [shipment] = await db
      .select()
      .from(shipmentsTable)
      .where(eq(shipmentsTable.trackingNumber, trackingNumber!))
      .limit(1);

    if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }

    const events = await db
      .select()
      .from(shipmentEventsTable)
      .where(eq(shipmentEventsTable.shipmentId, shipment.id))
      .orderBy(desc(shipmentEventsTable.occurredAt));

    const [order] = await db
      .select({ id: ordersTable.id, shippingAddress: ordersTable.shippingAddress, status: ordersTable.status })
      .from(ordersTable)
      .where(eq(ordersTable.id, shipment.orderId))
      .limit(1);

    res.json({ shipment, events, order: order || null });
  } catch {
    res.status(500).json({ error: "Failed to track shipment" });
  }
});

// ─── AUTH: GET /api/shipments/order/:orderId ──────────────────────────────────
router.get("/order/:orderId", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(String(req.params["orderId"]));
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.userId !== req.user!.userId && req.user!.role !== "admin" && req.user!.role !== "vendor") {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const [shipment] = await db
      .select()
      .from(shipmentsTable)
      .where(eq(shipmentsTable.orderId, orderId))
      .limit(1);

    if (!shipment) { res.json({ shipment: null, events: [] }); return; }

    const events = await db
      .select()
      .from(shipmentEventsTable)
      .where(eq(shipmentEventsTable.shipmentId, shipment.id))
      .orderBy(desc(shipmentEventsTable.occurredAt));

    res.json({ shipment, events });
  } catch {
    res.status(500).json({ error: "Failed to fetch shipment" });
  }
});

// ─── VENDOR: GET /api/shipments/vendor ───────────────────────────────────────
router.get("/vendor", requireAuth, async (req, res) => {
  if (req.user!.role !== "vendor" && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  try {
    const shipments = await db
      .select()
      .from(shipmentsTable)
      .where(eq(shipmentsTable.vendorId, req.user!.userId))
      .orderBy(desc(shipmentsTable.createdAt));
    res.json({ shipments });
  } catch {
    res.status(500).json({ error: "Failed to fetch vendor shipments" });
  }
});

// ─── ADMIN: GET /api/shipments/admin/all ─────────────────────────────────────
router.get("/admin/all", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const shipments = await db
      .select()
      .from(shipmentsTable)
      .orderBy(desc(shipmentsTable.createdAt));
    res.json({ shipments });
  } catch {
    res.status(500).json({ error: "Failed to fetch all shipments" });
  }
});

// ─── VENDOR: POST /api/shipments ─────────────────────────────────────────────
const CreateShipmentSchema = z.object({
  orderId: z.number().int().positive(),
  carrier: z.string().min(1).default("Standard"),
  estimatedDelivery: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/", requireAuth, async (req, res) => {
  if (req.user!.role !== "vendor" && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  try {
    const data = CreateShipmentSchema.parse(req.body);

    // Check no duplicate shipment for this order
    const existing = await db
      .select()
      .from(shipmentsTable)
      .where(eq(shipmentsTable.orderId, data.orderId))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Shipment already exists for this order" }); return;
    }

    const trackingNumber = generateTrackingNumber();
    const [shipment] = await db.insert(shipmentsTable).values({
      orderId: data.orderId,
      vendorId: req.user!.userId,
      trackingNumber,
      carrier: data.carrier,
      status: "created",
      estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : null,
      notes: data.notes,
    }).returning();

    // Auto-add first tracking event
    await db.insert(shipmentEventsTable).values({
      shipmentId: shipment.id,
      status: "created",
      description: "Shipment created and awaiting pickup",
      descriptionAr: "تم إنشاء الشحنة وفي انتظار الاستلام",
      occurredAt: new Date(),
    });

    // Update order status to "shipped"
    await db.update(ordersTable)
      .set({ status: "shipped", updatedAt: new Date() })
      .where(eq(ordersTable.id, data.orderId));

    res.status(201).json({ shipment });

    // Notify customer about shipment
    (async () => {
      try {
        const [order] = await db.select({ userId: ordersTable.userId }).from(ordersTable).where(eq(ordersTable.id, data.orderId)).limit(1);
        if (order?.userId) {
          const [customer] = await db.select({ email: usersTable.email, fullName: usersTable.fullName })
            .from(usersTable).where(eq(usersTable.id, order.userId)).limit(1);
          if (customer) {
            await notifyUser(order.userId, customer.email, customer.fullName, {
              type: "shipment_created",
              title: `Order #${data.orderId} Shipped!`,
              titleAr: `تم شحن الطلب #${data.orderId}!`,
              message: `Your order has been shipped via ${data.carrier}. Tracking number: ${trackingNumber}`,
              messageAr: `تم شحن طلبك عبر ${data.carrier}. رقم التتبع: ${trackingNumber}`,
              link: `/track/${trackingNumber}`,
              sendEmail: true,
            });
          }
        }
      } catch {}
    })();
  } catch (err: any) {
    if (err?.name === "ZodError") res.status(400).json({ error: "Invalid data", details: err.errors });
    else res.status(500).json({ error: "Failed to create shipment" });
  }
});

// ─── VENDOR/ADMIN: PUT /api/shipments/:id ────────────────────────────────────
const UpdateShipmentSchema = z.object({
  status: z.enum(["created", "picked_up", "in_transit", "out_for_delivery", "delivered", "failed_delivery", "returned"]).optional(),
  carrier: z.string().optional(),
  estimatedDelivery: z.string().nullable().optional(),
  notes: z.string().optional(),
});

router.put("/:id", requireAuth, async (req, res) => {
  if (req.user!.role !== "vendor" && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  try {
    const id = parseInt(String(req.params["id"]));
    const data = UpdateShipmentSchema.parse(req.body);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.status) updates["status"] = data.status;
    if (data.carrier) updates["carrier"] = data.carrier;
    if (data.estimatedDelivery !== undefined) updates["estimatedDelivery"] = data.estimatedDelivery ? new Date(data.estimatedDelivery) : null;
    if (data.notes !== undefined) updates["notes"] = data.notes;
    if (data.status === "picked_up" || data.status === "in_transit") updates["shippedAt"] = new Date();
    if (data.status === "delivered") updates["deliveredAt"] = new Date();

    const [shipment] = await db
      .update(shipmentsTable)
      .set(updates)
      .where(eq(shipmentsTable.id, id))
      .returning();

    // Sync order status
    if (data.status === "delivered") {
      await db.update(ordersTable).set({ status: "delivered", updatedAt: new Date() }).where(eq(ordersTable.id, shipment.orderId));
    }

    res.json({ shipment });
  } catch (err: any) {
    if (err?.name === "ZodError") res.status(400).json({ error: "Invalid data", details: err.errors });
    else res.status(500).json({ error: "Failed to update shipment" });
  }
});

// ─── VENDOR/ADMIN: POST /api/shipments/:id/events ────────────────────────────
const EventSchema = z.object({
  status: z.enum(["created", "picked_up", "in_transit", "out_for_delivery", "delivered", "failed_delivery", "returned"]),
  location: z.string().optional(),
  locationAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  occurredAt: z.string().optional(),
});

router.post("/:id/events", requireAuth, async (req, res) => {
  if (req.user!.role !== "vendor" && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  try {
    const id = parseInt(String(req.params["id"]));
    const data = EventSchema.parse(req.body);

    const [event] = await db.insert(shipmentEventsTable).values({
      shipmentId: id,
      status: data.status,
      location: data.location,
      locationAr: data.locationAr,
      description: data.description,
      descriptionAr: data.descriptionAr,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
    }).returning();

    // Update shipment status to latest event status
    const updates: Record<string, unknown> = { status: data.status, updatedAt: new Date() };
    if (data.status === "picked_up" || data.status === "in_transit") updates["shippedAt"] = new Date();
    if (data.status === "delivered") updates["deliveredAt"] = new Date();
    const [shipment] = await db.update(shipmentsTable).set(updates).where(eq(shipmentsTable.id, id)).returning();

    // Sync order status for key events
    if (data.status === "in_transit" || data.status === "picked_up") {
      await db.update(ordersTable).set({ status: "shipped", updatedAt: new Date() }).where(eq(ordersTable.id, shipment.orderId));
    }
    if (data.status === "delivered") {
      await db.update(ordersTable).set({ status: "delivered", updatedAt: new Date() }).where(eq(ordersTable.id, shipment.orderId));
    }

    res.status(201).json({ event, shipment });

    // Notify customer about tracking update
    (async () => {
      try {
        const [order] = await db.select({ userId: ordersTable.userId }).from(ordersTable).where(eq(ordersTable.id, shipment.orderId)).limit(1);
        if (order?.userId) {
          const [customer] = await db.select({ email: usersTable.email, fullName: usersTable.fullName })
            .from(usersTable).where(eq(usersTable.id, order.userId)).limit(1);
          if (customer) {
            const statusLabels: Record<string, { en: string; ar: string }> = {
              picked_up:        { en: "Picked Up",         ar: "تم الاستلام" },
              in_transit:       { en: "In Transit",        ar: "في الطريق" },
              out_for_delivery: { en: "Out for Delivery",  ar: "خارج للتسليم" },
              delivered:        { en: "Delivered",         ar: "تم التسليم" },
              failed_delivery:  { en: "Delivery Failed",   ar: "فشل التسليم" },
              returned:         { en: "Returned",          ar: "مُعاد" },
            };
            const label = statusLabels[data.status] || { en: data.status, ar: data.status };
            await notifyUser(order.userId, customer.email, customer.fullName, {
              type: "shipment_update",
              title: `Shipment Update: ${label.en}`,
              titleAr: `تحديث الشحنة: ${label.ar}`,
              message: `Your shipment (${shipment.trackingNumber}) status: ${label.en}${data.location ? ` — ${data.location}` : ""}.`,
              messageAr: `حالة شحنتك (${shipment.trackingNumber}): ${label.ar}${data.locationAr ? ` — ${data.locationAr}` : ""}.`,
              link: `/track/${shipment.trackingNumber}`,
              sendEmail: data.status === "delivered" || data.status === "out_for_delivery",
            });
          }
        }
      } catch {}
    })();
  } catch (err: any) {
    if (err?.name === "ZodError") res.status(400).json({ error: "Invalid data", details: err.errors });
    else res.status(500).json({ error: "Failed to add event" });
  }
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, usersTable, couponsTable, couponRedemptionsTable } from "@workspace/db/schema";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { priceOrder, PricingError } from "../payments/pricing";
import { audit } from "../payments/ledger";
import { releaseSettlement } from "../payments/services";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { notifyUser, notifyAdmins, createNotification } from "../lib/notify";

const router = Router();

const AddressSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(5),
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(2),
});

const CartItemSchema = z.object({
  productId: z.number().int().positive(),
  vendorId: z.number().int().positive(),
  title: z.string().min(1),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  image: z.string().optional().nullable(),
});

const CreateOrderSchema = z.object({
  items: z.array(CartItemSchema).min(1),
  shippingAddress: AddressSchema,
  paymentMethod: z.enum(["cod", "card"]).default("cod"),
  notes: z.string().optional(),
  // Accepted for backward compatibility but ignored: the currency is derived
  // from the products themselves by PricingService.
  currency: z.string().default("USD"),
  couponCode: z.string().optional(),
});

// POST /api/orders — create order from cart
router.post("/", requireAuth, async (req, res) => {
  try {
    const data = CreateOrderSchema.parse(req.body);

    // Authoritative pricing: every figure below comes from the database. The
    // client's prices are never used, only cross-checked.
    let pricing;
    try {
      pricing = await priceOrder({
        items: data.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        country: data.shippingAddress.country,
        state: data.shippingAddress.state,
        couponCode: data.couponCode,
        userId: req.user!.userId,
      });
    } catch (err) {
      if (err instanceof PricingError) {
        res.status(400).json({ error: err.message, code: err.code });
        return;
      }
      throw err;
    }

    // Reject tampered baskets outright rather than silently repricing them, so
    // a mismatch surfaces instead of becoming a support ticket later.
    const mismatch = data.items.find(sent => {
      const real = pricing.items.find(p => p.productId === sent.productId);
      return real !== undefined && Math.abs(real.price - sent.price) > 0.01;
    });
    if (mismatch) {
      const real = pricing.items.find(p => p.productId === mismatch.productId)!;
      await audit({
        action: "order.price_mismatch",
        actorId: req.user!.userId,
        severity: "critical",
        detail: { productId: mismatch.productId, clientPrice: mismatch.price, actualPrice: real.price },
        ipAddress: req.ip ?? null,
      });
      res.status(409).json({
        error: "Product prices have changed. Please refresh your cart.",
        code: "PRICE_MISMATCH",
        productId: mismatch.productId,
        actualPrice: real.price,
      });
      return;
    }

    const subtotal = pricing.subtotal;
    const shippingCost = pricing.shippingCost;
    const tax = pricing.taxAmount;
    const total = pricing.total;

    const [order] = await db.insert(ordersTable).values({
      userId: req.user!.userId,
      status: "pending",
      subtotal: subtotal.toFixed(2),
      shippingCost: shippingCost.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      currency: pricing.currency,
      shippingAddress: data.shippingAddress,
      paymentMethod: data.paymentMethod,
      couponId: pricing.couponId,
      discountAmount: pricing.discountAmount.toFixed(2),
      notes: data.notes,
    }).returning();

    await db.insert(orderItemsTable).values(
      pricing.items.map(item => ({
        orderId: order.id,
        productId: item.productId,
        vendorId: item.vendorId,
        title: item.title,
        price: item.price.toFixed(2),
        quantity: item.quantity,
        subtotal: item.subtotal.toFixed(2),
        image: item.image,
      }))
    );

    if (pricing.couponId) {
      await db.insert(couponRedemptionsTable).values({
        couponId: pricing.couponId,
        userId: req.user!.userId,
        orderId: order.id,
        discountAmount: pricing.discountAmount.toFixed(2),
        currency: pricing.currency,
      });
      await db.update(couponsTable)
        .set({ usedCount: sql`${couponsTable.usedCount} + 1` })
        .where(eq(couponsTable.id, pricing.couponId));
    }

    res.status(201).json({ order });

    // Fire-and-forget notifications
    (async () => {
      try {
        // Fetch customer info
        const [customer] = await db.select({ email: usersTable.email, fullName: usersTable.fullName })
          .from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);

        // Notify customer
        if (customer) {
          await notifyUser(req.user!.userId, customer.email, customer.fullName, {
            type: "order_created",
            title: `Order #${order.id} Placed`,
            titleAr: `تم إنشاء الطلب #${order.id}`,
            message: `Your order of ${data.items.length} item(s) totalling $${total.toFixed(2)} has been placed successfully.`,
            messageAr: `تم إنشاء طلبك بنجاح الذي يحتوي على ${data.items.length} منتج/منتجات بإجمالي $${total.toFixed(2)}.`,
            link: `/orders/${order.id}`,
            sendEmail: true,
          });
        }

        // Notify each unique vendor in the order
        const vendorIds = [...new Set(data.items.map(i => i.vendorId))];
        const vendors = await db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName })
          .from(usersTable).where(inArray(usersTable.id, vendorIds));
        for (const vendor of vendors) {
          const vendorItems = data.items.filter(i => i.vendorId === vendor.id);
          await notifyUser(vendor.id, vendor.email, vendor.fullName, {
            type: "new_order",
            title: `New Order #${order.id}`,
            titleAr: `طلب جديد #${order.id}`,
            message: `You have a new order for ${vendorItems.length} item(s). Please process it promptly.`,
            messageAr: `لديك طلب جديد يحتوي على ${vendorItems.length} منتج/منتجات. يرجى معالجته في أقرب وقت.`,
            link: `/dashboard/orders`,
            sendEmail: true,
          });
        }

        // Notify admins
        await notifyAdmins({
          type: "new_order",
          title: `New Order #${order.id} — $${total.toFixed(2)}`,
          titleAr: `طلب جديد #${order.id} — $${total.toFixed(2)}`,
          message: `A new order was placed by ${customer?.fullName || "a customer"} for $${total.toFixed(2)}.`,
          messageAr: `تم تقديم طلب جديد بواسطة ${customer?.fullName || "عميل"} بقيمة $${total.toFixed(2)}.`,
          link: `/dashboard/orders`,
        });
      } catch {}
    })();
  } catch (err: any) {
    if (err?.name === "ZodError") res.status(400).json({ error: "Invalid order data", details: err.errors });
    else res.status(500).json({ error: "Failed to create order" });
  }
});

// GET /api/orders — user's orders
router.get("/", requireAuth, async (req, res) => {
  try {
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, req.user!.userId))
      .orderBy(desc(ordersTable.createdAt));
    res.json({ orders });
  } catch {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/orders/:id — single order with items
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params["id"]));
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (order.userId !== req.user!.userId && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const orderItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    res.json({ order, items: orderItems });
  } catch {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// Admin: GET /api/orders/admin/all
router.get("/admin/all", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    res.json({ orders });
  } catch {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Admin: PUT /api/orders/:id/status
router.put("/:id/status", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const id = parseInt(String(req.params["id"]));
    const { status } = z.object({
      status: z.enum(["pending","confirmed","processing","shipped","delivered","cancelled","refunded"]),
    }).parse(req.body);
    // Delivery is what releases vendor earnings from escrow into payable.
    if (status === "delivered") {
      try {
        await releaseSettlement(id);
      } catch (err) {
        await audit({
          action: "settlement.release_failed", orderId: id, severity: "warning",
          detail: { error: err instanceof Error ? err.message : String(err) },
        });
      }
    }

    const [order] = await db.update(ordersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(ordersTable.id, id))
      .returning();
    res.json({ order });
  } catch (err: any) {
    if (err?.name === "ZodError") res.status(400).json({ error: "Invalid status" });
    else res.status(500).json({ error: "Failed to update order" });
  }
});

export default router;

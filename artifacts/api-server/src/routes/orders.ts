import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

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
  currency: z.string().default("USD"),
});

// POST /api/orders — create order from cart
router.post("/", requireAuth, async (req, res) => {
  try {
    const data = CreateOrderSchema.parse(req.body);

    const subtotal = data.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const shippingCost = subtotal >= 100 ? 0 : 9.99;
    const tax = subtotal * 0.05;
    const total = subtotal + shippingCost + tax;

    const [order] = await db.insert(ordersTable).values({
      userId: req.user!.userId,
      status: "pending",
      subtotal: subtotal.toFixed(2),
      shippingCost: shippingCost.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      currency: data.currency,
      shippingAddress: data.shippingAddress,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
    }).returning();

    await db.insert(orderItemsTable).values(
      data.items.map(item => ({
        orderId: order.id,
        productId: item.productId,
        vendorId: item.vendorId,
        title: item.title,
        price: item.price.toFixed(2),
        quantity: item.quantity,
        subtotal: (item.price * item.quantity).toFixed(2),
        image: item.image,
      }))
    );

    res.status(201).json({ order });
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
    const id = parseInt(req.params["id"]!);
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
    const id = parseInt(req.params["id"]!);
    const { status } = z.object({
      status: z.enum(["pending","confirmed","processing","shipped","delivered","cancelled","refunded"]),
    }).parse(req.body);
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

import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, productsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

const DEMO_PRODUCTS = [
  {
    title: "Premium Wireless Headphones", titleAr: "سماعات لاسلكية فاخرة",
    description: "Industry-leading noise cancelling headphones with 30-hour battery life and premium sound quality.", descriptionAr: "سماعات فاخرة بإلغاء الضوضاء الصناعية مع بطارية 30 ساعة",
    category: "Electronics", price: "299.99", compareAtPrice: "399.99", discountPercent: 25,
    stock: 45, images: ["https://picsum.photos/seed/headphones1/600/600", "https://picsum.photos/seed/headphones2/600/600"],
    coverImage: "https://picsum.photos/seed/headphones1/600/600", isFeatured: true, tags: ["audio", "wireless", "noise-cancelling"],
  },
  {
    title: "Smart Watch Pro Series 5", titleAr: "ساعة ذكية برو سيريس 5",
    description: "Advanced health monitoring, GPS, and a stunning AMOLED display. Water resistant to 50 meters.", descriptionAr: "مراقبة صحية متقدمة، GPS، وشاشة AMOLED رائعة",
    category: "Electronics", price: "449.99", compareAtPrice: "549.99", discountPercent: 18,
    stock: 32, images: ["https://picsum.photos/seed/watch1/600/600", "https://picsum.photos/seed/watch2/600/600"],
    coverImage: "https://picsum.photos/seed/watch1/600/600", isFeatured: true, tags: ["smartwatch", "fitness", "GPS"],
  },
  {
    title: "4K Ultra HD Webcam", titleAr: "كاميرا ويب فائقة الدقة",
    description: "Professional-grade 4K webcam with autofocus, built-in ring light, and noise-cancelling mic.", descriptionAr: "كاميرا ويب احترافية 4K مع تركيز تلقائي وميكروفون",
    category: "Electronics", price: "189.99", compareAtPrice: null, discountPercent: 0,
    stock: 78, images: ["https://picsum.photos/seed/webcam1/600/600"],
    coverImage: "https://picsum.photos/seed/webcam1/600/600", isFeatured: false, tags: ["webcam", "4k", "streaming"],
  },
  {
    title: "Luxury Leather Tote Bag", titleAr: "حقيبة توت جلدية فاخرة",
    description: "Handcrafted Italian leather tote bag. Spacious interior with gold-tone hardware.", descriptionAr: "حقيبة جلد إيطالية مصنوعة يدوياً مع أجهزة لون ذهبي",
    category: "Fashion", price: "385.00", compareAtPrice: "520.00", discountPercent: 26,
    stock: 15, images: ["https://picsum.photos/seed/bag1/600/600", "https://picsum.photos/seed/bag2/600/600"],
    coverImage: "https://picsum.photos/seed/bag1/600/600", isFeatured: true, tags: ["leather", "luxury", "handbag"],
  },
  {
    title: "Men's Slim Fit Blazer", titleAr: "بليزر رجالي نحيف الملاءمة",
    description: "Modern slim-fit blazer in premium wool blend. Perfect for business and formal occasions.", descriptionAr: "بليزر عصري نحيف الملاءمة من خليط الصوف الفاخر",
    category: "Fashion", price: "229.99", compareAtPrice: "289.99", discountPercent: 21,
    stock: 60, images: ["https://picsum.photos/seed/blazer1/600/600"],
    coverImage: "https://picsum.photos/seed/blazer1/600/600", isFeatured: false, tags: ["blazer", "formal", "men"],
  },
  {
    title: "Minimalist Desk Lamp", titleAr: "مصباح مكتب بسيط",
    description: "LED desk lamp with adjustable brightness, color temperature, and USB charging port.", descriptionAr: "مصباح مكتب LED مع سطوع قابل للتعديل ومنفذ USB",
    category: "Home & Living", price: "79.99", compareAtPrice: "99.99", discountPercent: 20,
    stock: 120, images: ["https://picsum.photos/seed/lamp1/600/600", "https://picsum.photos/seed/lamp2/600/600"],
    coverImage: "https://picsum.photos/seed/lamp1/600/600", isFeatured: true, tags: ["lamp", "LED", "desk"],
  },
  {
    title: "Bamboo Cutting Board Set", titleAr: "طقم ألواح تقطيع بامبو",
    description: "Eco-friendly bamboo cutting board set of 3 sizes with juice groove and non-slip feet.", descriptionAr: "طقم ألواح تقطيع بامبو صديق للبيئة من 3 أحجام",
    category: "Home & Living", price: "49.99", compareAtPrice: null, discountPercent: 0,
    stock: 200, images: ["https://picsum.photos/seed/bamboo1/600/600"],
    coverImage: "https://picsum.photos/seed/bamboo1/600/600", isFeatured: false, tags: ["kitchen", "eco", "bamboo"],
  },
  {
    title: "Vitamin C Brightening Serum", titleAr: "سيروم فيتامين C للبشرة المضيئة",
    description: "20% Vitamin C serum with hyaluronic acid for glowing, even-toned skin. Dermatologist tested.", descriptionAr: "سيروم فيتامين C بتركيز 20% مع حمض الهيالورونيك",
    category: "Beauty", price: "68.00", compareAtPrice: "89.00", discountPercent: 24,
    stock: 88, images: ["https://picsum.photos/seed/serum1/600/600"],
    coverImage: "https://picsum.photos/seed/serum1/600/600", isFeatured: true, tags: ["skincare", "vitamin-c", "serum"],
  },
  {
    title: "Yoga Mat Pro — Non-Slip", titleAr: "حصيرة يوغا احترافية مانعة للانزلاق",
    description: "6mm thick eco-friendly yoga mat with alignment lines, carry strap and non-slip surface.", descriptionAr: "حصيرة يوغا سميكة 6 مم صديقة للبيئة مع خطوط محاذاة",
    category: "Sports", price: "89.99", compareAtPrice: "119.99", discountPercent: 25,
    stock: 55, images: ["https://picsum.photos/seed/yoga1/600/600"],
    coverImage: "https://picsum.photos/seed/yoga1/600/600", isFeatured: false, tags: ["yoga", "fitness", "mat"],
  },
  {
    title: "Gold Diamond Tennis Bracelet", titleAr: "سوار تنس ذهبي بالألماس",
    description: "18K gold plated tennis bracelet with cubic zirconia stones. Adjustable clasp, hypoallergenic.", descriptionAr: "سوار تنس مطلي بالذهب عيار 18 مع أحجار الزركونيا",
    category: "Jewelry & Watches", price: "149.99", compareAtPrice: "199.99", discountPercent: 25,
    stock: 30, images: ["https://picsum.photos/seed/bracelet1/600/600", "https://picsum.photos/seed/bracelet2/600/600"],
    coverImage: "https://picsum.photos/seed/bracelet1/600/600", isFeatured: true, tags: ["gold", "bracelet", "jewelry"],
  },
  {
    title: "Mechanical Keyboard RGB", titleAr: "لوحة مفاتيح ميكانيكية RGB",
    description: "TKL mechanical keyboard with Cherry MX switches, per-key RGB, and aluminium frame.", descriptionAr: "لوحة مفاتيح ميكانيكية TKL مع مفاتيح Cherry MX وإضاءة RGB",
    category: "Electronics", price: "159.99", compareAtPrice: "199.99", discountPercent: 20,
    stock: 40, images: ["https://picsum.photos/seed/keyboard1/600/600"],
    coverImage: "https://picsum.photos/seed/keyboard1/600/600", isFeatured: false, tags: ["keyboard", "gaming", "mechanical"],
  },
  {
    title: "Scented Luxury Candle Set", titleAr: "طقم شموع فاخرة معطرة",
    description: "Set of 3 hand-poured soy wax candles in amber, oud, and sandalwood. 45-hour burn time each.", descriptionAr: "طقم من 3 شموع شمع صويا معطرة بالعنبر والعود والصندل",
    category: "Home & Living", price: "95.00", compareAtPrice: "120.00", discountPercent: 21,
    stock: 70, images: ["https://picsum.photos/seed/candle1/600/600"],
    coverImage: "https://picsum.photos/seed/candle1/600/600", isFeatured: true, tags: ["candle", "luxury", "home"],
  },
];

router.post("/seed", async (_req, res) => {
  // Development-only endpoint: it creates an administrator account with a
  // well-known password. Exposing it on a public deployment is a full account
  // takeover, so it is disabled unless explicitly opted into. 404 (not 403) so
  // the endpoint's existence is not disclosed in production.
  if (process.env["NODE_ENV"] === "production" && process.env["ALLOW_SEED"] !== "true") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const demoUsers = [
    { email: "admin@orbit.market", password: "Admin1234!", fullName: "Admin User", role: "admin" as const },
    {
      email: "vendor@orbit.market", password: "Vendor1234!", fullName: "Ahmed Al-Rashid", role: "vendor" as const,
      storeName: "TechElite Store", storeDescription: "Premium electronics from verified suppliers.", storeCategory: "Electronics",
    },
    { email: "customer@orbit.market", password: "Customer1234!", fullName: "Sarah Johnson", role: "customer" as const },
  ];

  const results: string[] = [];

  for (const u of demoUsers) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, u.email)).limit(1);
    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(u.password, 12);
      await db.insert(usersTable).values({
        email: u.email, passwordHash, role: u.role, fullName: u.fullName,
        storeName: (u as any).storeName, storeDescription: (u as any).storeDescription,
        storeCategory: (u as any).storeCategory, isVendorApproved: u.role === "vendor",
        isActive: true,
      });
      results.push(`Created: ${u.email}`);
    } else {
      results.push(`Exists: ${u.email}`);
    }
  }

  // Seed demo products if none exist
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(productsTable);
  if (Number(count) === 0) {
    const [vendor] = await db.select().from(usersTable).where(eq(usersTable.email, "vendor@orbit.market")).limit(1);
    if (vendor) {
      for (const p of DEMO_PRODUCTS) {
        await db.insert(productsTable).values({
          ...p,
          vendorId: vendor.id,
          status: "approved",
          rating: (3.5 + Math.random() * 1.5).toFixed(2),
          reviewCount: Math.floor(Math.random() * 200) + 10,
          salesCount: Math.floor(Math.random() * 500) + 20,
        });
      }
      results.push(`Created ${DEMO_PRODUCTS.length} demo products`);
    }
  } else {
    results.push(`Products exist: ${count}`);
  }

  res.json({ results });
});

export default router;

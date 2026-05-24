import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// POST /api/seed — creates demo accounts (idempotent)
router.post("/seed", async (_req, res) => {
  const demoUsers = [
    { email: "admin@orbit.market",    password: "Admin1234!",    fullName: "Admin User",    role: "admin"    as const },
    { email: "vendor@orbit.market",   password: "Vendor1234!",   fullName: "Ahmed Al-Rashid", role: "vendor"  as const,
      storeName: "TechElite Store", storeDescription: "Premium electronics from verified suppliers.", storeCategory: "Electronics" },
    { email: "customer@orbit.market", password: "Customer1234!", fullName: "Sarah Johnson",  role: "customer" as const },
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
  res.json({ results });
});

export default router;

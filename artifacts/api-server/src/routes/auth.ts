import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../middlewares/auth";
import { z } from "zod";
import { notifyUser, notifyAdmins } from "../lib/notify";
import { authLimiter, accountLimiter } from "../middlewares/rateLimit";

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(["customer", "vendor"]).default("customer"),
  phone: z.string().optional(),
  storeName: z.string().optional(),
  storeDescription: z.string().optional(),
  storeCategory: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  storeName: z.string().optional(),
  storeDescription: z.string().optional(),
  storeCategory: z.string().optional(),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

function safeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
}

// POST /api/auth/register
router.post("/register", accountLimiter, async (req, res) => {
  try {
    const data = RegisterSchema.parse(req.body);
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, data.email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(data.password, 12);
    const [user] = await db.insert(usersTable).values({
      email: data.email,
      passwordHash,
      role: data.role,
      fullName: data.fullName,
      phone: data.phone,
      storeName: data.storeName,
      storeDescription: data.storeDescription,
      storeCategory: data.storeCategory,
      isVendorApproved: false,
    }).returning();
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie("orbit_token", token, COOKIE_OPTIONS);
    res.status(201).json({ user: safeUser(user), token });

    // Welcome notification
    notifyUser(user.id, user.email, user.fullName, {
      type: "system",
      title: "Welcome to Orbit Market!",
      titleAr: "مرحباً بك في أوربت ماركت!",
      message: "Your account has been created successfully. Start shopping or explore vendor options.",
      messageAr: "تم إنشاء حسابك بنجاح. ابدأ التسوق أو استكشف خيارات البائعين.",
      link: "/products",
    }).catch(() => {});

    // Alert admins about new vendor registration
    if (data.role === "vendor") {
      notifyAdmins({
        type: "new_vendor",
        title: `New vendor: ${data.fullName}`,
        titleAr: `بائع جديد: ${data.fullName}`,
        message: `${data.fullName} (${data.email}) registered as a vendor${data.storeName ? ` — store: "${data.storeName}"` : ""}. Pending approval.`,
        messageAr: `${data.fullName} (${data.email}) سجّل كبائع${data.storeName ? ` — المتجر: "${data.storeName}"` : ""}. بانتظار الموافقة.`,
        link: "/dashboard/vendors",
      }).catch(() => {});
    }
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: "Validation failed", details: err.errors });
    } else {
      res.status(500).json({ error: "Registration failed" });
    }
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ error: "Account is deactivated" });
      return;
    }
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.cookie("orbit_token", token, COOKIE_OPTIONS);
    res.json({ user: safeUser(user), token });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: "Validation failed", details: err.errors });
    } else {
      res.status(500).json({ error: "Login failed" });
    }
  }
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.clearCookie("orbit_token", { path: "/" });
  res.json({ message: "Logged out" });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user: safeUser(user) });
  } catch {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT /api/auth/profile
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const data = UpdateProfileSchema.parse(req.body);
    const [user] = await db
      .update(usersTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(usersTable.id, req.user!.userId))
      .returning();
    res.json({ user: safeUser(user) });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: "Validation failed", details: err.errors });
    } else {
      res.status(500).json({ error: "Failed to update profile" });
    }
  }
});

// PUT /api/auth/password
router.put("/password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    }).parse(req.body);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, req.user!.userId));
    res.json({ message: "Password updated" });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      res.status(400).json({ error: "Validation failed" });
    } else {
      res.status(500).json({ error: "Failed to change password" });
    }
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", accountLimiter, async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (user) {
      const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const expiry = new Date(Date.now() + 60 * 60 * 1000);
      await db.update(usersTable).set({ resetToken: token, resetTokenExpiry: expiry }).where(eq(usersTable.id, user.id));
      // In production: send email. For demo purposes we return the token.
    }
    // Always return success to avoid email enumeration
    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch {
    res.status(500).json({ error: "Failed to process request" });
  }
});

// GET /api/auth/admin/users  (admin only)
router.get("/admin/users", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const users = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      fullName: usersTable.fullName,
      role: usersTable.role,
      isActive: usersTable.isActive,
      isVendorApproved: usersTable.isVendorApproved,
      createdAt: usersTable.createdAt,
    }).from(usersTable);
    res.json({ users });
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// PUT /api/auth/admin/users/:id/approve  (admin only)
router.put("/admin/users/:id/approve", requireAuth, async (req, res) => {
  if (req.user!.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const id = parseInt(String(req.params["id"]));
    const [user] = await db.update(usersTable).set({ isVendorApproved: true }).where(eq(usersTable.id, id)).returning();
    res.json({ user: safeUser(user) });
    notifyUser(user.id, user.email, user.fullName, {
      type: "vendor_approved",
      title: "Your store has been approved!",
      titleAr: "تمت الموافقة على متجرك!",
      message: `Congratulations! Your vendor account has been approved. You can now list products on Orbit Market.`,
      messageAr: "تهانينا! تمت الموافقة على حسابك كبائع. يمكنك الآن إدراج المنتجات في أوربت ماركت.",
      link: "/dashboard",
      sendEmail: true,
    }).catch(() => {});
  } catch {
    res.status(500).json({ error: "Failed to approve vendor" });
  }
});

export default router;

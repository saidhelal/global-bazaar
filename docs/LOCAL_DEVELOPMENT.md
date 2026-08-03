# التشغيل المحلي — Orbit Market (global-bazaar)

دليل تشغيل المشروع محليًا على Windows بعد نقله من Replit.

---

## 1. المتطلبات

| المتطلب | الإصدار المستخدم | ملاحظات |
|---|---|---|
| Node.js | **24.18.0** | مطلوب 20.6+ على الأقل لدعم `--env-file`. الحزم مبنية على Node 24 |
| pnpm | **11.18.0** | إلزامي — سكربت `preinstall` يرفض npm/yarn |
| Git | 2.55+ | اختياري للتشغيل، مطلوب للتطوير |
| PostgreSQL | — | **لا حاجة لتثبيته**. المشروع يشغّل نسخة مدمجة خاصة به |

نظام التشغيل المُتحقَّق منه: **Windows 11 Pro (x64)**.
لا حاجة إلى Docker، ولا إلى WSL، ولا إلى أي خادم Postgres مثبّت على النظام.

---

## 2. المنافذ المستخدمة

| المنفذ | الخدمة | مُلزِم؟ |
|---|---|---|
| **5175** | Frontend — Vite dev server | قابل للتغيير عبر `PORT` |
| **5176** | API Server — Express | قابل للتغيير عبر `PORT` + `API_PORT` |
| **5433** | PostgreSQL المحلي الخاص بالمشروع | قابل للتغيير عبر `PG_PORT` |

### منافذ محجوزة لمشاريع أخرى — ممنوع استخدامها

| المنفذ | المشروع |
|---|---|
| 5173 | ERP |
| 5174 | Pyramids Website |
| 5432 | Postgres المدمج التابع لمشروع ERP |

> المشروع لا يلمس أيًّا من هذه المنافذ. قاعدة بياناته منفصلة تمامًا على 5433 ببياناتها الخاصة داخل `lib/db/.pgdata`.

---

## 3. التشغيل من الصفر

### الخطوة 1 — تثبيت الحزم

```powershell
cd F:\Projects\global-bazaar
pnpm install
```

عند أول تشغيل قد يطلب pnpm الموافقة على تشغيل سكربتات البناء. الموافقات مسجّلة مسبقًا في `pnpm-workspace.yaml` تحت `allowBuilds` لـ `esbuild` و`@embedded-postgres/windows-x64`.

### الخطوة 2 — ملف البيئة

```powershell
Copy-Item .env.example .env
```

ثم افتح `.env` وولّد مفتاحًا للتوقيع:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

وضع الناتج في `JWT_SECRET`. القيم الافتراضية لـ `DATABASE_URL` و`PORT` جاهزة ولا تحتاج تعديلًا.

### الخطوة 3 — تشغيل قاعدة البيانات (نافذة طرفية أولى)

```powershell
cd lib\db
pnpm run pg
```

عند أول تشغيل ستُنشأ مجموعة البيانات في `lib/db/.pgdata` وقاعدة باسم `global_bazaar` تلقائيًا. انتظر ظهور:

```
[pg] listening on 127.0.0.1:5433
```

اترك النافذة مفتوحة — إغلاقها يوقف قاعدة البيانات.

### الخطوة 4 — إنشاء الجداول (مرة واحدة فقط)

```powershell
cd lib\db
pnpm run push:local
```

يقرأ `DATABASE_URL` من `.env` تلقائيًا ويطبّق مخطط Drizzle (12 جدولًا).

### الخطوة 5 — تشغيل الخادم (نافذة ثانية)

```powershell
cd artifacts\api-server
pnpm run dev
```

`dev` يبني ثم يشغّل. انتظر:

```
INFO: Server listening  port: 5176
```

### الخطوة 6 — تشغيل الواجهة (نافذة ثالثة)

```powershell
cd artifacts\orbit-market
$env:PORT="5175"; $env:BASE_PATH="/"
pnpm run dev
```

ثم افتح: **http://localhost:5175/**

### الخطوة 7 — بيانات تجريبية (اختياري، مرة واحدة)

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:5175/api/seed" -Method POST -UseBasicParsing
```

ينشئ 12 منتجًا و3 حسابات:

| الدور | البريد | كلمة المرور |
|---|---|---|
| Admin | `admin@orbit.market` | `Admin1234!` |
| Vendor | `vendor@orbit.market` | `Vendor1234!` |
| Customer | `customer@orbit.market` | `Customer1234!` |

> ⚠️ هذه بيانات تطوير فقط. النقطة `/api/seed` **غير محمية** ويجب تعطيلها أو حمايتها قبل أي نشر.

---

## 4. مرجع الأوامر

| الأمر | المجلد | الوظيفة |
|---|---|---|
| `pnpm install` | الجذر | تثبيت كل حزم مساحة العمل |
| `pnpm run pg` | `lib/db` | تشغيل PostgreSQL المحلي (5433) |
| `pnpm run push:local` | `lib/db` | تطبيق مخطط Drizzle مع تحميل `.env` |
| `pnpm run push` | `lib/db` | نفس الشيء لكن يتطلب `DATABASE_URL` في البيئة يدويًا |
| `pnpm run dev` | `artifacts/api-server` | بناء + تشغيل الخادم |
| `pnpm run build` | `artifacts/api-server` | بناء حزمة esbuild فقط |
| `pnpm run start` | `artifacts/api-server` | تشغيل البناء الموجود |
| `pnpm run dev` | `artifacts/orbit-market` | خادم تطوير Vite |
| `pnpm run build` | `artifacts/orbit-market` | بناء إنتاج → `dist/public` |
| `pnpm --filter @workspace/api-spec run codegen` | الجذر | إعادة توليد عميل API من OpenAPI |

> `pnpm run build` في الجذر يستدعي `typecheck` أولًا، وهو **يفشل حاليًا** لسبب سابق للنقل (انظر قسم المشاكل المعروفة). استخدم أوامر البناء داخل كل حزمة.

---

## 5. بنية المشروع

```
global-bazaar/
├── artifacts/                       ← التطبيقات القابلة للنشر
│   ├── orbit-market/                ← الواجهة: React 19 + Vite 7 + Tailwind 4
│   │   ├── src/pages/               ← 24 صفحة (تحميل كسول)
│   │   ├── src/components/          ← مكوّنات + shadcn/ui
│   │   ├── src/contexts/            ← اللغة، العملة، المصادقة، السلة، الإشعارات
│   │   └── vite.config.ts           ← يتضمن proxy لـ /api
│   ├── api-server/                  ← الخادم: Express 5
│   │   ├── src/routes/              ← 11 مسارًا
│   │   ├── src/middlewares/auth.ts  ← JWT
│   │   ├── src/lib/                 ← البريد، السجلات، التخزين، ACL
│   │   └── build.mjs                ← تجميع esbuild → dist/index.mjs
│   └── mockup-sandbox/              ← معاينة مكوّنات (أداة تصميم، ليست جزءًا من المنتج)
├── lib/
│   ├── db/                          ← مصدر الحقيقة لقاعدة البيانات
│   │   ├── src/schema/              ← مخطط Drizzle (12 جدولًا)
│   │   ├── scripts/local-postgres.mjs ← خادم Postgres المحلي
│   │   └── .pgdata/                 ← بيانات القاعدة (مُستبعَد من Git)
│   ├── api-spec/                    ← OpenAPI + إعداد Orval
│   ├── api-client-react/            ← عميل مولّد آليًا (لا يُعدَّل يدويًا)
│   ├── api-zod/                     ← مخططات تحقق مولّدة آليًا
│   └── object-storage-web/          ← عميل رفع الملفات
├── scripts/                         ← أدوات مساعدة
├── docs/                            ← هذا التوثيق
└── .env                             ← أسرار محلية (مُستبعَد من Git)
```

### تدفّق الطلب محليًا

```
المتصفح → :5175 (Vite)
              ├── /            → ملفات الواجهة
              └── /api/*       → proxy → :5176 (Express) → :5433 (Postgres)
```

الواجهة تستدعي مسارات نسبية `/api/...` فقط. الـ proxy في `vite.config.ts` هو ما يجعلها تصل للخادم — وهو البديل المحلي لموجّه Replit.

---

## 6. متغيرات البيئة

### إلزامية

| المتغير | الوصف |
|---|---|
| `DATABASE_URL` | رابط Postgres. الخادم و`drizzle-kit` يرفضان العمل بدونه |
| `PORT` | منفذ الخادم (5176). الواجهة تقرؤه أيضًا عند التشغيل |
| `BASE_PATH` | مسار أساس Vite (`/`). Vite يرمي خطأً بدونه |
| `JWT_SECRET` | مفتاح توقيع التوكن. غيابه يسبب فشل تسجيل الدخول |

### اختيارية

| المجموعة | المتغيرات | السلوك عند الغياب |
|---|---|---|
| Vite proxy | `API_PORT` | يستخدم 5176 افتراضيًا |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY` | نقاط الدفع ترجع 503 |
| Paymob | `PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID`, `PAYMOB_IFRAME_ID`, `PAYMOB_HMAC_SECRET` | ترجع 503 |
| MyFatoorah | `MYFATOORAH_API_KEY`, `MYFATOORAH_BASE_URL` | ترجع 503 |
| البريد | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `FROM_NAME` | يُطبع في الطرفية بدل الإرسال |
| التخزين | `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` | رفع الملفات معطّل |
| Postgres المحلي | `PG_PORT`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE` | 5433 / bazaar / bazaar / global_bazaar |
| عام | `NODE_ENV`, `LOG_LEVEL` | development / info |

`.env.example` يحتوي القائمة كاملة. **لا تُرفع `.env` إلى Git إطلاقًا** — مُستبعَد في `.gitignore`.

---

## 7. المشاكل المعروفة

### 🔴 `pnpm run typecheck` يفشل (سابق للنقل)

```
lib/db/src/schema/users.ts(58,34): error TS2344
lib/db/src/schema/users.ts(60,32): error TS2344
```

**السبب:** `drizzle-zod@0.8.3` يُنتج مخططات بواجهة Zod v4، بينما [users.ts](../lib/db/src/schema/users.ts) يستورد `from "zod"` أي الجذر v3. حزمة `zod@3.25.76` تحتوي كلا الواجهتين.

**ليس ناتجًا عن نقل المشروع** — الملف من الـ commit `3a46754`، ولم تتغير أي نسخة من zod أو drizzle-zod. الخطأ في الأنواع فقط ولا يؤثر على التشغيل لأن esbuild يزيل الأنواع دون فحصها.

**الأثر:** `pnpm run build` في الجذر يتوقف. البناء داخل كل حزمة يعمل بشكل طبيعي.
**الحل المقترح:** توحيد الاستيراد إلى `from "zod/v4"` في `lib/db/src/schema/users.ts`. *(لم يُنفَّذ — يمسّ كود المنتج.)*

### 🔴 رفع الملفات معطّل محليًا

[objectStorage.ts](../artifacts/api-server/src/lib/objectStorage.ts) يجلب اعتمادات Google Cloud Storage من خدمة Replit الداخلية على `127.0.0.1:1106`. غير موجودة محليًا.
**الأثر:** رفع صور المنتجات ووثائق البائعين لا يعمل. باقي المشروع سليم.

### 🟠 إرسال البريد لا يعمل حتى مع ضبط SMTP

[email.ts](../artifacts/api-server/src/lib/email.ts) يستدعي `await import("nodemailer")` وهي **غير مُعلَنة في أي `package.json`**، ومستثناة من تجميع esbuild. الفشل صامت داخل `try/catch`.

### 🟡 مسار `@assets` يشير إلى مجلد غير موجود

`vite.config.ts` يعرّف `@assets` → `attached_assets/` وهو غير موجود في المستودع. لا يسبب خطأ ما لم يُستخدم الاسم المستعار.

### 🟡 تعارض في التوثيق القديم

`replit.md` يذكر أن الخادم على المنفذ 5000 — غير صحيح. المنفذ الفعلي محليًا هو 5176.

---

## 8. خطوات النشر المستقبلية

المشروع لم يعد مربوطًا بمنصة Replit. لأي نشر لاحق يجب معالجة التالي:

### أ. قاعدة البيانات
استبدال Postgres المدمج بخادم حقيقي (VPS / Docker / خدمة مُدارة). يكفي تغيير `DATABASE_URL` — لا تغيير في الكود. راجع `MIGRATION_FROM_REPLIT.md`.

### ب. تخزين الملفات
إعادة كتابة `objectStorage.ts` لتستخدم اعتمادات مباشرة (Service Account لـ GCS، أو S3، أو تخزين على القرص) بدل خدمة Replit.

### ج. تقديم الواجهة
`proxy` الخاص بـ Vite يعمل في التطوير فقط. في الإنتاج:
- بناء الواجهة: `pnpm --filter @workspace/orbit-market run build` → `dist/public`
- تقديم الملفات عبر خادم ثابت (Nginx / Caddy)
- توجيه `/api` من نفس الخادم إلى خدمة Express حتى تبقى المسارات النسبية صالحة

### د. الأمان قبل النشر — إلزامي
1. حذف `JWT_SECRET` من [.replit](../.replit) وتدويره (مكشوف في تاريخ Git).
2. حماية أو تعطيل `POST /api/seed`.
3. تقييد CORS بقائمة أصول محددة بدل `origin: true`.
4. ضبط `NODE_ENV=production` لتعطيل تنسيق السجلات المفصّل.

### هـ. البناء
```powershell
pnpm --filter @workspace/api-server run build      # → dist/index.mjs
pnpm --filter @workspace/orbit-market run build    # → dist/public
```
التشغيل في الإنتاج: `node --enable-source-maps artifacts/api-server/dist/index.mjs`

> ملاحظة: ملفات `.replit-artifact/artifact.toml` تحتوي تعريفات بناء وتشغيل الإنتاج التي كانت تستخدمها Replit — مرجع مفيد لبناء ملفات إعداد Nginx أو systemd أو Docker مكافئة.

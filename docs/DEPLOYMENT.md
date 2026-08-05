# النشر على AWS EC2

دليل تشغيل Global Bazaar في الإنتاج على Ubuntu مع Node LTS وpnpm وPM2 وNginx وPostgreSQL.
للتطوير المحلي راجع [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md).

---

## 1. المعمارية على الخادم

```
الإنترنت ──> Nginx :80/:443 ──┬── /api/*  ──> PM2 → Node (API) :5176
                              └── /*      ──> ملفات ثابتة من
                                               artifacts/orbit-market/dist/public
                                                    │
                                            PostgreSQL :5432 (محلي أو RDS)
```

الواجهة تستدعي مسارات `/api/...` **نسبية على نفس الأصل** (انظر `API_BASE` في
`src/contexts/AuthContext.tsx`). لذلك **يجب** أن يبقى الـ API خلف نفس النطاق؛
نقله إلى نطاق فرعي يتطلب تعديل الواجهة.

**حجم الخادم:** النشر يبني على الخادم نفسه. `t3.small` (2GB) هو الحد الأدنى العملي —
`t2.micro` (1GB) قد يفشل بناء Vite بنفاد الذاكرة.

---

## 2. تجهيز الخادم لأول مرة

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx curl

# Node LTS 22 (نفس إصدار CI)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm + PM2
sudo corepack enable && corepack prepare pnpm@11 --activate
sudo npm install -g pm2

# PostgreSQL (تخطَّ هذه الخطوة عند استخدام RDS)
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE USER bazaar WITH PASSWORD 'ضع-كلمة-مرور-قوية';"
sudo -u postgres psql -c "CREATE DATABASE global_bazaar OWNER bazaar;"
```

استنساخ المشروع:

```bash
cd ~
git clone https://github.com/saidhelal/global-bazaar.git
cd global-bazaar
```

---

## 3. متغيرات البيئة

```bash
cp .env.example .env
nano .env
```

**إلزامية — الخادم يرفض الإقلاع بدونها:**

| المتغير | ملاحظات |
|---|---|
| `DATABASE_URL` | `postgresql://bazaar:PASSWORD@127.0.0.1:5432/global_bazaar` |
| `PORT` | `5176` — يجب أن يطابق `upstream` في إعداد Nginx |
| `JWT_SECRET` | **ولّد قيمة جديدة للإنتاج** (أدناه) |

**تخزين الصور (S3) — مطلوب لتفعيل الرفع:**

| المتغير | ملاحظات |
|---|---|
| `S3_BUCKET` | اسم الحاوية |
| `S3_REGION` | مثال: `eu-central-1` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | **اتركهما فارغين على EC2** واستخدم IAM Role مرتبطًا بالمثيل |

لا تُقدَّم الكائنات للعالم مباشرة: يتحقق الـAPI من الصلاحية ثم يُحوّل إلى رابط
موقّع قصير العمر. لذلك يجب **حجب الوصول العام بالكامل** على الحاوية.

#### 1) إنشاء الحاوية وحجب الوصول العام

```bash
export BUCKET=orbit-market-prod
export REGION=eu-central-1

aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"

aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# تشفير افتراضي عند التخزين
aws s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

#### 2) CORS — إلزامي وإلا فشل الرفع من المتصفح

المتصفح يرفع مباشرة إلى S3 عبر `PUT`، فبدون هذا الإعداد يحجب المتصفح الطلب.
`ETag` مكشوف لأن العميل يقرؤه بعد الرفع.

```bash
aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["https://example.com", "https://www.example.com"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["content-type", "x-amz-meta-owner", "x-amz-meta-visibility"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }]
}'
```

> ترويستا `x-amz-meta-*` مطلوبتان لأن المالك ودرجة الظهور مثبّتتان داخل توقيع
> الرابط، فيرسلهما المتصفح مع الرفع.

#### 3) سياسة IAM

`HeadObject` لا يحتاج إذنًا منفصلًا — `s3:GetObject` يغطيه.

```bash
cat > s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
    "Resource": "arn:aws:s3:::$BUCKET/objects/*"
  }]
}
EOF

aws iam create-policy --policy-name OrbitMarketS3 \
  --policy-document file://s3-policy.json
```

#### 4) IAM Role وربطه بمثيل EC2 (بلا مفاتيح ثابتة)

```bash
cat > trust.json <<'EOF'
{ "Version": "2012-10-17",
  "Statement": [{ "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },
    "Action": "sts:AssumeRole" }] }
EOF

aws iam create-role --role-name OrbitMarketEC2 \
  --assume-role-policy-document file://trust.json

aws iam attach-role-policy --role-name OrbitMarketEC2 \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/OrbitMarketS3

aws iam create-instance-profile --instance-profile-name OrbitMarketEC2
aws iam add-role-to-instance-profile \
  --instance-profile-name OrbitMarketEC2 --role-name OrbitMarketEC2

aws ec2 associate-iam-instance-profile --instance-id i-XXXXXXXX \
  --iam-instance-profile Name=OrbitMarketEC2
```

بعد الربط اترك `AWS_ACCESS_KEY_ID` و`AWS_SECRET_ACCESS_KEY` **فارغين** — تلتقط
حزمة AWS الاعتمادات من الدور تلقائيًا.

#### 5) التحقق

```bash
curl -i https://example.com/api/storage/uploads/request-url  # بلا رمز ← 401
# ومن حساب بائع: 200 مع uploadURL موقّع، أو 503 إن لم تُضبط الحاوية
```

بدون `S3_BUCKET` و`S3_REGION` تُعيد نقاط الرفع **503** ويبقى باقي النظام يعمل.

**موصى بها بشدة في الإنتاج:**

| المتغير | لماذا |
|---|---|
| `NODE_ENV=production` | يُفعّل حجب `/api/seed` |
| `CORS_ORIGINS=https://example.com` | بدونها يعكس الخادم أي أصل مع credentials |

> ⚠️ **متغيرات الواجهة لا تُقرأ من `.env` في الجذر.** جذر مشروع Vite هو
> `artifacts/orbit-market`، لذا `PORT` و`BASE_PATH` و`VITE_STRIPE_PUBLISHABLE_KEY`
> يجب تصديرها في الصدفة قبل البناء (مُتحقَّق منه عمليًا):
>
> ```bash
> PORT=5175 BASE_PATH=/ VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx pnpm run build
> ```
>
> مفتاح Stripe هذا من نوع *publishable* (عام بطبيعته) ويُدمج داخل الحزمة، فلا خطر منه.

توليد مفتاح توقيع:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ لا تعِد استخدام أي مفتاح ظهر في تاريخ Git. راجع قسم المخاطر أدناه.

إنشاء الجداول (مرة واحدة، ومع كل تغيير للمخطط):

```bash
pnpm --filter @workspace/db run push
```

---

## 4. أول تشغيل

```bash
pnpm install --frozen-lockfile
PORT=5175 BASE_PATH=/ pnpm run build

mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup          # نفّذ الأمر الذي يطبعه ليبقى بعد إعادة التشغيل
```

> `PORT=5175` أعلاه خاص ببناء Vite فقط؛ الـ API يقرأ `PORT` من `.env` عند التشغيل.

ثم Nginx:

```bash
sudo cp deploy/nginx.conf.sample /etc/nginx/sites-available/global-bazaar
sudo nano /etc/nginx/sites-available/global-bazaar     # عدّل النطاق و root
sudo ln -s /etc/nginx/sites-available/global-bazaar /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo snap install --classic certbot
sudo certbot --nginx -d example.com -d www.example.com
```

التحقق:

```bash
curl -i https://example.com/api/healthz     # {"status":"ok"}
curl -I https://example.com/                # 200 + text/html
```

---

## 5. النشر الآلي (GitHub Actions)

يُعرَّف سير العمل في [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml):

| المرحلة | يعمل على |
|---|---|
| Install → Typecheck → Build → Artifact Verification | كل push وPR |
| Deploy → Restart → Health Check | `main` فقط، وعند ضبط الأسرار |

**الأسرار المطلوبة** (Settings → Secrets and variables → Actions):

| السر | مثال |
|---|---|
| `EC2_HOST` | `13.51.x.x` |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | محتوى المفتاح الخاص كاملًا (`-----BEGIN ... KEY-----`) |
| `EC2_APP_DIR` | `/home/ubuntu/global-bazaar` |
| `HEALTH_URL` | `https://example.com/api/healthz` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | اختياري — `pk_live_...` (مفتاح عام يُدمج وقت البناء) |

إن لم يُضبط `EC2_HOST` يتخطى سير العمل النشر ويبقى أخضر — فالبناء والفحص يعملان من اليوم الأول.

**آلية النشر:** يتصل عبر SSH، يجلب الـ commit المحدد، يثبت من ملف القفل، يبني،
ثم `pm2 reload` (بلا توقف)، ثم فحص صحة بعشر محاولات. أي فشل يوقف العملية.

---

## 6. التشغيل اليومي

```bash
pm2 status
pm2 logs global-bazaar-api --lines 100
pm2 reload ecosystem.config.cjs      # إعادة تحميل بلا توقف
pm2 monit
```

- سجلات التطبيق: `logs/api-out.log` و`logs/api-error.log` (بصيغة JSON من pino)
- سجلات Nginx: `/var/log/nginx/global-bazaar.*.log`
- تدوير السجلات: `pm2 install pm2-logrotate`

**الإيقاف الرشيق:** التطبيق يلتقط `SIGTERM`/`SIGINT`، يتوقف عن قبول اتصالات جديدة،
ينهي الطلبات الجارية، ثم يخرج (بحدٍ أقصى 10 ثوانٍ). `kill_timeout` في PM2 مضبوط على
12 ثانية ليتسع لذلك — لا تُنقصه.

**التراجع (Rollback):**

```bash
cd /home/ubuntu/global-bazaar
git checkout --force <commit-سابق>
pnpm install --frozen-lockfile
PORT=5175 BASE_PATH=/ pnpm run build
pm2 reload ecosystem.config.cjs
```

---

## 7. ملاحظات أمنية قبل الإطلاق

1. **`JWT_SECRET`**: ظهر مفتاح حقيقي سابقًا في تاريخ Git، والمستودع عام. استخدم
   قيمة جديدة تمامًا في الإنتاج ولا تعِد استخدام القديمة أبدًا.
2. **`/api/seed`**: محجوبة تلقائيًا عندما `NODE_ENV=production`. لا تُفعّل `ALLOW_SEED`
   على خادم عام — فهي تُنشئ حساب مدير بكلمة مرور معروفة.
3. **`CORS_ORIGINS`**: اضبطها على نطاقك؛ تركها فارغة يعكس أي أصل مع الاعتماديات.
4. **مجموعات أمان EC2**: افتح 80 و443 فقط للعالم. أبقِ 22 مقصورًا على عنوانك،
   و5432 مغلقًا تمامًا إن كانت قاعدة البيانات محلية.
5. **مخطط قاعدة البيانات**: يُطبَّق عبر `drizzle-kit push` بلا ملفات ترحيل — لا يوجد
   تراجع تلقائي. خُذ نسخة احتياطية قبل أي تغيير للمخطط:
   `pg_dump -U bazaar global_bazaar > backup-$(date +%F).sql`

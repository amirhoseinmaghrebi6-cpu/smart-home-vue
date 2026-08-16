# 🔴 اقدام امنیتی فوری - چرخش رمزها و پاکسازی تاریخچه Git

## خلاصه وضعیت
✅ **انجام‌شده در این شاخه:**
- حذف فایل‌های `.env` از ردیابی Git
- تغییر `docker-compose.yml` به استفاده از `env_file`
- افزودن فایل‌های نمونه `docker-compose.env.example` و `backend/.env.example`
- به‌روزرسانی `.gitignore`

❌ **نیاز به اقدام دستی شما:**
1. Push کردن تغییرات به گیت‌هاب
2. پاکسازی تاریخچه Git (حذف رمزها از کامیت‌های قبلی)
3. چرخش فوری تمام رمزها و کلیدهای امنیتی

---

## 📍 مرحله ۱: Push تغییرات به گیت‌هاب

در ترمینال سیستم خود اجرا کنید:

```bash
cd /path/to/smart-home-vue
git checkout qwen-code-4ad60f72-3a55-49b0-b35a-f40ee8242cb7
git push origin qwen-code-4ad60f72-3a55-49b0-b35a-f40ee8242cb7
```

اگر خطای احراز هویت دیدید، از GitHub Token استفاده کنید:
```bash
git remote set-url origin https://YOUR_USERNAME:YOUR_TOKEN@github.com/amirhoseinmaghrebi6-cpu/smart-home-vue.git
git push origin qwen-code-4ad60f72-3a55-49b0-b35a-f40ee8242cb7
```

سپس در گیت‌هاب یک **Pull Request** از این شاخه به `main` باز کنید.

---

## 📍 مرحله ۲: پاکسازی تاریخچه Git (حیاتی)

### روش پیشنهادی: استفاده از `git-filter-repo`

```bash
# کلون کردن مخزن به صورت mirror
git clone --mirror https://github.com/amirhoseinmaghrebi6-cpu/smart-home-vue.git
cd smart-home-vue.git

# نصب git-filter-repo (اگر ندارید)
# Ubuntu/Debian:
sudo apt install git-filter-repo
# macOS:
brew install git-filter-repo

# حذف فایل‌های محرمانه از تمام تاریخچه
git filter-repo --invert-paths \
  --path .env \
  --path .env.development \
  --path .env.production \
  --path backend/.env \
  --path docker-compose.env \
  --force

# پاکسازی کامل
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push به گیت‌هاب
git push --force --all
git push --force --tags
```

### روش جایگزین: استفاده از BFG Repo-Cleaner

```bash
# دانلود BFG از https://repo.maven.apache.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
java -jar bfg-1.14.0.jar --delete-files '.env' --delete-files 'docker-compose.env' smart-home-vue.git
cd smart-home-vue.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

### ⚠️ هشدار مهم پس از Force Push:
به همه همکاران اطلاع دهید:
```
🔴 توجه: تاریخچه Git بازنویسی شد.
لطفاً کلون محلی خود را پاک کرده و دوباره clone کنید:

rm -rf smart-home-vue
git clone https://github.com/amirhoseinmaghrebi6-cpu/smart-home-vue.git
```

---

## 📍 مرحله ۳: چرخش فوری رمزها (بسیار حیاتی)

### ۳.۱ تولید رمزهای جدید قوی

```bash
# JWT Secret (حداقل ۶۴ کاراکتر)
openssl rand -hex 32

# PostgreSQL Password
openssl rand -base64 32

# Redis Password
openssl rand -base64 24

# InfluxDB Token
openssl rand -hex 32

# MQTT Password
openssl rand -base64 24

# Grafana Admin Password
openssl rand -base64 20
```

### ۳.۲ ساخت فایل docker-compose.env روی سرور

روی سرور تولیدی خود:

```bash
cd /path/to/smart-home-vue
cp docker-compose.env.example docker-compose.env
nano docker-compose.env
```

مقادیر زیر را با رمزهای جدید جایگزین کنید:

```ini
# PostgreSQL Database
POSTGRES_DB=smart_home
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<رمز_جدید_PostgreSQL>

# InfluxDB
DOCKER_INFLUXDB_INIT_PASSWORD=<رمز_جدید_InfluxDB>
INFLUXDB_TOKEN=<توکن_جدید_InfluxDB_64_کاراکتری>

# Redis
REDIS_PASSWORD=<رمز_جدید_Redis>

# MQTT Broker
MQTT_USER=smart_home_user
MQTT_PASSWORD=<رمز_جدید_MQTT>

# JWT Secret (حداقل ۳۲ کاراکتر)
JWT_SECRET=<رمز_جدید_JWT>

# Frontend URL
FRONTEND_URL=https://your-domain.com

# Grafana Admin Password
GF_SECURITY_ADMIN_PASSWORD=<رمز_جدید_Grafana>
```

### ۳.۳ ساخت فایل backend/.env روی سرور

```bash
cd /path/to/smart-home-vue/backend
cp .env.example .env
nano .env
```

مقادیر را با رمزهای جدید پر کنید.

### ۳.۴ ری‌استارت سرویس‌ها

```bash
docker-compose down
docker-compose up -d
```

### ۳.۵ تغییر رمز PostgreSQL در دیتابیس

اگر دیتابیس قبلاً با رمز قدیمی کار می‌کرده:

```sql
-- وارد PostgreSQL شوید
docker exec -it smart-home-postgres psql -U postgres

-- تغییر رمز کاربر postgres
ALTER USER postgres WITH PASSWORD '<رمز_جدید>';
\q
```

سپس `docker-compose.env` را آپدیت و ری‌استارت کنید.

### ۳.۶ تغییر رمز Redis

```bash
docker exec -it smart-home-redis redis-cli
AUTH <رمز_قدیمی>
CONFIG SET requirepass <رمز_جدید>
```

یا بهتر است container Redis را حذف و مجدد بسازید.

### ۳.۷ تغییر رمز Grafana

وارد Grafana شوید (http://your-server:3001):
- Username: `admin`
- Password: رمز قدیمی یا `admin`
- به پروفایل بروید و رمز را تغییر دهید

---

## 📍 مرحله ۴: تأیید نهایی

### ۴.۱ بررسی کنید که فایل‌های محرمانه در گیت‌هاب نیستند

به آدرس زیر بروید و بررسی کنید:
```
https://github.com/amirhoseinmaghrebi6-cpu/smart-home-vue/tree/qwen-code-4ad60f72-3a55-49b0-b35a-f40ee8242cb7
```

فایل‌های زیر **نباید** وجود داشته باشند:
- ❌ `.env`
- ❌ `.env.development`
- ❌ `.env.production`
- ❌ `backend/.env`
- ❌ `docker-compose.env`

فایل‌های زیر **باید** وجود داشته باشند:
- ✅ `.env.example`
- ✅ `backend/.env.example`
- ✅ `docker-compose.env.example`

### ۴.۲ بررسی تاریخچه Git

```bash
git log --all --full-history -- .env
git log --all --full-history -- backend/.env
```

اگر خروجی داشت، یعنی هنوز رمزها در تاریخچه هستند و باید مرحله ۲ را انجام دهید.

### ۴.۳ تست استقرار

```bash
docker-compose config  # بررسی صحت پیکربندی
docker-compose up -d   # استقرار
docker-compose ps      # بررسی وضعیت سرویس‌ها
docker-compose logs    # بررسی لاگ‌ها
```

---

## 📍 مرحله ۵: اقدامات امنیتی تکمیلی

### ۵.۱ فعال‌سازی Dependabot

فایل `.github/dependabot.yml` را بسازید:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
```

### ۵.۲ افزودن GitHub Actions برای امنیت

فایل `.github/workflows/security-scan.yml`:

```yaml
name: Security Scan

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci
      
      - name: Run npm audit
        run: |
          cd backend && npm audit --audit-level=high
          cd ../frontend && npm audit --audit-level=high
```

### ۵.۳ تنظیم Secret Scanning در گیت‌هاب

به آدرس زیر بروید و Secret Scanning را فعال کنید:
```
https://github.com/amirhoseinmaghrebi6-cpu/smart-home-vue/settings/security_analysis
```

---

## 📞 پشتیبانی

اگر سوالی دارید یا نیاز به کمک دارید:
1. مستندات رسمی Docker: https://docs.docker.com/compose/env-file/
2. راهنمای Git Filter-Repo: https://htmlpreview.github.io/?https://github.com/newren/git-filter-repo/blob/docs/html/git-filter-repo.html
3. OWASP Security Guidelines: https://owasp.org/www-project-top-ten/

---

## ✅ چک‌لیست نهایی

- [ ] Push تغییرات به گیت‌هاب
- [ ] پاکسازی تاریخچه Git با git-filter-repo یا BFG
- [ ] تولید رمزهای جدید با openssl
- [ ] ساخت docker-compose.env روی سرور
- [ ] ساخت backend/.env روی سرور
- [ ] تغییر رمز PostgreSQL
- [ ] تغییر رمز Redis
- [ ] تغییر رمز InfluxDB
- [ ] تغییر رمز MQTT
- [ ] تغییر رمز Grafana
- [ ] تغییر JWT_SECRET
- [ ] ری‌استارت تمام سرویس‌ها
- [ ] تست سلامت سرویس‌ها
- [ ] بررسی عدم وجود رمزها در گیت‌هاب
- [ ] اطلاع به همکاران برای re-clone
- [ ] فعال‌سازی Dependabot
- [ ] فعال‌سازی GitHub Actions Security Scan
- [ ] فعال‌سازی Secret Scanning در گیت‌هاب

---

**تاریخ ایجاد:** 2025-01-XX  
**وضعیت:** نیاز به اقدام فوری  
**سطح خطر:** 🔴 بحرانی

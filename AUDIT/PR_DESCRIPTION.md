# PR: Audit/security: remove tracked node_modules and env files; baseline scan & tests

## Summary
این PR تغییرات محافظه‌کارانه‌ای را برای بهبود امنیت و کاهش اندازه مخزن اعمال می‌کند:
- بروزرسانی `.gitignore` برای نادیده گرفتن `node_modules` و فایل‌های `.env`.
- پاک‌سازی مستندات `ReadMe.txt` برای حذف credentialهای درج‌شده.
- جایگزینی محتویات `.env` در شاخهٔ audit با placeholder (بدون مقادیر محرمانه).

> توجه: حذف کامل فایل‌های پرحجم (مثل `backend/node_modules`) از تاریخچهٔ گیت نیاز به بازنویسی تاریخچه دارد؛ این PR عملیات محافظه‌کارانه را انجام می‌دهد (اضافه/ویرایش فایل‌ها در شاخهٔ جدید). برای حذف tracked شدن محلیِ `node_modules` و فایل‌های `.env` باید دستورات محلی زیر اجرا شوند یا یک commit حذف توسط کاربر انجام شود.

## Root Causes
- `node_modules` و فایل‌های `.env` به‌صورت ناخواسته کمیت شده‌اند.
- مستندات شامل credential نمونه واقعی بودند و باید با placeholder جایگزین می‌شدند.

## Changes in this branch
- `.gitignore` — اضافه شدن rules برای `node_modules` و `.env`.
- `ReadMe.txt` — پاک‌سازی از credentialها و افزودن راهنمای امن‌سازی.
- `.env` — جایگزینی با placeholder در شاخهٔ audit.
- `AUDIT/PR_DESCRIPTION.md` — این فایل (شرح PR و دستورات ادامه کار).

## Required local steps (run on your machine) — حذف tracked files بدون بازنویسی تاریخچه
روی ماشین محلی که repo را clone کرده‌اید، مراحل زیر را اجرا کنید:

```bash
# دریافت شاخهٔ audit
git fetch origin
git checkout -b codex/comprehensive-project-audit origin/codex/comprehensive-project-audit

# حذف از index (tracked) ولی نگه داشتن فایل‌ها روی دیسک
git rm -r --cached backend/node_modules || true
git rm -r --cached node_modules || true
git rm --cached .env .env.development .env.production || true

# اضافه کردن تغییرات (شامل .gitignore که پیش‌تر تغییر کرده)
git add .gitignore ReadMe.txt .env || true

git commit -m "chore(security): remove tracked node_modules and env files; sanitize docs"

git push origin codex/comprehensive-project-audit
```

پس از اجرای دستورات بالا، شما می‌توانید از طریق وب یا CLI یک Pull Request از `codex/comprehensive-project-audit` به `main` ایجاد کنید.

## Recommended scans and immediate actions
1. فوراً credentialهای احتمالی را rotate کنید (DB، MQTT، دیگر توکن‌ها).
2. اجرای یک اسکن اسرار در مخزن (local یا CI):
   - با gitleaks:
     ```bash
     gitleaks detect -s . --report-path gitleaks-report.json
     ```
3. در صورت نیاز به حذف دائمی از تاریخچهٔ گیت، از `git filter-repo` یا `BFG Repo-Cleaner` استفاده کنید (نیاز به هماهنگی تیمی دارد).

## Baseline build (locally / with Docker)
برای گرفتن baseline از build و تست‌ها:

```bash
# اگر Docker دارید:
cp docker-compose.env.example .env  # پر کردن مقادیر محلی در .env (هرگز commit نکنید)
docker compose up --build

# یا اجرای محلی:
# فرانت‌اند
npm ci
npm run dev
# بک‌اند
cd backend
npm ci
npm run dev
```

## Remaining issues
- پاک‌سازی کامل تاریخچهٔ git (در صورت تمایل) — نیاز به تصمیم تیمی.
- بررسی‌های کامل با اسکنرهای امنیتی و اصلاحات بیشتر بر اساس یافته‌ها.

## Risk Assessment
تغییرات انجام‌شده محافظه‌کارانه و غیر مخرب هستند؛ بزرگ‌ترین ریسک عدم rotate credentialها پس از افشا است که باید فوراً انجام شود.

---


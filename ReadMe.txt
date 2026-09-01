برای بارگذاری خودکار روی گیت‌هاب

# راهنمای سریع حذف node_modules از مخزن (و نگهداری محلی)

```bash
# حذف از شاخص گیت (فایل‌ها روی دیسک می‌مانند)
git rm -r --cached node_modules || true
git rm -r --cached backend/node_modules || true
# اطمینان از وجود قواعد در .gitignore
# سپس commit و push
git add .gitignore
git commit -m "chore: remove tracked node_modules and ignore them"
git push origin codex/comprehensive-project-audit
```

نمونهٔ داده‌های کاربری و رمز عبور که قبلاً در این فایل قرار داشتند، به دلایل امنیتی حذف شده‌اند. لطفاً از فایل‌های .env.example یا docker-compose.env.example برای پر کردن مقادیر محیطی استفاده کنید.

راهنمای راه‌اندازی کامل پروژه (خلاصه)

🔹 قدم ۱: روشن کردن دیتابیس (PostgreSQL)
1. از pgAdmin یا ابزار دلخواه خود برای اتصال به دیتابیس استفاده کنید.
2. مقادیر اتصال را از فایل‌های مثال (.env.example یا docker-compose.env.example) بگیرید و در یک فایل .env محلی قرار دهید (هرگز آن را به مخزن کمیت نکنید).

🔹 قدم ۲: روشن کردن بروکر MQTT (Mosquitto)
1. نصب و اجرای Mosquitto یا سرویس مشابه.
2. مقادیر HOST/PORT/USERNAME/PASSWORD را در .env محلی قرار دهید.

🔹 قدم ۳: روشن کردن بک‌اند (Node.js)
```
cd backend
npm ci
npm run dev
```

🔹 قدم ۴: روشن کردن فرانت‌اند (Vue + Vite)
```
# در ریشهٔ پروژه یا پوشهٔ فرانت‌اند
npm ci
npm run dev
# فرانت‌اند معمولاً در http://localhost:5173 در دسترس است
```

🔹 قدم ۵: تست نهایی
- از یک پنجرهٔ ناشناس مرورگر استفاده کنید.
- آدرس سرویس فرانت‌اند را باز کنید و با حساب تستی که به‌صورت محلی ایجاد کرده‌اید لاگین کنید.

تذکر امنیتی مهم:
- اگر هر credential یا رمز عبوری در این مخزن (در commitها یا فایل‌ها) افشا شده است، فوراً آن‌ها را ریست/تعویض کنید (DB، حساب‌های MQTT، توکن‌ها). این مخزن هنوز شامل تاریخچهٔ commit است که ممکن است مقادیر محرمانه را نگه دارد.

برای اطلاعات بیشتر به فایل SECURITY_FIXES.md و DOCUMENTATION مراجعه کنید.

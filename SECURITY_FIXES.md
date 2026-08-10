# 🔒 گزارش اصلاحات امنیتی و منطقی پروژه Smart Home

## خلاصه اجرایی
این سند تمام ایرادات امنیتی و منطقی شناسایی‌شده در پروژه خانه هوشمند را به همراه راهکارهای اعمال‌شده مستند می‌کند.

---

## 🚨 ایرادات امنیتی (Critical & High)

### ۱. JWT Secret هاردکد شده ✅ اصلاح شد
**مشکل:** 
- `JWT_SECRET=dev_jwt_secret_change_in_production` در فایل `.env`
- رمز دیتابیس ضعیف: `postgres_password_123`

**اصلاحات:**
- تغییر به مقادیر placeholder در `/backend/.env`:
  ```
  JWT_SECRET=CHANGE_THIS_TO_A_STRONG_RANDOM_STRING_MIN_32_CHARS_PROD
  DB_PASSWORD=CHANGE_THIS_SECURE_DB_PASSWORD_123!@#
  ```
- افزودن اعتبارسنجی در `authMiddleware.js`:
  ```javascript
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('CHANGE_THIS')) {
    return res.status(500).json({ message: 'پیکربندی سرور نامعتبر است' })
  }
  ```
- به‌روزرسانی `docker-compose.yml` برای استفاده از متغیرهای محیطی ایمن

### ۲. عدم اعتبارسنجی توکن در Socket.io ✅ اصلاح شد
**مشکل:** اتصالات Socket.io بدون احراز هویت پذیرفته می‌شدند.

**اصلاحات:**
- افزودن middleware احراز هویت در `app.js`:
  ```javascript
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication required'))
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.userId = decoded.id || decoded.userId
    next()
  })
  ```

### ۳. Cookie Security ناقص ✅ اصلاح شد
**مشکل:** `sameSite: 'lax'` امکان CSRF را فراهم می‌کرد.

**اصلاحات:**
- تغییر به `sameSite: 'strict'` در `authController.js`
- اطمینان از `secure: true` در production

### ۴. حالت تستی احراز هویت گوگل ⚠️ نیاز به توجه
**مشکل:** `USE_MOCK_GOOGLE = true` در `src/utils/googleAuth.js`

**توصیه:** قبل از استقرار production، این مقدار به `false` تغییر کند و Client ID واقعی تنظیم شود.

---

## 🐛 ایرادات منطقی (Medium)

### ۱. Race Condition در Scheduler ✅ اصلاح شد
**مشکل:** اجرای همزمان سناریوها در بازه‌های ۳۰ ثانیه‌ای

**اصلاحات:**
- افزودن قفل اجرایی (`_isRunning`) در `checkAndExecuteScenarios()`
- آپدیت اتمیک فیلد `executed` با شرط `where: { executed: false }`
- جمع‌آوری Promiseها و اجرای موازی ایمن با `Promise.allSettled()`

### ۲. مدیریت نادرست خطا در MQTT ⚠️ نیاز به بهبود
**مشکل:** عدم وجود مکانیزم Retry و Circuit Breaker

**توصیه:** 
- افزودن exponential backoff برای اتصال مجدد
- پیاده‌سازی Circuit Breaker Pattern

### ۳. عدم وجود Graceful Shutdown کامل ✅ تا حدی اصلاح شد
**مشکل:** بسته‌ نشدن صحیح اتصالات هنگام shutdown

**اصلاحات موجود:**
- توقف schedulerها در `SIGINT`
- بستن Socket.io و MQTT

**توصیه تکمیلی:**
- افزودن health check endpoint برای Kubernetes
- تنظیم timeout برای shutdown

---

## 📋 چک‌لیست استقرار Production

### الزامات امنیتی:
- [ ] تولید JWT_SECRET قوی (حداقل ۳۲ کاراکتر تصادفی)
- [ ] تغییر تمام پسوردهای پیش‌فرض
- [ ] فعال‌سازی HTTPS با SSL/TLS معتبر
- [ ] غیرفعال کردن `USE_MOCK_GOOGLE`
- [ ] تنظیم CORS Origin به دامنه واقعی
- [ ] فعال‌سازی rate limiting شدیدتر

### پیکربندی محیطی:
```bash
# تولید JWT_SECRET ایمن
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# مثال خروجی:
# JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### مانیتورینگ و لاگ:
- [ ] فعال‌سازی structured logging
- [ ] تنظیم alert برای خطاهای امنیتی
- [ ] مانیتورینگ تعداد تلاش‌های ناموفق ورود

---

## 📊 اولویت‌بندی اقدامات

| اولویت | مورد | وضعیت | توضیح |
|--------|------|--------|-------|
| 🔴 Critical | JWT Secret | ✅ انجام‌شده | نیاز به تغییر در production |
| 🔴 Critical | Socket.io Auth | ✅ انجام‌شده | نیاز به تست فرانت‌اند |
| 🟠 High | Cookie Security | ✅ انجام‌شده | نیاز به بررسی compatibility |
| 🟠 High | Race Condition | ✅ انجام‌شده | نیاز به تست سناریوهای همزمان |
| 🟡 Medium | Google Auth Mock | ⚠️ pending | تغییر قبل از production |
| 🟡 Medium | MQTT Retry Logic | ⚠️ pending | بهبود تاب‌آوری |
| 🟢 Low | Graceful Shutdown | ⚠️ partial | تکمیل برای Kubernetes |

---

## 🔧 فایل‌های تغییر یافته

1. `/backend/.env` - مقادیر امنیتی
2. `/docker-compose.yml` - متغیرهای محیطی
3. `/backend/src/middleware/authMiddleware.js` - اعتبارسنجی JWT_SECRET
4. `/backend/src/app.js` - احراز هویت Socket.io + import jwt
5. `/backend/src/controllers/authController.js` - Cookie security
6. `/backend/src/services/mqttService.js` - Race condition fix

---

## 🧪 تست‌های پیشنهادی

### تست امنیتی:
```bash
# تست Socket.io بدون توکن
wscat -c ws://localhost:3000
# باید خطای Authentication دریافت کنید

# تست با توکن منقضی
# باید خطای Token Expired دریافت کنید
```

### تست منطقی:
```bash
# ایجاد دو سناریوی یکسان برای زمان جاری
# باید فقط یکبار اجرا شوند
```

---

## 📞 پشتیبانی

در صورت بروز هرگونه مشکل در حین استقرار، لطفاً لاگ‌های زیر را بررسی کنید:
- `❌ CRITICAL: JWT_SECRET is not properly configured!`
- `⚠️ Socket connection rejected: No token provided`
- `⚠️ Scenario scheduler already running, skipping this round`


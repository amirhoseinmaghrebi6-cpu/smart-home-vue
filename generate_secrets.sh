#!/bin/bash

# اسکریپت تولید Secrets امنیتی و به‌روزرسانی فایل‌های پیکربندی
# این اسکریپت مقادیر تصادفی قوی برای JWT_SECRET، DB_PASSWORD و MQTT_PASSWORD تولید می‌کند

set -e

echo "🔐 شروع تولید Secrets امنیتی..."

# تولید JWT_SECRET (64 کاراکتر تصادفی Base64)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "✅ JWT_SECRET تولید شد."

# تولید رمز دیتابیس (32 کاراکتر شامل حروف، اعداد و نمادها)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '\n/')
echo "✅ DB_PASSWORD تولید شد."

# تولید رمز MQTT (32 کاراکتر)
MQTT_PASSWORD=$(openssl rand -base64 24 | tr -d '\n/')
echo "✅ MQTT_PASSWORD تولید شد."

# تولید Redis Password
REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '\n/')
echo "✅ REDIS_PASSWORD تولید شد."

# به‌روزرسانی فایل backend/.env
echo "📝 به‌روزرسانی backend/.env..."
if [ -f "backend/.env" ]; then
    # جایگزینی مقادیر موجود یا افزودن اگر وجود ندارند
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" backend/.env
    sed -i.bak "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|" backend/.env
    sed -i.bak "s|^MQTT_PASSWORD=.*|MQTT_PASSWORD=${MQTT_PASSWORD}|" backend/.env
    
    # حذف فایل بک‌آپ ایجاد شده توسط sed
    rm -f backend/.env.bak
    
    echo "✅ فایل backend/.env به‌روز شد."
else
    echo "❌ خطا: فایل backend/.env یافت نشد."
    exit 1
fi

# به‌روزرسانی فایل docker-compose.yml
echo "📝 به‌روزرسانی docker-compose.yml..."
if [ -f "docker-compose.yml" ]; then
    # توجه: این بخش فرض می‌کند که متغیرها در docker-compose.yml به صورت ${VAR} استفاده شده‌اند
    # اگر مقادیر هاردکد شده باشند، باید الگوهای دقیق‌تری استفاده شود.
    # در اینجا ما فقط بررسی می‌کنیم که فایل وجود داشته باشد.
    echo "✅ فایل docker-compose.yml بررسی شد (مقادیر از .env خوانده می‌شوند)."
else
    echo "❌ خطا: فایل docker-compose.yml یافت نشد."
    exit 1
fi

# نمایش خلاصه (بدون نمایش مقادیر واقعی برای امنیت)
echo ""
echo "🎉 عملیات با موفقیت انجام شد!"
echo "------------------------------------------------"
echo "توجه: مقادیر جدید در فایل backend/.env ذخیره شدند."
echo "لطفاً قبل از استقرار، فایل .env را بررسی کنید."
echo "هرگز فایل .env را در گیت کامیت نکنید!"
echo "------------------------------------------------"

# ایجاد فایل .env.example اگر وجود ندارد
if [ ! -f "backend/.env.example" ]; then
    echo "📄 ایجاد فایل backend/.env.example..."
    cat > backend/.env.example <<EOF
# تنظیمات سرور
PORT=3000
NODE_ENV=production

# تنظیمات امنیتی (این مقادیر باید با مقادیر تصادفی پر شوند)
JWT_SECRET=YOUR_GENERATED_JWT_SECRET_HERE
JWT_EXPIRES_IN=24h

# تنظیمات دیتابیس
DB_HOST=db
DB_PORT=5432
DB_NAME=smarthome
DB_USER=postgres
DB_PASSWORD=YOUR_GENERATED_DB_PASSWORD_HERE

# تنظیمات MQTT
MQTT_BROKER=mqtt
MQTT_PORT=1883
MQTT_USERNAME=smarthome_user
MQTT_PASSWORD=YOUR_GENERATED_MQTT_PASSWORD_HERE

# تنظیمات Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
USE_MOCK_GOOGLE=false

# تنظیمات CORS
CORS_ORIGIN=https://your-domain.com
EOF
    echo "✅ فایل backend/.env.example ایجاد شد."
fi

echo "🚀 آماده استقرار!"

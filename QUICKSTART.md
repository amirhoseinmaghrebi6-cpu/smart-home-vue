# Smart Home - Production Deployment Quick Start

## 🚀 سریع‌ترین راه برای اجرا روی سرور HP شما

### پیش‌نیازها
- دامنه `m2smart.ir` به IP سرور شما اشاره کند
- سرور Ubuntu/Debian با دسترسی root
- پورت‌های 80 و 443 باز باشند

---

## مرحله ۱: نصب Docker (۵ دقیقه)

```bash
# آپدیت سیستم
sudo apt update && sudo apt upgrade -y

# نصب Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# نصب Docker Compose
sudo apt install docker-compose-plugin -y

# خروج و ورود مجدد
exit
```

---

## مرحله ۲: دریافت گواهی SSL (۳ دقیقه)

```bash
# نصب Certbot
sudo apt install certbot -y

# دریافت گواهی (پورت 80 باید آزاد باشد)
sudo certbot certonly --standalone \
  -d m2smart.ir \
  -d www.m2smart.ir \
  --email your-email@example.com \
  --agree-tos
```

📍 گواهی در `/etc/letsencrypt/live/m2smart.ir/` ذخیره می‌شود

---

## مرحله ۳: تنظیم پسوردها (۲ دقیقه)

```bash
cd ~/smart-home  # یا مسیری که پروژه را clone کردید

# کپی فایل محیطی
cp .env.example .env

# تولید پسوردهای امن
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)" >> .env
echo "REDIS_PASSWORD=$(openssl rand -base64 32)" >> .env
echo "JWT_SECRET=$(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")" >> .env
echo "MQTT_INTERNAL_PASS=$(openssl rand -base64 32)" >> .env

# ویرایش دستی بقیه مقادیر
nano .env
```

**مقادیر مهم برای تغییر در `.env`:**
```bash
DOMAIN=m2smart.ir
GF_SECURITY_ADMIN_PASSWORD=your_grafana_password
PORTAINER_ADMIN_PASSWORD_HASH=your_portainer_hash
```

---

## مرحله ۴: تنظیم Mosquitto (۱ دقیقه)

```bash
# تولید پسورد MQTT
docker run --rm eclipse-mosquitto:2 \
  mosquitto_passwd -b /tmp/passwd backend_service YOUR_MQTT_PASSWORD

# کپی هش تولید شده به فایل کانفیگ
nano mosquitto/config/mosquitto.conf
```

در فایل بالا، `CHANGE_ME_MQTT_INTERNAL_PASS` را با پسورد واقعی عوض کنید.

---

## مرحله ۵: اجرا (۳ دقیقه)

```bash
# ساخت کانتینرها
docker compose build

# اجرای تمام سرویس‌ها
docker compose up -d

# بررسی وضعیت
docker compose ps

# مشاهده لاگ‌ها
docker compose logs -f
```

✅ اگر همه سرویس‌ها `healthy` هستند، موفق بودید!

---

## 🔗 دسترسی به سرویس‌ها

| سرویس | آدرس | نام کاربری | رمز عبور |
|-------|------|-----------|---------|
| **Smart Home** | https://m2smart.ir | test@smarthome.ir | (از قبل ساخته شده) |
| **Grafana** | https://m2smart.ir/grafana | admin | (از .env) |
| **Portainer** | https://m2smart.ir/portainer | admin | (از .env) |
| **Prometheus** | https://m2smart.ir/prometheus | - | - |

---

## ✅ تست سلامت سیستم

```bash
# تست HTTPS
curl -I https://m2smart.ir

# تست API
curl -k https://m2smart.ir/api/health

# بررسی پورت‌های باز (فقط 80 و 443 باید باز باشند)
sudo netstat -tulpn | grep LISTEN
```

---

## 🔐 فایروال (اختیاری ولی توصیه می‌شود)

```bash
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw status verbose
```

---

## 🆘 مشکل‌دارد؟

### کانتینر بالا نمی‌آید
```bash
docker compose logs <service-name>
```

### خطای SSL
```bash
# بررسی گواهی
sudo certbot certificates

# تمدید اجباری
sudo certbot renew --force-renewal
```

### دیتابیس وصل نمی‌شود
```bash
# ریست دیتابیس (تمام داده‌ها پاک می‌شوند!)
docker compose down -v postgres_data
docker compose up -d postgres
```

---

## 📦 Backup گیری

```bash
# Backup از دیتابیس
docker compose exec postgres \
  pg_dump -U smarthome_admin smarthome_db > backup.sql

# Backup از ولوم‌ها
tar -czvf backup.tar.gz postgres_data redis_data grafana_data
```

---

## ➡️ مرحله بعد

بعد از اطمینان از اجرای صحیح:

1. ✅ پسوردهای پیش‌فرض را عوض کنید
2. ✅ فایروال را فعال کنید
3. ✅ مانیتورینگ Grafana را تنظیم کنید
4. ✅ دستگاه‌های ESP32 را جفت کنید

**فایل کامل راهنما:** `DEPLOYMENT.md`  
**چک‌لیست امنیت:** `SECURITY_PHASE0.md`

---

## 📞 پشتیبانی

برای گزارش مشکل یا سؤال:
- Issue در GitHub باز کنید
- لاگ‌ها را ضمیمه کنید: `docker compose logs > logs.txt`

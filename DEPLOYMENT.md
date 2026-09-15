# Smart Home Production Deployment Guide
# Domain: m2smart.ir

## Prerequisites

1. **Server Requirements:**
   - Ubuntu Server 20.04+ or Debian 11+
   - Minimum 4GB RAM (8GB recommended)
   - 2 CPU cores (4+ recommended)
   - 50GB+ SSD storage
   - Static IP address

2. **Domain Setup:**
   - Point `m2smart.ir` and `www.m2smart.ir` to your server IP
   - Ensure ports 80 and 443 are open in firewall

## Step 1: Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose v2
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version

# Logout and login again for group changes
```

## Step 2: Clone Project & Setup Environment

```bash
# Clone repository
cd ~
git clone <your-repo-url> smart-home
cd smart-home

# Create .env file from example
cp .env.example .env

# IMPORTANT: Edit .env and change ALL passwords!
nano .env
```

### Critical Environment Variables to Change:

- `POSTGRES_PASSWORD` - Use strong password (20+ chars)
- `REDIS_PASSWORD` - Use strong password
- `JWT_SECRET` - Generate random string (min 32 chars)
- `MQTT_INTERNAL_PASS` - Use strong password
- `MOSQUITTO_PASSWORD` - Use strong password
- `GF_SECURITY_ADMIN_PASSWORD` - Grafana admin password
- `DOMAIN` - Should be `m2smart.ir`

Generate secure passwords:
```bash
# Generate random password
openssl rand -base64 32

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3: Obtain SSL Certificate (Let's Encrypt)

### Option A: Using Certbot on Host (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Stop nginx container temporarily (port 80 conflict)
docker compose stop frontend

# Get certificate
sudo certbot certonly --standalone -d m2smart.ir -d www.m2smart.ir

# Follow prompts, enter email for renewal notifications

# Restart containers
docker compose start frontend
```

Certificate location: `/etc/letsencrypt/live/m2smart.ir/`

### Option B: Manual Certificate Placement

If you already have certificates:
```bash
sudo mkdir -p /workspace/ssl/certs
sudo cp /path/to/fullchain.pem ./ssl/certs/
sudo cp /path/to/privkey.pem ./ssl/certs/
sudo chown -R 101:101 ./ssl/certs  # nginx user ID
```

## Step 4: Configure Mosquitto Passwords

```bash
# Generate MQTT password hash
docker run --rm eclipse-mosquitto:2 mosquitto_passwd -b /tmp/passwd backend_service YOUR_PASSWORD

# Or use online generator and paste hash into mosquitto/config/mosquitto.conf
```

Update `mosquitto/config/mosquitto.conf`:
```
# Replace CHANGE_ME_MQTT_INTERNAL_PASS with actual password
# Replace CHANGE_ME_MQTT_ADMIN_PASS with actual password
```

## Step 5: Build and Deploy

```bash
# Build all containers
docker compose build

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

## Step 6: Verify Deployment

### Check Services Health

```bash
# All containers should be "healthy"
docker compose ps

# Test HTTPS
curl -I https://m2smart.ir

# Test API health
curl -k https://m2smart.ir/api/health

# Test WebSocket
# Open browser: wss://m2smart.ir
```

### Access Services

- **Frontend:** https://m2smart.ir
- **Grafana:** https://m2smart.ir/grafana (admin / your_password)
- **Portainer:** https://m2smart.ir/portainer
- **Prometheus:** https://m2smart.ir/prometheus

## Step 7: Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block direct access to internal services
sudo ufw deny 3000/tcp
sudo ufw deny 5432/tcp
sudo ufw deny 6379/tcp
sudo ufw deny 9090/tcp
sudo ufw deny 9000/tcp

# Allow MQTT only from local network (adjust for your setup)
# sudo ufw allow from 192.168.1.0/24 to any port 1883

# Check status
sudo ufw status verbose
```

## Step 8: Automated SSL Renewal

Certbot auto-renewal is set up, but verify:

```bash
# Test renewal (dry-run)
sudo certbot renew --dry-run

# Add to crontab (usually already added by certbot)
sudo crontab -e

# Add this line if not present:
0 3 * * * /usr/bin/certbot renew --quiet
```

After renewal, reload nginx:
```bash
docker compose exec frontend nginx -s reload
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs <service-name>

# Rebuild specific service
docker compose build <service-name>
docker compose up -d <service-name>
```

### SSL Certificate Issues

```bash
# Check certificate expiry
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

### Database Connection Errors

```bash
# Check postgres is healthy
docker compose ps postgres

# View postgres logs
docker compose logs postgres

# Reset database (WARNING: Deletes all data!)
docker compose down -v postgres_data
docker compose up -d postgres
```

### MQTT Connection Issues

```bash
# Test MQTT locally
docker compose exec mosquitto mosquitto_sub -t '#' -v

# Check mosquitto config
docker compose exec mosquitto cat /mosquitto/config/mosquitto.conf
```

## Backup Strategy

### Database Backup

```bash
# Backup PostgreSQL
docker compose exec postgres pg_dump -U smarthome_admin smarthome_db > backup_$(date +%Y%m%d).sql

# Restore
cat backup_YYYYMMDD.sql | docker compose exec -T postgres psql -U smarthome_admin smarthome_db
```

### Volume Backup

```bash
# Backup all volumes
tar -czvf smart-home-backup-$(date +%Y%m%d).tar.gz \
    postgres_data redis_data mosquitto_data grafana_data
```

## Next Steps

1. **Change default admin credentials** in all services
2. **Set up monitoring alerts** in Grafana
3. **Configure device pairing** for ESP32 devices
4. **Implement OTA updates** for firmware
5. **Set up log aggregation** (optional: ELK stack)

## Security Checklist

- [ ] All default passwords changed
- [ ] SSL certificate valid and auto-renewing
- [ ] Firewall configured correctly
- [ ] Only ports 80/443 exposed to internet
- [ ] `.env` file not committed to git
- [ ] Regular backups scheduled
- [ ] Monitoring enabled

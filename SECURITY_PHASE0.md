# Security Hardening Checklist - Phase 0

## ✅ Completed in This Phase

### 1. Secrets Management
- [x] Created `.env.example` with all required environment variables
- [x] Removed hardcoded passwords from `docker-compose.yml`
- [x] Marked all sensitive values as `CHANGE_ME` placeholders
- [x] Documented password generation commands in DEPLOYMENT.md

**Action Required:** You MUST change all `CHANGE_ME_*` values in your `.env` file before deployment.

### 2. Network Security
- [x] Removed public exposure of database ports (PostgreSQL, Redis)
- [x] Restricted MQTT broker to localhost only (127.0.0.1)
- [x] All external traffic now routes through Nginx reverse proxy
- [x] Implemented rate limiting zones (API: 10r/s, General: 30r/s)
- [x] Added WebSocket support for Socket.io real-time communication

### 3. SSL/TLS Configuration
- [x] Nginx configured for HTTPS termination with Let's Encrypt
- [x] Modern TLS configuration (TLSv1.2 + TLSv1.3 only)
- [x] Strong cipher suites configured
- [x] HTTP to HTTPS redirect implemented
- [x] OCSP Stapling enabled
- [x] SSL certificate paths mounted from host

### 4. Container Security
- [x] Backend Dockerfile: Multi-stage build, non-root user
- [x] Frontend Dockerfile: Non-root nginx user, minimal permissions
- [x] Health checks added to all critical services
- [x] Removed InfluxDB (unused dependency)
- [x] Proper service dependencies with health conditions

### 5. Web Application Security Headers
- [x] X-Frame-Options: SAMEORIGIN
- [x] X-Content-Type-Options: nosniff
- [x] X-XSS-Protection: 1; mode=block
- [x] Referrer-Policy: strict-origin-when-cross-origin
- [x] Content-Security-Policy (configured for Vue.js)
- [x] Server tokens hidden

### 6. Service Isolation
- [x] Grafana exposed only via subpath (/grafana)
- [x] Portainer exposed only via subpath (/portainer)
- [x] Prometheus exposed only via subpath (/prometheus)
- [x] No direct access to internal services from internet

### 7. Documentation
- [x] Created comprehensive DEPLOYMENT.md guide
- [x] Documented SSL certificate setup process
- [x] Firewall configuration instructions provided
- [x] Backup and restore procedures documented
- [x] Troubleshooting section added

---

## ⚠️ Critical Actions Required Before Production

### IMMEDIATE (Before First Run)

1. **Generate Strong Passwords**
   ```bash
   # Run these commands and save output securely
   openssl rand -base64 32  # For POSTGRES_PASSWORD
   openssl rand -base64 32  # For REDIS_PASSWORD
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # For JWT_SECRET
   openssl rand -base64 32  # For MQTT_INTERNAL_PASS
   ```

2. **Edit .env File**
   ```bash
   cp .env.example .env
   nano .env  # Change ALL CHANGE_ME_* values
   ```

3. **Obtain SSL Certificate**
   ```bash
   # On your server (before running docker compose up)
   sudo apt install certbot -y
   sudo certbot certonly --standalone -d m2smart.ir -d www.m2smart.ir
   ```

4. **Update Mosquitto Passwords**
   Edit `mosquitto/config/mosquitto.conf`:
   - Replace `CHANGE_ME_MQTT_ADMIN_PASS`
   - Replace `CHANGE_ME_MQTT_INTERNAL_PASS`
   
   Or generate proper hashes:
   ```bash
   docker run --rm eclipse-mosquitto:2 mosquitto_passwd -b /tmp/passwd backend_service YOUR_PASSWORD
   ```

### HIGH PRIORITY (Week 1)

5. **Configure Firewall**
   ```bash
   sudo ufw enable
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP (for Let's Encrypt)
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw status verbose
   ```

6. **Remove Sensitive Files from Git History**
   If you committed `.env` or passwords to git:
   ```bash
   # Install BFG Repo-Cleaner
   wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
   
   # Remove .env files from history
   java -jar bfg-1.14.0.jar --delete-files '.env*'
   
   # Force push (WARNING: This rewrites history!)
   git push --force
   ```

7. **Change Default Admin Credentials**
   After first login:
   - Grafana: Change admin password immediately
   - Portainer: Set strong admin password during setup
   - Database: Consider changing default username too

### MEDIUM PRIORITY (Month 1)

8. **Enable MQTT Authentication for Devices**
   Current setup allows any authenticated user on sh/+/+/# topics.
   Next phase should implement:
   - Per-device credentials
   - Topic-level ACL per user/home
   - Device certificate authentication

9. **Implement Refresh Token Rotation**
   Current JWT setup needs:
   - Short-lived access tokens (15 min)
   - Long-lived refresh tokens (7 days)
   - Token rotation on each refresh

10. **Add Monitoring Alerts**
    Configure Grafana alerts for:
    - High CPU/Memory usage
    - Database connection failures
    - MQTT broker disconnections
    - SSL certificate expiry (< 30 days)

---

## 🔒 Security Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    INTERNET                         │
└────────────────────┬────────────────────────────────┘
                     │ Ports 80, 443 ONLY
                     ▼
        ┌────────────────────────┐
        │   Nginx (SSL Term.)    │  ← Let's Encrypt Cert
        │   Rate Limiting        │
        │   Security Headers     │
        └──────────┬─────────────┘
                   │ Internal Network Only
         ┌─────────┼─────────┬──────────┬──────────┐
         │         │         │          │          │
         ▼         ▼         ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
    │Backend │ │Grafana │ │Promethe│ │Portain │ │ Mosquitto│
    │:3000   │ │:3000   │ │us :9090 │ │er :9000│ │ :1883    │
    └────────┘ └────────┘ └────────┘ └────────┘ └────┬─────┘
         │                                           │
         │         ┌──────────┐                      │
         └────────►│ Postgres │◄─────────────────────┘
                   │  :5432   │
                   └────┬─────┘
                        │
                   ┌────▼─────┐
                   │  Redis   │
                   │  :6379   │
                   └──────────┘

All internal services: NO direct internet access
All inter-service communication: Encrypted via Docker network
External communication: TLS 1.2/1.3 only
```

---

## 📋 Verification Commands

After deployment, run these to verify security:

```bash
# 1. Check no sensitive ports are exposed
sudo netstat -tulpn | grep -E '3000|5432|6379|9090'

# Should only show 80 and 443

# 2. Test SSL configuration
curl -I https://m2smart.ir
openssl s_client -connect m2smart.ir:443 -tls1_2

# 3. Verify rate limiting
for i in {1..20}; do curl -s -o /dev/null -w "%{http_code}\n" https://m2smart.ir/api/health; done

# 4. Check container users
docker compose exec backend whoami  # Should be 'nodejs'
docker compose exec frontend whoami # Should be 'nginx'

# 5. Verify health checks
docker compose ps  # All should show "healthy"

# 6. Test security headers
curl -I https://m2smart.ir | grep -E 'X-Frame|X-Content|X-XSS|Content-Security'
```

---

## 🚨 Known Limitations (To Be Addressed in Future Phases)

| Issue | Current State | Phase 1 Plan |
|-------|--------------|--------------|
| MQTT Auth | Basic username/password | Per-device certificates |
| Topic ACL | Wildcard for all users | User/Home scoped topics |
| JWT Tokens | Single token, no rotation | Access + Refresh tokens |
| Device Identity | espDeviceId string | Unique device keys + PoP |
| Firmware Updates | Manual | OTA with signed updates |
| Audit Logging | Console.log | Winston + structured logs |
| API Versioning | None | /api/v1 prefix |
| CORS | Single origin | Dynamic based on config |

---

## Next Phase: Phase 1 - Core Security & Device Management

After you complete the actions above and confirm the system is running:

1. **Fix Broken Auth Code** (authController completion)
2. **Implement Proper Device Model** (Entity/Capability pattern)
3. **Secure MQTT with Per-Device Auth**
4. **Add Refresh Token Rotation**
5. **Implement Device Shadow Pattern** (Redis-based)
6. **Add Comprehensive Logging** (Winston + log rotation)

**Do not proceed to Phase 1 until:**
- ✅ All CHANGE_ME passwords are updated
- ✅ SSL certificate is valid
- ✅ Firewall is configured
- ✅ System passes verification commands above

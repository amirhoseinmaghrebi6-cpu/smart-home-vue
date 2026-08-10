# 🏠 Smart Home Vue + Express - Complete Startup Guide

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 12+ installed and running
- npm or yarn

---

## 📋 Step 1: Setup Backend

### 1.1 Install Dependencies
```bash
cd backend
npm install
```

### 1.2 Configure Environment Variables
Copy and update `.env`:
```bash
cp .env.example .env
```

Edit `backend/.env`:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_home
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=super_secret_key_change_in_production
JWT_EXPIRE=7d

# MQTT (Optional for IoT)
MQTT_BROKER=mqtt://localhost:1883
```

### 1.3 Initialize Database
See [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed instructions:

**Quick version:**
```bash
# Create database
psql -U postgres -c "CREATE DATABASE smart_home;"

# Run migrations
npx sequelize-cli db:migrate
```

---

## 🎨 Step 2: Setup Frontend

### 2.1 Install Dependencies
```bash
npm install
```

### 2.2 Configure Environment Variables
```bash
# Development is pre-configured in .env.development
# For production, edit .env.production with your backend URL
```

Check `.env.development`:
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME=Smart Home
```

For production, update `.env.production`:
```env
VITE_API_BASE_URL=https://api.example.com/api
```

---

## ▶️ Step 3: Start Both Servers

### Option A: Separate Terminals (Recommended)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Expected output:
```
🚀 Smart Home API running on port 3001
🌐 Environment: development
📡 Accessible from: http://0.0.0.0:3001
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Expected output:
```
  VITE v5.4.0  ready in 234 ms

  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

### Option B: Using npm-run-all (Single Terminal)
```bash
npm install --save-dev npm-run-all
```

Add to root `package.json`:
```json
{
  "scripts": {
    "dev": "npm-run-all --parallel backend-dev frontend-dev",
    "backend-dev": "cd backend && npm run dev",
    "frontend-dev": "npm run dev"
  }
}
```

Then:
```bash
npm run dev
```

---

## 🔗 Step 4: Access Application

Open browser:
```
http://localhost:3000
```

### Test Login
Default test credentials (if database seeded):
- Email: `test@example.com`
- Password: `test123`

Or register a new account.

---

## 📦 Step 5: Build for Production

### Frontend Build
```bash
npm run build
```
Creates optimized files in `dist/` folder.

### Backend Production
```bash
cd backend
NODE_ENV=production npm start
```

---

## 🐳 Docker Setup (Optional)

### Using Docker Compose
Create `docker-compose.yml` in root:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: smart_home
      POSTGRES_DB: smart_home
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: development
      DB_HOST: postgres
      DB_USER: postgres
      DB_PASSWORD: smart_home
      DB_NAME: smart_home
    depends_on:
      - postgres

  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      VITE_API_BASE_URL: http://localhost:3001/api

volumes:
  postgres_data:
```

Run:
```bash
docker-compose up
```

---

## 🔧 Troubleshooting

### Frontend can't connect to backend
- ✅ Check backend is running: `http://localhost:3001/api/health`
- ✅ Check CORS: Backend should have `FRONTEND_URL` in `.env`
- ✅ Check proxy: Vite proxy configured in `vite.config.js`

### Database connection error
- ✅ PostgreSQL running: `psql -U postgres`
- ✅ Database exists: `psql -l | grep smart_home`
- ✅ Credentials match `.env`: `DB_USER`, `DB_PASSWORD`
- ✅ Migrations run: `psql -d smart_home -c "\dt"`

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>

# Or use different port
VITE_PORT=3001 npm run dev
```

### Module not found errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

---

## 📚 Additional Documentation

- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Detailed database initialization
- [ANALYSIS.md](ANALYSIS.md) - Architecture and problem analysis
- [Backend README](backend/README.md) - Backend specific documentation
- [Frontend README](README.md) - Frontend specific documentation

---

## 🎯 Next Steps

1. ✅ Setup complete
2. 🔐 Create user account
3. 📍 Add locations and spaces
4. 🔌 Pair smart devices (when implemented)
5. ⏰ Create automation scenarios (when implemented)

---

## 📞 Support

For issues, check:
1. Console errors (Ctrl+Shift+I in browser)
2. Network tab for failed requests
3. Backend logs in terminal
4. Database logs if applicable

---

**Happy coding! 🚀**

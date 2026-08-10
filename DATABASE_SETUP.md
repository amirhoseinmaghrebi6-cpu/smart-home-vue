# 📚 Database Initialization Guide

## Prerequisites
- PostgreSQL installed and running
- Backend dependencies installed: `cd backend && npm install`

---

## Step 1: Create Database

### Option A: Using psql (Recommended)
```bash
psql -U postgres -c "CREATE DATABASE smart_home;"
```

### Option B: Using pgAdmin
1. Connect to PostgreSQL
2. Right-click "Databases" → Create → Database
3. Name: `smart_home`
4. Click "Save"

---

## Step 2: Install Sequelize CLI (if not already installed)
```bash
cd backend
npm install --save-dev sequelize-cli
```

---

## Step 3: Create .sequelizerc Config File
In `backend/.sequelizerc`:
```javascript
const path = require('path');

module.exports = {
  'config': path.resolve('config', 'config.js'),
  'models-path': path.resolve('src', 'models'),
  'seeders-path': path.resolve('src', 'seeders'),
  'migrations-path': path.resolve('migrations'),
};
```

---

## Step 4: Configure Environment Variables

Edit `backend/.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_home
DB_USER=postgres
DB_PASSWORD=your_password
NODE_ENV=development
JWT_SECRET=your_secret_key
PORT=3001
```

---

## Step 5: Run Migrations

Initialize Sequelize migrations (run once):
```bash
cd backend
npx sequelize-cli db:migrate --config config/config.js
```

Or directly run the migration file:
```bash
npx sequelize-cli db:migrate:up --name 20240523-create-all-tables.js
```

---

## Step 6: Verify Database Setup

Check if tables were created:
```bash
psql -U postgres -d smart_home -c "\dt"
```

Expected tables:
```
          List of relations
 Schema |        Name        | Type  
--------+--------------------+-------
 public | devices            | table
 public | emergency_contacts | table
 public | scenarios          | table
 public | spaces             | table
 public | users              | table
(5 rows)
```

---

## Step 7: (Optional) Seed Test Data

Create `backend/src/seeders/001-test-user.js`:
```javascript
module.exports = {
  async up(queryInterface, Sequelize) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    await queryInterface.bulkInsert('users', [{
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      phone: '09123456789',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { email: 'test@example.com' });
  }
};
```

Run seeders:
```bash
npx sequelize-cli db:seed:all
```

---

## Step 8: Start Backend

```bash
cd backend
npm run dev
# or
npm start
```

Expected output:
```
🚀 Smart Home API running on port 3001
🌐 Environment: development
🔗 Health check: http://localhost:3001/api/health
📡 Accessible from: http://0.0.0.0:3001
```

---

## Troubleshooting

### Error: "relation 'users' does not exist"
**Cause**: Migrations not run
**Fix**: Run Step 5 again

### Error: "password authentication failed"
**Cause**: Wrong PostgreSQL credentials in `.env`
**Fix**: Update `DB_USER` and `DB_PASSWORD` to match your PostgreSQL setup

### Error: "database 'smart_home' does not exist"
**Cause**: Database not created
**Fix**: Run Step 1 again

### Error: "connect ECONNREFUSED 127.0.0.1:5432"
**Cause**: PostgreSQL not running
**Fix**: Start PostgreSQL service:
- **Linux/Mac**: `brew services start postgresql`
- **Windows**: Start PostgreSQL service from Services
- **Docker**: `docker run -d -e POSTGRES_PASSWORD=password postgres`

---

## Useful Commands

```bash
# View all tables
psql -U postgres -d smart_home -c "\dt"

# View users table structure
psql -U postgres -d smart_home -c "\d users"

# Run specific migration
npx sequelize-cli db:migrate:up --name 20240523-create-all-tables.js

# Undo all migrations
npx sequelize-cli db:migrate:undo:all

# Create new migration
npx sequelize-cli migration:generate --name add-new-column

# Generate seed file
npx sequelize-cli seed:generate --name add-test-users
```

---

## Next Steps

1. ✅ Database initialized
2. 🚀 Start backend: `npm run dev`
3. 🎨 Start frontend: `cd .. && npm run dev`
4. 🔑 Test login with user data (if seeded)
5. 📱 Access at `http://localhost:3000`

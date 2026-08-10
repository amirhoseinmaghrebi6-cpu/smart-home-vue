'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(path.join(__dirname, '../../config/config.js'))[env];

const db = {};

// -------------------------
// Sequelize init
// -------------------------
let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// -------------------------
// Load models safely (شامل DeviceAccess)
// -------------------------
fs.readdirSync(__dirname)
  .filter(file => {
    return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js';
  })
  .forEach(file => {
    try {
      const modelFactory = require(path.join(__dirname, file));
      if (typeof modelFactory !== 'function') {
        console.warn(`⚠️ Skipped (not a model function): ${file}`);
        return;
      }
      const model = modelFactory(sequelize, Sequelize.DataTypes);
      if (!model || !model.name) {
        console.warn(`⚠️ Invalid model export in: ${file}`);
        return;
      }
      db[model.name] = model;
      console.log(`✔ Model loaded: ${model.name}`);
    } catch (err) {
      console.error(`❌ Failed loading model: ${file}`, err.message);
    }
  });

// -------------------------
// Run associations safely
// -------------------------
Object.keys(db).forEach(modelName => {
  try {
    if (db[modelName].associate) {
      db[modelName].associate(db);
      console.log(`🔗 Associated: ${modelName}`);
    }
  } catch (err) {
    console.error(`❌ Association error in: ${modelName}`, err.message);
  }
});

// -------------------------
// ✅ تعریف associations چندکاربره (Device ↔ User)
// -------------------------
if (db.Device && db.User && db.DeviceAccess) {
  db.Device.belongsToMany(db.User, { 
    through: db.DeviceAccess, 
    foreignKey: 'deviceId', 
    otherKey: 'userId', 
    as: 'usersWithAccess' 
  });
  
  db.User.belongsToMany(db.Device, { 
    through: db.DeviceAccess, 
    foreignKey: 'userId', 
    otherKey: 'deviceId', 
    as: 'accessibleDevices' 
  });
  console.log('🔗 Multi-user associations configured');
}

// -------------------------
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// ✅ فقط یک بار اکسپورت کن:
module.exports = db;
// backend/src/models/device.js
module.exports = (sequelize, DataTypes) => {
  const Device = sequelize.define('Device', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    spaceId: { type: DataTypes.UUID, allowNull: true }, 
    
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    icon: { type: DataTypes.STRING, defaultValue: '💡' },
    
    // ✅ فیلد حیاتی: کانال فیزیکی روی ESP32
    channelIndex: { type: DataTypes.INTEGER, allowNull: true },

    location: DataTypes.JSONB,
    status: { type: DataTypes.BOOLEAN, defaultValue: false },
    brightness: DataTypes.INTEGER,
    // ✅ ← ← ← حیاتی: channels باید همیشه یک آرایه معتبر باشد
channels: {
  type: DataTypes.JSONB,
  allowNull: false,  // ← ← ← null نپذیرد
  defaultValue: [],  // ← ← ← پیش‌فرض: آرایه خالی
  comment: 'آرایه وضعیت کانال‌ها: [{id, label, status}]'
},
    pairedDeviceId: DataTypes.STRING,
    pairedAt: DataTypes.DATE,
    token: DataTypes.STRING,
    lastSeen: DataTypes.DATE,
    
    // ✅ ← ← ← فیلد timezone را دقیقاً اینجا، داخل آُبجکت اصلی اضافه کنید:
    timezone: { 
      type: DataTypes.STRING, 
      defaultValue: 'Asia/Tehran',
      allowNull: false,
      comment: 'محل نصب دستگاه برای اجرای صحیح سناریوها'
    }
    // ✅ پایان فیلدها
  }, { 
    tableName: 'devices', 
    timestamps: true 
  });

  Device.associate = (models) => {
    Device.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Device.hasMany(models.Scenario, { foreignKey: 'deviceId', as: 'scenarios' });
    Device.belongsTo(models.Space, { foreignKey: 'spaceId', as: 'space', onDelete: 'SET NULL' });
  };
  
  return Device;
};
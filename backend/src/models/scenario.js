// backend/src/models/scenario.js
module.exports = (sequelize, DataTypes) => {
  const Scenario = sequelize.define('Scenario', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    deviceId: { type: DataTypes.UUID, allowNull: false },
    
    // نوع سناریو: recurring (تکرارشونده) یا once (یک‌بار)
    type: { type: DataTypes.STRING, defaultValue: 'recurring', allowNull: false },
    
    // برای type: 'once'
    datetime: { type: DataTypes.DATE, allowNull: true },
    
    // برای type: 'recurring'
    time: { type: DataTypes.STRING, allowNull: true }, // فرمت "HH:mm"
// Sequelize به صورت خودکار آرایه جاوااسکریپت را به JSON تبدیل کرده و در متن ذخیره می‌کند
days: { 
  type: DataTypes.TEXT, 
  allowNull: true,
  defaultValue: '[]', // مقدار پیش‌فرض را به صورت رشته JSON تنظیم می‌کنیم
  get() {
    // هنگام خواندن از دیتابیس، رشته JSON را به آرایه تبدیل کن
    const val = this.getDataValue('days');
    return val ? (typeof val === 'string' ? JSON.parse(val) : val) : [];
  },
  set(val) {
    // هنگام نوشتن در دیتابیس، آرایه را به رشته JSON تبدیل کن
    this.setDataValue('days', val ? JSON.stringify(val) : '[]');
  }
},
    
    // عملیات
    action: { type: DataTypes.STRING, allowNull: false }, // 'on' یا 'off'
    channelIndex: { type: DataTypes.INTEGER, allowNull: true }, // برای دستگاه‌های چند کاناله
    
    // وضعیت
    enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
executed: { 
  type: DataTypes.BOOLEAN, 
  defaultValue: false,
  allowNull: false  // ← ← ← مهم: مقدار null نپذیرد
},
    
    // متادیتا
    name: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'scenarios',
    timestamps: true,
    indexes: [{ fields: ['deviceId'] }, { fields: ['enabled'] }]
  });

  Scenario.associate = (models) => {
    Scenario.belongsTo(models.Device, { foreignKey: 'deviceId', as: 'device', onDelete: 'CASCADE' });
  };

  return Scenario;
};
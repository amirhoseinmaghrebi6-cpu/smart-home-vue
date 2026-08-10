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
    days: { 
      type: DataTypes.ARRAY(DataTypes.INTEGER), 
      allowNull: true,
      defaultValue: [] // [0=Sun, 1=Mon, ..., 6=Sat]
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
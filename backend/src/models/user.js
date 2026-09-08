// backend/src/models/user.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    timezone: {
  type: DataTypes.STRING,
  defaultValue: 'Asia/Tehran',  // Ù¾ÛŒØ´â€ŒÙØ±Ø¶ Ø¨Ø±Ø§ÛŒ Ú©Ø§Ø±Ø¨Ø±Ø§Ù† Ø§ÛŒØ±Ø§Ù†ÛŒ
  validate: {
    isIn: [['Asia/Tehran', 'Europe/London', 'America/New_York', 'Asia/Dubai', 'UTC']] // ÛŒØ§ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ø§Ø² Ú©ØªØ§Ø¨Ø®Ø§Ù†Ù‡â€ŒÛŒ timezone-validator
  }
},
    password: { type: DataTypes.STRING, allowNull: false },
    phone: DataTypes.STRING,
    preferences: { type: DataTypes.JSONB, defaultValue: { lang: 'fa', theme: 0, calendarSystem: 'shamsi' } }
  }, { tableName: 'users', timestamps: true });

  User.associate = (models) => {
    User.hasMany(models.Device, { foreignKey: 'userId', as: 'devices' });
    User.hasMany(models.EmergencyContact, { foreignKey: 'userId', as: 'emergencyContacts' });
  };
  return User;
};

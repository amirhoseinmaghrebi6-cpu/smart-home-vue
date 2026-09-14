module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'Asia/Tehran',
      validate: { isIn: [['Asia/Tehran', 'Europe/London', 'America/New_York', 'Asia/Dubai', 'UTC']] }
    },
    password: { type: DataTypes.STRING, allowNull: false },
    phone: DataTypes.STRING,
    preferences: { type: DataTypes.JSONB, defaultValue: { lang: 'fa', theme: 0, calendarSystem: 'shamsi' } },
    mfaSecret: { type: DataTypes.STRING, allowNull: true },
    isMfaEnabled: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, { tableName: 'users', timestamps: true });

  User.associate = (models) => {
    User.hasMany(models.Device, { foreignKey: 'userId', as: 'devices' });
    User.hasMany(models.EmergencyContact, { foreignKey: 'userId', as: 'emergencyContacts' });
  };
  return User;
};

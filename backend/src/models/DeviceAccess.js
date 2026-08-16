module.exports = (sequelize, DataTypes) => {
  const DeviceAccess = sequelize.define('DeviceAccess', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    deviceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'devices', key: 'id' }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'owner', // owner | editor | viewer
      allowNull: false
    }
  }, {
    tableName: 'device_accesses',
    timestamps: true
  });

  DeviceAccess.associate = (models) => {
    DeviceAccess.belongsTo(models.Device, { foreignKey: 'deviceId', as: 'device' });
    DeviceAccess.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return DeviceAccess;
};
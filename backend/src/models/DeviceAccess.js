module.exports = (sequelize, DataTypes) => {
  const DeviceAccess = sequelize.define('DeviceAccess', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
  return DeviceAccess;
};
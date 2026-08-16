'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeviceAccess extends Model {
    static associate(models) {
      // تعریف روابط برای جلوگیری از خطا
      DeviceAccess.belongsTo(models.Device, { foreignKey: 'deviceId', as: 'device' });
      DeviceAccess.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  
  DeviceAccess.init({
    deviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Devices', key: 'id' }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    permissionLevel: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'read'
    }
  }, {
    sequelize,
    modelName: 'DeviceAccess',
    tableName: 'DeviceAccesses'
  });

  return DeviceAccess;
};

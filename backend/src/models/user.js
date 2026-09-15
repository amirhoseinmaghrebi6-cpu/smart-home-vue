'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Device, { foreignKey: 'ownerId', as: 'devices' });
      User.hasMany(models.Scenario, { foreignKey: 'userId', as: 'scenarios' });
      User.hasMany(models.EmergencyContact, { foreignKey: 'userId', as: 'emergencyContacts' });
      User.belongsToMany(models.Device, { through: models.DeviceAccess, as: 'sharedDevices', foreignKey: 'userId' });
    }

    // متد کمکی برای هش کردن رمز (فقط اگر خام باشد)
    async setPassword(password) {
      if (!password) return;
      // اگر قبلاً هش نشده (طول کمتر از 60)، هش کن
      if (this.passwordHash.length < 60) {
        this.passwordHash = await bcrypt.hash(password, 12); // Salt rounds = 12 برای امنیت بالاتر
      }
    }

    // متد بررسی رمز عبور
    checkPassword(password) {
      if (!this.passwordHash) return false;
      return bcrypt.compare(password, this.passwordHash);
    }
  }

  User.init({
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true, notEmpty: true }
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: true // برای کاربران گوگل ممکن است خالی باشد
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'کاربر مهمان'
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'user',
      validate: { isIn: [['user', 'admin']] }
    },
    googleId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    mfaSecret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isMfaEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    hooks: {
      beforeCreate: async (user) => {
        // اگر کاربر گوگلی نیست و رمز دارد، هش کن
        if (!user.googleId && user.passwordHash) {
          user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
        }
        if (user.googleId) {
          user.isVerified = true;
          if (!user.name) user.name = user.email.split('@')[0];
        }
      },
      beforeUpdate: async (user) => {
        // اگر رمز تغییر کرد و کاربر گوگلی نیست، دوباره هش کن
        if (user.changed('passwordHash') && !user.googleId && user.passwordHash) {
           if (user.passwordHash.length < 60) {
             user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
           }
        }
      }
    }
  });

  return User;
};
// backend/migrations/20240523-create-all-tables.js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ۱. جدول کاربران
    await queryInterface.createTable('users', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      phone: { type: Sequelize.STRING },
      preferences: { type: Sequelize.JSONB, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // ۲. جدول تماس‌های اضطراری
    await queryInterface.createTable('emergency_contacts', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { 
        type: Sequelize.UUID, 
        allowNull: false, 
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE' 
      },
      phoneNumber: { type: Sequelize.STRING, allowNull: false },
      label: { type: Sequelize.STRING, defaultValue: 'شماره اضطراری' },
      priority: { type: Sequelize.INTEGER, defaultValue: 1 },
      enabled: { type: Sequelize.BOOLEAN, defaultValue: true },
      notifyOn: { type: Sequelize.JSONB, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // ۳. جدول فضاها/مکان‌ها (Spaces)
    await queryInterface.createTable('spaces', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { 
        type: Sequelize.UUID, 
        allowNull: false, 
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      parentId: { 
        type: Sequelize.UUID, 
        allowNull: true, 
        references: { model: 'spaces', key: 'id' },
        onDelete: 'SET NULL'
      },
      name: { type: Sequelize.STRING, allowNull: false },
      type: { type: Sequelize.ENUM('large', 'small'), allowNull: false },
      image: { type: Sequelize.STRING },
      description: { type: Sequelize.TEXT },
      icon: { type: Sequelize.STRING, defaultValue: '🏠' },
      color: { type: Sequelize.STRING },
      order: { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('spaces', ['userId']);
    await queryInterface.addIndex('spaces', ['parentId']);

    // ۴. جدول دستگاه‌ها
    await queryInterface.createTable('devices', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { 
        type: Sequelize.UUID, 
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      spaceId: { 
        type: Sequelize.UUID, 
        allowNull: true,
        references: { model: 'spaces', key: 'id' },
        onDelete: 'SET NULL'
      },
      name: { type: Sequelize.STRING, allowNull: false },
      type: { type: Sequelize.STRING, allowNull: false },
      icon: { type: Sequelize.STRING, defaultValue: '💡' },
      location: { type: Sequelize.JSONB },
      status: { type: Sequelize.BOOLEAN, defaultValue: false },
      brightness: { type: Sequelize.INTEGER },
      channels: { type: Sequelize.JSONB },
      pairedDeviceId: { type: Sequelize.STRING },
      pairedAt: { type: Sequelize.DATE },
      token: { type: Sequelize.STRING },
      lastSeen: { type: Sequelize.DATE },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('devices', ['userId']);
    await queryInterface.addIndex('devices', ['spaceId']);

    // ۵. جدول سناریوها
    await queryInterface.createTable('scenarios', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      deviceId: { 
        type: Sequelize.UUID, 
        allowNull: false, 
        references: { model: 'devices', key: 'id' },
        onDelete: 'CASCADE'
      },
      type: { type: Sequelize.ENUM('once', 'recurring'), allowNull: false },
      action: { type: Sequelize.ENUM('on', 'off'), allowNull: false },
      channelIndex: { type: Sequelize.INTEGER },
      datetime: { type: Sequelize.DATE },
      days: { type: Sequelize.ARRAY(Sequelize.INTEGER) },
      time: { type: Sequelize.TIME },
      enabled: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('scenarios', ['deviceId']);
    await queryInterface.addIndex('scenarios', ['enabled']);
  },

  async down(queryInterface, Sequelize) {
    // حذف به ترتیب معکوس وابستگی‌ها
    await queryInterface.dropTable('scenarios');
    await queryInterface.dropTable('devices');
    await queryInterface.dropTable('spaces');
    await queryInterface.dropTable('emergency_contacts');
    await queryInterface.dropTable('users');
  }
};
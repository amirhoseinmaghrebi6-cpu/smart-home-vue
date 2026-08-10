'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    
    // ✅ تغییر نوع فیلد image از STRING به TEXT برای ذخیره‌ی عکس‌های base64
    await queryInterface.changeColumn('spaces', 'image', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    
    // ✅ بازگرداندن به حالت قبلی (در صورت نیاز)
    await queryInterface.changeColumn('spaces', 'image', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
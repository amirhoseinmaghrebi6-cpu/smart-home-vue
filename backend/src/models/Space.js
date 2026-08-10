// backend/src/models/Space.js
module.exports = (sequelize, DataTypes) => {
const Space = sequelize.define('Space', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.STRING, defaultValue: 'large' },
  parentId: { type: DataTypes.UUID, allowNull: true, references: { model: 'spaces', key: 'id' } },
  name: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  icon: { type: DataTypes.STRING(50), defaultValue: '🏠' },
  color: { type: DataTypes.STRING(7), defaultValue: '#3b82f6' },
  order: { type: DataTypes.INTEGER, defaultValue: 0 },
  image: { type: DataTypes.TEXT, allowNull: true } // ✅ اضافه شد
}, {
  tableName: 'spaces',
  timestamps: true,
  indexes: [{ fields: ['userId'] }]
});

  Space.associate = (models) => {
    Space.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Space.hasMany(models.Device, { foreignKey: 'spaceId', as: 'devices', onDelete: 'SET NULL' });
    Space.belongsTo(models.Space, { as: 'parent', foreignKey: 'parentId', onDelete: 'SET NULL' });
    Space.hasMany(models.Space, { as: 'children', foreignKey: 'parentId', onDelete: 'CASCADE' });
  };

  return Space;
};
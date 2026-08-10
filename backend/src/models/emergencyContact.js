// backend/src/models/emergencyContact.js
module.exports = (sequelize, DataTypes) => {
  const EmergencyContact = sequelize.define('EmergencyContact', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    phoneNumber: { type: DataTypes.STRING, allowNull: false },
    label: { type: DataTypes.STRING, defaultValue: 'شماره اضطراری' },
    priority: { type: DataTypes.INTEGER, defaultValue: 1 },
    enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    notifyOn: { type: DataTypes.JSONB, defaultValue: { intrusion: true, fire: true, gas: true, emergency_button: true } }
  }, { tableName: 'emergency_contacts', timestamps: true });

  EmergencyContact.associate = (models) => {
    EmergencyContact.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };
  return EmergencyContact;
};
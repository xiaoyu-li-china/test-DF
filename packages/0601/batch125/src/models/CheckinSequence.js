const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CheckinSequence = sequelize.define('CheckinSequence', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  class_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false
  },
  checkin_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'checkin_sequences',
  comment: '签到序号表',
  indexes: [
    { fields: ['class_id', 'checkin_date'], unique: true }
  ]
});

module.exports = CheckinSequence;

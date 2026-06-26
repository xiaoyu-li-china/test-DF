const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Kindergarten = sequelize.define('Kindergarten', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '园所ID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '园所名称'
  },
  address: {
    type: DataTypes.STRING(255),
    comment: '园所地址'
  },
  contact_phone: {
    type: DataTypes.STRING(20),
    comment: '联系电话'
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
    comment: '状态: 0-禁用 1-启用'
  }
}, {
  tableName: 'kindergartens',
  comment: '园所表',
  indexes: [
    { fields: ['status'] }
  ]
});

module.exports = Kindergarten;

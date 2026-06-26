const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Parent = sequelize.define('Parent', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '家长ID'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '姓名'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '手机号'
  },
  id_card: {
    type: DataTypes.STRING(18),
    allowNull: false,
    comment: '身份证号'
  },
  avatar_url: {
    type: DataTypes.STRING(255),
    comment: '头像URL'
  },
  id_card_verified: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
    comment: '身份证是否已验证: 0-未验证 1-已验证'
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
    comment: '状态: 0-禁用 1-启用'
  }
}, {
  tableName: 'parents',
  comment: '家长表',
  indexes: [
    { fields: ['phone'], unique: true },
    { fields: ['id_card'], unique: true },
    { fields: ['status'] }
  ]
});

module.exports = Parent;

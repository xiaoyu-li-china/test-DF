const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Teacher = sequelize.define('Teacher', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '老师ID'
  },
  kindergarten_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '园所ID'
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
    comment: '身份证号'
  },
  avatar_url: {
    type: DataTypes.STRING(255),
    comment: '头像URL'
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
    comment: '状态: 0-禁用 1-启用'
  }
}, {
  tableName: 'teachers',
  comment: '老师表',
  indexes: [
    { fields: ['kindergarten_id'] },
    { fields: ['phone'], unique: true }
  ]
});

module.exports = Teacher;

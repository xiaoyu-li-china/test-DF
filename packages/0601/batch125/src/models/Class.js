const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Class = sequelize.define('Class', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '班级ID'
  },
  kindergarten_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '园所ID'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '班级名称'
  },
  grade: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '年级: 小班/中班/大班'
  },
  class_qr_code: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '班级签到二维码内容/标识'
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
    comment: '状态: 0-禁用 1-启用'
  }
}, {
  tableName: 'classes',
  comment: '班级表',
  indexes: [
    { fields: ['kindergarten_id'] },
    { fields: ['class_qr_code'], unique: true }
  ]
});

module.exports = Class;

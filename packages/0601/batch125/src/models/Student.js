const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '学生ID'
  },
  class_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '班级ID'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '姓名'
  },
  gender: {
    type: DataTypes.TINYINT,
    comment: '性别: 1-男 2-女'
  },
  birthday: {
    type: DataTypes.DATEONLY,
    comment: '出生日期'
  },
  avatar_url: {
    type: DataTypes.STRING(255),
    comment: '头像URL'
  },
  student_no: {
    type: DataTypes.STRING(50),
    comment: '学号'
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
    comment: '状态: 0-离校 1-在校'
  }
}, {
  tableName: 'students',
  comment: '学生表',
  indexes: [
    { fields: ['class_id'] },
    { fields: ['class_id', 'student_no'], unique: true }
  ]
});

module.exports = Student;

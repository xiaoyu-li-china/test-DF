const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ClassTeacherRelation = sequelize.define('ClassTeacherRelation', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  class_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '班级ID'
  },
  teacher_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '老师ID'
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'teacher',
    comment: '角色: teacher-班主任, assistant-助教'
  }
}, {
  tableName: 'class_teacher_relations',
  comment: '班级老师关系表',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['class_id', 'teacher_id'], unique: true }
  ]
});

module.exports = ClassTeacherRelation;

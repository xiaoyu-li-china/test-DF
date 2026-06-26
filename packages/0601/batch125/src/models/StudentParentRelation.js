const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StudentParentRelation = sequelize.define('StudentParentRelation', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '学生ID'
  },
  parent_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '家长ID'
  },
  relation: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '关系: 父亲/母亲/爷爷/奶奶等'
  },
  is_primary: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
    comment: '是否主要联系人: 0-否 1-是'
  }
}, {
  tableName: 'student_parent_relations',
  comment: '学生家长关系表',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['student_id', 'parent_id'], unique: true },
    { fields: ['parent_id'] }
  ]
});

module.exports = StudentParentRelation;

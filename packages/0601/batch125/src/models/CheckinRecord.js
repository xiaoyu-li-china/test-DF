const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CheckinRecord = sequelize.define('CheckinRecord', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '签到记录ID'
  },
  class_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '班级ID'
  },
  student_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '学生ID'
  },
  checkin_type: {
    type: DataTypes.TINYINT,
    allowNull: false,
    comment: '签到类型: 1-入园签到 2-离园签到'
  },
  checkin_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '签到时间'
  },
  picker_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    comment: '接送人ID(家长ID或临时授权人ID)'
  },
  picker_type: {
    type: DataTypes.TINYINT,
    comment: '接送人类型: 1-家长 2-临时授权人'
  },
  picker_name: {
    type: DataTypes.STRING(50),
    comment: '接送人姓名'
  },
  picker_relation: {
    type: DataTypes.STRING(20),
    comment: '接送人与学生关系'
  },
  checkin_method: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1,
    comment: '签到方式: 1-扫码签到 2-手动补签'
  },
  operator_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    comment: '操作人ID(手动补签时为老师ID)'
  },
  remark: {
    type: DataTypes.STRING(255),
    comment: '备注'
  }
}, {
  tableName: 'checkin_records',
  comment: '签到记录表',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['class_id'] },
    { fields: ['student_id'] },
    { fields: ['checkin_time'] },
    { fields: ['class_id', 'checkin_time'] }
  ]
});

module.exports = CheckinRecord;

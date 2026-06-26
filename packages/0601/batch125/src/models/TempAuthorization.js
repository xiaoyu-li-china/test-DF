const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TempAuthorization = sequelize.define('TempAuthorization', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '授权ID'
  },
  student_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '学生ID'
  },
  parent_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '发起授权的家长ID'
  },
  authorized_person_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '被授权人姓名'
  },
  authorized_person_phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '被授权人手机号'
  },
  authorized_person_id_card: {
    type: DataTypes.STRING(18),
    allowNull: false,
    comment: '被授权人身份证号'
  },
  id_card_front_url: {
    type: DataTypes.STRING(255),
    comment: '身份证正面照片URL'
  },
  id_card_back_url: {
    type: DataTypes.STRING(255),
    comment: '身份证背面照片URL'
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '授权开始时间'
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '授权结束时间'
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
    comment: '状态: 0-待审核 1-审核通过 2-审核拒绝 3-已过期'
  },
  reviewer_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    comment: '审核人ID(老师ID)'
  },
  review_time: {
    type: DataTypes.DATE,
    comment: '审核时间'
  },
  review_remark: {
    type: DataTypes.STRING(255),
    comment: '审核备注'
  }
}, {
  tableName: 'temp_authorizations',
  comment: '临时接送人授权表',
  indexes: [
    { fields: ['student_id'] },
    { fields: ['parent_id'] },
    { fields: ['status'] },
    { fields: ['start_time', 'end_time'] }
  ]
});

module.exports = TempAuthorization;

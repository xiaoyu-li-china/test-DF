const { sequelize } = require('../config/database');

const Kindergarten = require('./Kindergarten');
const Class = require('./Class');
const Teacher = require('./Teacher');
const ClassTeacherRelation = require('./ClassTeacherRelation');
const Parent = require('./Parent');
const Student = require('./Student');
const StudentParentRelation = require('./StudentParentRelation');
const TempAuthorization = require('./TempAuthorization');
const CheckinRecord = require('./CheckinRecord');
const CheckinSequence = require('./CheckinSequence');

const setupAssociations = () => {
  Kindergarten.hasMany(Class, { foreignKey: 'kindergarten_id' });
  Class.belongsTo(Kindergarten, { foreignKey: 'kindergarten_id' });

  Kindergarten.hasMany(Teacher, { foreignKey: 'kindergarten_id' });
  Teacher.belongsTo(Kindergarten, { foreignKey: 'kindergarten_id' });

  Class.belongsToMany(Teacher, { through: ClassTeacherRelation, foreignKey: 'class_id' });
  Teacher.belongsToMany(Class, { through: ClassTeacherRelation, foreignKey: 'teacher_id' });

  Class.hasMany(Student, { foreignKey: 'class_id' });
  Student.belongsTo(Class, { foreignKey: 'class_id' });

  Student.belongsToMany(Parent, { through: StudentParentRelation, foreignKey: 'student_id' });
  Parent.belongsToMany(Student, { through: StudentParentRelation, foreignKey: 'parent_id' });

  Student.hasMany(TempAuthorization, { foreignKey: 'student_id' });
  TempAuthorization.belongsTo(Student, { foreignKey: 'student_id' });

  Parent.hasMany(TempAuthorization, { foreignKey: 'parent_id' });
  TempAuthorization.belongsTo(Parent, { foreignKey: 'parent_id' });

  Teacher.hasMany(TempAuthorization, { foreignKey: 'reviewer_id', as: 'reviewed_authorizations' });
  TempAuthorization.belongsTo(Teacher, { foreignKey: 'reviewer_id', as: 'reviewer' });

  Class.hasMany(CheckinRecord, { foreignKey: 'class_id' });
  CheckinRecord.belongsTo(Class, { foreignKey: 'class_id' });

  Student.hasMany(CheckinRecord, { foreignKey: 'student_id' });
  CheckinRecord.belongsTo(Student, { foreignKey: 'student_id' });

  Class.hasMany(CheckinSequence, { foreignKey: 'class_id' });
  CheckinSequence.belongsTo(Class, { foreignKey: 'class_id' });
};

const syncDatabase = async (force = false) => {
  setupAssociations();
  await sequelize.sync({ force });
  console.log('数据库模型同步完成');
};

module.exports = {
  sequelize,
  syncDatabase,
  Kindergarten,
  Class,
  Teacher,
  ClassTeacherRelation,
  Parent,
  Student,
  StudentParentRelation,
  TempAuthorization,
  CheckinRecord,
  CheckinSequence
};

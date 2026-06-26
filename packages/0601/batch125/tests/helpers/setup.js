process.env.DB_NAME = 'kindergarten_checkin_test';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    timezone: '+08:00',
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

const Kindergarten = sequelize.define('Kindergarten', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  address: { type: DataTypes.STRING(255) },
  contact_phone: { type: DataTypes.STRING(20) },
  status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 }
}, { tableName: 'kindergartens' });

const Class = sequelize.define('Class', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  kindergarten_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  name: { type: DataTypes.STRING(50), allowNull: false },
  grade: { type: DataTypes.STRING(20), allowNull: false },
  class_qr_code: { type: DataTypes.STRING(255), allowNull: false },
  status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 }
}, { tableName: 'classes', indexes: [{ fields: ['class_qr_code'], unique: true }] });

const Teacher = sequelize.define('Teacher', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  kindergarten_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  name: { type: DataTypes.STRING(50), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: false },
  id_card: { type: DataTypes.STRING(18) },
  avatar_url: { type: DataTypes.STRING(255) },
  status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 }
}, { tableName: 'teachers', indexes: [{ fields: ['phone'], unique: true }] });

const ClassTeacherRelation = sequelize.define('ClassTeacherRelation', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  class_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  teacher_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'teacher' }
}, { tableName: 'class_teacher_relations', timestamps: true, updatedAt: false, indexes: [{ fields: ['class_id', 'teacher_id'], unique: true }] });

const Parent = sequelize.define('Parent', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: false },
  id_card: { type: DataTypes.STRING(18), allowNull: false },
  avatar_url: { type: DataTypes.STRING(255) },
  id_card_verified: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 }
}, { tableName: 'parents', indexes: [{ fields: ['phone'], unique: true }, { fields: ['id_card'], unique: true }] });

const Student = sequelize.define('Student', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  class_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  name: { type: DataTypes.STRING(50), allowNull: false },
  gender: { type: DataTypes.TINYINT },
  birthday: { type: DataTypes.DATEONLY },
  avatar_url: { type: DataTypes.STRING(255) },
  student_no: { type: DataTypes.STRING(50) },
  status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 }
}, { tableName: 'students', indexes: [{ fields: ['class_id'] }, { fields: ['class_id', 'student_no'], unique: true }] });

const StudentParentRelation = sequelize.define('StudentParentRelation', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  parent_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  relation: { type: DataTypes.STRING(20), allowNull: false },
  is_primary: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 }
}, { tableName: 'student_parent_relations', timestamps: true, updatedAt: false, indexes: [{ fields: ['student_id', 'parent_id'], unique: true }] });

const TempAuthorization = sequelize.define('TempAuthorization', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  parent_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  authorized_person_name: { type: DataTypes.STRING(50), allowNull: false },
  authorized_person_phone: { type: DataTypes.STRING(20), allowNull: false },
  authorized_person_id_card: { type: DataTypes.STRING(18), allowNull: false },
  id_card_front_url: { type: DataTypes.STRING(255) },
  id_card_back_url: { type: DataTypes.STRING(255) },
  start_time: { type: DataTypes.DATE, allowNull: false },
  end_time: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  reviewer_id: { type: DataTypes.BIGINT.UNSIGNED },
  review_time: { type: DataTypes.DATE },
  review_remark: { type: DataTypes.STRING(255) }
}, { tableName: 'temp_authorizations' });

const CheckinRecord = sequelize.define('CheckinRecord', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  class_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  student_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  checkin_type: { type: DataTypes.TINYINT, allowNull: false },
  checkin_time: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  picker_id: { type: DataTypes.BIGINT.UNSIGNED },
  picker_type: { type: DataTypes.TINYINT },
  picker_name: { type: DataTypes.STRING(50) },
  picker_relation: { type: DataTypes.STRING(20) },
  checkin_method: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  operator_id: { type: DataTypes.BIGINT.UNSIGNED },
  remark: { type: DataTypes.STRING(255) }
}, { tableName: 'checkin_records', timestamps: true, updatedAt: false });

const CheckinSequence = sequelize.define('CheckinSequence', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  class_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  checkin_date: { type: DataTypes.DATEONLY, allowNull: false },
  sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'checkin_sequences', indexes: [{ fields: ['class_id', 'checkin_date'], unique: true }] });

const models = {
  Kindergarten, Class, Teacher, ClassTeacherRelation,
  Parent, Student, StudentParentRelation,
  TempAuthorization, CheckinRecord, CheckinSequence
};

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

const ensureSync = async () => {
  setupAssociations();
  await sequelize.sync({ force: true });
};

const seedBaseData = async (t) => {
  const opt = { transaction: t };

  const kg = await Kindergarten.create({
    name: '阳光幼儿园', address: '测试路1号', contact_phone: '010-12345678', status: 1
  }, opt);

  const cls = await Class.create({
    kindergarten_id: kg.id, name: '小一班', grade: '小班', class_qr_code: 'QR_TEST_CLASS_1', status: 1
  }, opt);

  const teacher = await Teacher.create({
    kindergarten_id: kg.id, name: '王老师', phone: '13900000001', id_card: '110101199001011111', status: 1
  }, opt);

  await ClassTeacherRelation.create({
    class_id: cls.id, teacher_id: teacher.id, role: 'teacher'
  }, opt);

  const parent = await Parent.create({
    name: '张三', phone: '13900000002', id_card: '110101199002022222', id_card_verified: 1, status: 1
  }, opt);

  const student = await Student.create({
    class_id: cls.id, name: '小明', gender: 1, birthday: '2020-06-01', student_no: 'S2024001', status: 1
  }, opt);

  await StudentParentRelation.create({
    student_id: student.id, parent_id: parent.id, relation: '父亲', is_primary: 1
  }, opt);

  return { kg, cls, teacher, parent, student };
};

module.exports = { sequelize, models, ensureSync, seedBaseData };

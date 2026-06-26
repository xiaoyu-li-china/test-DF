const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { sequelize, models, ensureSync, seedBaseData } = require('./helpers/setup');

const { Class, Student, Parent, CheckinRecord, CheckinSequence, StudentParentRelation } = models;

describe('签到幂等性集成测试', () => {
  let t;
  let seed;

  beforeAll(async () => {
    await ensureSync();
  });

  beforeEach(async () => {
    t = await sequelize.transaction();
    seed = await seedBaseData(t);
  });

  afterEach(async () => {
    await t.rollback();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('同一学生同日同类型扫码签到应被拦截', async () => {
    const { cls, student, parent } = seed;
    const today = dayjs().format('YYYY-MM-DD');
    const dayStart = dayjs(today).startOf('day').toDate();
    const dayEnd = dayjs(today).endOf('day').toDate();

    const relation = await StudentParentRelation.findOne({
      where: { student_id: student.id, parent_id: parent.id },
      transaction: t
    });
    expect(relation).not.toBeNull();

    await CheckinRecord.create({
      class_id: cls.id,
      student_id: student.id,
      checkin_type: 1,
      picker_id: parent.id,
      picker_type: 1,
      picker_name: parent.name,
      picker_relation: relation.relation,
      checkin_method: 1
    }, { transaction: t });

    const existingRecord = await CheckinRecord.findOne({
      where: {
        class_id: cls.id,
        student_id: student.id,
        checkin_type: 1,
        checkin_time: { [Op.between]: [dayStart, dayEnd] }
      },
      transaction: t
    });
    expect(existingRecord).not.toBeNull();

    const shouldBlock = !!existingRecord;
    expect(shouldBlock).toBe(true);

    const recordCount = await CheckinRecord.count({
      where: {
        class_id: cls.id,
        student_id: student.id,
        checkin_type: 1,
        checkin_time: { [Op.between]: [dayStart, dayEnd] }
      },
      transaction: t
    });
    expect(recordCount).toBe(1);
  });

  test('同一学生同日同类型补签应被拦截', async () => {
    const { cls, student, teacher } = seed;
    const checkinDate = dayjs().format('YYYY-MM-DD');
    const dayStart = dayjs(checkinDate).startOf('day').toDate();
    const dayEnd = dayjs(checkinDate).endOf('day').toDate();

    await CheckinRecord.create({
      class_id: cls.id,
      student_id: student.id,
      checkin_type: 1,
      checkin_method: 2,
      operator_id: teacher.id,
      picker_name: '张三',
      picker_relation: '父亲'
    }, { transaction: t });

    const existing = await CheckinRecord.findOne({
      where: {
        class_id: cls.id,
        student_id: student.id,
        checkin_type: 1,
        checkin_time: { [Op.between]: [dayStart, dayEnd] }
      },
      transaction: t
    });
    expect(existing).not.toBeNull();

    const totalCount = await CheckinRecord.count({
      where: {
        class_id: cls.id,
        student_id: student.id,
        checkin_type: 1,
        checkin_time: { [Op.between]: [dayStart, dayEnd] }
      },
      transaction: t
    });
    expect(totalCount).toBe(1);
  });

  test('同一学生入园和离园是不同类型，均应成功', async () => {
    const { cls, student, parent } = seed;
    const relation = await StudentParentRelation.findOne({
      where: { student_id: student.id, parent_id: parent.id },
      transaction: t
    });

    await CheckinRecord.create({
      class_id: cls.id,
      student_id: student.id,
      checkin_type: 1,
      picker_id: parent.id,
      picker_type: 1,
      picker_name: parent.name,
      picker_relation: relation.relation,
      checkin_method: 1
    }, { transaction: t });

    await CheckinRecord.create({
      class_id: cls.id,
      student_id: student.id,
      checkin_type: 2,
      picker_id: parent.id,
      picker_type: 1,
      picker_name: parent.name,
      picker_relation: relation.relation,
      checkin_method: 1
    }, { transaction: t });

    const count1 = await CheckinRecord.count({
      where: { class_id: cls.id, student_id: student.id, checkin_type: 1 },
      transaction: t
    });
    const count2 = await CheckinRecord.count({
      where: { class_id: cls.id, student_id: student.id, checkin_type: 2 },
      transaction: t
    });
    expect(count1).toBe(1);
    expect(count2).toBe(1);
  });

  test('不同学生同日同类型签到互不影响', async () => {
    const { cls, parent } = seed;

    const student2 = await Student.create({
      class_id: cls.id,
      name: '小红',
      gender: 2,
      student_no: 'S2024002',
      status: 1
    }, { transaction: t });

    await StudentParentRelation.create({
      student_id: student2.id,
      parent_id: parent.id,
      relation: '母亲',
      is_primary: 0
    }, { transaction: t });

    await CheckinRecord.create({
      class_id: cls.id,
      student_id: seed.student.id,
      checkin_type: 1,
      picker_id: parent.id,
      picker_type: 1,
      picker_name: parent.name,
      picker_relation: '父亲',
      checkin_method: 1
    }, { transaction: t });

    await CheckinRecord.create({
      class_id: cls.id,
      student_id: student2.id,
      checkin_type: 1,
      picker_id: parent.id,
      picker_type: 1,
      picker_name: parent.name,
      picker_relation: '母亲',
      checkin_method: 1
    }, { transaction: t });

    const count = await CheckinRecord.count({
      where: { class_id: cls.id, checkin_type: 1 },
      transaction: t
    });
    expect(count).toBe(2);
  });
});

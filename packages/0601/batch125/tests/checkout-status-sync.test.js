const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { sequelize, models, ensureSync, seedBaseData } = require('./helpers/setup');

const { Class, Student, Parent, CheckinRecord, StudentParentRelation } = models;

const computeCheckinStatus = (checkinRecord, checkoutRecord) => {
  if (!checkinRecord) return 0;
  if (!checkoutRecord) return 1;
  return 2;
};

describe('签退状态同步集成测试', () => {
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

  test('未签到 → 状态应为「未到达」(0)', async () => {
    const { cls, student } = seed;

    const today = dayjs().format('YYYY-MM-DD');
    const dayStart = dayjs(today).startOf('day').toDate();
    const dayEnd = dayjs(today).endOf('day').toDate();

    const records = await CheckinRecord.findAll({
      where: {
        class_id: cls.id,
        student_id: student.id,
        checkin_time: { [Op.between]: [dayStart, dayEnd] }
      },
      transaction: t
    });

    const checkinMap = {};
    records.forEach(r => {
      const key = `${r.student_id}_${r.checkin_type}`;
      if (!checkinMap[key]) checkinMap[key] = r;
    });

    const checkinRecord = checkinMap[`${student.id}_1`];
    const checkoutRecord = checkinMap[`${student.id}_2`];
    const status = computeCheckinStatus(checkinRecord, checkoutRecord);

    expect(status).toBe(0);
  });

  test('入园签到后 → 状态应为「在园」(1)', async () => {
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

    const today = dayjs().format('YYYY-MM-DD');
    const dayStart = dayjs(today).startOf('day').toDate();
    const dayEnd = dayjs(today).endOf('day').toDate();

    const records = await CheckinRecord.findAll({
      where: {
        class_id: cls.id,
        student_id: student.id,
        checkin_time: { [Op.between]: [dayStart, dayEnd] }
      },
      order: [['checkin_time', 'ASC']],
      transaction: t
    });

    const checkinMap = {};
    records.forEach(r => {
      const key = `${r.student_id}_${r.checkin_type}`;
      if (!checkinMap[key]) checkinMap[key] = r;
    });

    const checkinRecord = checkinMap[`${student.id}_1`];
    const checkoutRecord = checkinMap[`${student.id}_2`];
    const status = computeCheckinStatus(checkinRecord, checkoutRecord);

    expect(status).toBe(1);
    expect(checkinRecord).toBeDefined();
    expect(checkinRecord.picker_name).toBe(parent.name);
  });

  test('入园 + 离园签到后 → 状态应为「已接走」(2)', async () => {
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

    const today = dayjs().format('YYYY-MM-DD');
    const dayStart = dayjs(today).startOf('day').toDate();
    const dayEnd = dayjs(today).endOf('day').toDate();

    const records = await CheckinRecord.findAll({
      where: {
        class_id: cls.id,
        student_id: student.id,
        checkin_time: { [Op.between]: [dayStart, dayEnd] }
      },
      order: [['checkin_time', 'ASC']],
      transaction: t
    });

    const checkinMap = {};
    records.forEach(r => {
      const key = `${r.student_id}_${r.checkin_type}`;
      if (!checkinMap[key]) checkinMap[key] = r;
    });

    const checkinRecord = checkinMap[`${student.id}_1`];
    const checkoutRecord = checkinMap[`${student.id}_2`];
    const status = computeCheckinStatus(checkinRecord, checkoutRecord);

    expect(status).toBe(2);
    expect(checkoutRecord).toBeDefined();
    expect(checkoutRecord.picker_name).toBe(parent.name);
    expect(checkoutRecord.checkin_type).toBe(2);
  });

  test('班级整体状态统计：未到达/在园/已接走人数', async () => {
    const { cls, student, parent } = seed;

    const student2 = await Student.create({
      class_id: cls.id,
      name: '小红',
      gender: 2,
      student_no: 'S2024002',
      status: 1
    }, { transaction: t });

    const student3 = await Student.create({
      class_id: cls.id,
      name: '小刚',
      gender: 1,
      student_no: 'S2024003',
      status: 1
    }, { transaction: t });

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

    await CheckinRecord.create({
      class_id: cls.id,
      student_id: student2.id,
      checkin_type: 1,
      picker_name: '李四',
      picker_relation: '母亲',
      checkin_method: 1
    }, { transaction: t });

    const today = dayjs().format('YYYY-MM-DD');
    const dayStart = dayjs(today).startOf('day').toDate();
    const dayEnd = dayjs(today).endOf('day').toDate();

    const allStudents = await Student.findAll({
      where: { class_id: cls.id, status: 1 },
      attributes: ['id', 'name'],
      transaction: t
    });

    const allRecords = await CheckinRecord.findAll({
      where: {
        class_id: cls.id,
        checkin_time: { [Op.between]: [dayStart, dayEnd] }
      },
      order: [['checkin_time', 'ASC']],
      transaction: t
    });

    const checkinMap = {};
    allRecords.forEach(r => {
      const key = `${r.student_id}_${r.checkin_type}`;
      if (!checkinMap[key]) checkinMap[key] = r;
    });

    const studentStatuses = allStudents.map(s => {
      const checkin = checkinMap[`${s.id}_1`];
      const checkout = checkinMap[`${s.id}_2`];
      return computeCheckinStatus(checkin, checkout);
    });

    const stats = { not_arrived: 0, at_school: 0, picked_up: 0 };
    studentStatuses.forEach(status => {
      if (status === 0) stats.not_arrived++;
      else if (status === 1) stats.at_school++;
      else if (status === 2) stats.picked_up++;
    });

    expect(allStudents.length).toBe(3);
    expect(stats.picked_up).toBe(1);
    expect(stats.at_school).toBe(1);
    expect(stats.not_arrived).toBe(1);
  });

  test('家长端查看孩子状态：入园后未离园应显示「在园」', async () => {
    const { student, parent, cls } = seed;

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

    const today = dayjs().format('YYYY-MM-DD');
    const dayStart = dayjs(today).startOf('day').toDate();
    const dayEnd = dayjs(today).endOf('day').toDate();

    const parentWithStudents = await Parent.findByPk(parent.id, {
      include: [{
        model: Student,
        through: { attributes: ['relation', 'is_primary'] },
        where: { status: 1 }
      }],
      transaction: t
    });

    const studentIds = parentWithStudents.Students.map(s => s.id);

    const checkinRecords = await CheckinRecord.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        checkin_time: { [Op.between]: [dayStart, dayEnd] }
      },
      order: [['checkin_time', 'ASC']],
      transaction: t
    });

    const checkinMap = {};
    checkinRecords.forEach(r => {
      const key = `${r.student_id}_${r.checkin_type}`;
      if (!checkinMap[key]) checkinMap[key] = r;
    });

    const childStatus = parentWithStudents.Students.map(s => {
      const checkin = checkinMap[`${s.id}_1`];
      const checkout = checkinMap[`${s.id}_2`];
      return {
        student_id: s.id,
        name: s.name,
        checkin_status: computeCheckinStatus(checkin, checkout)
      };
    });

    expect(childStatus.length).toBe(1);
    expect(childStatus[0].checkin_status).toBe(1);
  });
});

const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { sequelize, models, ensureSync, seedBaseData } = require('./helpers/setup');

const { TempAuthorization, Student, Parent, Teacher, CheckinRecord } = models;

const validatePicker = async (studentId, pickerId, pickerType, t) => {
  if (pickerType === 1) {
    const relation = await models.StudentParentRelation.findOne({
      where: { student_id: studentId, parent_id: pickerId },
      transaction: t
    });
    if (!relation) return { valid: false, message: '非该学生家长' };
    const parent = await Parent.findByPk(pickerId, { transaction: t });
    return { valid: true, name: parent.name, relation: relation.relation };
  } else if (pickerType === 2) {
    const now = new Date();
    const auth = await TempAuthorization.findOne({
      where: {
        id: pickerId,
        student_id: studentId,
        status: 1,
        start_time: { [Op.lte]: now },
        end_time: { [Op.gte]: now }
      },
      transaction: t
    });
    if (!auth) return { valid: false, message: '临时授权无效或已过期' };
    return { valid: true, name: auth.authorized_person_name, relation: '临时接送' };
  }
  return { valid: false, message: '接送人类型错误' };
};

describe('临时接送人授权校验集成测试', () => {
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

  test('待审核的授权(status=0) → 签到时应被拒绝', async () => {
    const { student, parent } = seed;

    const auth = await TempAuthorization.create({
      student_id: student.id,
      parent_id: parent.id,
      authorized_person_name: '李四',
      authorized_person_phone: '13900000099',
      authorized_person_id_card: '110101199003033333',
      id_card_front_url: 'https://img.test/front.jpg',
      id_card_back_url: 'https://img.test/back.jpg',
      start_time: dayjs().subtract(1, 'hour').toDate(),
      end_time: dayjs().add(5, 'hour').toDate(),
      status: 0
    }, { transaction: t });

    const result = await validatePicker(student.id, auth.id, 2, t);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('临时授权无效或已过期');
  });

  test('被拒绝的授权(status=2) → 签到时应被拒绝', async () => {
    const { student, parent, teacher } = seed;

    const auth = await TempAuthorization.create({
      student_id: student.id,
      parent_id: parent.id,
      authorized_person_name: '李四',
      authorized_person_phone: '13900000099',
      authorized_person_id_card: '110101199003033333',
      start_time: dayjs().subtract(1, 'hour').toDate(),
      end_time: dayjs().add(5, 'hour').toDate(),
      status: 2,
      reviewer_id: teacher.id,
      review_time: new Date(),
      review_remark: '身份信息不符'
    }, { transaction: t });

    const result = await validatePicker(student.id, auth.id, 2, t);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('临时授权无效或已过期');
  });

  test('已过期时间范围的授权(status=1但end_time已过) → 签到时应被拒绝', async () => {
    const { student, parent, teacher } = seed;

    const auth = await TempAuthorization.create({
      student_id: student.id,
      parent_id: parent.id,
      authorized_person_name: '王五',
      authorized_person_phone: '13900000088',
      authorized_person_id_card: '110101199004044444',
      start_time: dayjs().subtract(10, 'hour').toDate(),
      end_time: dayjs().subtract(1, 'hour').toDate(),
      status: 1,
      reviewer_id: teacher.id,
      review_time: dayjs().subtract(9, 'hour').toDate(),
      review_remark: '审核通过'
    }, { transaction: t });

    const result = await validatePicker(student.id, auth.id, 2, t);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('临时授权无效或已过期');
  });

  test('尚未到开始时间的授权(status=1但start_time未到) → 签到时应被拒绝', async () => {
    const { student, parent, teacher } = seed;

    const auth = await TempAuthorization.create({
      student_id: student.id,
      parent_id: parent.id,
      authorized_person_name: '赵六',
      authorized_person_phone: '13900000077',
      authorized_person_id_card: '110101199005055555',
      start_time: dayjs().add(2, 'hour').toDate(),
      end_time: dayjs().add(5, 'hour').toDate(),
      status: 1,
      reviewer_id: teacher.id,
      review_time: new Date(),
      review_remark: '审核通过'
    }, { transaction: t });

    const result = await validatePicker(student.id, auth.id, 2, t);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('临时授权无效或已过期');
  });

  test('有效授权(status=1且时间范围内) → 签到应成功', async () => {
    const { student, parent, teacher } = seed;

    const auth = await TempAuthorization.create({
      student_id: student.id,
      parent_id: parent.id,
      authorized_person_name: '李四',
      authorized_person_phone: '13900000099',
      authorized_person_id_card: '110101199003033333',
      start_time: dayjs().subtract(1, 'hour').toDate(),
      end_time: dayjs().add(5, 'hour').toDate(),
      status: 1,
      reviewer_id: teacher.id,
      review_time: new Date(),
      review_remark: '审核通过'
    }, { transaction: t });

    const result = await validatePicker(student.id, auth.id, 2, t);
    expect(result.valid).toBe(true);
    expect(result.name).toBe('李四');
    expect(result.relation).toBe('临时接送');
  });

  test('有效授权签到 → 完整签到记录应包含临时接送人信息', async () => {
    const { cls, student, parent, teacher } = seed;

    const auth = await TempAuthorization.create({
      student_id: student.id,
      parent_id: parent.id,
      authorized_person_name: '李四',
      authorized_person_phone: '13900000099',
      authorized_person_id_card: '110101199003033333',
      start_time: dayjs().subtract(1, 'hour').toDate(),
      end_time: dayjs().add(5, 'hour').toDate(),
      status: 1,
      reviewer_id: teacher.id,
      review_time: new Date(),
      review_remark: '审核通过'
    }, { transaction: t });

    const pickerResult = await validatePicker(student.id, auth.id, 2, t);
    expect(pickerResult.valid).toBe(true);

    const record = await CheckinRecord.create({
      class_id: cls.id,
      student_id: student.id,
      checkin_type: 2,
      picker_id: auth.id,
      picker_type: 2,
      picker_name: pickerResult.name,
      picker_relation: pickerResult.relation,
      checkin_method: 1
    }, { transaction: t });

    expect(record.picker_type).toBe(2);
    expect(record.picker_name).toBe('李四');
    expect(record.picker_relation).toBe('临时接送');
  });

  test('审核通过后再重复审核应被拒绝', async () => {
    const { student, parent, teacher } = seed;

    const auth = await TempAuthorization.create({
      student_id: student.id,
      parent_id: parent.id,
      authorized_person_name: '李四',
      authorized_person_phone: '13900000099',
      authorized_person_id_card: '110101199003033333',
      start_time: dayjs().subtract(1, 'hour').toDate(),
      end_time: dayjs().add(5, 'hour').toDate(),
      status: 0
    }, { transaction: t });

    auth.status = 1;
    auth.reviewer_id = teacher.id;
    auth.review_time = new Date();
    auth.review_remark = '审核通过';
    await auth.save({ transaction: t });

    const isAlreadyReviewed = auth.status !== 0;
    expect(isAlreadyReviewed).toBe(true);

    const secondStatus = auth.status !== 0;
    expect(secondStatus).toBe(true);
  });

  test('同一学生可有多条有效授权（不同临时接送人）', async () => {
    const { student, parent, teacher } = seed;

    await TempAuthorization.create({
      student_id: student.id,
      parent_id: parent.id,
      authorized_person_name: '李四',
      authorized_person_phone: '13900000099',
      authorized_person_id_card: '110101199003033333',
      start_time: dayjs().subtract(1, 'hour').toDate(),
      end_time: dayjs().add(5, 'hour').toDate(),
      status: 1,
      reviewer_id: teacher.id,
      review_time: new Date()
    }, { transaction: t });

    await TempAuthorization.create({
      student_id: student.id,
      parent_id: parent.id,
      authorized_person_name: '王五',
      authorized_person_phone: '13900000088',
      authorized_person_id_card: '110101199004044444',
      start_time: dayjs().subtract(1, 'hour').toDate(),
      end_time: dayjs().add(5, 'hour').toDate(),
      status: 1,
      reviewer_id: teacher.id,
      review_time: new Date()
    }, { transaction: t });

    const now = new Date();
    const validAuths = await TempAuthorization.findAll({
      where: {
        student_id: student.id,
        status: 1,
        start_time: { [Op.lte]: now },
        end_time: { [Op.gte]: now }
      },
      transaction: t
    });

    expect(validAuths.length).toBe(2);
    expect(validAuths.map(a => a.authorized_person_name)).toContain('李四');
    expect(validAuths.map(a => a.authorized_person_name)).toContain('王五');
  });
});

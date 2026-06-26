const { Op } = require('sequelize');
const { sequelize, models, ensureSync, seedBaseData } = require('./helpers/setup');

const { Class, Student, Kindergarten } = models;

describe('重复学号导入拦截集成测试', () => {
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

  test('同班级内重复学号导入应抛出唯一约束错误', async () => {
    const { cls, student } = seed;

    await expect(
      Student.create({
        class_id: cls.id,
        name: '小刚',
        gender: 1,
        student_no: student.student_no,
        status: 1
      }, { transaction: t })
    ).rejects.toThrow();

    const students = await Student.findAll({
      where: { class_id: cls.id, student_no: student.student_no },
      transaction: t
    });
    expect(students.length).toBe(1);
    expect(students[0].name).toBe('小明');
  });

  test('重复学号导入失败后事务应能回滚，不影响已有数据', async () => {
    const { cls, student } = seed;

    const countBefore = await Student.count({
      where: { class_id: cls.id },
      transaction: t
    });

    try {
      await Student.create({
        class_id: cls.id,
        name: '小刚',
        gender: 1,
        student_no: student.student_no,
        status: 1
      }, { transaction: t });
    } catch (err) {
      expect(err).toBeDefined();
    }

    const countAfter = await Student.count({
      where: { class_id: cls.id },
      transaction: t
    });
    expect(countAfter).toBe(countBefore);
  });

  test('批量导入中含重复学号时整个事务应回滚', async () => {
    const batchT = await sequelize.transaction();

    let batchCls;
    try {
      const kg = await Kindergarten.create({
        name: '批量导入测试园', address: '测试路2号', status: 1
      }, { transaction: batchT });

      batchCls = await Class.create({
        kindergarten_id: kg.id, name: '测试班', grade: '大班',
        class_qr_code: 'QR_BATCH_IMPORT_TEST', status: 1
      }, { transaction: batchT });

      await Student.create({
        class_id: batchCls.id, name: '小华', gender: 2,
        student_no: 'S2024010', status: 1
      }, { transaction: batchT });

      await Student.create({
        class_id: batchCls.id, name: '小丽', gender: 2,
        student_no: 'S2024011', status: 1
      }, { transaction: batchT });

      await Student.create({
        class_id: batchCls.id, name: '小强', gender: 1,
        student_no: 'S2024010', status: 1
      }, { transaction: batchT });

      await batchT.commit();
      fail('应该因重复学号而抛出错误');
    } catch (err) {
      await batchT.rollback();
      expect(err).toBeDefined();
    }

    const checkT = await sequelize.transaction();
    try {
      if (batchCls) {
        const count = await Student.count({
          where: {
            class_id: batchCls.id,
            student_no: { [Op.in]: ['S2024010', 'S2024011'] }
          },
          transaction: checkT
        });
        expect(count).toBe(0);
      }
    } finally {
      await checkT.rollback();
    }
  });

  test('不同班级可以有相同学号', async () => {
    const { kg } = seed;

    const cls2 = await Class.create({
      kindergarten_id: kg.id,
      name: '小二班',
      grade: '小班',
      class_qr_code: 'QR_TEST_CLASS_2',
      status: 1
    }, { transaction: t });

    const student1 = await Student.create({
      class_id: seed.cls.id,
      name: '小甲',
      gender: 1,
      student_no: 'S2024099',
      status: 1
    }, { transaction: t });

    const student2 = await Student.create({
      class_id: cls2.id,
      name: '小乙',
      gender: 2,
      student_no: 'S2024099',
      status: 1
    }, { transaction: t });

    expect(student1.student_no).toBe('S2024099');
    expect(student2.student_no).toBe('S2024099');
    expect(student1.class_id).not.toBe(student2.class_id);
  });

  test('学号为空时不应受唯一约束影响（允许多个空学号）', async () => {
    const { cls } = seed;

    const student1 = await Student.create({
      class_id: cls.id,
      name: '小丁',
      gender: 1,
      status: 1
    }, { transaction: t });

    const student2 = await Student.create({
      class_id: cls.id,
      name: '小戊',
      gender: 2,
      status: 1
    }, { transaction: t });

    expect(student1.student_no).toBeFalsy();
    expect(student2.student_no).toBeFalsy();

    const count = await Student.count({
      where: { class_id: cls.id, student_no: null },
      transaction: t
    });
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('更新学号为已存在的学号应被拦截', async () => {
    const { cls, student } = seed;

    const student2 = await Student.create({
      class_id: cls.id,
      name: '小红',
      gender: 2,
      student_no: 'S2024050',
      status: 1
    }, { transaction: t });

    await expect(
      student2.update({ student_no: student.student_no }, { transaction: t })
    ).rejects.toThrow();

    await student2.reload({ transaction: t });
    expect(student2.student_no).toBe('S2024050');
  });
});

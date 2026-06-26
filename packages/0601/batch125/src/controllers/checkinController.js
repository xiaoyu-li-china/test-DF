const { Op, QueryTypes } = require('sequelize');
const dayjs = require('dayjs');
const { sequelize } = require('../config/database');
const {
  Class,
  Student,
  Parent,
  TempAuthorization,
  CheckinRecord,
  CheckinSequence,
  StudentParentRelation
} = require('../models');
const { success, error, pagination } = require('../utils/response');

const getNextSequence = async (classId, date) => {
  const [sequence] = await CheckinSequence.findOrCreate({
    where: { class_id: classId, checkin_date: date },
    defaults: { sequence: 0 }
  });
  sequence.sequence += 1;
  await sequence.save();
  return sequence.sequence;
};

const validatePicker = async (studentId, pickerId, pickerType) => {
  if (pickerType === 1) {
    const relation = await StudentParentRelation.findOne({
      where: { student_id: studentId, parent_id: pickerId }
    });
    if (!relation) return { valid: false, message: '非该学生家长' };
    const parent = await Parent.findByPk(pickerId);
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
      }
    });
    if (!auth) return { valid: false, message: '临时授权无效或已过期' };
    return { valid: true, name: auth.authorized_person_name, relation: '临时接送' };
  }
  return { valid: false, message: '接送人类型错误' };
};

const scanCheckin = async (req, res, next) => {
  try {
    const { class_qr_code, student_id, checkin_type, picker_id, picker_type } = req.body;

    const classInfo = await Class.findOne({ where: { class_qr_code, status: 1 } });
    if (!classInfo) {
      return res.status(400).json(error(400, '班级二维码无效'));
    }

    const student = await Student.findOne({
      where: { id: student_id, class_id: classInfo.id, status: 1 }
    });
    if (!student) {
      return res.status(400).json(error(400, '学生信息无效'));
    }

    const pickerResult = await validatePicker(student_id, picker_id, picker_type);
    if (!pickerResult.valid) {
      return res.status(400).json(error(400, pickerResult.message));
    }

    const today = dayjs().format('YYYY-MM-DD');
    const existingRecord = await CheckinRecord.findOne({
      where: {
        class_id: classInfo.id,
        student_id,
        checkin_type,
        checkin_time: {
          [Op.between]: [
            dayjs(today).startOf('day').toDate(),
            dayjs(today).endOf('day').toDate()
          ]
        }
      }
    });
    if (existingRecord) {
      return res.status(400).json(error(400, '今日已签到，请勿重复签到'));
    }

    const sequenceNo = await getNextSequence(classInfo.id, today);

    const record = await CheckinRecord.create({
      class_id: classInfo.id,
      student_id,
      checkin_type,
      picker_id,
      picker_type,
      picker_name: pickerResult.name,
      picker_relation: pickerResult.relation,
      checkin_method: 1
    });

    res.json(success({
      record_id: record.id,
      student_name: student.name,
      checkin_time: record.checkin_time,
      checkin_type,
      sequence_no: sequenceNo
    }, '签到成功'));
  } catch (err) {
    next(err);
  }
};

const manualCheckin = async (req, res, next) => {
  try {
    const { class_id, student_id, checkin_type, checkin_time, picker_name, picker_relation, remark } = req.body;
    const teacherId = req.user.id;

    const student = await Student.findOne({
      where: { id: student_id, class_id, status: 1 }
    });
    if (!student) {
      return res.status(400).json(error(400, '学生信息无效'));
    }

    const checkinDate = checkin_time ? dayjs(checkin_time).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
    const existingRecord = await CheckinRecord.findOne({
      where: {
        class_id,
        student_id,
        checkin_type,
        checkin_time: {
          [Op.between]: [
            dayjs(checkinDate).startOf('day').toDate(),
            dayjs(checkinDate).endOf('day').toDate()
          ]
        }
      }
    });
    if (existingRecord) {
      return res.status(400).json(error(400, '该日此类型签到已存在，请勿重复补签'));
    }

    const record = await CheckinRecord.create({
      class_id,
      student_id,
      checkin_type,
      checkin_time: checkin_time || new Date(),
      picker_name,
      picker_relation,
      checkin_method: 2,
      operator_id: teacherId,
      remark
    });

    res.json(success({ record_id: record.id }, '补签成功'));
  } catch (err) {
    next(err);
  }
};

const getClassTodayCheckinStatus = async (req, res, next) => {
  try {
    const { class_id } = req.params;
    const { checkin_type } = req.query;

    const classInfo = await Class.findByPk(class_id);
    if (!classInfo) {
      return res.status(404).json(error(404, '班级不存在'));
    }

    const students = await Student.findAll({
      where: { class_id, status: 1 },
      attributes: ['id', 'name', 'avatar_url']
    });

    const today = dayjs().format('YYYY-MM-DD');
    const startOfDay = dayjs(today).startOf('day').toDate();
    const endOfDay = dayjs(today).endOf('day').toDate();

    const checkinRecords = await CheckinRecord.findAll({
      where: {
        class_id,
        checkin_time: { [Op.between]: [startOfDay, endOfDay] }
      },
      order: [['checkin_time', 'ASC']],
      attributes: ['student_id', 'checkin_type', 'checkin_time', 'picker_name', 'picker_relation']
    });

    const studentCheckinMap = {};
    checkinRecords.forEach(record => {
      const key = `${record.student_id}_${record.checkin_type}`;
      if (!studentCheckinMap[key]) {
        studentCheckinMap[key] = record;
      }
    });

    const studentList = students.map(student => {
      const checkinRecord = studentCheckinMap[`${student.id}_1`];
      const checkoutRecord = studentCheckinMap[`${student.id}_2`];

      let checkinStatus;
      let displayRecord;

      if (checkin_type) {
        const record = studentCheckinMap[`${student.id}_${parseInt(checkin_type)}`];
        checkinStatus = record ? 1 : 0;
        displayRecord = record;
      } else {
        if (!checkinRecord) {
          checkinStatus = 0;
          displayRecord = null;
        } else if (!checkoutRecord) {
          checkinStatus = 1;
          displayRecord = checkinRecord;
        } else {
          checkinStatus = 2;
          displayRecord = checkoutRecord;
        }
      }

      return {
        student_id: student.id,
        student_name: student.name,
        avatar_url: student.avatar_url,
        checkin_status: checkinStatus,
        checkin_time: displayRecord?.checkin_time || null,
        picker_name: displayRecord?.picker_name || null,
        picker_relation: displayRecord?.picker_relation || null
      };
    });

    const stats = {
      not_arrived: 0,
      at_school: 0,
      picked_up: 0
    };
    studentList.forEach(s => {
      if (s.checkin_status === 0) stats.not_arrived++;
      else if (s.checkin_status === 1) stats.at_school++;
      else if (s.checkin_status === 2) stats.picked_up++;
    });

    res.json(success({
      class_id: classInfo.id,
      class_name: classInfo.name,
      total_students: students.length,
      stats,
      students: studentList
    }));
  } catch (err) {
    next(err);
  }
};

const getStudentCheckinRecords = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { start_date, end_date, page = 1, page_size = 20 } = req.query;

    const whereCondition = { student_id };
    if (start_date) {
      whereCondition.checkin_time = { ...whereCondition.checkin_time, [Op.gte]: dayjs(start_date).startOf('day').toDate() };
    }
    if (end_date) {
      whereCondition.checkin_time = { ...whereCondition.checkin_time, [Op.lte]: dayjs(end_date).endOf('day').toDate() };
    }

    const { count, rows } = await CheckinRecord.findAndCountAll({
      where: whereCondition,
      order: [['checkin_time', 'DESC']],
      limit: parseInt(page_size),
      offset: (parseInt(page) - 1) * parseInt(page_size),
      attributes: ['id', 'checkin_type', 'checkin_time', 'picker_name', 'picker_relation', 'checkin_method']
    });

    const list = rows.map(row => ({
      record_id: row.id,
      checkin_type: row.checkin_type,
      checkin_time: row.checkin_time,
      picker_name: row.picker_name,
      picker_relation: row.picker_relation,
      checkin_method: row.checkin_method
    }));

    res.json(success(pagination(list, count, parseInt(page), parseInt(page_size))));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  scanCheckin,
  manualCheckin,
  getClassTodayCheckinStatus,
  getStudentCheckinRecords
};

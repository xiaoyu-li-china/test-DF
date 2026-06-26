const { Op } = require('sequelize');
const dayjs = require('dayjs');
const {
  Parent,
  Student,
  StudentParentRelation,
  Class,
  CheckinRecord
} = require('../models');
const { success, error } = require('../utils/response');

const getParentChildren = async (req, res, next) => {
  try {
    const parentId = req.user.id;

    const parent = await Parent.findByPk(parentId, {
      include: [
        {
          model: Student,
          through: { attributes: ['relation', 'is_primary'] },
          include: [
            {
              model: Class,
              attributes: ['id', 'name']
            }
          ],
          where: { status: 1 }
        }
      ]
    });

    if (!parent) {
      return res.status(404).json(error(404, '家长不存在'));
    }

    const list = (parent.Students || []).map(student => ({
      student_id: student.id,
      name: student.name,
      class_id: student.class_id,
      class_name: student.Class?.name,
      relation: student.StudentParentRelation?.relation,
      is_primary: student.StudentParentRelation?.is_primary
    }));

    res.json(success({ list }));
  } catch (err) {
    next(err);
  }
};

const getChildrenTodayStatus = async (req, res, next) => {
  try {
    const parentId = req.user.id;

    const parent = await Parent.findByPk(parentId, {
      include: [
        {
          model: Student,
          through: { attributes: ['relation', 'is_primary'] },
          include: [
            {
              model: Class,
              attributes: ['id', 'name']
            }
          ],
          where: { status: 1 }
        }
      ]
    });

    if (!parent) {
      return res.status(404).json(error(404, '家长不存在'));
    }

    const studentIds = (parent.Students || []).map(s => s.id);
    const today = dayjs().format('YYYY-MM-DD');
    const startOfDay = dayjs(today).startOf('day').toDate();
    const endOfDay = dayjs(today).endOf('day').toDate();

    const checkinRecords = await CheckinRecord.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        checkin_time: { [Op.between]: [startOfDay, endOfDay] }
      },
      order: [['checkin_time', 'ASC']],
      attributes: ['student_id', 'checkin_type', 'checkin_time', 'picker_name', 'picker_relation']
    });

    const checkinMap = {};
    checkinRecords.forEach(record => {
      const key = `${record.student_id}_${record.checkin_type}`;
      if (!checkinMap[key]) {
        checkinMap[key] = record;
      }
    });

    const list = (parent.Students || []).map(student => {
      const checkinRecord = checkinMap[`${student.id}_1`];
      const checkoutRecord = checkinMap[`${student.id}_2`];

      let checkinStatus;
      let displayRecord;

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

      return {
        student_id: student.id,
        name: student.name,
        class_id: student.class_id,
        class_name: student.Class?.name,
        checkin_status: checkinStatus,
        checkin_time: displayRecord?.checkin_time || null,
        picker_name: displayRecord?.picker_name || null,
        picker_relation: displayRecord?.picker_relation || null
      };
    });

    res.json(success({ list }));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getParentChildren,
  getChildrenTodayStatus
};

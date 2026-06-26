const { Op } = require('sequelize');
const {
  Class,
  Teacher,
  Student,
  ClassTeacherRelation,
  CheckinRecord
} = require('../models');
const { success, error } = require('../utils/response');
const dayjs = require('dayjs');

const getClassInfo = async (req, res, next) => {
  try {
    const { class_id } = req.params;

    const classInfo = await Class.findByPk(class_id, {
      include: [
        {
          model: Teacher,
          through: { attributes: ['role'] },
          attributes: ['id', 'name']
        }
      ]
    });

    if (!classInfo) {
      return res.status(404).json(error(404, '班级不存在'));
    }

    const studentCount = await Student.count({
      where: { class_id, status: 1 }
    });

    const teachers = classInfo.Teachers?.map(teacher => ({
      teacher_id: teacher.id,
      name: teacher.name,
      role: teacher.ClassTeacherRelation?.role
    })) || [];

    res.json(success({
      class_id: classInfo.id,
      kindergarten_id: classInfo.kindergarten_id,
      name: classInfo.name,
      grade: classInfo.grade,
      class_qr_code: classInfo.class_qr_code,
      student_count: studentCount,
      teachers
    }));
  } catch (err) {
    next(err);
  }
};

const getTeacherClasses = async (req, res, next) => {
  try {
    const teacherId = req.user.id;

    const teacher = await Teacher.findByPk(teacherId, {
      include: [
        {
          model: Class,
          through: { attributes: ['role'] },
          where: { status: 1 }
        }
      ]
    });

    if (!teacher) {
      return res.status(404).json(error(404, '老师不存在'));
    }

    const list = await Promise.all(
      (teacher.Classes || []).map(async (classItem) => {
        const studentCount = await Student.count({
          where: { class_id: classItem.id, status: 1 }
        });
        return {
          class_id: classItem.id,
          name: classItem.name,
          grade: classItem.grade,
          student_count: studentCount
        };
      })
    );

    res.json(success({ list }));
  } catch (err) {
    next(err);
  }
};

const getClassDailyStats = async (req, res, next) => {
  try {
    const { class_id } = req.params;
    const { date } = req.query;

    const classInfo = await Class.findByPk(class_id);
    if (!classInfo) {
      return res.status(404).json(error(404, '班级不存在'));
    }

    const targetDate = date ? dayjs(date) : dayjs();
    const startOfDay = targetDate.startOf('day').toDate();
    const endOfDay = targetDate.endOf('day').toDate();

    const totalStudents = await Student.count({
      where: { class_id, status: 1 }
    });

    const morningRecords = await CheckinRecord.findAll({
      where: {
        class_id,
        checkin_type: 1,
        checkin_time: { [Op.between]: [startOfDay, endOfDay] }
      },
      attributes: ['student_id']
    });

    const eveningRecords = await CheckinRecord.findAll({
      where: {
        class_id,
        checkin_type: 2,
        checkin_time: { [Op.between]: [startOfDay, endOfDay] }
      },
      attributes: ['student_id']
    });

    const morningCheckedIn = new Set(morningRecords.map(r => r.student_id)).size;
    const eveningCheckedIn = new Set(eveningRecords.map(r => r.student_id)).size;

    res.json(success({
      class_id: classInfo.id,
      class_name: classInfo.name,
      date: targetDate.format('YYYY-MM-DD'),
      total_students: totalStudents,
      checkin_stats: {
        morning: {
          checked_in: morningCheckedIn,
          not_checked_in: totalStudents - morningCheckedIn,
          checkin_rate: totalStudents > 0 ? ((morningCheckedIn / totalStudents) * 100).toFixed(2) : 0
        },
        evening: {
          checked_in: eveningCheckedIn,
          not_checked_in: totalStudents - eveningCheckedIn,
          checkin_rate: totalStudents > 0 ? ((eveningCheckedIn / totalStudents) * 100).toFixed(2) : 0
        }
      }
    }));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getClassInfo,
  getTeacherClasses,
  getClassDailyStats
};

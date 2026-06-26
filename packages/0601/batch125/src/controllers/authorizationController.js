const { Op } = require('sequelize');
const {
  TempAuthorization,
  Student,
  Parent,
  Teacher
} = require('../models');
const { success, error, pagination } = require('../utils/response');

const createTempAuthorization = async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const {
      student_id,
      authorized_person_name,
      authorized_person_phone,
      authorized_person_id_card,
      id_card_front_url,
      id_card_back_url,
      start_time,
      end_time
    } = req.body;

    const authorization = await TempAuthorization.create({
      student_id,
      parent_id: parentId,
      authorized_person_name,
      authorized_person_phone,
      authorized_person_id_card,
      id_card_front_url,
      id_card_back_url,
      start_time,
      end_time,
      status: 0
    });

    res.json(success({
      authorization_id: authorization.id
    }, '授权申请提交成功，等待审核'));
  } catch (err) {
    next(err);
  }
};

const reviewAuthorization = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;
    const { status, review_remark } = req.body;

    if (![1, 2].includes(status)) {
      return res.status(400).json(error(400, '审核状态无效'));
    }

    const authorization = await TempAuthorization.findByPk(id);
    if (!authorization) {
      return res.status(404).json(error(404, '授权记录不存在'));
    }

    if (authorization.status !== 0) {
      return res.status(400).json(error(400, '该授权已审核，不可重复审核'));
    }

    authorization.status = status;
    authorization.reviewer_id = teacherId;
    authorization.review_time = new Date();
    authorization.review_remark = review_remark;
    await authorization.save();

    res.json(success({
      authorization_id: authorization.id,
      status: authorization.status
    }, '审核完成'));
  } catch (err) {
    next(err);
  }
};

const getAuthorizationList = async (req, res, next) => {
  try {
    const { student_id, status, page = 1, page_size = 20 } = req.query;

    const whereCondition = {};
    if (student_id) whereCondition.student_id = student_id;
    if (status !== undefined) whereCondition.status = parseInt(status);

    const { count, rows } = await TempAuthorization.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Student,
          attributes: ['name']
        },
        {
          model: Teacher,
          as: 'reviewer',
          attributes: ['name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(page_size),
      offset: (parseInt(page) - 1) * parseInt(page_size)
    });

    const list = rows.map(row => ({
      authorization_id: row.id,
      student_id: row.student_id,
      student_name: row.Student?.name,
      authorized_person_name: row.authorized_person_name,
      authorized_person_phone: row.authorized_person_phone,
      start_time: row.start_time,
      end_time: row.end_time,
      status: row.status,
      reviewer_name: row.reviewer?.name
    }));

    res.json(success(pagination(list, count, parseInt(page), parseInt(page_size))));
  } catch (err) {
    next(err);
  }
};

const getStudentValidAuthorizations = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const now = new Date();

    const authorizations = await TempAuthorization.findAll({
      where: {
        student_id,
        status: 1,
        start_time: { [Op.lte]: now },
        end_time: { [Op.gte]: now }
      },
      order: [['end_time', 'ASC']]
    });

    const list = authorizations.map(row => ({
      authorization_id: row.id,
      authorized_person_name: row.authorized_person_name,
      authorized_person_phone: row.authorized_person_phone,
      authorized_person_id_card: row.authorized_person_id_card,
      start_time: row.start_time,
      end_time: row.end_time
    }));

    res.json(success({ list }));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTempAuthorization,
  reviewAuthorization,
  getAuthorizationList,
  getStudentValidAuthorizations
};

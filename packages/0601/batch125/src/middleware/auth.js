const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json(error(401, '未提供认证token'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json(error(403, '权限不足'));
  }
  next();
};

module.exports = {
  auth,
  requireRole
};

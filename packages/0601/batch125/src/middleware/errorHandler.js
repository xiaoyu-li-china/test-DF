const { error } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json(error(400, '参数验证失败', errors));
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(error(401, '无效的token'));
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(error(401, 'token已过期'));
  }

  res.status(500).json(error(500, '服务器内部错误'));
};

module.exports = errorHandler;

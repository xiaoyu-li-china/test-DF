const success = (data = null, message = 'success') => ({
  code: 0,
  message,
  data
});

const error = (code, message, data = null) => ({
  code,
  message,
  data
});

const pagination = (list, total, page, pageSize) => ({
  list,
  total,
  page,
  page_size: pageSize,
  total_pages: Math.ceil(total / pageSize)
});

module.exports = {
  success,
  error,
  pagination
};

const Joi = require("joi");

const refundSchema = Joi.object({
  reason: Joi.string().required(),
  amount: Joi.number().positive().optional(),
});

module.exports = { refundSchema };

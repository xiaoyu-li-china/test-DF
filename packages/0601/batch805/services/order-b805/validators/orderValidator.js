const Joi = require("joi");

const createOrderSchema = Joi.object({
  item: Joi.string().required(),
  amount: Joi.number().positive().required(),
});

module.exports = { createOrderSchema };

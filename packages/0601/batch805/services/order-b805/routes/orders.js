const express = require("express");
const router = express.Router();
const { createOrderSchema } = require("../validators/orderValidator");
const { createOrder, getOrder } = require("../services/orderService");

router.post("/", (req, res) => {
  const { error, value } = createOrderSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const order = createOrder(value);
  res.status(201).json(order);
});

router.get("/:id", (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

module.exports = router;

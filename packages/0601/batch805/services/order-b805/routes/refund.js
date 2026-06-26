const express = require("express");
const router = express.Router();
const { refundSchema } = require("../validators/refundValidator");
const { processRefund } = require("../services/refundService");

router.post("/:id/refund", (req, res) => {
  const { error, value } = refundSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const result = processRefund(req.params.id, value);
  res.status(result.status).json(result.body);
});

module.exports = router;

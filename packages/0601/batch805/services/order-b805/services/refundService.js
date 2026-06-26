const { refundOrder, getOrder } = require("./orderService");

function processRefund(orderId, { reason, amount }) {
  const existing = getOrder(orderId);
  if (!existing) {
    return { status: 404, body: { error: "Order not found" } };
  }

  const result = refundOrder(orderId, { reason, amount });

  if (result.error === "invalid_status") {
    return { status: 409, body: { error: "Order status is not paid", currentStatus: result.order.status } };
  }

  if (result.idempotent) {
    return { status: 200, body: result.order };
  }

  return { status: 200, body: result.order };
}

module.exports = { processRefund };

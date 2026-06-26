const orders = new Map();

function createOrder({ item, amount }) {
  const id = require("uuid").v4();
  const order = {
    id,
    item,
    amount,
    status: "paid",
    createdAt: new Date().toISOString(),
  };
  orders.set(id, order);
  return order;
}

function getOrder(id) {
  return orders.get(id) || null;
}

function refundOrder(id, { reason, amount }) {
  const order = orders.get(id);
  if (!order) return { error: "not_found", order: null };
  if (order.status === "refunded") {
    return { error: null, order, idempotent: true };
  }
  if (order.status !== "paid") {
    return { error: "invalid_status", order, idempotent: false };
  }
  order.status = "refunded";
  order.refund = {
    reason,
    amount: amount !== undefined ? amount : order.amount,
    refundedAt: new Date().toISOString(),
  };
  return { error: null, order, idempotent: false };
}

module.exports = { createOrder, getOrder, refundOrder, _orders: orders };

const request = require("supertest");
const app = require("../app");
const { _orders } = require("../services/orderService");

beforeEach(() => {
  _orders.clear();
});

describe("POST /orders/:id/refund", () => {
  function createPaidOrder() {
    return request(app)
      .post("/orders")
      .send({ item: "Widget", amount: 100 });
  }

  it("should refund a paid order and return 200", async () => {
    const createRes = await createPaidOrder();
    const orderId = createRes.body.id;

    const res = await request(app)
      .post(`/orders/${orderId}/refund`)
      .send({ reason: "defective" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("refunded");
    expect(res.body.refund.reason).toBe("defective");
    expect(res.body.refund.amount).toBe(100);
  });

  it("should return 200 idempotent when order is already refunded", async () => {
    const createRes = await createPaidOrder();
    const orderId = createRes.body.id;

    await request(app)
      .post(`/orders/${orderId}/refund`)
      .send({ reason: "first" });

    const res = await request(app)
      .post(`/orders/${orderId}/refund`)
      .send({ reason: "second" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("refunded");
    expect(res.body.refund.reason).toBe("first");
  });

  it("should return 409 when order status is neither paid nor refunded", async () => {
    const createRes = await createPaidOrder();
    const orderId = createRes.body.id;

    const order = _orders.get(orderId);
    order.status = "cancelled";

    const res = await request(app)
      .post(`/orders/${orderId}/refund`)
      .send({ reason: "late" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/not paid/);
  });

  it("should return 404 for non-existent order", async () => {
    const res = await request(app)
      .post("/orders/non-existent-id/refund")
      .send({ reason: "any" });

    expect(res.status).toBe(404);
  });

  it("should return 400 when reason is missing", async () => {
    const createRes = await createPaidOrder();
    const orderId = createRes.body.id;

    const res = await request(app)
      .post(`/orders/${orderId}/refund`)
      .send({ amount: 50 });

    expect(res.status).toBe(400);
  });

  it("should accept optional amount field", async () => {
    const createRes = await createPaidOrder();
    const orderId = createRes.body.id;

    const res = await request(app)
      .post(`/orders/${orderId}/refund`)
      .send({ reason: "partial", amount: 30 });

    expect(res.status).toBe(200);
    expect(res.body.refund.amount).toBe(30);
  });
});

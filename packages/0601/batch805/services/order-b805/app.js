const express = require("express");
const app = express();

app.use(express.json());

const ordersRouter = require("./routes/orders");
const refundRouter = require("./routes/refund");
app.use("/orders", ordersRouter);
app.use("/orders", refundRouter);

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`order-b805 listening on port ${PORT}`);
  });
}

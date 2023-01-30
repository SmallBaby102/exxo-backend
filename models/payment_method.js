const mongoose = require("mongoose");

const PaymentMethod = mongoose.model(
  "PaymentMethod",
  new mongoose.Schema({
    name: String,
    status: Boolean,
  })
);

module.exports = PaymentMethod;

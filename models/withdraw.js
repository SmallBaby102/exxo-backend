const mongoose = require("mongoose");

const Withdraw = mongoose.model(
  "Withdraw",
  new mongoose.Schema({
    email: String,
    amount: String,
    address: String,
    currency: String,
    tradingAccountId: String,
    tradingAccountUuid: String,
    submittedAt: {type: Date, default: Date.now},
    status: {type: String, default: "Pending" },  //Pending, Approved, Rejected (Withdraw status)
  })
);

module.exports = Withdraw;
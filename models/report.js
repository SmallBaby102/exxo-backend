const mongoose = require("mongoose");

const Report = mongoose.model(
  "Report",
  new mongoose.Schema({
    clientUuid: String,
    email: String,
    tradingAccountUuid: String,
    tradingAccountId: String,
    amount: String,
    code: String,
    transfer_code: String,
    transfer_amount: String,
    createdAt: String,
    ethAddress: String,
    status: String
  })
);

module.exports = Report;
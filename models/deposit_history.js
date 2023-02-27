const mongoose = require("mongoose");

const DepositHistory = mongoose.model(
  "DepositHistory",
  new mongoose.Schema({
    txhash: String,
  })
);

module.exports = DepositHistory;
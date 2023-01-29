const mongoose = require("mongoose");

const Wallet = mongoose.model(
  "Wallet",
  new mongoose.Schema({
    clientUuid: String,
    email: String,
    tradingAccountUuid: String,
    ethAddress: String,
    ethPrivateKey: String,
    tronAddress: String,
    tronPrivateKey: String,
  
  })
);

module.exports = Wallet;
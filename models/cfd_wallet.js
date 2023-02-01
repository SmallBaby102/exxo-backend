const mongoose = require("mongoose");

const CFDWallet = mongoose.model(
  "CFDWallet",
  new mongoose.Schema({
    clientUuid: String,
    email: String,
    tradingAccountId: String,
    tradingAccountUuid: String,
    ethAddress: String,
    ethPrivateKey: String,
    tronAddress: String,
    tronPrivateKey: String,
  
  })
);

module.exports = CFDWallet;
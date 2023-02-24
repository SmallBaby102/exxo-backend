const mongoose = require("mongoose");

const Wallet = mongoose.model(
  "Wallet",
  new mongoose.Schema({
    clientUuid:           String,
    email:                String,
    tradingAccountUuid:   String,
    tradingAccountId:     String,
    ethAddress:           String,
    ethPrivateKey:        String,
    tronAddress:          String,
    tronPrivateKey:       String,
    offerUuid:            String,
    isDemo:               Boolean, 
  
  })
);

module.exports = Wallet;
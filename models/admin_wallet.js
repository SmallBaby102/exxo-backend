const mongoose = require("mongoose");

const AdminWallet = mongoose.model(
  "AdminWallet",
  new mongoose.Schema({
    address: String,
    privateKey: String,
  
  })
);

module.exports = AdminWallet;
const mongoose = require("mongoose");
const { NUMBER } = require("sequelize");
const SocialAccount = mongoose.model(
  "Social Account",
  new mongoose.Schema({
    accountUuid:                String,
    email:                      String,
    hasWebsite:                 Boolean,
    hasClientBase:              Boolean,
    shareTradingPerformance:    Boolean,
    promoteContent:             String,
    tradingInstruments:         Number, 
    tradingAccountForScoial:    String, 
    incentiveFeePercentage:     Number, 
    sStatus:                    {type:String, default:"NEW"}
  })

);
module.exports = SocialAccount;
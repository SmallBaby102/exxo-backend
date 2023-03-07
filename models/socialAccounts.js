const mongoose = require("mongoose");
const { NUMBER } = require("sequelize");
const SocialAccount = mongoose.model(
  "SocialAccount",
  new mongoose.Schema({
    email:                      String,
    accountUuid:                {type: String, unique:true,required: true},
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
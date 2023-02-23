const mongoose = require("mongoose");

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    accountUuid:                String,
    email:                      String,
    password:                   String,
    fullname:                   String,
    birthday:                   String,
    expDate:                    String,
    phone:                      String,
    countryCode:                String,
    country:                    String,
    state:                      String,
    city:                       String,
    address:                    String,
    postalCode:                 String,
    phone:                      String,
    landline_phone:             String,
    docType:                    String,         
    docType2:                   String,         
    docUrl1:                    String,
    docUrl2:                    String,
    docUrl3:                    String,
    remark:                     String,
    submittedAt:                {type: Date, default: Date.now},
    verification_status:        { type: String, default: 'New' },   //New, Pending, Approved, Rejected (KYC status)
    isEmailVerified:            { type: Boolean, default: false, required: true },
    ibStatus:                   { type: String, default: 'New' },
    parentTradingAccountID:     String, 
    parentTradingAccountUuid:   String, 
    ibParentTradingAccountUuid: { type: String, default: "" },
    IBLink:                     { type: String, default: "" },
    IBDeclineReason:            { type: String, default: "" },
  
  })
);

module.exports = User;
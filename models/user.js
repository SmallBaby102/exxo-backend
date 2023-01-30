const mongoose = require("mongoose");

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    accountUuid: String,
    email: String,
    password: String,
    fullname: String,
    birthday: String,
    expDate: String,
    phone: String,
    countryCode: String,
    country: String,
    city: String,
    address: String,
    postalCode: String,
    docType: String,         
    docUrl1: String,
    docUrl2: String,
    submittedAt: {type: Date, default: Date.now},
    verification_status: { type: String, default: 'New' },   //New, Pending, Approved, Rejected (KYC status)
    isEmailVerified: { type: Boolean, default: false, required: true },
  
  })
);

module.exports = User;
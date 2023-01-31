const mongoose = require("mongoose");

const Admin = mongoose.model(
  "Admin",
  new mongoose.Schema({
    email: String,
    password: String,
    fullname: String,
    createdAt: {type: Date, default: Date.now},
  })
);

module.exports = Admin;
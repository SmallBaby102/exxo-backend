const mongoose = require("mongoose");

const Admin = mongoose.model(
  "Admin",
  new mongoose.Schema({
    email: String,
    password: String,
    name: String,
    role: {type: String, default: "Admin"}, //Admin, Super Admin
    createdAt: {type: Date, default: Date.now},
  })
);

module.exports = Admin;
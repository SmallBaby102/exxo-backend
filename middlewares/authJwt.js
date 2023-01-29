const jwt = require("jsonwebtoken");
const config = require("../config/auth.js");
const User =  require("../models/user");
const Role =  require("../models/role");

verifyToken = (req, res, next) => {
  // let token = req.headers["x-access-token"];

  // if (!token) {
  //   return res.status(403).send({ message: "No token provided!" });
  // }

  // jwt.verify(token, config.secret, (err, decoded) => {
  //   if (err) {
  //     return res.status(401).send({ message: "Unauthorized!" });
  //   }
  //   req.email = decoded.email;
    next();
  // });
};

const authJwt = {
  verifyToken,
};
module.exports = authJwt;
const config = require("../config/auth");
const User = require("../models/user");
const Admin = require("../models/admin");
const axios = require("axios"); 
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { readHTMLFile } = require("../utils/helper.js");
const handlebars = require('handlebars');

/*
    Here we are configuring our SMTP Server details.
    STMP is mail server which is responsible for sending and recieving email.
*/
let smtpTransport = nodemailer.createTransport({
  service: "Gmail",
  auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD
  }
});
/*------------------SMTP Over-----------------------------*/

exports.signup = (req, res) => {
  try {
    let user = new User({
      fullname: req.body.fullname,
      email: req.body.email,
      countryCode: req.body.countryCode,
      phone: req.body.phone,
      password: bcrypt.hashSync(req.body.password, 8)
    });
  
    user.save((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      let email = user.email;
      let info = {id: user._id, email: email, fullname: user.fullname, countryCode: user.countryCode, password: req.body.password};
      // The hash we will be sending to the user
      const token = jwt.sign(info, config.secret);
      link="https://secure.exxomarkets.com/api/auth/verify?token="+token;
      readHTMLFile(__dirname + '/../public/email_template/Verify_email.html', function(err, html) {
        if (err) {
          console.log('error reading file', err);
          return;
        }
        var template = handlebars.compile(html);
        var replacements = {
          VERIFY_LINK: link,
        };
        var htmlToSend = template(replacements);
        var mailOptions = {
            from: `${process.env.MAIL_NAME} <${process.env.MAIL_USERNAME}>`,
            to : req.body.email,
            subject : "Please confirm your account",
            html : htmlToSend
        };
        smtpTransport.sendMail(mailOptions, function(error, response){
            if(error){
                console.log(error);
            }else{
                console.log("Message sent: " + response.response);
            }
        });
      });
      res.status(200).send("User was registered successfully. Please check your email.");
    });
  } catch (error) {
    res.status(500).send("User register failed.");
    
  }

};
exports.resetLink = (req, res) => {
  try {
    User.findOne({
      email: req.body.email
    })
    .exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      if(!user){
        res.status(404).send({ message: "User not found" });
        return;
      }
      let email = user.email;
      let info = { id: user._id, email: email };
      // The hash we will be sending to the user
      const token = jwt.sign(info, config.secret, {
        expiresIn: "1h"
      });
      link="https://secure.exxomarkets.com/api/auth/reset-password?token="+token;
      readHTMLFile(__dirname + '/../public/email_template/FORGOT_PW.html', function(err, html) {
        if (err) {
          console.log('error reading file', err);
          return;
        }
        var template = handlebars.compile(html);
        var replacements = {
          EMAIL_ADDRESS: email,
          RESET_LINK: link,
        };
        var htmlToSend = template(replacements);
        var mailOptions = {
            from: `${process.env.MAIL_NAME} <${process.env.MAIL_USERNAME}>`,
            to : req.body.email,
            subject : "Please reset your password",
            html : htmlToSend
        };
        smtpTransport.sendMail(mailOptions, function(error, response){
            if(error){
                console.log(error);
            }else{
                console.log("Message sent: " + response.response);
            }
        });
      });
      res.status(200).send("User was registered successfully. Please check your email.");
    });
  } catch (error) {
    res.status(500).send("User register failed.");
    
  }

};

exports.resetPasswordPage = async (req, res) => {
  try {
    let decoded = jwt.verify(req.query.token, config.secret);
    console.log("decoded", decoded);
    let user = await User.findById(decoded.id);
    if (!user)
        return  res.status(500).send("Couldn't find the user!");
    else {
        if (decoded.exp < new Date().getTime() / 1000 ) {
          return  res.status(500).send("The link was expired");
        }
        global.resetEmail = decoded.email;
        return res.redirect(`${process.env.FRONT_ENTRY}/reset-password`);
    }
  } catch (err) {
    console.log(err)
    return  res.status(500).send("The link was expired");
  }
  
}

exports.verifyEmail = async (req, res) => {
  let decoded = jwt.verify(req.query.token, config.secret);
  console.log("decoded", decoded);
  const auth = {
    username: "cfdprime-broker@integration.com",
    password: "abcd1234",
    grant_type: "password"
  } 
  let user = await User.findById(decoded.id);
  if (!user)
      return  res.status(500).send("Couldn't find the user!");
  else {
      // do your updates here
      user.isEmailVerified = true;
      await user.save();
  }
  let headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic Y2xpZW50SWQ6Y2xpZW50U2VjcmV0",
      "Cookie": "JSESSIONID=C91F99D6BBE3F8CC5F53D43ED03FBE44"
  } 
  axios.post(`${process.env.API_SERVER}/proxy/auth/oauth/token`, auth, { headers })
  .then(result => {
      headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${result.data.access_token}`,
          "Cookie": "JSESSIONID=93AD5858240894B517A4B1A2ADC27617"
      }
      global.mySpecialVariable = headers;
      global.adminUuid = result.data.account_uuid;
      global.partnerId = result.data.partnerId;
      
      const partnerId = result.data.partnerId;

      const data = {
          "offerUuid": "2c053e94-4baf-440b-8f63-92a2a75718b4",
          "adminUuid" :  result.data.account_uuid,
          "account": {
            "partnerId": partnerId,
            "email" : decoded.email,
            "name": decoded.fullname,
            "surname": decoded.fullname,
            "phone": decoded.phone,
            "country": decoded.countryCode,
            "password": decoded.password,
          }
        } 
      axios.post(`${process.env.API_SERVER}/documentation/process/api/accounts/sync`, data, { headers } )
      .then(async accountRes => {
        user.accountUuid = accountRes.data.accountUuid;
        await user.save();
        return res.redirect(`${process.env.FRONT_ENTRY}/login`);
      }) 
      .catch(err => {
        console.log("creating account error", err.response.data.message);
        // res.status(200).send("Email was verified successfully but didn't create a new CFD account!");
        return res.redirect(`${process.env.FRONT_ENTRY}/login`);
      })
  })
  .catch(err => {
    console.log("admin login error", err.response.data.message);
    // res.status(500).send("Email was verified successfully but didn't create a new CFD account!");
    return res.redirect(`${process.env.FRONT_ENTRY}/login`);
  })
}
exports.resetPassword = (req, res) => {
 
  User.findOne({
    email: global.resetEmail
  })
    .exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      if (!user) {
        return res.status(404).send({ message: "User Not found." });
      }
      global.resetEmail = null;
      user.password = bcrypt.hashSync(req.body.password, 8);
      user.save();
      
      const data = {
        email: user.email,
        partnerId: global.partnerId,
        newValue: req.body.password
      }
      let headers = { ...global.mySpecialVariable, "Content-Type": "application/json" }; 
      axios.post(`${process.env.API_SERVER}/documentation/auth/api/user/change-password`, data, { headers })
      .then( async result => {
          res.status(200).send({ message: "Successfully changed" });
      }) 
      .catch(e => { 
        console.log(e)
        res.status(500).send({ message: "Axios request for changing Backoffice password was failed!" });
      })

    });
};
exports.signin = (req, res) => {
 
  User.findOne({
    email: req.body.email
  })
    .exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      if (!user) {
        return res.status(404).send({ message: "User Not found." });
      }
      if(!user.isEmailVerified){
        return res.status(200).send(user);
      }
      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );

      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Invalid Password!"
        });
      }

      var token = jwt.sign({ email: req.body.email }, config.secret, {
        expiresIn: 3599 // 1 hours
      });
      const auth = {
        "grant_type": "password",
        "password": "abcd1234",
        "username": "cfdprime-broker@integration.com",
      }
      let headers = {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic Y2xpZW50SWQ6Y2xpZW50U2VjcmV0",
          "Cookie": "JSESSIONID=C91F99D6BBE3F8CC5F53D43ED03FBE44"
      }
      let email =req.body.email;
      axios.post(`${process.env.API_SERVER}/proxy/auth/oauth/token`, auth, { headers })
      .then(result => {
        console.log("admin", result.data)
          headers = {
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": `Bearer ${result.data.access_token}`,
              "Cookie": "JSESSIONID=93AD5858240894B517A4B1A2ADC27617"
          }
          global.mySpecialVariable = headers;
          global.adminUuid = result.data.account_uuid;
          global.partnerId = result.data.partnerId;
          
          axios.get(`${process.env.API_SERVER}/documentation/account/api/partners/${partnerId}/accounts/by-email/?email=${email}`, { headers })
          .then( async accountRes => {
            res.status(200).send({
              ...user._doc,
              partnerId: accountRes.data?.partnerId, 
              ...accountRes.data,
              accessToken: token,
            });
              
          })
          .catch(e => {
              console.log(e);
              res.status(200).send({
                ...user._doc,
                accessToken: token
              });
          })              
      })
      .catch(e => {
        //console.log(e);
        res.status(500).send({
          message: "Admin signin error"
        });
      })

    });
};
exports.getAdmins = (req, res) => {
  Admin.find({}, function(err, result) {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    } else {
      return res.status(200).send(result);
    }
  });
}
exports.updateAdmin = (req, res) => {
  if(!req.body){
    return res.status(500).send({ message: "Request error!" });
  }
  const name = req.body.name;
  const email = req.body.email;
  const password = bcrypt.hashSync(req.body.password, 8);
  const role = req.body.role;
  const createdAt = new Date();
  Admin.findOne({ email }, async function(err, result) {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    } else {
      if (result) {
        result.name = name;
        result.email = email;
        result.role = role;
        // result.password = password;
        result.createdAt = createdAt;
        result.save();
      } else {
        let admin = new Admin({
          name,
          email,
          role,
          password,
          createdAt,
        })
        await admin.save();
      }
      return res.status(200).send(result);
    }
  });
}
exports.deleteAdmin = (req, res) => {
  if(!req.body){
    return res.status(500).send({ message: "Request error!" });
  }
  const name = req.body.name;
  const email = req.body.email;
  const role = req.body.role;
  const createdAt = new Date();
  Admin.findOneAndRemove({ email }, async function(err, result) {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    } else {
      console.log("remove", result)
      return res.status(200).send(result);
    }
  });
}

exports.adminSignin = (req, res) => {
 
  Admin.findOne({
    email: req.body.email
  })
    .exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      if (!user) {
        return res.status(404).send({ message: "User Not found." });
      }
      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );

      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Invalid Password!"
        });
      }

      var token = jwt.sign({ email: req.body.email }, config.secret, {
        expiresIn: 3599 // 1 hours
      });
      const auth = {
        "grant_type": "password",
        "password": "abcd1234",
        "username": "cfdprime-broker@integration.com",
      }
      let headers = {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic Y2xpZW50SWQ6Y2xpZW50U2VjcmV0",
          "Cookie": "JSESSIONID=C91F99D6BBE3F8CC5F53D43ED03FBE44"
      }
      let email =req.body.email;
      axios.post(`${process.env.API_SERVER}/proxy/auth/oauth/token`, auth, { headers })
      .then(result => {
        console.log("admin", result.data)
          headers = {
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": `Bearer ${result.data.access_token}`,
              "Cookie": "JSESSIONID=93AD5858240894B517A4B1A2ADC27617"
          }
          global.mySpecialVariable = headers;
          global.adminUuid = result.data.account_uuid;
          global.partnerId = result.data.partnerId;
          res.status(200).send({
            ...user._doc,
            accessToken: token,
          });
      })
      .catch(e => {
        console.log(e);
        res.status(500).send({
          message: "Admin signin error"
        });
      })

    });
};

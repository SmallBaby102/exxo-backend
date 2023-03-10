const config = require("../config/auth");
const User = require("../models/user");
const Admin = require("../models/admin");
const axios = require("axios"); 
const sessions = require('express-session');
var moment = require('moment')
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

exports.signup = async (req, res) => {
  try {
    let parentTradingAccountId ="";
    let parentTradingAccountUuid ="";

    const ibLinkCookie = req.body.ibLinkCookie || null;
    console.log("Affiliate Cookie Info", ibLinkCookie);
    if(ibLinkCookie){
      const cookieInfo = JSON.parse(ibLinkCookie); 
      const parentAccount =await User.findOne({ibNumber: cookieInfo.ibLinkId}); 
      console.log("IB parent acount info", parentAccount);
      if(parentAccount  &&  parentAccount.ibStatus){
        
        console.log(Date.now()); 
        console.log(Number(cookieInfo.when) + 30*24*3600*1000);

        if((cookieInfo.when + 30*24*3600*1000 > Date.now())){
          parentTradingAccountId = parentAccount?.ibParentTradingAccountId; 
          parentTradingAccountUuid = parentAccount?.ibParentTradingAccountUuid; 
        }
      }
    }
    console.log("parentTradingAccountUuid :--------", parentTradingAccountUuid)

    let user = new User({
      fullname:                   req.body.fullname,
      email:                      req.body.email,
      countryCode:                req.body.countryCode,
      phone:                      req.body.phone,
      password:                   bcrypt.hashSync(req.body.password, 8),
      parentTradingAccountId:     parentTradingAccountId | undefined,
      parentTradingAccountUuid:   "asdfasdfasdfasdfasdf"
    });
    console.log("Followed User's info",user);
  
    user.save((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      let email = user.email;
      let info = {id: user._id, email: email, fullname: user.fullname, countryCode: user.countryCode, password: req.body.password, parentTradingAccountId: parentTradingAccountId, parentTradingAccountUuid: parentTradingAccountUuid};
      // The hash we will be sending to the user
      const token = jwt.sign(info, config.secret);
      link = process.env.BACKEND_SERVER + "/api/auth/verify?token=" + token;
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
            bcc:process.env.MAIL_USERNAME, 
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
    console.log("register faild error", error);
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
      link = process.env.BACKEND_SERVER + "/api/auth/reset-password?token=" + token;
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
            bcc:process.env.MAIL_USERNAME, 
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
  const auth = {
    username: process.env.AUTH_USERNAME,
    password: process.env.AUTH_PASSWORD,
    grant_type: process.env.AUTH_GRANTTYPE
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
      "Authorization": process.env.AUTH_AUTHORIZATION,
      "Cookie": process.env.AUTH_COOKIE
  } 
  axios.post(`${process.env.API_SERVER}/proxy/auth/oauth/token`, auth, { headers })
  .then(result => {
      console.log(result);
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
        "branchUuid": process.env.BRANCH_UUID,
        "adminUuid" :  result.data.account_uuid,
        "account": {
          "partnerId":                  partnerId,
          "email" :                     decoded.email,
          "name":                       decoded.fullname,
          "surname":                    decoded.fullname,
          "phone":                      decoded.phone,
          // "country":                 decoded.countryCode,
          "password":                   decoded.password,
          "parentTradingAccountId":     decoded.parentTradingAccountId,
          "parentTradingAccountUuid":   decoded.parentTradingAccountUuid,
        }
      }

      console.log("((((((((((((BO signup & verifyEmail))))))))))))", data);

      // axios.post(`${process.env.MANAGE_API_SERVER}/documentation/process/api/accounts/sync`, data, { headers } )
      axios.post(`${process.env.API_SERVER}/documentation/process/api/accounts/sync`, data, { headers } )
      .then(async accountRes => {
        user.accountUuid = accountRes.data.accountUuid;
        await user.save();
        return res.redirect(`${process.env.FRONT_ENTRY}/login`);
      })
      .catch(err => {
        console.log("creating account error", err);
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
        "grant_type": process.env.AUTH_GRANTTYPE,
        "password": process.env.AUTH_PASSWORD,
        "username": process.env.AUTH_USERNAME,
      }
      let headers = {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": process.env.AUTH_AUTHORIZATION,
          "Cookie": process.env.AUTH_COOKIE
      }
      let email =req.body.email;
      axios.post(`${process.env.API_SERVER}/proxy/auth/oauth/token`, auth, { headers })
      .then(result => {
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
            console.log("login account info: ", accountRes);
            res.status(200).send({              
              ...accountRes.data,
              ...user._doc,
              partnerId: accountRes.data?.partnerId, 
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
        console.log(e);
        res.status(500).send({
          message: "Admin signin error"
        });
      })
    });
};
exports.getAdmins = (req, res) => {
  Admin.find({}).exec((err, result)=>{
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
        "grant_type": process.env.AUTH_GRANTTYPE,
        "password": process.env.AUTH_PASSWORD,
        "username": process.env.AUTH_USERNAME,
      }
      let headers = {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": process.env.AUTH_AUTHORIZATION,
          "Cookie": process.env.AUTH_COOKIE
      }
      let email =req.body.email;
      axios.post(`${process.env.API_SERVER}/proxy/auth/oauth/token`, auth, { headers })
      .then(result => {
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

exports.sendWithdrawVerifyCode = (req, res) => {
  var minm = 10000;
  var maxm = 99999;
  var code = Math.floor(Math.random() * (maxm - minm + 1)) + minm;
  readHTMLFile(__dirname + '/../public/email_template/Verify_code.html', function(err, html) {
    if (err) {
      console.log('error reading file', err);
      return;
    }
    var template = handlebars.compile(html);
    var replacements = {
      VERIFY_CODE: code,
    };
    var htmlToSend = template(replacements);
    var mailOptions = {
      from: `${process.env.MAIL_NAME} <${process.env.MAIL_USERNAME}>`,
      to : req.query.email,
      bcc:process.env.MAIL_USERNAME, 
      subject : "Verify withdraw code",
      html : htmlToSend
    };
    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error);
        }else{
            let cur_moment = moment()
            sessions.withdraw_verify_code = code;
            sessions.moment = cur_moment;

        }
    });
  });
  res.status(200).send("Withdraw verification code was sent successfully. Please check your email." + code);
};

exports.verifyWithdrawCode = (req, res) => {
  let cur_moment = moment();
  let timeDifference = cur_moment.diff(sessions.moment, 'seconds')
  if ( timeDifference > 30 * 60 ) { // expired after 30min
    res.status(200).send({ 
      "status" : 0,
      "msg" : "Expired verification code. Try to send again"
    });
  }
  res.status(200).send({ 
    "status" : 1, 
    "Code" : sessions.withdraw_verify_code,
    "TimeDiff" : timeDifference,
    "msg" : "Success to get verification code"
  });
};

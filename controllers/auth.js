const config = require("../config/auth");
const User = require("../models/user");
const axios = require("axios"); 
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
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
let mailOptions,host,link;
/*------------------SMTP Over-----------------------------*/

exports.signup = (req, res) => {
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
    host=req.get('host');
    link="http://"+req.get('host')+"/api/auth/verify?token="+token;
    mailOptions={
        to : req.body.email,
        subject : "Please confirm your Email account",
        html : "Welcome, <br> Please Click on the link to verify your email.<br><a href="+link+">Click here to verify</a>" 
    }
    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error);
        }else{
            console.log("Message sent: " + response.response);
        }
    }); 
    res.status(200).send("User was registered successfully. Please check your email.");
  });
};
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
      const partnerId = result.data.partnerId;
      const data = {
          "offerUuid": "85af4b81-f01c-4e0f-9c8d-fd37b0ec4b50",
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
      axios.post(`${process.env.API_SERVER}/documentation/process/api/accounts`, data, { headers } )
      .then(async accountRes => {
        user.accountUuid = accountRes.accountUuid;
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
        expiresIn: 86400 // 24 hours
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
        console.log(e);
      })

    });
};

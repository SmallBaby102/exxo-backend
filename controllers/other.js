
const axios = require('axios');
const User = require('../models/user.js');
const CryptoRate = require('../models/crypto_rate.js');
const nodemailer = require("nodemailer");
const PaymentMethod = require('../models/payment_method.js');
const Withdraw = require('../models/withdraw.js');

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

exports.getSetting = async (req, res, next) => {
  try {
    const cryptoRates = await CryptoRate.find({});
    const payments = await PaymentMethod.find({});
    return res.status(200).send({ cryptoRates: cryptoRates, paymentMethods : payments });
  } catch (error) {
    return res.status(500).send({ message: "error" });
  }
}
exports.getWithdraw = async (req, res, next) => {
  console.log(req.query)
  try {
    let withdraws = [];
    if (req.query.email) {
      withdraws = await Withdraw.find({email : req.query.email});
    } else {
      withdraws = await Withdraw.find({});
    }
    return res.status(200).send(withdraws);
  } catch (error) {
    return res.status(500).send({ message: "error" });
  }
}
exports.removeSetting = async (req, res, next) => {
  User.findOneAndRemove({ _id: req.params.id}, function(err, result) {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    } else {
      return res.status(200).send(result);
    } 
  });
}
exports.updateSetting = async (req, res, next) => {
  try {
    const setting = req.body.setting;
    let cryptoRate = await CryptoRate.findOne({pair: "usdtPrice" });
    if (!cryptoRate) {
      cryptoRate = new CryptoRate({
        pair : "usdtPrice",
        rate : setting.usdtPrice
      });
    } else {
      cryptoRate.rate = setting.usdtPrice;
    }
    await cryptoRate.save();
    
    let payment = await PaymentMethod.findOne({name: "usdt" });
    if (!payment) {
      payment = new PaymentMethod({
        name : "usdt",
        status : setting.usdt
      });
    } else {
      payment.status = setting.usdt;
    }
    await payment.save();
    payment = await PaymentMethod.findOne({name: "bank" });
    if (!payment) {
      payment = new PaymentMethod({
        name : "bank",
        status : setting.usdt
      });
    } else {
      payment.status = setting.bank;
    }
    await payment.save();
    payment = await PaymentMethod.findOne({name: "npay" });
    if (!payment) {
      payment = new PaymentMethod({
        name : "npay",
        status : setting.npay
      });
    } else {
      payment.status = setting.npay;
    }
    await payment.save();
    payment = await PaymentMethod.findOne({name: "neteller" });
    if (!payment) {
      payment = new PaymentMethod({
        name : "neteller",
        status : setting.neteller
      });
    } else {
      payment.status = setting.neteller;
    }
    await payment.save();
    payment = await PaymentMethod.findOne({name: "skrill" });
    if (!payment) {
      payment = new PaymentMethod({
        name : "skrill",
        status : setting.skrill
      });
    } else {
      payment.status = setting.skrill;
    }
    await payment.save();
    payment = await PaymentMethod.findOne({name: "sticpay" });
    if (!payment) {
      payment = new PaymentMethod({
        name : "sticpay",
        status : setting.sticpay
      });
    } else {
      payment.status = setting.sticpay;
    }
    await payment.save();

    return res.status(200).send({ message: "success"});
  } catch (error) {
    return res.status(500).send({ message: "error"});
  }
}
exports.updateWithdraw = async (req, res, next) => {
  try
  {
    const id = req.body.id;
    const amount = req.body.amount;
    let withdraw = await Withdraw.findOne({ _id: id });
    if (!withdraw) {
      withdraw = new Withdraw({
        email: req.body.email,
        amount: amount,
        currency: "USD",
        tradingAccountId: req.body.tradingAccountId,
        tradingAccountUuid: req.body.tradingAccountUuid,
      });
      await withdraw.save();
      return res.status(200).send({ message: "success"});
    } else {
      withdraw.status = req.body.status;
    }
    if(req.body.status === "Approved"){
      const headers = { ...global.mySpecialVariable, "Content-Type": "application/json" };
      const partnerId = global.partnerId;
      const data = {
        "paymentGatewayUuid": "58d26ead-8ba4-4588-8caa-358937285f88",
        "tradingAccountUuid": withdraw.tradingAccountUuid,
        "amount": amount,
        "netAmount": amount,
        "currency": "USD",
        "remark": "string"
      }
      axios.post(`${process.env.API_SERVER}/documentation/payment/api/partner/${partnerId}/withdraws/manual`, data, { headers })
      .then(res => {
        console.log("withdraw success:", res.data);   
        return res.status(200).send({ message: "success"});
      })
      .catch(async err => {
        withdraw.status = "Failed";
        console.log("withdraw failed:", err.response.data.message);   
        await withdraw.save();
        return res.status(500).send({ message: "error"});
      })
    } else {
      await withdraw.save();
      return res.status(200).send({ message: "success"});
    }
  } catch (error) {
    console.log(error)
    return res.status(500).send({ message: "error"});
  }
}
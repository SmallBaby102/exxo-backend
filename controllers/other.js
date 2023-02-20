
const axios = require('axios');
const User = require('../models/user.js');
const CryptoRate = require('../models/crypto_rate.js');
const SysSetting = require('../models/setting.js');
const nodemailer = require("nodemailer");
const handlebars = require('handlebars');

const PaymentMethod = require('../models/payment_method.js');
const Withdraw = require('../models/withdraw.js');
const AdminWallet = require('../models/admin_wallet.js');
const Wallet = require('../models/wallet.js');
const { readHTMLFile } = require("../utils/helper.js");
const Web3 = require("web3");
const Common = require('ethereumjs-common');
const Tx = require('ethereumjs-tx');
const sessions = require('express-session');
var moment = require('moment')
const BUSDT_ABI = require("../abi/busdt_abi.json");


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

exports.getSetting = async (req, res, next) => {
  try {
    const sysSetting = await SysSetting.findOne({});
    const cryptoRates = await CryptoRate.find({});
    const payments = await PaymentMethod.find({});
    const adminWallet = await AdminWallet.findOne({});
    return res.status(200).send({ sysSetting: sysSetting, cryptoRates: cryptoRates, paymentMethods : payments, adminWallet: adminWallet });
  } catch (error) {
    return res.status(500).send({ message: "error" });
  }
}
exports.getWallets = async (req, res, next) => {
  try {
    const wallets = await Wallet.find({});
    return res.status(200).send(wallets);
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

exports.getWithdrawDetail = async (req, res, next) => {
  console.log(req.query)
  try {
    let withdrawDetail = await Withdraw.findOne({_id : req.query.id});
    return res.status(200).send(withdrawDetail);
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
    const admin_wallet = req.body.adminWallet;
    const sys_setting = req.body.sysSetting;

    // update crypto rate
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

    // update system settings
    let sysSetting = await SysSetting.findOne();
    if (!sysSetting) {
      sysSetting = new SysSetting({
        telegram : sys_setting.telegram
      });
    } else {
      sysSetting.telegram = sys_setting.telegram;
    }
    await sysSetting.save();

    // update admin wallet info
    let adminWallet = await AdminWallet.findOne({});
    if (!adminWallet) {
      adminWallet = new AdminWallet({
        address : admin_wallet.address,
        privateKey : admin_wallet.privateKey
      });
    } else {
      adminWallet.address = admin_wallet.address;
      adminWallet.privateKey = admin_wallet.privateKey;
    }
    await adminWallet.save();
    global.ADMIN_WALLET_ADDRESS = admin_wallet.address;   
    global.ADMIN_WALLET_PRIVATE_KEY = admin_wallet.privateKey;

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
    let amount  = req.body.amount;
    let email   = req.body.email;
    let method  = req.body.method;
    let address = req.body.address;
    if ( method === "Vietnam Bank Transfer" ) {
      address = req.body.benificiaryName + " ( " + req.body.bankName + ", " + req.body.bankAccount + " ) ";
    }

    // confirm withdraw verification code first
    let cur_moment = moment();
    let timeDifference = cur_moment.diff(sessions.moment, 'seconds')
    let request_code = req.body.code;
    let session_code = sessions.withdraw_verify_code;

    
    let withdraw = await Withdraw.findOne({ _id: id });
    if (!withdraw) {
      // confirm withdraw verification code ith email
      if ( request_code != session_code ) {
        return res.status(200).send({ 
          status : 0,
          message : "Verification code is wrong. Try again."
        });
      }
      if ( timeDifference > 30 * 60 ) { // expired after 30min      
        return res.status(200).send({ 
          status : 0,
          message : "Expired verification code. Try to send again"
        });
      } 

      withdraw = new Withdraw({
        email:              email,
        amount:             amount,
        method:             method,
        address:            address,
        currency:           "USD",
        tradingAccountId:   req.body.tradingAccountId,
        tradingAccountUuid: req.body.tradingAccountUuid,
      });
      await withdraw.save();
      return res.status(200).send({ 
        status: 1,
        message: "success"
      });
    } else {
      withdraw.status = req.body.status;
      withdraw.remark = req.body.remark;
      email = withdraw.email;
      amount = withdraw.amount;
    }
    if(req.body.status === "Approved"){
      const headers = { ...global.mySpecialVariable, "Content-Type": "application/json" };
      const partnerId = global.partnerId;
      const data = {
        "paymentGatewayUuid": process.env.PAYMENT_GATEWAY_UUID, //"58d26ead-8ba4-4588-8caa-358937285f88",
        "tradingAccountUuid": withdraw.tradingAccountUuid,
        "amount": withdraw.amount,
        "netAmount": withdraw.amount,
        "currency": "USD",
        "remark": "string"
      }
      try {
        const web3 = new Web3(new Web3.providers.HttpProvider("https://red-lively-putty.bsc.quiknode.pro/ae116772d9a25e7ee57ac42983f29cd0e6095940/"))
        // let wallet_addresses = ["0x5fF3A508d28A3c237656Ba23A042863aa47FC098"];
        const busdt = "0x55d398326f99059fF775485246999027B3197955"; ///BUSDT Contract
        const usdtContract = new web3.eth.Contract(BUSDT_ABI, busdt)
        let sender = global.ADMIN_WALLET_ADDRESS
        let receiver = withdraw.address;
        let senderkey = global.ADMIN_WALLET_PRIVATE_KEY;
        let amount_hex = web3.utils.toHex(web3.utils.toWei(amount, 'ether'));;
        // let data = await contract.methods.transfer(receiver, web3.utils.toHex(web3.utils.toWei(element.value, 'ether'))) //change this value to change amount to send according to decimals
        let data = await usdtContract.methods.transfer(receiver, amount_hex) //change this value to change amount to send according to decimals
        let nonce = await web3.eth.getTransactionCount(sender) //to get nonce of sender address
        let gas = await usdtContract.methods.transfer(receiver, amount_hex).estimateGas({from: sender});
        let chain = {
          "name": "bsc",
          "networkId": 56,
          "chainId": 56
      }
        let rawTransaction = {
            "from": sender,
            "gasPrice": web3.utils.toHex(parseInt(Math.pow(10,9) * 5)), //5 gwei
            "gasLimit": web3.utils.toHex(40000), //40000 gas limit
            "gas": web3.utils.toHex(gas),
            "to": busdt, //interacting with busdt contract
            // "value": web3.utils.BN(web3.utils.toWei(element.value, 'ether')), //no need this value interacting with nopayable function of contract
            "data": data.encodeABI(), //our transfer data from contract instance
            "nonce": web3.utils.toHex(nonce)
        };
        const common1 = Common.default.forCustomChain(
          'mainnet', chain,
          'petersburg'
      ) // declaring that our tx is on a custom chain, bsc chain

        let transaction = new Tx.Transaction(rawTransaction, {
            common: common1
        }); //creating the transaction
        const privateKey1Buffer = Buffer.from(senderkey, 'hex')
        transaction.sign(privateKey1Buffer); //signing the transaction with private key

        result = await web3.eth.sendSignedTransaction(`0x${transaction.serialize().toString('hex')}`) //sending the signed transaction
        console.log(`usdtTxstatus: ${result.status}`) //return true/false
        console.log(`usdtTxhash: ${result.transactionHash}`) //return transaction hash
      }
      catch (err){
        console.log("Withdraw transaction failed", err);
      }      
      axios.post(`${process.env.API_SERVER}/documentation/payment/api/partner/${partnerId}/withdraws/manual`, data, { headers })
      .then(async withdrawResult => {
        console.log("withdraw success:", withdrawResult.data);   
        withdraw.status = withdrawResult.data.status;
        await withdraw.save();
        readHTMLFile(__dirname + '/../public/email_template/Withdraw_succeed.html', function(err, html) {
          if (err) {
              console.log('error reading file', err);
              return;
          }
          var template = handlebars.compile(html);
          var replacements = {
            AMOUNT: amount,
            TRADING_ACCOUNT_ID: withdraw.tradingAccountId
          };
          var htmlToSend = template(replacements);
          var mailOptions = {
              from: `${process.env.MAIL_NAME} <${process.env.MAIL_USERNAME}>`,
              to : email,
              subject : "Your withdraw was succeeded!",
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
        return res.status(200).send({ 
          status: 1,
          message: "success"
        });
      })
      .catch(async err => {        
        withdraw.status = "Failed";
        console.log("withdraw failed:", err);   
        await withdraw.save();
        return res.status(500).send({ 
          status: 0,
          message: "error"
        });
      })
    } else {      
      if (req.body.status === "Rejected") {
        withdraw.decline_reason = req.body.decline_reason;
        await withdraw.save();
        readHTMLFile(__dirname + '/../public/email_template/Withdraw_declined.html', function(err, html) {
          if (err) {
              console.log('error reading file', err);
              return;
          }
          var template = handlebars.compile(html);
          var replacements = {
            AMOUNT: amount,
            TRADING_ACCOUNT_ID: withdraw.tradingAccountId,
            DECLINE_REASON: withdraw.decline_reason, 
            REMARK: withdraw.remark
          };
          var htmlToSend = template(replacements);
          var mailOptions = {
              from: `${process.env.MAIL_NAME} <${process.env.MAIL_USERNAME}>`,
              to : email,
              subject : "Your withdraw was declined!",
              html : htmlToSend
          };
          smtpTransport.sendMail(mailOptions, function(error, response){
              if(error){
                  console.log(error);
              }else{
                  console.log("Message sent");
              }
          });
        });
      }
      return res.status(200).send({ 
        status: 1,
        message: "success"
      });
    }
  } catch (error) {
    console.log(error)
    return res.status(500).send({ 
      status: 0,
      message: "error"
    });
  }
} 
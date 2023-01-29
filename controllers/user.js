
const axios = require('axios');
const { generateAccount } = require('tron-create-address')
const ethWallet = require('ethereumjs-wallet').default;
var bcrypt = require("bcryptjs");
var User = require('../models/user.js');
const Wallet = require('../models/Wallet.js');
const nodemailer = require("nodemailer");
const Web3 = require("web3");
const Chains = require("@moralisweb3/common-evm-utils");
const ethers = require("ethers");

const BUSDT_ABI = require("../abi/busdt_abi.json");
const USDT_ABI = require("../abi/usdt_abi.json");
const BNB_ABI = require("../abi/bnb_abi.json");
 
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

// Listening Wallet address 
async function getBUsdtTransfer(email, wallet_address){
  const Common = require('ethereumjs-common');
  const Tx = require('ethereumjs-tx')
  // const web3 = (new Web3(new Web3.providers.HttpProvider("https://bsc-dataseed.binance.org/")))
  const web3 = new Web3(new Web3.providers.HttpProvider("https://necessary-snowy-road.bsc.discover.quiknode.pro/917afe17cb7449f1b033b31c03417aad8df285c4/"))
  // let wallet_addresses = ["0x5fF3A508d28A3c237656Ba23A042863aa47FC098"];
  const busdt = "0x55d398326f99059fF775485246999027B3197955"; ///BUSDT Contract
  const provider = new ethers.providers.WebSocketProvider(
      `wss://necessary-snowy-road.bsc.discover.quiknode.pro/917afe17cb7449f1b033b31c03417aad8df285c4/`
  ); 
  // List all token transfers  *to*  myAddress:
  // const filter = {
  //     address: busdt,
  //     topics: [
  //         ethers.utils.id("Transfer(address,address,uint256)"),
  //         null,
  //         [
  //             ethers.utils.hexZeroPad(wallet_addresses[0], 32),
  //             // ethers.utils.id(wallet_addresses[0], 32),
  //         ]
  //     ]
  // };
  // provider.on(filter, async (log) => {
  //     console.log("TX log:", log);
  //     web3.eth.getTransaction(log.transactionHash, async function (error, transactionDetail) {
  //         console.log("trans-detail", transactionDetail);
  //         // if(parseFloat(transactionDetail.value) < 0.000105 ){
  //         //     return;
  //         // }
         
  //     });
  //     // Emitted whenever a DAI token transfer occurs
  // })
  const contract = new ethers.Contract(busdt, BUSDT_ABI, provider);
  const myfilter = contract.filters.Transfer(null, wallet_address)
  contract.on(myfilter, async (from, to, value, event)=>{
      let transferEvent ={
          from: from,
          to: to,
          value: value,
          eventData: event,
      }
      const element = transferEvent;
      console.log("transferEvent:", element);
      let link=`bscscan.com/tx/${event.transactionHash}`;
      mailOptions={
          to : email,
          subject : "Your deposit was succeeded",
          html : "Hello,<br> You made a new deposit successfully.<br><a href="+link+">Click here to see your transaction</a>" 
      }
      smtpTransport.sendMail(mailOptions, function(error, response){
          if(error){
              console.log(error);
          }else{
              console.log("Message sent: " + response.response);
          }
      });
      const wallet = await Wallet.findOne({ ethAddress : element.to});
      if(!wallet) {
          console.log("Cound't find a wallet of this address!");
          return;
      }
      const amount = web3.utils.fromWei(web3.utils.hexToNumberString(element.value._hex), "ether");
      const data = {
        "paymentGatewayUuid": "a3846b0c-a651-44ae-b1d1-2be1462cabb8",
        "tradingAccountUuid": wallet.tradingAccountUuid,
        "amount": amount,
        "netAmount": amount,
        "currency": "USD",
        "remark": "string"
      }
      const headers = { ...global.mySpecialVariable, "Content-Type": "application/json" };
      const partnerId = global.partnerId;
      axios.post(`${process.env.API_SERVER}/documentation/payment/api/partner/${partnerId}/deposits/manual`, data, { headers })
      .then(res => {
        console.log("deposit success", res.data);
      })

      const bnb = "0x242a1ff6ee06f2131b7924cacb74c7f9e3a5edc9";
      const contract = new web3.eth.Contract(BNB_ABI, bnb)
      const usdtContract = new web3.eth.Contract(BUSDT_ABI, busdt)

      let sender = process.env.ADMIN_WALLET_ADDRESS
      let receiver = element.to;
      let senderkey = process.env.ADMIN_WALLET_PRIVATE_KEY //admin private key
      
      try {
            //BNB needed for getting USDT
            let gas = await usdtContract.methods.transfer(sender, element.value._hex).estimateGas({from: receiver});

            let data = await contract.methods.transfer(receiver, element.value._hex) //change this value to change amount to send according to decimals
            let nonce = await web3.eth.getTransactionCount(sender) //to get nonce of sender address

            let chain = {
                "name": "bsc",
                "networkId": 56,
                "chainId": 56
            }

            let rawTransaction = {
                "from": sender,
                "gasPrice": web3.utils.toHex(parseInt(Math.pow(10,9) * 5)), //5 gwei
                "gasLimit": web3.utils.toHex(40000), //40000 gas limit
                "gas": web3.utils.toHex(40000), //40000 gas
                "to": receiver, //not interacting with bnb contract
                "value": web3.utils.toHex(`${gas*parseInt(Math.pow(10,9) * 5)}`),     //in case of native coin, set this value
                "data": data.encodeABI(), //our transfer data from contract instance
                "nonce":web3.utils.toHex(nonce)
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
            let result = await web3.eth.sendSignedTransaction(`0x${transaction.serialize().toString('hex')}`) //sending the signed transaction
            console.log(`BNBTxstatus: ${result.status}`) //return true/false
            console.log(`BNBTxhash: ${result.transactionHash}`) //return transaction hash
            if(result.status){
                let sender = element.to
                let receiver = process.env.ADMIN_WALLET_ADDRESS;
                let senderkey = wallet.ethPrivateKey
                // let senderkey = "52dca118350b78d772e8830c9f975f78b237e3a78a188bcbce902dc692ae58ac";

                // let data = await contract.methods.transfer(receiver, web3.utils.toHex(web3.utils.toWei(element.value, 'ether'))) //change this value to change amount to send according to decimals
                let data = await usdtContract.methods.transfer(receiver, element.value._hex) //change this value to change amount to send according to decimals
                let nonce = await web3.eth.getTransactionCount(sender) //to get nonce of sender address
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
                let transaction = new Tx.Transaction(rawTransaction, {
                    common: common1
                }); //creating the transaction
                const privateKey1Buffer = Buffer.from(senderkey.substring(2), 'hex')
                transaction.sign(privateKey1Buffer); //signing the transaction with private key

                result = await web3.eth.sendSignedTransaction(`0x${transaction.serialize().toString('hex')}`) //sending the signed transaction
                console.log(`usdtTxstatus: ${result.status}`) //return true/false
                console.log(`usdtTxhash: ${result.transactionHash}`) //return transaction hash

             }
          }
      catch(err) {
        console.log(err.response.data.message);
      }
  })   
}
// Listening Wallet address  Over
exports.getUsers = async (req, res, next) => {
  User.find({}, function(err, result) {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    } else {
      return res.status(200).send(result);
  }
  });
 
}
exports.removeUsers = async (req, res, next) => {
  User.findOneAndRemove({ _id: req.params.id}, function(err, result) {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    } else {
      return res.status(200).send(result);
    } 
  });
}
exports.updateUsers = async (req, res, next) => {
  User.findOneAndUpdate({ _id: req.params.id}, req.body.data, function(err, result) {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    } else {
      return res.status(200).send(result);
  }
  });

}
exports.createTradingAccount = async (req, res, next) => {
  const data = {
      "offerUuid": req.body.offerUuid,
      "partnerId": req.body.partnerId,
      "clientUuid" : req.body.clientUuid,
      "adminUuid" : global.adminUuid
    } 
  const headers = { ...global.mySpecialVariable, "Content-Type": "application/json"};
  axios.post(`${process.env.API_SERVER}/documentation/process/api/trading-account/create/sync`, data, { headers } )
  .then(async accountRes => {
    console.log("created a new trading account:", accountRes.data);
    let addressData = ethWallet.generate();
    const eth_privateKey = addressData.getPrivateKeyString()
    // addresses
    const eth_address =  addressData.getAddressString()
    //Tron
    const { address, privateKey } = generateAccount()
    const wallet = new Wallet({
      clientUuid: req.body.clientUuid,
      email: accountRes.data.clientEmail,
      tradingAccountUuid: accountRes.data.tradingAccountUuid,
      ethAddress: eth_address,
      ethPrivateKey: eth_privateKey,
      tronAddress: address,
      tronPrivateKey: privateKey
    }); 
    await wallet.save(); 
    await getBUsdtTransfer(accountRes.data.clientEmail, eth_address);
    res.status(200).send({ account: accountRes.data, message: "Trading account was created successfully!" });
  }) 
  .catch(err => {
    console.log(err.response.data.message);
    res.status(500).send({ message: "Creating Trading account failed" });
  })
} 

exports.createTradingAccountsOfAllAccounts = async (req, res, next) => {
  const partnerId = global.partnerId;
  const from =  "2022-01-14T00:00:00Z";
  const to = "2023-12-12T00:00:00Z";
  const pageable = {
    "sort": {
      "sorted": true,
      "unsorted": true,
      "empty": true
    },
    "pageSize": 1000,
    "pageNumber": 0,
    "unpaged": true,
    "paged": true,
    "offset": 0
  }
  let page = 0;
  const headers = { ...global.mySpecialVariable, "Content-Type": "application/json"};
  try {
        const accounts = await axios.get(`${process.env.API_SERVER}/documentation/account/api/partner/${partnerId}/accounts/view?from=${from}&to=${to}&size=10000&page=${page}&query=`, { headers } )
      for (let index = 0; index < accounts.data.content?.length; index++) {
        // console.log(accounts.data)
        const element = accounts.data.content[0];
        const data = {
          "offerUuid": req.body.offerUuid,
          "partnerId": element.partnerId,
          "clientUuid" : element.uuid,
          "adminUuid" : global.adminUuid
        } 
        const accountRes = await axios.post(`${process.env.API_SERVER}/documentation/process/api/trading-account/create/sync`, data, { headers } );
        console.log("created a new trading account:", accountRes.data);
        let addressData = ethWallet.generate();
        const eth_privateKey = addressData.getPrivateKeyString()
        // addresses
        const eth_address =  addressData.getAddressString()
        //Tron
        const { address, privateKey } = generateAccount()
        const wallet = new Wallet({
          clientUuid: element.uuid,
          email: accountRes.data.clientEmail,
          tradingAccountUuid: accountRes.data.tradingAccountUuid,
          ethAddress: eth_address,
          ethPrivateKey: eth_privateKey,
          tronAddress: address,
          tronPrivateKey: privateKey
        }); 
        await wallet.save(); 
        await getBUsdtTransfer(accountRes.data.clientEmail, eth_address);
  }
    return res.status(200).send({ accounts: accounts.data})
  } catch (error) {
    console.log(error.response.data.message)
    return res.status(500).send({ message: error.response.data.message})
  }
  
  
} 

exports.getTradingAccounts = async (req, res, next) => {
    let headers = global.mySpecialVariable;
    const partnerId = req.query.partnerId;
    const email = req.query.email;
    axios.get(`${process.env.API_SERVER}/proxy/accounts/trading-accounts/search/by-partnerId-and-email?partnerId=${partnerId}&email=${email}`, { headers })
    .then( async tradingAccountsRes => {
        let trAccounts = tradingAccountsRes.data;
        for (let index = 0; index < trAccounts.length; index++) {
          const element = trAccounts[index];
          let result = await axios.get(`${process.env.API_SERVER}/documentation/account/api/partner/${partnerId}/systems/${element.systemUuid}/trading-accounts/${element.tradingAccountId}/balance`, { headers });
          trAccounts[index].balance = result?.data;
          let wallet = await Wallet.findOne({ tradingAccountUuid: element.uuid});
          trAccounts[index].address = wallet?.ethAddress || "";
        }
        res.status(200).send(tradingAccountsRes.data);
    }) 
    .catch(e => { 
      console.log(e.response.data.message)
      res.status(500).send("Axios request for getting trading accounts was failed!");
    })
 
}
exports.changePassword = async (req, res, next) => {
    const partnerId = req.body.partnerId;
    const email = req.body.email;
    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;

    User.findOne({
      email: req.body.email
    })
      .exec(async (err, user) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }
   
        if (!user) {
          return res.status(404).send({ message: "User Not found." });
        }
  
        var passwordIsValid = bcrypt.compareSync(
          currentPassword,
          user.password
        );
  
        if (!passwordIsValid) {
          return res.status(401).send({
            message: "Invalid Password!"
          });
        }
        user.password = bcrypt.hashSync(newPassword, 8);
        await user.save();
        const data = {
          email,
          partnerId,
          newValue: newPassword
        }
        axios.post(`${process.env.API_SERVER}/documentation/auth/api/user/change-password`, data, { headers })
        .then( async res => {
            res.status(200).send({ message: "Successfully changed" });
        }) 
        .catch(e => { 
          res.status(500).send({ message: "Axios request for changing Backoffice password was failed!" });
        })
      });
}
exports.getOffers = async (req, res, next) => {
    let headers = global.mySpecialVariable;
    const email = req.query.email;
    const partnerId = req.query.partnerId;
    axios.get(`${process.env.API_SERVER}/proxy/configuration/api/partner/${partnerId}/offers`, { headers })
    .then( offersRes => {
      console.log("Global:", email, partnerId)
        res.status(200).send(offersRes.data);
    })
    .catch(e => {
      res.status(500).send("Axios request for getting trading accounts was failed!");

    })
 
}
exports.verifyProfile = async (req, res, next) => {
  const email = req.body.email;
  User.findOneAndUpdate({
    email: email
  },
  {
    fullname: req.body.name,
    birthday: req.body.dob,
    expDate: req.body.expDate,
    country: req.body.country,
    city: req.body.city,
    postalCode: req.body.postalCode,
    address: req.body.address,
    docType: req.body.docType,
    docUrl1: req.files?.frontImg? req.files?.frontImg[0]?.path : "",
    docUrl2: req.files?.backImg ? req.files?.backImg[0]?.path : "",
    verification_status: "Pending",
  },
   function (err, place) {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      if(!place){
        res.status(500).send({ message: "User doesn't exist!" });
        return;
      }
      res.status(200).send("Saved a profile!"+ place);
    });

}
exports.updateStatus = async (req, res, next) => {
  const id = req.params.id;
  let status = req.body.verification_status;
  User.findOneAndUpdate({
    _id: id
  },
  {
    verification_status: status,
   },
   function (err, place) {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      if(!place){
        res.status(500).send({ message: "User doesn't exist!" });
        return;
      }
      let email = place.email;
      if (status === "Approved") {
        const auth = {
          username: "cfdprime-broker@integration.com",
          password: "abcd1234",
          grant_type: "password"
        }  
        let headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic Y2xpZW50SWQ6Y2xpZW50U2VjcmV0",
            "Cookie": "JSESSIONID=C91F99D6BBE3F8CC5F53D43ED03FBE44"
        } 
        try{
          axios.post(`${process.env.API_SERVER}/proxy/auth/oauth/token`, auth, { headers })
          .then(result => {
              headers = {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${result.data.access_token}`,
                  "Cookie": "JSESSIONID=93AD5858240894B517A4B1A2ADC27617"
              }
              const partnerId = result.data.partnerId;
              const data = {
                    "name": place.fullname,
                    "surname": place.fullname,
                    "dateOfBirth" : place.birthday,
                    "country" : place.country,
                    "city" : place.city,
                    "postCode" : place.postalCode,
                    "address" : place.address,
                    "status" : status
                } 
              axios.put(`${process.env.API_SERVER}/documentation/account/api/accounts/?email=${email}&partnerId=${partnerId}`, data, { headers } )
              .then(accountRes => {
                console.log("updated a CFD account:", accountRes.data);
                host=req.get('host');
                link=`${process.env.FRONT_ENTRY}/app/profile`;
                mailOptions={
                    to : email,
                    subject : "Your profile was approved",
                    html : "Hello,<br> Your profile was approved and your Backoffice account was created successfully.<br><a href="+link+">Click here to see your account</a>" 
                }
                smtpTransport.sendMail(mailOptions, function(error, response){
                    if(error){
                        console.log("smtpTransport error: ", error);
                    }else{
                        console.log("Message sent: " + response.response);
                    }
                });
                return res.status(200).send("Your profile was approved and created a Backoffice account!"+ place);
              })
              .catch(err => {
                console.log("Update backoffice error:", err.response.data.message);

                return res.status(200).send("Your profile was approveds but didn't update a Backoffice account!"+ place);
              })
          })
        } catch(e) {
          return res.status(500).send("Your profile was approved but failed in updating a Backoffice account!"+ place);
        }
      }
      else if (status === "Rejected"){
        host=req.get('host');
        link=`${process.env.FRONT_ENTRY}/app/profile`;
        mailOptions={
            to : email,
            subject : "Your profile was rejected",
            html : "Hello,<br> Your profile was rejected.<br><a href="+link+">Click here to see your account</a>" 
        }
        smtpTransport.sendMail(mailOptions, function(error, response){
            if(error){
                console.log("smtpTransport error:", error);
            }else{
                console.log("Message sent: " + response.response);
            }
        });
        return res.status(200).send("Your profile was rejected!"+ place);
      }

    });

}



exports.webhook = async (req, res, next) => {
  const Web3 = require("web3");
  const web3 = (new Web3(new Web3.providers.HttpProvider("https://bsc-dataseed.binance.org/")))
  const Common = require('ethereumjs-common');
  const Tx = require('ethereumjs-tx')
  const transactions =  req.body.erc20Transfers;
  for (let index = 0; index < transactions.length; index++) {
    const element = transactions[index];
    const busdt = "0x55d398326f99059fF775485246999027B3197955";
    const abi = require("../abi/busdt_abi.json");

    const contract = new web3.eth.Contract(abi, busdt)
    let sender = element.to
    const wallet = await Wallet.findOne({ ethAddress : element.to});
    if(!wallet) continue;
    let receiver = "0x7cbEaa70Fa87622cC20A54aC7Cd88Bd008492e47";
    // let senderkey = Buffer.from(wallet.ethPrivateKey, "hex")
    let senderkey = wallet.ethPrivateKey

    let data = await contract.methods.transfer(receiver, web3.utils.toHex(element.value)) //change this value to change amount to send according to decimals
    let nonce = await web3.eth.getTransactionCount(sender) //to get nonce of sender address

    let chain = {

        "name": "bnb",
        "networkId": 56,
        "chainId": 56
    }

    let rawTransaction = {
        "from": sender,
        "gasPrice": web3.utils.toHex(parseInt(Math.pow(10,9) * 5)), //5 gwei
        // "gasLimit": web3.utils.toHex(500000), //500,000 gas limit
        "gas": 40000,
        "to": busdt, //interacting with busd contract
        "data": data.encodeABI(), //our transfer data from contract instance
        "nonce":web3.utils.toHex(nonce)
    };

    const common1 = Common.default.forCustomChain(
        'mainnet', chain,
        'petersburg'
    ) // declaring that our tx is on a custom chain, bsc chain

    let transaction = new Tx.Transaction(rawTransaction, {
        common: common1
    }); //creating the transaction

    transaction.sign(senderkey); //signing the transaction with private key

    let result = await web3.eth.sendSignedTransaction(`0x${transaction.serialize().toString('hex')}`) //sending the signed transaction
    console.log(`Txstatus: ${result.status}`) //return true/false
    console.log(`Txhash: ${result.transactionHash}`) //return transaction hash
  }
  res.status(200).send("success");
}
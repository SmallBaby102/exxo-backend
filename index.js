const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");
const handlebars = require('handlebars');
const mongoose = require("mongoose");
const Moralis = require("moralis").default;
const Chains = require("@moralisweb3/common-evm-utils");
const ethers = require("ethers");
const BUSDT_ABI = require("./abi/busdt_abi.json");
const USDT_ABI = require("./abi/usdt_abi.json");
const BNB_ABI = require("./abi/bnb_abi.json");
const AdminWallet = require("./models/admin_wallet");
const Wallet = require('./models/wallet.js');
const Web3 = require("web3");
const axios = require('axios');
const Common = require('ethereumjs-common');
const Tx = require('ethereumjs-tx');
const web3 = new Web3(new Web3.providers.HttpProvider("https://red-lively-putty.bsc.quiknode.pro/ae116772d9a25e7ee57ac42983f29cd0e6095940/"))
// token address
const busdt = "0x55d398326f99059fF775485246999027B3197955"; ///BUSDT Contract
const bnb = "0x242a1ff6ee06f2131b7924cacb74c7f9e3a5edc9";

const { readHTMLFile } = require("./utils/helper.js");


require("dotenv").config();

mongoose.connect(`${process.env.DB_URL}/${process.env.DB_NAME}`, [], (err) => {
    if (err) {
        console.log(`DB connection failed at ${process.env.DB_URL}/${process.env.DB_NAME}`);
    } else {
        console.log(`DB connected at ${process.env.DB_URL}/${process.env.DB_NAME}`);
    }
});

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

const router = require("./api/router");
const auth = require("./api/auth");
const user = require("./api/user"); 
const other = require("./api/other"); 

const app = express();
const oneDay = 1000 * 60 * 60 * 24;
app.use(session({
    name : 'app.sid',
    secret: "exxo",
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false 
}));

app.use(cors({ origin: "*", credentials : true }));
app.use(express.json({ extended: false }));
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
// Initialization
app.use(cookieParser());

app.get("/", (req, res) => {
    res.json({ message: "Welcome to news website backend." });
});

app.get("/result", (req, res) => {
    res.sendFile(__dirname + "/public/result.csv");
});
app.get(`/download/uploads/:filename`, (req, res) => {

    res.download(__dirname + "/public/uploads/" + req.params.filename);
});

app.use("/api", router);
app.use("/api/auth", auth);
app.use("/api/user", user);
app.use("/api/other", other);

async function request(wallet_addresses) {
    try {
        const filter_ERC20 = {  
            "and": [  
                { "in": ["to", wallet_addresses] },  
                { "gt": ["value", "0000000000000000000"] }, // Example of USDT (18 Decimals) 
            ],
        }; 
        const EvmChain = Chains.EvmChain;
        const options = {
            chains: [EvmChain.BSC/*, EvmChain.ETHEREUM*/],
            description: "USDT Transfers in Exxo Markets",
            tag: "exxo",
            includeContractLogs: true,
            abi: BUSDT_ABI,
            topic0: ["Transfer(address,address,uint256)"],
            webhookUrl: `${process.env.MY_SERVER}/api/user/webhook`,
            advancedOptions : {
                topic0: "Transfer(address,address,uint256)",
                filter: { "gt": ["value", "0000000000000000000"] },
                includeNativeTxs: false
            } 
        };
        const stream = await Moralis.Streams.add(options);
        const { id } = stream.toJSON();
        await Moralis.Streams.addAddress({
            id: id,
            address: wallet_addresses   // Users' addresses
        });
    } catch (error) {
        console.log(error)            
    }
} 
async function getBUsdtTransfer(email, wallet_address){
try {  
    const provider = new ethers.providers.WebSocketProvider(
        `wss://red-lively-putty.bsc.quiknode.pro/ae116772d9a25e7ee57ac42983f29cd0e6095940/`
    ); 
    const contract = new ethers.Contract(busdt, BUSDT_ABI, provider);
    const myfilter = contract.filters.Transfer(null, wallet_address)
    contract.on(myfilter, async (from, to, value, event)=>{
        let transferEvent ={
            from: from,
            to: to,
            value: value,
            // eventData: event,
        }
        let element = transferEvent;
        console.log("transferEvent:", element);
        console.log("toAddress in Index:", wallet_address);
        const deposit_amount = web3.utils.fromWei(web3.utils.hexToNumberString(element.value._hex), "ether");
        if (deposit_amount <= 0) {
            return;
        }
        Wallet.findOne({ ethAddress : wallet_address })
        .exec(async (err, wallet) => {
        if(err || !wallet) {
            console.log("Cound't find a wallet of this address!");
            return;
        }
        
            readHTMLFile(__dirname + '/public/email_template/Deposit_succeed.html', function(err, html) {
                if (err) {
                    console.log('error reading file', err);
                    return;
                }
                var template = handlebars.compile(html);
                var replacements = {
                    AMOUNT: deposit_amount,
                };
                var htmlToSend = template(replacements);
                var mailOptions = {
                    from: `${process.env.MAIL_NAME} <${process.env.MAIL_USERNAME}>`,
                    to : email,
                    bcc:process.env.MAIL_USERNAME, 
                    subject : "Your deposit was succeeded",
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
            
            const data = {
            "paymentGatewayUuid": process.env.PAYMENT_GATEWAY_UUID,
            "tradingAccountUuid": wallet.tradingAccountUuid,
            "amount": deposit_amount,
            "netAmount": deposit_amount,
            "currency": "USD",
            "remark": "string"
            }
            const headers = { ...global.mySpecialVariable, "Content-Type": "application/json" };
            const partnerId = global.partnerId;
            axios.post(`${process.env.API_SERVER}/documentation/payment/api/partner/${partnerId}/deposits/manual`, data, { headers })
            .then(res => {
                console.log("deposit success", res.data);
            })
            .catch(err => {
                console.log("deposit manual failed", err);

            })

            const contract = new web3.eth.Contract(BNB_ABI, bnb)
            const usdtContract = new web3.eth.Contract(BUSDT_ABI, busdt)

            let sender = global.ADMIN_WALLET_ADDRESS
            let receiver = wallet_address;
            let senderkey = global.ADMIN_WALLET_PRIVATE_KEY //admin private key
            
        try {
            //BNB needed for getting USDT
            const balance = await usdtContract.methods.balanceOf(receiver).call();
            const amount =  web3.utils.toHex(balance);
            let gas = await usdtContract.methods.transfer(sender, amount).estimateGas({from: receiver});

            let data = await contract.methods.transfer(receiver, amount) //change this value to change amount to send according to decimals
            let nonce = await web3.eth.getTransactionCount(sender, "pending") //to get nonce of sender address
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
                let sender = wallet_address
                let receiver = global.ADMIN_WALLET_ADDRESS;
                let senderkey = wallet.ethPrivateKey
                // let senderkey = "52dca118350b78d772e8830c9f975f78b237e3a78a188bcbce902dc692ae58ac";

                // let data = await contract.methods.transfer(receiver, web3.utils.toHex(web3.utils.toWei(element.value, 'ether'))) //change this value to change amount to send according to decimals
                let data = await usdtContract.methods.transfer(receiver, amount) //change this value to change amount to send according to decimals
                let nonce = await web3.eth.getTransactionCount(sender, "pending") //to get nonce of sender address
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
            console.log(err);
            }
        });
     })   
    }
    catch (err) {
        console.log(err)
    }
}
function getAdminToken () {
    const auth = {
        "grant_type": process.env.AUTH_GRANTTYPE,
        "password": process.env.AUTH_PASSWORD,
        "username": process.env.AUTH_USERNAME, 
        }
    let headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": process.env.AUTH_AUTHORIZATION, //"Basic Y2xpZW50SWQ6Y2xpZW50U2VjcmV0",
        "Cookie": process.env.AUTH_COOKIE //"JSESSIONID=C91F99D6BBE3F8CC5F53D43ED03FBE44"
    }
    axios.post(`${process.env.API_SERVER}/proxy/auth/oauth/token`, auth, { headers })
    .then(async result => {
        console.log("admin", result.data)
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Bearer ${result.data.access_token}`,
            "Cookie": "JSESSIONID=93AD5858240894B517A4B1A2ADC27617"
        }
        global.mySpecialVariable = headers;
        global.adminUuid = result.data.account_uuid;
        global.partnerId = result.data.partnerId;

        const wallet = await AdminWallet.findOne({});
        if (wallet) {
            global.ADMIN_WALLET_ADDRESS = wallet.address;    
            global.ADMIN_WALLET_PRIVATE_KEY = wallet.privateKey;
            global.ADMIN_WALLET_WITHDRAW_ADDRESS = wallet.withdrawAddress;    
            global.ADMIN_WALLET_WITHDRAW_PRIVATE_KEY = wallet.withdrawPrivateKey;
        } else {
            global.ADMIN_WALLET_ADDRESS = process.env.ADMIN_WALLET_ADDRESS;
            global.ADMIN_WALLET_PRIVATE_KEY = process.env.ADMIN_WALLET_PRIVATE_KEY;
            global.ADMIN_WALLET_WITHDRAW_ADDRESS = process.env.ADMIN_WALLET_ADDRESS;
            global.ADMIN_WALLET_WITHDRAW_PRIVATE_KEY = process.env.ADMIN_WALLET_PRIVATE_KEY;
        }        
    })
    .catch(err => {
        //console.log(err);
        console.log("******", err);
    })
}
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT} .`);

    getAdminToken();

    Moralis.start({
        apiKey: process.env.MORALIS_KEY ,
    });
    const streams = await Moralis.Streams.getAll({
        limit: 100, // limit the number of streams to return
    });
    
    const options = {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          'X-API-Key': process.env.MORALIS_KEY
        },
      };
      
    for (let index = 0; index < streams.result.length; index++) {
        const element = streams.result[index]._data;
        if (element.tag === "exxo") {
            await  axios.delete(`https://api.moralis-streams.com/streams/evm/${element.id}`, options);
        }
    } 
  
    let wallets = await Wallet.find({});
    let wallet_addresses = [];
    for (let index = 0; index < wallets.length; index++) {
        const element = wallets[index];
         if (!element.ethAddress ) {
            continue;
        }
        wallet_addresses.push(element.ethAddress);
    }
    if ( wallet_addresses.length > 0 ) {
        request(wallet_addresses);
    }  
}); 
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const Moralis = require("moralis").default;
const Chains = require("@moralisweb3/common-evm-utils");
const ethers = require("ethers");
const BUSDT_ABI = require("./abi/busdt_abi.json");
const USDT_ABI = require("./abi/usdt_abi.json");
const BNB_ABI = require("./abi/bnb_abi.json");

const Wallet = require('./models/wallet.js');
const Web3 = require("web3");
const axios = require('axios');

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
let rand,mailOptions,host,link;
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
    console.log("result", req.session);
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

function request() {
    // const wallets = Wallet.get();
    let wallet_addresses = ["0x7cbEaa70Fa87622cC20A54aC7Cd88Bd008492e47"];
    const EvmChain = Chains.EvmChain;
    const options = {
        chains: [EvmChain.BSC],
        description: "USDT Transfers",
        tag: "usdtTransfers",
        includeContractLogs: true,
        abi: BUSDT_ABI,
        topic0: ["Transfer(address,address,uint256)"],
        webhookUrl: "https://0994-38-32-68-195.ngrok.io/api/user/webhook",
        advancedOptions : {
            topic0: "Transfer(address,address,uint256)",
            // filter: {
            //     "in" : ["to", wallet_addresses]
            // }
        }
    };
    Moralis.start({
        apiKey: process.env.MORALIS_KEY ,
    }).then(async () => {
        const stream = await Moralis.Streams.add(options);
        const { id } = stream.toJSON();
        await Moralis.Streams.addAddress({
            id: id,
            address: ["0x55d398326f99059fF775485246999027B3197955"]   //BUSD-T
        })
    });
}
async function getBUsdtTransfer(email, wallet_address){
    const Common = require('ethereumjs-common');
    const Tx = require('ethereumjs-tx')
    // const web3 = (new Web3(new Web3.providers.HttpProvider("https://bsc-dataseed.binance.org/")))
    const web3 = new Web3(new Web3.providers.HttpProvider("https://necessary-snowy-road.bsc.discover.quiknode.pro/917afe17cb7449f1b033b31c03417aad8df285c4/"))
    // let wallet_addresses = ["0x5fF3A508d28A3c237656Ba23A042863aa47FC098"];
    const busdt = "0x55d398326f99059fF775485246999027B3197955"; ///BUSDT Contract
    let provider;
    try {
        provider  = new ethers.providers.WebSocketProvider(
            `wss://necessary-snowy-road.bsc.discover.quiknode.pro/917afe17cb7449f1b033b31c03417aad8df285c4/`
        );    
    } catch (error) {
        console.log("websocket error::", error)        
    }

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
        console.log("transferEvent:", transferEvent);
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
                console.log("Message sent: " + response);
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
        .catch(err => {
            console.log(err.response.data.message);
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
        transaction.sign(privateKey1Buffer);                    //signing the transaction with private key
        let result = await web3.eth.sendSignedTransaction(`0x${transaction.serialize().toString('hex')}`) //sending the signed transaction
        console.log(`BNBTxstatus: ${result.status}`)            //return true/false
        console.log(`BNBTxhash: ${result.transactionHash}`)     //return transaction hash
        if(result.status){
            let sender = element.to
            let senderkey = wallet.ethPrivateKey
            let receiver = process.env.ADMIN_WALLET_ADDRESS;

            // let data = await contract.methods.transfer(receiver, web3.utils.toHex(web3.utils.toWei(element.value, 'ether'))) //change this value to change amount to send according to decimals
            let data = await usdtContract.methods.transfer(receiver, element.value._hex) //change this value to change amount to send according to decimals
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
            const privateKey1Buffer = Buffer.from(senderkey.substring(2), 'hex')
            transaction.sign(privateKey1Buffer); //signing the transaction with private key

            let result = await web3.eth.sendSignedTransaction(`0x${transaction.serialize().toString('hex')}`) //sending the signed transaction
            console.log(`usdtTxstatus: ${result.status}`) //return true/false
            console.log(`usdtTxhash: ${result.transactionHash}`) //return transaction hash
        }
        } catch (error) {
            console.log(error)
        }
        
    })
}
async function getUsdtTransfer(){
    const web3 = (new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/7bf5d938412c4462a81d59e1d24e776e")))
    let wallet_addresses = ["0x7cbEaa70Fa87622cC20A54aC7Cd88Bd008492e47"];
    const usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; ///USDT Contract
    const provider = new ethers.providers.WebSocketProvider(
        `wss://mainnet.infura.io/ws/v3/7bf5d938412c4462a81d59e1d24e776e`
    );
    // List all token transfers  *to*  myAddress:
    const filter = {
        address: usdtAddress,
        topics: [
            ethers.utils.id("Transfer(address,address,uint256)"),
            null,
            [
                ethers.utils.id(wallet_addresses[0], 32),
                ethers.utils.id(wallet_addresses[0], 32),
            ]
        ]
    };
    provider.on(filter, (log) => {
        web3.eth.getTransaction(log.transactionHash, function (error, result){
            console.log(result);
        });
        // Emitted whenever a DAI token transfer occurs
    })
    // const contract = new ethers.Contract(usdtAddress, USDT_ABI, provider);
    // contract.on("Transfer", (from, to, value, event)=>{
    //     let transferEvent ={
    //         from: from,
    //         to: to,
    //         value: value,
    //         eventData: event,
    //     }
    //     console.log(JSON.stringify(transferEvent, null, 4))
    // })
}
function getAdminToken () {
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
    })
    .catch(err => {
        console.log(err);
    })
}
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT} .`);
    getAdminToken()
    let wallets = await Wallet.find({});
    for (let index = 0; index < wallets.length; index++) {
        const element = wallets[index];
        try {
            getBUsdtTransfer(element.email, element.ethAddress);
        } catch (error) {
            console.log(error)            
        }
    }
}); 
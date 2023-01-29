
const { authJwt } = require("../middlewares");
var multer = require('multer')
const path = require('path');

const axios = require('axios');
const puppeteer = require('puppeteer');
const CancelToken = axios.CancelToken;
const fs = require("fs");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
  cb(null, 'public/uploads')
},
filename: function (req, file, cb) {
  cb(null, Date.now() + file.originalname)
} 
})
exports.upload = multer({ storage: storage })

// =========================================Buy USDT===============================================
exports.buy = async (req, res, next) => {
  if (!req.body) {
    return res.status(400).send({
      message: "Content can not be empty!"
    });

  }

  const reqBody = {
    receive_address : req.body.receive_address,
    receive_amount : req.body.receive_amount,
    user_info : req.body.user_info || "email",
  }; 
  console.log("reqBody", reqBody); 
  const browser = await puppeteer.launch({headless:false});
  try {
    const page = await browser.newPage();
    await page.goto('https://stacoinex.vn/transaction/buy', {waitUntil: 'networkidle2'});
    await page.waitForSelector('input[name=receive_amount]');
    await page.type('input[name=receive_amount]', reqBody.receive_amount);
    await page.waitForSelector('#buy_info_address');
    await page.type('#buy_info_address',reqBody.receive_address);
    await page.waitForSelector('#buy_info_contact');
    await page.type('#buy_info_contact',reqBody.user_info);
    const selector = "form .btn-order";
    await page.waitForSelector(selector);
    const button = await page.$(selector);
    await button.evaluate(b => b.click());
    await page.waitForNavigation();
    let temp  = page.url().split("/");
    let result_url = `https://stacoinex.vn/ajax/order/${temp[temp.length-1]}`;
    let res_page = await axios.get(result_url);
    await browser.close();
    let csv = `\r\n${res_page.data.data.order.amount.toLocaleString(undefined, {maximumFractionDigits:3})}, ${res_page.data.data.order.receive_address}, ${res_page.data.data.order.code}, ${res_page.data.data.order.created_at}`;
    fs.appendFileSync("public/result.csv", csv);
    return res.status(200).send(res_page.data);
  } catch (error) {
    await browser.close(); 
    return res.status(500).send({message : "error"});
  }
};

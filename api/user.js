var router = require("express").Router();
const { authJwt, verifySignUp } = require("../middlewares");
const { upload } = require("../controllers/controllers");
const { webhook, getUsers, removeUsers, updateUsers, getTradingAccounts, getOffers, createTradingAccount, 
    createWalletOfAllTradingAccounts, createWalletOfAllTradingAccountsCFDPrime, changePassword, verifyProfile, updateStatus } = require("../controllers/user");

router.get("/users", [ authJwt.verifyToken ], getUsers);
router.get("/offers", [ authJwt.verifyToken ], getOffers);
router.get("/tradingAccounts", [ authJwt.verifyToken ], getTradingAccounts);
router.post("/tradingAccount", [ authJwt.verifyToken ], createTradingAccount);
router.post("/walletOfAllTradingAccounts", createWalletOfAllTradingAccounts);
router.post("/walletOfAllTradingAccountsCFDPrime", createWalletOfAllTradingAccountsCFDPrime);
router.post("/status/:id", [ authJwt.verifyToken ], updateStatus);
router.post("/verifyProfile", upload.fields([{ name: "frontImg", maxCount: 1},{name: "backImg", maxCount: 1 }]), verifyProfile);
router.post("/checkDuplicateUsernameOrEmail",  verifySignUp.checkDuplicateUsernameOrEmail, (req, res) => { res.status(200).send(true)} );
router.post("/users/:id", [ authJwt.verifyToken ], updateUsers);
router.post("/changePassword", [ authJwt.verifyToken ], changePassword);
router.delete("/users/:id", [ authJwt.verifyToken ], removeUsers);
router.post("/webhook", webhook);
module.exports = router;
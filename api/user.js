    var router = require("express").Router();
 const { authJwt, verifySignUp } = require("../middlewares");
 const { upload } = require("../controllers/controllers");
 const { webhook, getUsers, removeUsers, updateUsers, getTradingAccounts, getOffers, createTradingAccount, 
     createWalletOfAllTradingAccounts, changePassword, verifyProfile, updateStatus, 
     internalTransfer, getTradingAccountBalance, getTradingAccountTransactions, 
     requestIB, cancelIB, IBClients, updateIBStatus, getOwnIBClients, IBClientDetail,
     getIBParentTradingAccountDeposits, 
     getSocialTradingAccountInfo,
     getSocialTradingAccountInfoAll,
     registerSocialTradingFeed,
     updateSocialAccountStatus} = require("../controllers/user");
 
 router.get("/users", [ authJwt.verifyToken ], getUsers);
 router.get("/offers", [ authJwt.verifyToken ], getOffers);
 router.get("/tradingAccounts", [ authJwt.verifyToken ], getTradingAccounts);
 router.get("/tradingAccountTransactions", [ authJwt.verifyToken ], getTradingAccountTransactions);
 router.get("/tradingAccount/balance", [ authJwt.verifyToken ], getTradingAccountBalance);
 router.post("/tradingAccount", [ authJwt.verifyToken ], createTradingAccount);
 router.post("/walletOfAllTradingAccounts", createWalletOfAllTradingAccounts);
 router.post("/status/:id", [ authJwt.verifyToken ], updateStatus);
 router.post("/verifyProfile", upload.fields([{ name: "frontImg", maxCount: 1},{name: "backImg", maxCount: 1 }, {name: "proofOfResident", maxCount: 1 }]), verifyProfile);
 router.post("/checkDuplicateUsernameOrEmail",  verifySignUp.checkDuplicateUsernameOrEmail, (req, res) => { res.status(200).send(true)} );
 router.post("/users/:id", [ authJwt.verifyToken ], updateUsers);
 router.post("/changePassword", [ authJwt.verifyToken ], changePassword);
 router.post("/internal-transfer", [ authJwt.verifyToken ], internalTransfer);
 router.delete("/users/:id", [ authJwt.verifyToken ], removeUsers);
 router.post("/webhook", webhook);
 router.post("/request-ib", [ authJwt.verifyToken ], requestIB);
 router.post("/cancel-ib", [ authJwt.verifyToken ], cancelIB);
 router.get("/ib-clients", [ authJwt.verifyToken ], IBClients);
 router.get("/ib-client-detail", [ authJwt.verifyToken ], IBClientDetail);
 router.post("/update-ib-status", [ authJwt.verifyToken ], updateIBStatus);
 router.get("/own-ib-clients", [ authJwt.verifyToken ], getOwnIBClients);
 router.get("/ib-parent-trading-account-deposits", [ authJwt.verifyToken ], getIBParentTradingAccountDeposits);
 router.get("/social-account-info",[ authJwt.verifyToken ], getSocialTradingAccountInfo ); 
 router.put("/social-account-info", [ authJwt.verifyToken ], registerSocialTradingFeed); 
 router.post("/social-account-info", [ authJwt.verifyToken ], updateSocialAccountStatus); 
 router.get("/social-account-all",[ authJwt.verifyToken ], getSocialTradingAccountInfoAll);
 module.exports = router;
 
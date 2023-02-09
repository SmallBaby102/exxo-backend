var router = require("express").Router();
const { authJwt, verifySignUp } = require("../middlewares");
const { getSetting, updateSetting, getWithdraw, updateWithdraw, getWallets } = require("../controllers/other");

router.get("/setting", [ authJwt.verifyToken ], getSetting);
router.get("/wallets", [ authJwt.verifyToken ], getWallets);
router.post("/setting", [ authJwt.verifyToken ], updateSetting);
router.get("/withdraw", [ authJwt.verifyToken ], getWithdraw);
router.post("/withdraw", [ authJwt.verifyToken ], updateWithdraw);

module.exports = router;
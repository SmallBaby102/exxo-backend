var router = require("express").Router();
const { authJwt, verifySignUp } = require("../middlewares");
const { getSetting, updateSetting, getWithdraw, updateWithdraw } = require("../controllers/other");

router.get("/setting", [ authJwt.verifyToken ], getSetting);
router.post("/setting", [ authJwt.verifyToken ], updateSetting);
router.get("/withdraw", [ authJwt.verifyToken ], getWithdraw);
router.post("/withdraw", [ authJwt.verifyToken ], updateWithdraw);

module.exports = router;
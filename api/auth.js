var router = require("express").Router();
const { verifySignUp } = require("../middlewares");
const controller = require("../controllers/auth");
router.post("/admin-signup", controller.adminSignup);
router.post("/signup", [verifySignUp.checkDuplicateUsernameOrEmail], controller.signup);
router.post("/signin", controller.signin);
router.post("/admin-signin", controller.adminSignin);
router.get("/verify", controller.verifyEmail);
module.exports = router;
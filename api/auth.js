var router = require("express").Router();
const { verifySignUp } = require("../middlewares");
const controller = require("../controllers/auth");
router.post(
"/signup",
[
    verifySignUp.checkDuplicateUsernameOrEmail,
    // verifySignUp.checkRolesExisted
],
controller.signup
);

router.post("/signin", controller.signin);
router.get("/verify", controller.verifyEmail);
module.exports = router;
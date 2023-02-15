var router = require("express").Router();
const { verifySignUp } = require("../middlewares");
const controller = require("../controllers/auth");

router.get("/admins", controller.getAdmins);
router.post("/admin",  [verifySignUp.checkDuplicateAdminNameOrEmail],  controller.updateAdmin);
router.delete("/admin", controller.deleteAdmin);
router.post("/signup", [verifySignUp.checkDuplicateUsernameOrEmail], controller.signup);
router.post("/signin", controller.signin);
router.post("/admin-signin", controller.adminSignin);
router.get("/verify", controller.verifyEmail);
router.post("/reset-link", controller.resetLink);
router.get("/reset-password", controller.resetPasswordPage);
router.post("/reset-password", controller.resetPassword);
module.exports = router;

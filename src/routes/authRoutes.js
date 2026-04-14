const express = require("express");
const router = express.Router();
const authController = require("../controller/authController");
const { authenticateToken } = require("../middleware/authMiddleware");
const {decryptPayload} = require("../middleware/decryptPayload");
//decryptPayload is used to decypt the UI payload for login, register and reset password routes.
router.post("/login",decryptPayload, authController.login);
router.post("/register",decryptPayload, authController.register);
router.post("/reset-password", decryptPayload, authController.resetPassword);

router.post("/forgot-password", authController.forgotPassword);
router.use(authenticateToken);
// Protected routes below
router.get("/profile/:id", authController.getProfile);
router.put("/profile/:id", authController.updateProfile);
router.post("/profile/:id/address", authController.addAddress);
router.delete("/profile/:id/address/:index", authController.removeAddress);
router.put("/profile/:id/password", authController.updatePassword);
router.post("/logout", authController.logout);





module.exports = router;
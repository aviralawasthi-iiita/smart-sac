import { Router } from "express";
import { registerUser ,loginUser,logoutUser,refreshAccessToken,getCurrentUser,
changeCurrentPassword,verifyResetToken,forgotPassword,resetPassword,dashboardDetails,updateAccountDetails} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT,changeCurrentPassword);
router.route("/verify-reset-token").post(verifyResetToken);
router.route("/current-user").get(verifyJWT,getCurrentUser);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").post(resetPassword)
router.route("/dashboard").get(verifyJWT,dashboardDetails);
router.route("/update-account-details").post(verifyJWT,updateAccountDetails);

export default router;
import { Router } from "express";
import { registerUser ,loginUser,logoutUser,refreshAccessToken,getCurrentUser,
changeCurrentPassword,verifyResetToken,forgotPassword,resetPassword,dashboardDetails,updateAccountDetails,searchUser,brokenEquipmentTicket,newEquipmentTicket,getAnnouncements,getNoOfAnnouncements} from "../controllers/user.controller.js";
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
router.route("/search-user").post(verifyJWT,searchUser);
router.route("/broken-equipment-ticket").post(verifyJWT,brokenEquipmentTicket);
router.route("/new-equipment-ticket").post(verifyJWT,newEquipmentTicket);
router.route("/get-announcement").get(verifyJWT,getAnnouncements);
router.route("/get-no-of-announcement").get(verifyJWT,getNoOfAnnouncements);

 
export default router;
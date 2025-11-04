import { Router } from "express";
import { 
  loginAdmin, 
  logoutAdmin, 
  refreshAccessToken, 
  getCurrentAdmin ,
  registerAdmin,
  updateAccountDetails,
  dashboardDetails,
  updateEquipment,
  addEquipment,
  removeEquipment,
  addGame,
  removeGame,
  makeAnnouncement,
  getAnnouncements,
  getNoOfAnnouncements
} from "../controllers/admin.controller.js";
import { verifyJWT } from "../middlewares/authadmin.middleware.js";
const router = Router();

router.route("/register").post(registerAdmin);
router.route("/login").post(loginAdmin);
router.route("/logout").post(verifyJWT,logoutAdmin);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/current-admin").get(verifyJWT,getCurrentAdmin);
router.route("/dashboard").get(verifyJWT,dashboardDetails);
router.route("/update-account-details").post(verifyJWT,updateAccountDetails);
router.route("/update-equipment").post(verifyJWT,updateEquipment);
router.route("/add-game").post(verifyJWT,addGame);
router.route("/remove-game").delete(verifyJWT,removeGame);
router.route("/add-equipment").post(verifyJWT,addEquipment);
router.route("/remove-equipment").delete(verifyJWT,removeEquipment);
router.route("/make-announcement").post(verifyJWT,makeAnnouncement);
router.route("/get-announcement").post(verifyJWT,getAnnouncements);
router.route("/get-no-of-announcement").get(verifyJWT,getNoOfAnnouncements);

export default router;
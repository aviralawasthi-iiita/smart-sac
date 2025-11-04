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
  getNoOfAnnouncements,
  updateTicket,
  getNoOfActiveTickets,
  getActiveTickets,
  getEquipmentHistory,
  getNoOfEquipmentHistory,
  getRecentEquipmentHistory,
  getEquipmentRecentHistoryDict
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
router.route("/get-announcement").get(verifyJWT,getAnnouncements);
router.route("/get-no-of-announcement").get(verifyJWT,getNoOfAnnouncements);
router.route("/update-ticket").post(verifyJWT,updateTicket);
router.route("/get-no-of-active-tickets").get(verifyJWT,getNoOfActiveTickets);
router.route("/get-active-tickets").get(verifyJWT,getActiveTickets);
router.route("/get-recent-equipment-history").get(verifyJWT,getRecentEquipmentHistory);
router.route("/get-equipment-recent-history-dict").get(verifyJWT,getEquipmentRecentHistoryDict);
router.route("/get-no-of-equipment-history").get(verifyJWT,getNoOfEquipmentHistory);
router.route("/get-equipment-history").post(verifyJWT,getEquipmentHistory); 

export default router;
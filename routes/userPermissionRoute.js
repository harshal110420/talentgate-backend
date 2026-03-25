const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/authMiddleware");
const checkPermissionUnified = require("../middleware/checkPermissionUnified");
const {
  getPermissionsByUser,
  createOrUpdateUserPermission,
} = require("../controller/userPermissionController");

// This should match `menus.code` for your permission module
const MENU_CODE = "user_management";

router.get(
  "/getPermissionbyuser/:userId",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "view", true),
  getPermissionsByUser
);

router.post(
  "/createPermissionByUser",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "new", false),
  createOrUpdateUserPermission
);

module.exports = router;

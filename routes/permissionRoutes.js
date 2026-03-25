const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/authMiddleware");
const checkPermissionUnified = require("../middleware/checkPermissionUnified"); // <- new flexible middleware
const {
  getPermissionsByRole,
  createOrUpdatePermission,
  getPermissionById,
  getAllPermissions,
  deletePermission,
} = require("../controller/permissionController");

// This should match `menus.code` for your permission module
const MENU_CODE = "permission_management";

// Allow users to view their own role's permissions without permission_management permission
// This is needed for the dashboard to show modules they have access to
// But still require permission_management permission to view other roles' permissions
router.get(
  "/getPermission/:role",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "view", true),
  getPermissionsByRole
);

router.get(
  "/getAll",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getAllPermissions
);

router.get(
  "/get/:id",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getPermissionById
);

router.post(
  "/create",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "new", false), // ✅ create → new
  createOrUpdatePermission
);

router.delete(
  "/delete/:id",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "delete", false),
  deletePermission
);

module.exports = router;

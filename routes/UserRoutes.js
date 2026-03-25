const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/authMiddleware");
const checkPermissionUnified = require("../middleware/checkPermissionUnified");

const {
  createUser,
  getAllUsers,
  getActiveUsers,
  getUserByID,
  updateUser,
  deleteUser,
  getHRUsers,
} = require("../controller/userController");

// 👇 Ye code value same honi chahiye as stored in `menus.code`
const MENU_CODE = "user_management";

router.post(
  "/create",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "new", false),
  createUser,
);

router.get(
  "/all",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getAllUsers,
);

router.get("/active-users", authmiddleware, getActiveUsers);

router.get("/hr-recruiters", authmiddleware, getHRUsers);

router.get(
  "/get/:id",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getUserByID,
);

router.put(
  "/update/:id",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  updateUser,
);

router.delete(
  "/delete/:id",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "delete", false),
  deleteUser,
);

module.exports = router;

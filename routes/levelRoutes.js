const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/authMiddleware");
const checkPermissionUnified = require("../middleware/checkPermissionUnified"); // <- new flexible middleware
const {
  createLevel,
  getAllLevels,
  getActiveLevels,
  getSingleLevel,
  updateLevel,
  deleteLevel,
} = require("../controller/levelController");

// Menu code used in 'menus' table for Level module
const MENU_CODE = "level_management";

router.post(
  "/create",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "new", false),
  createLevel,
);

router.get(
  "/all",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getAllLevels,
);

router.get("/all_levels", authmiddleware, getActiveLevels);

router.get(
  "/get/:id",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getSingleLevel,
);

router.put(
  "/update/:id",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  updateLevel,
);

router.delete(
  "/delete/:id",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "delete", false),
  deleteLevel,
);

module.exports = router;

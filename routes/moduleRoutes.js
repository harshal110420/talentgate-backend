const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/authMiddleware");
const checkPermissionUnified = require("../middleware/checkPermissionUnified"); // <- new flexible middleware

const {
  getAllModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
} = require("../controller/moduleController");
const { getAllExams } = require("../controller/examController");

// Match this with `menuId` column from your `menus` table
const MENU_CODE = "module_management";

router.get(
  "/all_modules",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getAllModules
);

router.get("/fetch_all_modules", authmiddleware, getAllModules);

router.get(
  "/:id",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getModuleById
);

router.post(
  "/",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "new", false), // ✅ create → new
  createModule
);

router.put(
  "/:id",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false), // ✅ update → edit
  updateModule
);

router.delete(
  "/:id",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "delete", false),
  deleteModule
);

// Exams
router.get(
  "/exam/all",
  authmiddleware,
  checkPermissionUnified("exam_management", "view"),
  getAllExams
);

module.exports = router;

const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/authMiddleware");
const checkPermissionUnified = require("../middleware/checkPermissionUnified"); // <- new flexible middleware
const {
  getAllMenusGrouped,
  getMenusByModule,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
} = require("../controller/menuController");

const MENU_CODE = "menu_management";

router.get(
  "/all_menu",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getAllMenusGrouped
);

router.get("/fetch_all_menu", authmiddleware, getAllMenusGrouped);

router.get(
  "/module/:moduleId",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getMenusByModule
);

router.get(
  "/get/:id",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getMenuById
);

router.post(
  "/create",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "new", false),
  createMenu
);

router.put(
  "/update/:id",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  updateMenu
);

router.delete(
  "/:id",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "delete", false),
  deleteMenu
);

module.exports = router;

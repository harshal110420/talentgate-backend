const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/authMiddleware");
const checkPermissionUnified = require("../middleware/checkPermissionUnified");
const {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} = require("../controller/notificationController");

const MENU_CODE = "notification_management";

router.post(
  "/create-notification",
  authmiddleware,
  //   checkPermissionUnified(MENU_CODE, "new", false),
  createNotification
);

router.post(
  "/create-bulk-notification",
  authmiddleware,
  checkPermissionUnified(MENU_CODE, "new", false),
  createBulkNotifications
);

router.get("/:userId", authmiddleware, getUserNotifications);
router.patch("/mark-read/:id", authmiddleware, markRead);
router.patch("/mark-read/user/:userId", authmiddleware, markAllRead);
router.delete(
  "/:id",
  authmiddleware,
  // checkPermissionUnified(MENU_CODE, "delete", false),
  deleteNotification
);

module.exports = router;

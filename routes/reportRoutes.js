const express = require("express");
const router = express.Router();
const {
  getReport,
  getDetailedReport,
} = require("../controller/QuestionReportController");
const authMiddleware = require("../middleware/authMiddleware");
const checkPermissionUnified = require("../middleware/checkPermissionUnified");

const MENU_CODE = "question_reports";
router.get(
  "/questions",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "print", false),
  getReport
);

router.get(
  "/questions/detailed",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "print", false),
  getDetailedReport
);

module.exports = router;

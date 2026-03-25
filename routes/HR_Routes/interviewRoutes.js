const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/authMiddleware");
const checkPermissionUnified = require("../../middleware/checkPermissionUnified");
const MENU_CODE = "interview_management";
const {
  getCandidatesOverview,
  createInterview,
  rescheduleInterview,
  getMyInterviews,
  getAllInterviews,
} = require("../../controller/HR_controllers/interviewController");

router.get(
  "/overview",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getCandidatesOverview
);

router.post(
  "/schedule",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "new", false),
  createInterview
);

router.post(
  "/reschedule/:interviewId",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  rescheduleInterview
);

router.get(
  "/my",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getMyInterviews
);

router.get(
  "/all",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getAllInterviews
);

module.exports = router;

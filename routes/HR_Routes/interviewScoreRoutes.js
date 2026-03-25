const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authMiddleware");
const checkPermissionUnified = require("../../middleware/checkPermissionUnified");

const MENU_CODE = "interview_evaluation";
const SCORE_MENU_CODE = "assigned_interviews";

const {
  saveDraftScore,
  submitInterviewScore,
  fetchInterviewScores,
  fetchMyInterviewScore,
  lockInterviewScores,
} = require("../../controller/HR_controllers/interviewScoreController");

/**
 * ================================
 * Interviewer Routes
 * ================================
 */

// Save or update draft score (editable)
router.post(
  "/:interviewId/draft",
  authMiddleware,
  checkPermissionUnified(SCORE_MENU_CODE, "new", false),
  saveDraftScore
);

// Submit final score (immutable)
router.post(
  "/:interviewId/submit",
  authMiddleware,
  checkPermissionUnified(SCORE_MENU_CODE, "new", false),
  submitInterviewScore
);

// Fetch logged-in interviewer's score
router.get(
  "/:interviewId/my-score",
  authMiddleware,
  checkPermissionUnified(SCORE_MENU_CODE, "view", false),
  fetchMyInterviewScore
);

/**
 * ================================
 * HR / Admin Routes
 * ================================
 */

// Fetch all scores for an interview
router.get(
  "/:interviewId/scores",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  fetchInterviewScores
);

// HR action
router.post(
  "/:interviewId/lock",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "new", false),
  lockInterviewScores
);
module.exports = router;

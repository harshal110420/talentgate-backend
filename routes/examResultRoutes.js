// routes/examResultRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkPermissionUnified = require("../middleware/checkPermissionUnified"); // <- new flexible middleware
const MENU_CODE = "exam_results";

const {
  getAllExamResults,
  getExamResultById,
  getExamResultsGroupedByCandidate,
  generateExamResultPDF,
  generateDetailedExamResultPDF,
} = require("../controller/examResultController");

// GET all exam results
router.get(
  "/get_all_exams",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getAllExamResults,
);

// GET single exam result details
router.get(
  "/get_exam_by_id/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getExamResultById,
);

router.get(
  "/by-candidate",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getExamResultsGroupedByCandidate,
);

// PDF route
router.get(
  "/generate-pdf/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  generateExamResultPDF,
);

router.get(
  "/generate-detailed-pdf/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  generateDetailedExamResultPDF,
);
module.exports = router;

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkPermissionUnified = require("../middleware/checkPermissionUnified"); // <- new flexible middleware
const {
  createCandidate,
  getAllCandidates,
  getActiveCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  sendExamMailToCandidate,
  startExam,
  reassignExam,
  markResumeReviewed,
  shortlistCandidateForExam,
  shortlistCandidateForInterview,
  rejectCandidate,
  scheduleInterview,
  markInterviewCompleted,
  markInterviewCancelled,
  markSelected,
  markHired,
} = require("../controller/candidateController");
const verifyTokenAndLogin = require("../middleware/verifyExamTokenMiddleware");
const verifyCandidateToken = require("../middleware/verifyCandidateMiddleware");
const upload = require("../middleware/multerMiddleware");
const MENU_CODE = "candidate_management";

// Create
router.post(
  "/create",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "new", false),
  upload.single("resume"),
  createCandidate,
);
// Get All
router.get(
  "/all",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getAllCandidates,
);

// Get All
router.get("/all_candidates", authMiddleware, getActiveCandidates);

// Get by ID
router.get(
  "/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getCandidateById,
);
// Update
router.put(
  "/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  upload.single("resume"),
  updateCandidate,
);
// Delete
router.delete(
  "/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "delete", false),
  deleteCandidate,
);

router.post(
  "/reassign-exam",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  reassignExam,
);

router.patch(
  "/mark-resume-reviewed/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  markResumeReviewed,
);

router.post(
  "/shortlist-candidate-for-exam/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  shortlistCandidateForExam,
);

router.post(
  "/shortlist-candidate-for-interview/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  shortlistCandidateForInterview,
);

router.patch(
  "/reject/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  rejectCandidate,
);

router.patch(
  "/schedule-interview/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  scheduleInterview,
);

router.patch(
  "/interview-completed/:interviewId",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  markInterviewCompleted,
);

router.patch(
  "/interview-cancelled/:interviewId",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  markInterviewCancelled,
);

router.patch(
  "/select/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  markSelected,
);

router.patch(
  "/hire/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  markHired,
);

// ------------------------------------------------------------------- //
router.post("/send-exam-mail/:candidateId", sendExamMailToCandidate);
router.post("/verify-token", verifyTokenAndLogin);
router.post("/start-exam", verifyCandidateToken, startExam);
// router.post("/login", loginCandidate);

module.exports = router;

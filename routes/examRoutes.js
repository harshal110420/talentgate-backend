const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkPermissionUnified = require("../middleware/checkPermissionUnified"); // <- new flexible middleware

const {
  createExam,
  getAllExams,
  getSingleExam,
  updateExam,
  //   deleteExam,
  toggleActiveExam,
  fetchQuestions,
  randomQuestions,
  submitExam,
  getExamQuestionsForUI,
  getActiveExams,
} = require("../controller/examController");
const verifyCandidateToken = require("../middleware/verifyCandidateMiddleware");

const MENU_CODE = "exam_management";

router.post(
  "/create_exam",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "new", false),
  createExam,
);

// Get Questions
router.get(
  "/fetch-questions",
  authMiddleware,
  // checkPermissionUnified(MENU_CODE, "view", false),
  fetchQuestions,
);

// Get Random Questions
router.get(
  "/random-questions",
  authMiddleware,
  // checkPermissionUnified(MENU_CODE, "view", false),
  randomQuestions,
);

router.get(
  "/all",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getAllExams,
);

router.get("/all_exams", authMiddleware, getActiveExams);

router.get(
  "/get/:id",
  authMiddleware,
  // checkPermissionUnified(MENU_CODE, "details", false),
  getSingleExam,
);

router.put(
  "/update/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  updateExam,
);

// router.delete(
//   "/delete/:id",
//   authMiddleware,
//    checkPermissionUnified(MENU_CODE, "delete", false),
//   deleteExam
// );

router.patch(
  "/toggle-active/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  toggleActiveExam,
);

// ------------------------ this part belong to user exam ui ---------------------------------------
router.post("/submit-exam", verifyCandidateToken, submitExam);
router.get(
  "/start-ui",
  verifyCandidateToken, // same one used for /submit-exam
  getExamQuestionsForUI,
);

module.exports = router;

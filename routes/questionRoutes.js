const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkPermissionUnified = require("../middleware/checkPermissionUnified"); // <- new flexible middleware
const upload = require("../middleware/uploadMiddleware");

const {
  createQuestion,
  getAllQuestions,
  getSingleQuestion,
  updateQuestion,
  deleteQuestion,
  toggleActiveQuestion,
  bulkUploadQuestions,
  exportQuestionsToExcel,
} = require("../controller/questionController");

// CRUD Routes with permission checks
router.post(
  "/create",
  authMiddleware,
  checkPermissionUnified("question_management", "new", false),
  createQuestion
);

router.get(
  "/all",
  authMiddleware,
  checkPermissionUnified("question_management", "view", false),
  getAllQuestions
);

router.get("/all_questions", authMiddleware, getAllQuestions);

router.get(
  "/get/:id",
  authMiddleware,
  checkPermissionUnified("question_management", "view", false),
  getSingleQuestion
);

router.put(
  "/update/:id",
  authMiddleware,
  checkPermissionUnified("question_management", "edit", false),
  updateQuestion
);

router.delete(
  "/delete/:id",
  authMiddleware,
  checkPermissionUnified("question_management", "delete", false),
  deleteQuestion
);

router.patch(
  "/toggle-active/:id",
  authMiddleware,
  checkPermissionUnified("question_management", "edit", false),
  toggleActiveQuestion
);

router.post(
  "/upload",
  authMiddleware,
  checkPermissionUnified("question_management", "upload", false),
  upload.single("file"),
  bulkUploadQuestions
);
router.get(
  "/export",
  authMiddleware,
  checkPermissionUnified("question_management", "export", false),
  exportQuestionsToExcel
);

module.exports = router;

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkPermissionUnified = require("../middleware/checkPermissionUnified");
const {
  createSubject,
  getAllSubjects,
  getSingleSubject,
  getSubjectsByDepartment,
  updateSubject,
  deleteSubject,
  getActiveSubjects,
} = require("../controller/subjectController");

// Menu code for RBAC
const MENU_CODE = "subject_management";

router.post(
  "/create",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "new", false),
  createSubject,
);

router.get(
  "/all",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getAllSubjects,
);

router.get("/all_subjects", authMiddleware, getActiveSubjects);

router.get(
  "/get/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getSingleSubject,
);

router.get(
  "/by-department/:departmentId",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getSubjectsByDepartment,
);

router.put(
  "/update/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  updateSubject,
);

router.delete(
  "/delete/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "delete", false),
  deleteSubject,
);

module.exports = router;

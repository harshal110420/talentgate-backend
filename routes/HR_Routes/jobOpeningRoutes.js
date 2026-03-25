const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/authMiddleware");
const checkPermissionUnified = require("../../middleware/checkPermissionUnified"); // <- new flexible middleware
const {
  createJobOpening,
  getAllJobOpenings,
  getJobOpeningById,
  updateJobOpening,
  deleteJobOpening,
  getActiveJobOpenings,
} = require("../../controller/HR_controllers/jobOpeningController");

const MENU_CODE = "job_management";

// Create
router.post(
  "/create",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "new", false),
  createJobOpening,
);

// Get All
router.get(
  "/all",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getAllJobOpenings,
);

// Get All Job Openings
router.get("/all_jobs", authMiddleware, getActiveJobOpenings);

// Get by ID
router.get(
  "/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "view", false),
  getJobOpeningById,
);

// Update
router.put(
  "/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "edit", false),
  updateJobOpening,
);

// Delete
router.delete(
  "/:id",
  authMiddleware,
  checkPermissionUnified(MENU_CODE, "delete", false),
  deleteJobOpening,
);

module.exports = router;

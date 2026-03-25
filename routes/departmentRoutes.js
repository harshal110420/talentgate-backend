const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/authMiddleware");
const checkPermissionUnified = require("../middleware/checkPermissionUnified"); // <- new flexible middleware
const {
  createDepartment,
  getAllDepartments,
  getActiveDepartments,
  getSingleDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controller/departmentController");

// CREATE department
router.post(
  "/create",
  authmiddleware,
  checkPermissionUnified("department_management", "new", false),
  createDepartment,
);

// GET all departments
router.get(
  "/all",
  authmiddleware,
  checkPermissionUnified("department_management", "view", false),
  getAllDepartments,
);

// GET all departments (alternative route)
router.get("/all_departments", authmiddleware, getActiveDepartments);

// GET single department by ID
router.get(
  "/get/:id",
  authmiddleware,
  checkPermissionUnified("department_management", "view", false),
  getSingleDepartment,
);

// UPDATE department
router.put(
  "/update/:id",
  authmiddleware,
  checkPermissionUnified("department_management", "edit", false),
  updateDepartment,
);

// DELETE department
router.delete(
  "/delete/:id",
  authmiddleware,
  checkPermissionUnified("department_management", "delete", false),
  deleteDepartment,
);

module.exports = router;

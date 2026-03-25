const asyncHandler = require("express-async-handler");
const { DashMatrixDB } = require("../models");
const { Department } = DashMatrixDB;

// ➤ Create Department
const createDepartment = asyncHandler(async (req, res) => {
  const { name, isActive = true } = req.body;

  // Check if department with same name exists
  const existing = await Department.findOne({ where: { name } });
  if (existing) {
    return res.status(400).json({ message: "Department already exists" });
  }

  const department = await Department.create({ name, isActive });

  res
    .status(201)
    .json({ message: "Department created successfully", department });
});

// ➤ Get All Departments
const getAllDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.findAll({ order: [["id", "DESC"]] });
  res
    .status(200)
    .json({ message: "Departments fetched successfully", departments });
});

// ➤ Get Active Departments
const getActiveDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.findAll({
    where: { isActive: true },
    order: [["name", "ASC"]],
  });
  res
    .status(200)
    .json({ message: "Active departments fetched successfully", departments });
});

// ➤ Get Single Department
const getSingleDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findByPk(req.params.id);
  if (!department) {
    return res.status(404).json({ message: "Department not found" });
  }

  res.status(200).json({ message: "Department fetched", department });
});

// ➤ Update Department
const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findByPk(req.params.id);
  if (!department) {
    return res.status(404).json({ message: "Department not found" });
  }

  const { name, isActive } = req.body;

  await department.update({
    name: name ?? department.name,
    isActive: isActive ?? department.isActive,
  });

  res
    .status(200)
    .json({ message: "Department updated successfully", department });
});

// ➤ Delete Department
const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findByPk(req.params.id);
  if (!department) {
    return res.status(404).json({ message: "Department not found" });
  }

  await department.destroy();
  res.status(200).json({ message: "Department deleted successfully" });
});

module.exports = {
  createDepartment,
  getAllDepartments,
  getActiveDepartments,
  getSingleDepartment,
  updateDepartment,
  deleteDepartment,
};

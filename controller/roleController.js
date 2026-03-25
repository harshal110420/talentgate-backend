const asyncHandler = require("express-async-handler");

const { DashMatrixDB } = require("../models");
const { Role } = DashMatrixDB;

// ➤ Create Role
// ➤ Create Role
const createRole = asyncHandler(async (req, res) => {
  const { displayName, isActive = true } = req.body;

  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ message: "Display name is required" });
  }

  // auto-generate role_name from displayName
  const role_name = displayName.trim().toLowerCase().replace(/\s+/g, "_");

  // Check for duplicate role_name
  const existing = await Role.findOne({ where: { role_name } });
  if (existing) {
    return res.status(400).json({ message: "Role already exists" });
  }

  const role = await Role.create({
    role_name,
    displayName,
    isActive,
  });

  res.status(201).json({
    message: "Role created successfully",
    role,
  });
});

// ➤ Get All Roles
const getAllRoles = asyncHandler(async (req, res) => {
  const roles = await Role.findAll({ order: [["id", "DESC"]] });
  res.status(200).json({ message: "Roles fetched successfully", roles });
});

// ➤ Get Active Roles (For dropdowns)
const getActiveRoles = asyncHandler(async (req, res) => {
  const roles = await Role.findAll({
    where: { isActive: true },
    order: [["displayName", "ASC"]],
  });

  res.status(200).json({
    message: "Active roles fetched successfully",
    roles,
  });
});

// ➤ Get Single Role
const getSingleRole = asyncHandler(async (req, res) => {
  const role = await Role.findByPk(req.params.id);
  if (!role) {
    return res.status(404).json({ message: "Role not found" });
  }
  res.status(200).json({ message: "Role found", role });
});

// ➤ Update Role
const updateRole = asyncHandler(async (req, res) => {
  const role = await Role.findByPk(req.params.id);
  if (!role) {
    return res.status(404).json({ message: "Role not found" });
  }

  const { displayName, isActive } = req.body;

  await role.update({
    displayName: displayName ?? role.displayName,
    isActive: isActive ?? role.isActive,
  });

  res.status(200).json({
    message: "Role updated successfully",
    role,
  });
});

// ➤ Delete Role
const deleteRole = asyncHandler(async (req, res) => {
  const role = await Role.findByPk(req.params.id);
  if (!role) {
    return res.status(404).json({ message: "Role not found" });
  }

  await role.destroy();
  res.status(200).json({ message: "Role deleted successfully" });
});

module.exports = {
  createRole,
  getAllRoles,
  getActiveRoles,
  getSingleRole,
  updateRole,
  deleteRole,
};

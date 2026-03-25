const asyncHandler = require("express-async-handler");
const { DashMatrixDB } = require("../models");
const { Module } = DashMatrixDB;

// ➤ Get all active modules (ordered by orderBy)
const getAllModules = asyncHandler(async (req, res) => {
  const modules = await Module.findAll({
    where: { isActive: true },
    order: [["orderBy", "ASC"]],
  });
  res.status(200).json(modules);
});

// ➤ Create a new module
const createModule = asyncHandler(async (req, res) => {
  const {
    moduleId,
    name,
    path,
    version = "1.0",
    isActive = true,
    orderBy,
  } = req.body;

  const module = await Module.create({
    moduleId,
    name,
    path,
    version,
    isActive,
    orderBy: orderBy ? Number(orderBy) : null, // ✅ FIX
    created_by: req.user.id, // ✅ capture audit
  });

  res.status(201).json({ message: "Module created successfully", module });
});

// ➤ Get a module by ID
const getModuleById = asyncHandler(async (req, res) => {
  const module = await Module.findByPk(req.params.id);

  if (!module) {
    return res.status(404).json({ message: "Module not found" });
  }

  res.status(200).json(module);
});

// ➤ Update existing module
const updateModule = asyncHandler(async (req, res) => {
  // console.log("REQ.BODY:", req.body); // 🔍 debug
  const module = await Module.findByPk(req.params.id);

  if (!module) {
    return res.status(404).json({ message: "Module not found" });
  }

  const { moduleId, name, path, version, isActive, orderBy } = req.body;

  await module.update({
    ...(moduleId && { moduleId }),
    ...(name && { name }),
    ...(path && { path }),
    ...(version && { version }),
    ...(typeof isActive !== "undefined" && { isActive }),
    ...(orderBy && { orderBy }),
    updated_by: req.user.id, // ✅ capture audit
  });

  res.status(200).json({ message: "Module updated successfully", module });
});

// ➤ Delete module (hard delete)
const deleteModule = asyncHandler(async (req, res) => {
  const module = await Module.findByPk(req.params.id);

  if (!module) {
    return res.status(404).json({ message: "Module not found" });
  }

  await module.destroy();
  res.status(200).json({ message: "Module deleted successfully" });
});

module.exports = {
  getAllModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
};

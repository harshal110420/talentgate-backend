const asyncHandler = require("express-async-handler");
const { DashMatrixDB } = require("../models");
const { Module, Menu } = DashMatrixDB;

// ➤ Get all menus grouped by module name and type
const getAllMenusGrouped = asyncHandler(async (req, res) => {
  const menus = await Menu.findAll({
    include: {
      model: Module,
      as: "module",
      attributes: ["name"],
    },
   
    order: [["orderBy", "ASC"]],
  });

  const grouped = {};

  menus.forEach((menu) => {
    const moduleName = menu.module?.name || "Unknown Module";
    const category = menu.type || "Uncategorized";

    if (!grouped[moduleName]) {
      grouped[moduleName] = {};
    }

    if (!grouped[moduleName][category]) {
      grouped[moduleName][category] = [];
    }

    grouped[moduleName][category].push({
      id: menu.id,
      name: menu.name,
      menuId: menu.menuId,
      parentCode: menu.parentCode,
      type: menu.type,
      path: menu.path,
      isActive: menu.isActive, // 👈 add this
    });
  });

  res.status(200).json(grouped);
});

// ➤ Get all menus for a specific module
const getMenusByModule = asyncHandler(async (req, res) => {
  const menus = await Menu.findAll({
    where: {
      moduleId: req.params.moduleId,
    },
    order: [["orderBy", "ASC"]],
  });

  res.status(200).json(menus);
});

// ➤ Create a new menu
const createMenu = asyncHandler(async (req, res) => {
  const {
    parentCode,
    moduleId,
    name,
    type,
    menuId,
    isActive = true,
    orderBy,
  } = req.body;

  const newMenu = await Menu.create({
    parentCode,
    moduleId,
    name,
    type,
    menuId,
    isActive,
    orderBy,
    created_by: req.user.id,
  });

  res.status(201).json({ message: "Menu created successfully", menu: newMenu });
});

// ➤ Get menu by ID
const getMenuById = asyncHandler(async (req, res) => {
  const menu = await Menu.findByPk(req.params.id, {
    include: {
      model: Module,
      as: "module",
      attributes: ["name"],
    },
  });

  if (!menu) {
    return res.status(404).json({ message: "Menu not found" });
  }

  res.status(200).json(menu);
});

// ➤ Update menu
const updateMenu = asyncHandler(async (req, res) => {
  const menu = await Menu.findByPk(req.params.id);
  if (!menu) {
    return res.status(404).json({ message: "Menu not found" });
  }

  const { parentCode, moduleId, name, type, menuId, isActive, orderBy } =
    req.body;

  await menu.update({
    ...(parentCode && { parentCode }),
    ...(moduleId && { moduleId }),
    ...(name && { name }),
    ...(type && { type }),
    ...(menuId && { menuId }),
    ...(typeof isActive !== "undefined" && { isActive }),
    ...(orderBy && { orderBy }),
    updated_by: req.user.id,
  });

  res.status(200).json({ message: "Menu updated successfully", menu });
});

// ➤ Delete menu
const deleteMenu = asyncHandler(async (req, res) => {
  const menu = await Menu.findByPk(req.params.id);
  if (!menu) {
    return res.status(404).json({ message: "Menu not found" });
  }

  await menu.destroy();
  res.status(200).json({ message: "Menu deleted successfully" });
});

module.exports = {
  getAllMenusGrouped,
  getMenusByModule,
  createMenu,
  getMenuById,
  updateMenu,
  deleteMenu,
};

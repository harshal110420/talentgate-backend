const asyncHandler = require("express-async-handler");
const { Op, Sequelize } = require("sequelize");

const { DashMatrixDB } = require("../models");
const { Level } = DashMatrixDB;

// ➤ Create Level
const createLevel = asyncHandler(async (req, res) => {
  const { name, isActive = true } = req.body;

  // Duplicate check (case-insensitive)
  const existing = await Level.findOne({
    where: Sequelize.where(
      Sequelize.fn("LOWER", Sequelize.col("name")),
      name.toLowerCase(),
    ),
  });

  if (existing) {
    return res
      .status(400)
      .json({ message: "Level with this name already exists" });
  }

  const level = await Level.create({ name, isActive });

  res.status(201).json({
    message: "Level created successfully",
    level,
  });
});

// ➤ Get All Levels
const getAllLevels = asyncHandler(async (req, res) => {
  const levels = await Level.findAll({ order: [["id", "DESC"]] });

  res.status(200).json({
    message: "Levels fetched successfully",
    levels,
  });
});

// ➤ Get Active Levels
const getActiveLevels = asyncHandler(async (req, res) => {
  const levels = await Level.findAll({
    where: { isActive: true },
    order: [["name", "ASC"]],
  });

  res.status(200).json({
    message: "Active levels fetched successfully",
    levels,
  });
});

// ➤ Get Single Level
const getSingleLevel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const level = await Level.findByPk(id);

  if (!level) {
    return res.status(404).json({ message: "Level not found" });
  }

  res.status(200).json({
    message: "Level fetched successfully",
    level,
  });
});

// ➤ Update Level
const updateLevel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, isActive } = req.body;

  const level = await Level.findByPk(id);

  if (!level) {
    return res.status(404).json({ message: "Level not found" });
  }

  // Duplicate name check (excluding self)
  if (name) {
    const duplicate = await Level.findOne({
      where: {
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("name")),
            name.toLowerCase(),
          ),
          { id: { [Op.ne]: id } },
        ],
      },
    });

    if (duplicate) {
      return res
        .status(400)
        .json({ message: "Another level with this name already exists" });
    }
  }

  // Update fields
  await level.update({
    name: name ?? level.name,
    isActive: typeof isActive === "boolean" ? isActive : level.isActive,
  });

  res.status(200).json({
    message: "Level updated successfully",
    level,
  });
});

// ➤ Delete Level
const deleteLevel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const level = await Level.findByPk(id);

  if (!level) {
    return res.status(404).json({ message: "Level not found" });
  }

  await level.destroy();

  res.status(200).json({ message: "Level deleted successfully" });
});

module.exports = {
  createLevel,
  getAllLevels,
  getActiveLevels,
  getSingleLevel,
  updateLevel,
  deleteLevel,
};

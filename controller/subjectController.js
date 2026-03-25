const asyncHandler = require("express-async-handler");
// const { Subject, Department } = require("../models");
const { Op, Sequelize } = require("sequelize");
const { DashMatrixDB } = require("../models");
const { Subject, Department } = DashMatrixDB;

// ➤ Create Subject
const createSubject = asyncHandler(async (req, res) => {
  const { name, departmentId, isActive = true } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Subject name is required" });
  }

  // Check if subject already exists (case-insensitive, same department)
  const existing = await Subject.findOne({
    where: {
      [Op.and]: [
        Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("name")),
          name.toLowerCase(),
        ),
        { departmentId },
      ],
    },
  });

  if (existing) {
    return res
      .status(400)
      .json({ message: "Subject already exists in this department" });
  }

  const subject = await Subject.create({
    name,
    departmentId,
    createdBy: req.user?.id ?? null,
    isActive,
    updatedAt: new Date(),
  });

  res.status(201).json({
    message: "Subject created successfully",
    subject,
  });
});

// ➤ Get All Subjects
const getAllSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.findAll({
    include: [{ model: Department, as: "department", attributes: ["name"] }],
    order: [["id", "DESC"]],
  });
  res.status(200).json({
    message: "Subjects fetched successfully",
    subjects,
  });
});

// ➤ Get Active Subjects
const getActiveSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.findAll({
    where: { isActive: true },
    include: [{ model: Department, as: "department", attributes: ["name"] }],
    order: [["id", "DESC"]],
  });
  res.status(200).json({
    message: "Active subjects fetched successfully",
    subjects,
  });
});

// ➤ Get subject by department
// const getSubjectsByDepartment = async (req, res) => {
//   const { departmentId } = req.params;
//   try {
//     const subjects = await Subject.findAll({
//       where: { departmentId, isActive: true },
//     });

//     res.status(200).json(subjects);
//   } catch (error) {
//     console.error("Error fetching subjects by department:", error);
//     res.status(500).json({ message: "Failed to fetch subjects." });
//   }
// };

// ─────────────────────────────────────────────────────────────────────────────
// Subject Controller
// ✅ OPTIMIZED: only id + name fetched, raw:true
// ─────────────────────────────────────────────────────────────────────────────
const getSubjectsByDepartment = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;

  const subjects = await Subject.findAll({
    where: { departmentId, isActive: true },
    attributes: ["id", "name"], // ✅ sirf zaruri fields
    order: [["name", "ASC"]],
    raw: true, // ✅ no model overhead
  });

  res.status(200).json(subjects);
});

// ➤ Get Single Subject by ID
const getSingleSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const subject = await Subject.findByPk(id, {
    include: [{ model: Department, as: "department", attributes: ["name"] }],
  });

  if (!subject) {
    return res.status(404).json({ message: "Subject not found" });
  }

  res.status(200).json({
    message: "Subject fetched successfully",
    subject,
  });
});

// ➤ Update Subject
const updateSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, departmentId, isActive } = req.body;

  const subject = await Subject.findByPk(id);
  if (!subject) {
    return res.status(404).json({ message: "Subject not found" });
  }

  // Duplicate check (excluding self)
  if (name) {
    const duplicate = await Subject.findOne({
      where: {
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("name")),
            name.toLowerCase(),
          ),
          { departmentId: departmentId ?? subject.departmentId },
          { id: { [Op.ne]: id } },
        ],
      },
    });

    if (duplicate) {
      return res.status(400).json({
        message:
          "Another subject with this name already exists in this department",
      });
    }
  }

  await subject.update({
    name: name ?? subject.name,
    departmentId: departmentId ?? subject.departmentId,
    isActive: typeof isActive === "boolean" ? isActive : subject.isActive,
    updatedAt: new Date(),
  });

  res.status(200).json({
    message: "Subject updated successfully",
    subject,
  });
});

// ➤ Delete Subject
const deleteSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const subject = await Subject.findByPk(id);

  if (!subject) {
    return res.status(404).json({ message: "Subject not found" });
  }

  await subject.destroy();
  res.status(200).json({ message: "Subject deleted successfully" });
});

module.exports = {
  createSubject,
  getAllSubjects,
  getActiveSubjects,
  getSingleSubject,
  updateSubject,
  deleteSubject,
  getSubjectsByDepartment,
};

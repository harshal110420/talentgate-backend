const asyncHandler = require("express-async-handler");
const { DashMatrixDB } = require("../../models");
const generateJobCode = require("../../utils/generateJobCode");
const { Op } = require("sequelize");

const { JobOpening, Department, User } = DashMatrixDB; // ✅ Exam remove

/* ======================================================
   CREATE JOB OPENING
====================================================== */
const createJobOpening = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { title, departmentId, designation, status, isPublished } = req.body;

  if (!title || !departmentId || !designation) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const department = await Department.findByPk(departmentId);
  if (!department)
    return res
      .status(400)
      .json({ success: false, message: "Invalid department" });

  const jobCode = await generateJobCode();
  const duplicate = await JobOpening.findOne({ where: { jobCode } });
  if (duplicate)
    return res
      .status(409)
      .json({ success: false, message: "Job code already exists" });

  const jobOpening = await JobOpening.create({
    jobCode,
    title,
    departmentId,
    designation,
    status,
    isPublished,
    createdBy: req.user.id,
    updatedBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: "Job opening created successfully",
    data: jobOpening,
  });
});

/* ======================================================
   GET ALL JOB OPENINGS
====================================================== */
const getAllJobOpenings = asyncHandler(async (req, res) => {
  const { departmentId, status, isPublished } = req.query;
  const where = {};

  if (departmentId) where.departmentId = departmentId;
  if (status) where.status = status;
  if (isPublished !== undefined) where.isPublished = isPublished === "true";

  try {
    const jobs = await JobOpening.findAll({
      where,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "mail"],
          required: false,
        },
      ],
    });
    res.json({ success: true, data: jobs });
  } catch (err) {
    console.error("❌ EXACT ERROR:", err.message); // ✅ exact message dikhega
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ======================================================
   GET ACTIVE JOB OPENINGS (for candidate form dropdown)
====================================================== */
const getActiveJobOpenings = asyncHandler(async (req, res) => {
  const { search = "", page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const searchCondition = search.trim()
    ? {
        [Op.or]: [
          { jobCode: { [Op.like]: `%${search}%` } },
          { title: { [Op.like]: `%${search}%` } },
          { designation: { [Op.like]: `%${search}%` } },
        ],
      }
    : {};

  const { count, rows: jobs } = await JobOpening.findAndCountAll({
    where: { status: "Open", isPublished: true, ...searchCondition },
    attributes: ["id", "jobCode", "title", "designation"],
    order: [["created_at", "DESC"]],
    limit: Number(limit),
    offset: Number(offset),
  });

  res.json({
    success: true,
    data: jobs,
    pagination: {
      total: count,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / limit),
    },
  });
});

/* ======================================================
   GET SINGLE JOB OPENING
====================================================== */
const getJobOpeningById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await JobOpening.findByPk(id, {
    include: [
      { model: Department, as: "department", attributes: ["id", "name"] },
      {
        model: User,
        as: "creator",
        attributes: ["id", "firstName", "lastName", "mail"],
      },
    ],
  });

  if (!job)
    return res
      .status(404)
      .json({ success: false, message: "Job opening not found" });

  res.json({ success: true, data: job });
});

/* ======================================================
   UPDATE JOB OPENING
====================================================== */
const updateJobOpening = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await JobOpening.findByPk(id);
  if (!job)
    return res
      .status(404)
      .json({ success: false, message: "Job opening not found" });

  await job.update({ ...req.body, updatedBy: req.user?.id || null });

  res.json({
    success: true,
    message: "Job opening updated successfully",
    data: job,
  });
});

/* ======================================================
   DELETE JOB OPENING
====================================================== */
const deleteJobOpening = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await JobOpening.findByPk(id);
  if (!job)
    return res
      .status(404)
      .json({ success: false, message: "Job opening not found" });

  await job.destroy();

  res.json({ success: true, message: "Job opening deleted successfully" });
});

module.exports = {
  createJobOpening,
  getAllJobOpenings,
  getActiveJobOpenings,
  getJobOpeningById,
  updateJobOpening,
  deleteJobOpening,
  // ✅ getPublicJobs aur getPublicJobByCode hata diye — zarurat nahi
};

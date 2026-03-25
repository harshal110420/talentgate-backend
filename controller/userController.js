// controllers/userController.js
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const { Op } = require("sequelize");

const { DashMatrixDB } = require("../models");
const { User, Role, Department } = DashMatrixDB;

const getHRUsers = asyncHandler(async (req, res) => {
  try {
    const hrUsers = await User.findAll({
      where: {
        isActive: true,
      },
      attributes: ["id", "firstName", "lastName", "mail"], // ← sirf yahi fields chahiye frontend ko
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "role_name", "displayName"],
          where: {
            role_name: "HR", // ← apna exact role_name yahan check karo DB mein
            isActive: true,
          },
          required: true, // ← INNER JOIN — sirf HR role wale users aayenge
        },
      ],
      order: [
        ["firstName", "ASC"],
        ["lastName", "ASC"],
      ],
    });

    res.status(200).json({
      success: true,
      data: hrUsers,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch HR users",
      error: err.message,
    });
  }
});

const createUser = asyncHandler(async (req, res) => {
  const {
    username,
    firstName,
    lastName,
    password,
    mail,
    mobile,
    roleId,
    departmentId,
    isActive,
  } = req.body;

  // ✅ Parallel validation - All queries run together
  const [existingUser, existingEmail, role, department] = await Promise.all([
    User.findOne({ where: { username } }),
    User.findOne({ where: { mail } }),
    Role.findOne({ where: { id: roleId, isActive: true } }),
    Department.findOne({ where: { id: departmentId, isActive: true } }),
  ]);

  // Check duplicates
  if (existingUser) {
    return res.status(400).json({ message: "Username already exists" });
  }

  if (existingEmail) {
    return res.status(400).json({ message: "Email already exists" });
  }

  // Validate role
  if (!role) {
    return res.status(400).json({
      message: "Selected role is inactive or does not exist",
    });
  }

  // Validate department
  if (!department) {
    return res.status(400).json({
      message: "Selected department is inactive or does not exist",
    });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    username,
    firstName,
    lastName,
    password: hashedPassword,
    mail,
    mobile,
    roleId,
    departmentId,
    isActive,
    created_by: req.user.id,
  });

  // ✅ Remove password from response
  const { password: _, ...userWithoutPassword } = user.toJSON();

  res.status(201).json({
    message: "User created successfully",
    user: userWithoutPassword,
  });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const {
    search = "",
    roleId = "",
    departmentId = "",
    isActive = "",
  } = req.query;

  // ✅ Base where clause
  const where = {};

  // 🔍 Search filter
  if (search) {
    where[Op.or] = [
      { username: { [Op.like]: `%${search}%` } },
      { mail: { [Op.like]: `%${search}%` } },
      { mobile: { [Op.like]: `%${search}%` } },
    ];
  }

  // ✅ Active / Inactive filter
  if (isActive !== "") {
    where.isActive = isActive === "true";
  }

  try {
    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "role_name", "displayName"],
          ...(roleId && { where: { id: roleId } }),
        },
        {
          model: Department,
          as: "department",
          attributes: ["id", "name"],
          ...(departmentId && { where: { id: departmentId } }),
        },
      ],
      distinct: true, // ⭐ IMPORTANT for correct count
      limit,
      offset,
      order: [["created_at", "DESC"]], // ⚠️ created_at → createdAt
    });

    res.status(200).json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalUsers: count,
        limit,
      },
    });
  } catch (error) {
    console.error("❌ Database Error:", error.message);
    res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

const getActiveUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    where: { isActive: true },
    attributes: { exclude: ["password"] },
    include: [
      {
        model: Role,
        as: "role",
        attributes: ["role_name", "displayName"],
      },
      {
        model: Department,
        as: "department",
        attributes: ["name"],
      },
    ],
    order: [["created_at", "DESC"]],
  });

  res.status(200).json(users);
});

const getUserByID = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ["password"] },
    include: [
      {
        model: Role,
        as: "role",
        attributes: ["role_name", "displayName"],
      },
      {
        model: Department,
        as: "department",
        attributes: ["name"],
      },
    ],
  });

  if (!user) return res.status(404).json({ message: "User not found" });

  res.status(200).json(user);
});

const updateUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // ❌ Username update attempt block
  if ("username" in req.body) {
    return res.status(400).json({
      message: "Username cannot be changed once created",
    });
  }

  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const {
    firstName,
    lastName,
    password,
    mail,
    mobile,
    roleId,
    departmentId,
    isActive,
  } = req.body;

  // ✅ Only update fields that are provided
  const updatedFields = {};

  if (firstName !== undefined && firstName.trim() !== "") {
    updatedFields.firstName = firstName;
  }

  if (lastName !== undefined && lastName.trim() !== "") {
    updatedFields.lastName = lastName;
  }

  if (mail !== undefined && mail.trim() !== "") {
    // ✅ Check email uniqueness if changing
    if (mail !== user.mail) {
      const existingEmail = await User.findOne({ where: { mail } });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }
    updatedFields.mail = mail;
  }

  if (mobile !== undefined && mobile.trim() !== "") {
    updatedFields.mobile = mobile;
  }

  if (isActive !== undefined) {
    updatedFields.isActive = isActive;
  }

  // ✅ Parallel validation for role and department
  const validationPromises = [];

  if (roleId !== undefined) {
    validationPromises.push(
      Role.findOne({ where: { id: roleId, isActive: true } }).then((role) => ({
        type: "role",
        data: role,
      })),
    );
  }

  if (departmentId !== undefined) {
    validationPromises.push(
      Department.findOne({
        where: { id: departmentId, isActive: true },
      }).then((department) => ({ type: "department", data: department })),
    );
  }

  // ✅ Wait for all validations
  if (validationPromises.length > 0) {
    const results = await Promise.all(validationPromises);

    for (const result of results) {
      if (result.type === "role") {
        if (!result.data) {
          return res.status(400).json({
            message: "Cannot assign inactive role",
          });
        }
        updatedFields.roleId = parseInt(roleId);
      }

      if (result.type === "department") {
        if (!result.data) {
          return res.status(400).json({
            message: "Cannot assign inactive department",
          });
        }
        updatedFields.departmentId = parseInt(departmentId);
      }
    }
  }

  // 🔐 Password update (optional)
  if (password && password.trim() !== "") {
    const salt = await bcrypt.genSalt(10);
    updatedFields.password = await bcrypt.hash(password, salt);
  }

  // Always track who updated
  updatedFields.updated_by = req.user.id;

  // ✅ Check if there are any fields to update
  if (Object.keys(updatedFields).length === 1) {
    return res.status(400).json({
      message: "No changes detected to update",
    });
  }

  // ✅ Update only changed fields
  await user.update(updatedFields);

  // ✅ Remove password from response
  const { password: _, ...userWithoutPassword } = user.toJSON();

  return res.status(200).json({
    message: "User updated successfully",
    user: userWithoutPassword,
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  // ✅ Soft delete - Mark as inactive
  await user.update({
    isActive: false,
    deleted_at: new Date(),
    updated_by: req.user.id,
  });

  res.status(200).json({ message: "User deactivated successfully" });
});

module.exports = {
  getHRUsers,
  createUser,
  getAllUsers,
  getActiveUsers,
  getUserByID,
  updateUser,
  deleteUser,
};

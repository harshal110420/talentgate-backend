const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { DashMatrixDB } = require("../models");

const { User, Role, Department } = DashMatrixDB;

/**
 * =========================
 * 🔐 LOGIN USER
 * =========================
 */
const loginUser = async (req, res) => {
  try {
    let { username, password } = req.body;

    // 1️⃣ Basic validation
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required." });
    }

    const user = await User.findOne({
      where: { username },
      include: [{ model: Role, as: "role" }],
    });

    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid username or user not found." });
    }

    // 🔒 CASE-SENSITIVE CHECK
    if (user.username !== username) {
      return res.status(401).json({
        message: "Invalid username or password.",
      });
    }

    // 3️⃣ Active check
    if (!user.isActive) {
      return res.status(403).json({ message: "User account is inactive." });
    }

    // 4️⃣ Password verification
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password." });
    }

    // 5️⃣ Generate JWT (standard claims)
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role?.role_name || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    // 6️⃣ Success response
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullName: `${user.firstName} ${user.lastName}`,
        username: user.username,
        role: user.role?.role_name || null,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/**
 * =========================
 * 🚪 LOGOUT USER
 * =========================
 * JWT based system – frontend clears token
 */
const logoutUser = async (req, res) => {
  try {
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};

/**
 * =========================
 * 👤 CURRENT LOGGED-IN USER
 * =========================
 */
const currentLoggedIn = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.user.id },
      include: [
        { model: Role, as: "role" },
        { model: Department, as: "department" },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "User account is inactive" });
    }

    return res.status(200).json({
      id: user.id,
      // fullName: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      mail: user.mail,
      role: user.role?.role_name || null,
      displayName: user.role?.displayName || null,
      departmentName: user.department?.name || null,
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  loginUser,
  logoutUser,
  currentLoggedIn,
};

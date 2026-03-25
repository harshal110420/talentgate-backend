const express = require("express");
const router = express.Router();
const {
  loginUser,
  logoutUser,
  currentLoggedIn,
} = require("../controller/authController");
const authmiddleware = require("../middleware/authMiddleware");



// POST /api/auth/login
router.post("/login", loginUser);

// GET /api/auth/logout
router.get("/logout", logoutUser);
router.get("/me", authmiddleware, currentLoggedIn); // ✅ New route
module.exports = router;

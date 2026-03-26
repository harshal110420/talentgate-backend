// app.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const { dashMatrixSequelize } = require("./config/db");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/UserRoutes");
const roleRoutes = require("./routes/roleRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const moduleRoutes = require("./routes/moduleRoutes");
const menuRoutes = require("./routes/menuRoutes");
const permissionRoutes = require("./routes/permissionRoutes");
const userPermissionRoutes = require("./routes/userPermissionRoute");
const levelRoutes = require("./routes/levelRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const questionRoutes = require("./routes/questionRoutes");
const candidateRoute = require("./routes/candidateRoute");
const examRoutes = require("./routes/examRoutes");
const examResultRoutes = require("./routes/examResultRoutes");
const jobOpeningRoutes = require("./routes/HR_Routes/jobOpeningRoutes");
// const jobPublicRoutes = require("./routes/HR_Routes/jobPublicRoutes");
// const jobApplyRoutes = require("./routes/Public_routes/publicCareerRoutes");
const interviewRoutes = require("./routes/HR_Routes/interviewRoutes");
const interviewScoreRoute = require("./routes/HR_Routes/interviewScoreRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

app.use(
  cors({
    origin: "*",
    credentials: false,
  }),
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ------------------ ROUTES -------------------
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/permission", permissionRoutes);
app.use("/api/userPermission", userPermissionRoutes);
app.use("/api/level", levelRoutes);
app.use("/api/subject", subjectRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/candidate", candidateRoute);
app.use("/api/exam", examRoutes);
app.use("/api/exam_results", examResultRoutes);
app.use("/api/job-openings", jobOpeningRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/interview-score", interviewScoreRoute);
app.use("/api/notifications", notificationRoutes);

// Public routes
// app.use("/api/public", jobPublicRoutes);
// app.use("/api/careers", jobApplyRoutes);

app.get("/", (req, res) => res.send("Server is running!"));
app.get("/health", async (req, res) => {
  try {
    await dashMatrixSequelize.authenticate(); // ✅ DB bhi ping hoga
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
    });
  } catch (err) {
    res.status(500).json({ status: "DB_ERROR", message: err.message });
  }
});
module.exports = app;

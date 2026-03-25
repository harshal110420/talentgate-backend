const jwt = require("jsonwebtoken");
const { DashMatrixDB } = require("../models");
const { Candidate } = DashMatrixDB;
const verifyExamToken = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] ||
      req.body?.token ||
      req.query?.token;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_EXAM);
    const { candidateId, examId } = decoded;

    const candidate = await Candidate.findByPk(candidateId);
    if (!candidate || candidate.examId !== examId) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const now = new Date();
    const sentTime = new Date(candidate.lastMailSentAt);
    const oneHour = 60 * 60 * 1000;

    if (now - sentTime > oneHour) {
      candidate.examStatus = "Expired";
      await candidate.save();
      return res.status(403).json({ message: "Exam link expired" });
    }

    if (candidate.examStatus === "Completed") {
      return res.status(403).json({ message: "Exam already submitted" });
    }

    if (candidate.examStatus === "Disqualified") {
      return res.status(403).json({ message: "Exam already disqualified" });
    }

    if (candidate.examStatus === "Expired") {
      return res.status(403).json({ message: "Exam link expired" });
    }

    req.candidate = candidate;
    req.examId = examId;

    next();
  } catch (err) {
    console.error("Token error:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = verifyExamToken;

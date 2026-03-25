const jwt = require("jsonwebtoken");
const { DashMatrixDB } = require("../models");
const { Candidate, Exam } = DashMatrixDB;

const verifyExamToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_EXAM);
    const { candidateId, examId } = decoded;

    // Fetch candidate and exam
    const candidate = await Candidate.findByPk(candidateId, {
      include: [{ model: Exam, as: "exam" }],
    });

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found." });
    }

    // Check exam assignment match
    if (candidate.examId !== examId) {
      return res
        .status(403)
        .json({ message: "Token does not match assigned exam." });
    }

    // 🚫 Reuse Prevention Logic
    if (candidate.examStatus === "Completed") {
      return res.status(403).json({
        message: "You have already completed the exam. Token expired.",
      });
    }

    if (candidate.examStatus === "Expired") {
      return res.status(403).json({ message: "This exam link has expired." });
    }

    if (candidate.examStatus === "Disqualified") {
      return res.status(403).json({
        message: "You have been disqualified from this exam.",
      });
    }

    if (candidate.examStatus === "Assigned") {
      return res.status(403).json({
        message: "Exam not yet started. Mail not sent or token invalid.",
      });
    }

    if (candidate.examStatus === "Not assigned") {
      return res
        .status(403)
        .json({ message: "No exam assigned to this candidate." });
    }

    // ✅ If status is Pending, allow access
    return res.status(200).json({
      message: "Token valid",
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
      },
      exam: {
        id: candidate.exam?.id,
        name: candidate.exam?.name,
        duration: candidate.exam?.duration,
        totalQuestions: candidate.exam?.totalQuestions,
      },
    });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = verifyExamToken;

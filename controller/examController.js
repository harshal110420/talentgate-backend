const asyncHandler = require("express-async-handler");
const { DashMatrixDB } = require("../models");
const { Exam, Department, Level, QuestionBank, ExamResult, Subject } =
  DashMatrixDB;
const { Op } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db");
const sequelize = dashMatrixSequelize;
const sendExamResultMail = require("../utils/sendExamResultMail"); // ✅ top pe import karo

// ─────────────────────────────────────────────────────────────────────────────
// Create Exam
// ─────────────────────────────────────────────────────────────────────────────
const createExam = asyncHandler(async (req, res) => {
  const {
    name,
    questionIds,
    levelId,
    departmentId,
    positiveMarking = 0,
    negativeMarking = 0,
    isActive = true,
  } = req.body;

  if (!name || !Array.isArray(questionIds) || questionIds.length === 0) {
    return res
      .status(400)
      .json({ message: "Exam name and at least one question are required" });
  }

  const formattedQuestionIds = questionIds
    .map((q) =>
      typeof q === "object" && q.questionId ? Number(q.questionId) : Number(q),
    )
    .filter((id) => !isNaN(id));

  const exam = await Exam.create({
    name,
    questionIds: formattedQuestionIds,
    levelId,
    departmentId,
    positiveMarking,
    negativeMarking,
    isActive,
    created_by: req.user?.id || null,
  });

  res.status(201).json({ message: "Exam created successfully", exam });
});

// ─────────────────────────────────────────────────────────────────────────────
// Random Questions
// ✅ OPTIMIZED: subjectId diya to Subject lookup skip, departmentId directly use
// ✅ OPTIMIZED: RAND() ki jagah offset-based random — large tables pe fast
// ─────────────────────────────────────────────────────────────────────────────
const randomQuestions = asyncHandler(async (req, res) => {
  const { departmentId, levelId, subjectId, limit } = req.query;
  const fetchLimit = Math.min(Number(limit) || 10, 100); // cap at 100

  if (!departmentId) {
    return res.status(400).json({ message: "Department is required" });
  }

  try {
    const whereClause = { isActive: true };

    if (subjectId) {
      // ✅ Specific subject — no extra DB call needed
      whereClause.subjectId = Number(subjectId);
    } else {
      // ✅ All subjects under department — single query with subquery
      const subjectIds = await Subject.findAll({
        where: { departmentId, isActive: true },
        attributes: ["id"],
        raw: true, // ✅ skip model instantiation — just plain objects
      }).then((rows) => rows.map((r) => r.id));

      if (!subjectIds.length) {
        return res.status(200).json({ questions: [] });
      }
      whereClause.subjectId = { [Op.in]: subjectIds };
    }

    if (levelId) whereClause.levelId = Number(levelId);

    // ✅ RAND() is slow on large tables.
    // Better: count total, pick random offset, fetch a window, shuffle in JS.
    const total = await QuestionBank.count({ where: whereClause });

    if (!total) {
      return res.status(200).json({ questions: [] });
    }

    // If we need more than available, just return all (shuffled)
    if (fetchLimit >= total) {
      const questions = await QuestionBank.findAll({
        where: whereClause,
        attributes: [
          "id",
          "question",
          "options",
          "correct",
          "timeLimit",
          "questionType",
          "metadata",
        ],
        raw: true, // ✅ no model overhead
      });
      return res.status(200).json({ questions: shuffleArray(questions) });
    }

    // Pick a random starting offset, then grab a larger window and slice
    const windowSize = Math.min(fetchLimit * 3, total); // wider window = better randomness
    const maxOffset = total - windowSize;
    const offset = Math.floor(Math.random() * (maxOffset + 1));

    const questions = await QuestionBank.findAll({
      where: whereClause,
      attributes: [
        "id",
        "question",
        "options",
        "correct",
        "timeLimit",
        "questionType",
        "metadata",
      ],
      order: [["id", "ASC"]], // ✅ indexed scan — much faster than RAND()
      limit: windowSize,
      offset,
      raw: true,
    });

    // Shuffle the window and take only what was asked
    const result = shuffleArray(questions).slice(0, fetchLimit);
    return res.status(200).json({ questions: result });
  } catch (err) {
    console.error("Random question error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Questions (manual selection)
// ✅ OPTIMIZED: raw:true, removed unnecessary RAND() when limit is small
// ─────────────────────────────────────────────────────────────────────────────
const fetchQuestions = asyncHandler(async (req, res) => {
  const { subjectId, levelId, departmentId, limit, page = 1 } = req.query;

  if (!subjectId && !levelId && !departmentId) {
    return res.status(400).json({
      message:
        "Please select at least one filter (Subject, Level, or Department)",
    });
  }

  const whereClause = { isActive: true };
  if (subjectId) whereClause.subjectId = Number(subjectId);
  if (levelId) whereClause.levelId = Number(levelId);
  if (departmentId) whereClause.departmentId = Number(departmentId);

  const parsedLimit = limit && Number(limit) > 0 ? Number(limit) : null;
  const offset = parsedLimit ? (Number(page) - 1) * parsedLimit : 0;

  const queryOptions = {
    where: whereClause,
    attributes: [
      "id",
      "question",
      "options",
      "correct",
      "timeLimit",
      "questionType",
      "metadata",
    ],
    include: [
      { model: Level, as: "level", attributes: ["id", "name"] },
      { model: Subject, as: "subject", attributes: ["id", "name"] },
      { model: Department, as: "department", attributes: ["id", "name"] },
    ],
    // ✅ RAND() only when limit is small (<=50), else stable order
    order:
      parsedLimit && parsedLimit <= 50
        ? [sequelize.literal("RAND()")]
        : [["id", "DESC"]],
  };

  if (parsedLimit) {
    queryOptions.limit = parsedLimit;
    queryOptions.offset = offset;
  }

  const questions = await QuestionBank.findAll(queryOptions);

  if (!questions.length) {
    return res.status(200).json({
      message: "No questions found for the selected filters.",
      questions: [],
    });
  }

  res.status(200).json({
    message: "Questions fetched successfully",
    count: questions.length,
    questions,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Get All Exams
// ─────────────────────────────────────────────────────────────────────────────
const getAllExams = asyncHandler(async (req, res) => {
  const exams = await Exam.findAll({
    attributes: ["id", "name", "isActive"],
    include: [
      { model: Department, as: "department", attributes: ["id", "name"] },
      { model: Level, as: "level", attributes: ["id", "name"] },
    ],
    order: [["id", "DESC"]],
  });

  res.status(200).json({ message: "Exams fetched successfully", exams });
});

// ─────────────────────────────────────────────────────────────────────────────
// Get Active Exams
// ─────────────────────────────────────────────────────────────────────────────
const getActiveExams = asyncHandler(async (req, res) => {
  const exams = await Exam.findAll({
    where: { isActive: true },
    attributes: ["id", "name"],
    include: [
      { model: Department, as: "department", attributes: ["id", "name"] },
      { model: Level, as: "level", attributes: ["id", "name"] },
    ],
    order: [["name", "ASC"]],
  });

  res.status(200).json({ message: "Active exams fetched successfully", exams });
});

// ─────────────────────────────────────────────────────────────────────────────
// Get Single Exam
// ✅ OPTIMIZED: raw:true for questions fetch, no extra model overhead
// ─────────────────────────────────────────────────────────────────────────────
const getSingleExam = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ✅ Fetch exam meta — keep model instance (needed for .toJSON())
  const exam = await Exam.findByPk(id, {
    attributes: [
      "id",
      "name",
      "questionIds",
      "levelId",
      "departmentId",
      "positiveMarking",
      "negativeMarking",
      "isActive",
    ],
    include: [
      { model: Department, as: "department", attributes: ["id", "name"] },
      { model: Level, as: "level", attributes: ["id", "name"] },
    ],
  });

  if (!exam) {
    return res.status(404).json({ message: "Exam not found" });
  }

  const questionIds = (exam.questionIds || [])
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);

  let questions = [];
  if (questionIds.length > 0) {
    // ✅ raw:true — skip Sequelize model instantiation for large question lists
    questions = await QuestionBank.findAll({
      where: { id: { [Op.in]: questionIds } },
      attributes: [
        "id",
        "question",
        "options",
        "correct",
        "subjectId",
        "levelId",
        "departmentId",
        "timeLimit",
        "questionType",
        "metadata",
      ],
      order: [
        [sequelize.literal(`FIELD(id, ${questionIds.join(",")})`), "ASC"],
      ],
      raw: true, // ✅ plain objects, faster
    });
  }

  return res.status(200).json({
    message: "Exam found",
    exam: { ...exam.toJSON(), questions },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Update Exam
// ─────────────────────────────────────────────────────────────────────────────
const updateExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findByPk(req.params.id);
  if (!exam) return res.status(404).json({ message: "Exam not found" });

  const {
    name,
    questionIds,
    levelId,
    departmentId,
    positiveMarking,
    negativeMarking,
    isActive,
  } = req.body;

  let formattedQuestionIds;
  if (questionIds) {
    formattedQuestionIds = questionIds
      .map((q) =>
        typeof q === "object" && q.questionId
          ? Number(q.questionId)
          : Number(q),
      )
      .filter((id) => !isNaN(id));
  }

  await exam.update({
    name: name ?? exam.name,
    questionIds: formattedQuestionIds ?? exam.questionIds,
    levelId: levelId ?? exam.levelId,
    departmentId: departmentId ?? exam.departmentId,
    positiveMarking: positiveMarking ?? exam.positiveMarking,
    negativeMarking: negativeMarking ?? exam.negativeMarking,
    isActive: typeof isActive === "boolean" ? isActive : exam.isActive,
    updated_by: req.user?.id,
  });

  res.status(200).json({ message: "Exam updated successfully", exam });
});

// ─────────────────────────────────────────────────────────────────────────────
// Toggle Active Status
// ─────────────────────────────────────────────────────────────────────────────
const toggleActiveExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findByPk(req.params.id);
  if (!exam) return res.status(404).json({ message: "Exam not found" });

  exam.isActive = !exam.isActive;
  await exam.save();

  res.status(200).json({
    message: `Exam ${exam.isActive ? "activated" : "deactivated"} successfully`,
    exam,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Submit Exam
// ─────────────────────────────────────────────────────────────────────────────
const submitExam = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const candidate = req.candidate;
    const { responses, submissionType } = req.body;
    const finalSubmissionType = submissionType === "AUTO" ? "AUTO" : "MANUAL";

    if (!responses || !Array.isArray(responses)) {
      await transaction.rollback();
      return res.status(400).json({ message: "Missing or invalid responses" });
    }

    const exam = await candidate.getExam({ transaction });
    if (!exam || candidate.examId !== exam.id) {
      await transaction.rollback();
      return res.status(403).json({ message: "Invalid exam assignment" });
    }

    await candidate.reload({ lock: transaction.LOCK.UPDATE, transaction });

    if (
      candidate.examStatus === "Completed" ||
      candidate.examStatus === "Disqualified"
    ) {
      await transaction.rollback();
      return res
        .status(200)
        .json({ message: "Exam already submitted earlier." });
    }

    const questionIds = exam.questionIds.map(Number);
    const questions = await QuestionBank.findAll({
      where: { id: { [Op.in]: questionIds } },
      attributes: ["id", "question", "correct"],
      raw: true,
      transaction,
    });

    // ✅ Map for O(1) lookup instead of .find() in loop
    const responseMap = new Map(
      responses.map((r) => [Number(r.questionId), r]),
    );

    let attempted = 0,
      correctAnswers = 0,
      incorrectAnswers = 0,
      skipped = 0;
    const finalResponses = [];

    for (const q of questions) {
      const correctValue = q.correct ?? q.correctAnswer;
      const userResponse = responseMap.get(Number(q.id));

      const baseResponse = {
        questionId: q.id,
        question: q.question,
        correctAnswer: String(correctValue).trim(),
        selectedOption: userResponse?.selectedOption ?? null,
      };

      if (!userResponse || userResponse.selectedOption == null) {
        skipped++;
        finalResponses.push(baseResponse);
        continue;
      }

      attempted++;
      String(userResponse.selectedOption).trim() === String(correctValue).trim()
        ? correctAnswers++
        : incorrectAnswers++;

      finalResponses.push(baseResponse);
    }

    const positiveMarking = exam.positiveMarking || 0;
    const negativeMarking = exam.negativeMarking || 0;
    const score =
      correctAnswers * positiveMarking - incorrectAnswers * negativeMarking;
    const totalMarks = questionIds.length * positiveMarking;
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const resultStatus = percentage >= 50 ? "pass" : "fail";

    const examResult = await ExamResult.create(
      {
        candidateId: candidate.id,
        examId: exam.id,
        totalQuestions: questionIds.length,
        attempted,
        correctAnswers,
        incorrectAnswers,
        skipped,
        candidateResponses: finalResponses,
        score,
        resultStatus,
        submissionType: finalSubmissionType,
        startedAt: new Date(),
        submittedAt: new Date(),
      },
      { transaction },
    );

    candidate.examStatus =
      finalSubmissionType === "AUTO" ? "Disqualified" : "Completed";
    candidate.applicationStage = "Exam Completed";
    candidate.examCompletedAt = new Date();
    await candidate.save({ transaction });

    await transaction.commit();

    sendExamResultMail({
      examResultId: examResult.id,
      examResult,
      exam,
    }).catch((err) => console.error("📧 Mail error:", err.message));

    return res.status(200).json({
      message: "✅ Exam submitted successfully.",
      resultStatus,
      score,
    });
  } catch (err) {
    console.error("❌ Submit exam error:", err);
    try {
      await transaction.rollback();
    } catch {}

    if (
      err.name === "SequelizeUniqueConstraintError" ||
      err.message?.includes("already submitted")
    ) {
      return res
        .status(200)
        .json({ message: "Exam already submitted or processed." });
    }

    return res.status(500).json({ message: "Failed to submit exam" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Exam Questions For UI (candidate-facing)
// ✅ OPTIMIZED: raw:true
// ─────────────────────────────────────────────────────────────────────────────
const getExamQuestionsForUI = asyncHandler(async (req, res) => {
  const candidate = req.candidate;

  const exam = await candidate.getExam();
  if (!exam) {
    return res.status(404).json({ message: "Assigned exam not found." });
  }

  const questionIds = exam.questionIds.map(Number);
  const orderField = questionIds.join(",");

  const questions = await QuestionBank.findAll({
    where: { id: { [Op.in]: questionIds } },
    attributes: [
      "id",
      "question",
      "options",
      "timeLimit",
      "questionType",
      "metadata",
    ],
    order: [[sequelize.literal(`FIELD(id, ${orderField})`), "ASC"]],
    raw: true, // ✅ no model instantiation needed for read-only UI data
  });

  res.status(200).json({
    message: "Exam data fetched successfully",
    exam: {
      id: exam.id,
      name: exam.name,
      positiveMarking: exam.positiveMarking,
      negativeMarking: exam.negativeMarking,
      questions,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

// ✅ Fisher-Yates shuffle — O(n), in-place
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = {
  createExam,
  getAllExams,
  getActiveExams,
  getSingleExam,
  updateExam,
  toggleActiveExam,
  fetchQuestions,
  randomQuestions,
  submitExam,
  getExamQuestionsForUI,
};

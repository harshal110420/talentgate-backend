const asyncHandler = require("express-async-handler");
const { DashMatrixDB } = require("../models");
const { Exam, Department, Level, QuestionBank, ExamResult, Subject } =
  DashMatrixDB;
const { Op } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db");
const sequelize = dashMatrixSequelize;

// Create Exam
const createExam = asyncHandler(async (req, res) => {
  const {
    name,
    questionIds, // array of question objects or IDs
    levelId,
    departmentId,
    positiveMarking = 0,
    negativeMarking = 0,
    isActive = true,
  } = req.body;

  // Basic validation
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

  // Create exam
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

// Get Random or Filtered Questions Dynamically
const randomQuestions = asyncHandler(async (req, res) => {
  try {
    const { departmentId, levelId, limit } = req.query;

    if (!departmentId) {
      return res.status(400).json({ message: "Department is required" });
    }

    // Step 1: Find all subjects under the department
    const subjects = await Subject.findAll({
      where: { departmentId },
      attributes: ["id"],
    });

    const subjectIds = subjects.map((s) => s.id);

    // Step 2: Fetch random questions from these subjects
    const whereClause = {
      subjectId: subjectIds,
      isActive: true,
    };

    if (levelId) whereClause.levelId = levelId;

    const questions = await QuestionBank.findAll({
      where: whereClause,
      attributes: [
        "id",
        "question",
        "options",
        "correct",
        "timeLimit",
        "questionType",
        "metadata", // ✅
      ],
      order: sequelize.literal("RAND()"),
      limit: Number(limit) || 10,
    });

    return res.status(200).json({ questions });
  } catch (err) {
    console.error("Random question error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

const fetchQuestions = asyncHandler(async (req, res) => {
  let { subjectId, levelId, departmentId, limit, page = 1 } = req.query;

  // ✅ At least one filter required
  if (!subjectId && !levelId && !departmentId) {
    return res.status(400).json({
      message:
        "Please select at least one filter (Subject, Level, or Department)",
    });
  }

  const whereClause = { isActive: true }; // only active questions
  if (subjectId) whereClause.subjectId = subjectId;
  if (levelId) whereClause.levelId = levelId;
  if (departmentId) whereClause.departmentId = departmentId;

  // ✅ If limit is not provided, fetch all matching questions
  const queryOptions = {
    where: whereClause,
    order: [sequelize.literal("RAND()")], // random order
    attributes: [
      "id",
      "question",
      "options",
      "correct",
      "timeLimit",
      "questionType",
      "metadata", // ✅
    ],
    include: [
      { model: Level, as: "level", attributes: ["id", "name"] },
      { model: Subject, as: "subject", attributes: ["id", "name"] },
      { model: Department, as: "department", attributes: ["id", "name"] },
    ],
  };

  // Add pagination & limit only if limit exists
  if (limit && Number(limit) > 0) {
    const offset = (page - 1) * limit;
    queryOptions.limit = Number(limit);
    queryOptions.offset = Number(offset);
  }

  const questions = await QuestionBank.findAll(queryOptions);

  if (!questions || questions.length === 0) {
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

// Get All Exams
const getAllExams = asyncHandler(async (req, res) => {
  const exams = await Exam.findAll({
    attributes: ["id", "name", "isActive"],
    include: [
      {
        model: Department,
        as: "department",
        attributes: ["id", "name"], // sirf useful fields
      },
      {
        model: Level,
        as: "level",
        attributes: ["id", "name"],
      },
    ],
    order: [["id", "DESC"]],
  });

  res.status(200).json({
    message: "Exams fetched successfully",
    exams,
  });
});

// Get Active exams
const getActiveExams = asyncHandler(async (req, res) => {
  const exams = await Exam.findAll({
    where: { isActive: true },
    attributes: ["id", "name"],
    include: [
      {
        model: Department,
        as: "department",
        attributes: ["id", "name"], // sirf useful fields
      },
      {
        model: Level,
        as: "level",
        attributes: ["id", "name"],
      },
    ],
    order: [["name", "ASC"]],
  });

  res.status(200).json({
    message: "Active exams fetched successfully",
    exams,
  });
});
// Get Single Exam
const getSingleExam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const exam = await Exam.findByPk(id, {
    include: [
      { model: Department, as: "department", attributes: ["id", "name"] },
      { model: Level, as: "level", attributes: ["id", "name"] },
    ],
  });
  if (!exam) {
    return res.status(404).json({ message: "Exam not found" });
  }
  // ✅ Convert questionIds to numbers
  const questionIds = (exam.questionIds || [])
    .map((q) => Number(q))
    .filter((qid) => !isNaN(qid) && qid > 0);

  let questions = [];
  if (questionIds.length > 0) {
    const orderField = questionIds.join(",");
    // 🔹 Use `Sequelize.literal` WITHOUT explicit table alias
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
      order: [[sequelize.literal(`FIELD(id, ${orderField})`), "ASC"]],
    });
  }

  return res.status(200).json({
    message: "Exam found",
    exam: {
      ...exam.toJSON(),
      questions,
    },
  });
});

// Update Exam
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

// Toggle Active Status
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

const submitExam = async (req, res) => {
  // console.log("🔥 submitExam HIT", {
  //   submissionType: req.body.submissionType,
  // });

  const transaction = await sequelize.transaction();

  try {
    const candidate = req.candidate;
    const { responses, submissionType } = req.body;
    const finalSubmissionType = submissionType === "AUTO" ? "AUTO" : "MANUAL";

    // ✅ Basic validation
    if (!responses || !Array.isArray(responses)) {
      await transaction.rollback();
      return res.status(400).json({ message: "Missing or invalid responses" });
    }

    // ✅ Fetch & validate exam assignment
    const exam = await candidate.getExam({ transaction });
    if (!exam || candidate.examId !== exam.id) {
      await transaction.rollback();
      return res.status(403).json({ message: "Invalid exam assignment" });
    }

    // 🔐 CRITICAL FIX: Lock candidate FIRST (before any status checks)
    await candidate.reload({
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    // ✅ Prevent duplicate submissions (after lock)
    if (
      candidate.examStatus === "Completed" ||
      candidate.examStatus === "Disqualified"
    ) {
      await transaction.rollback();
      return res.status(200).json({
        message: "Exam already submitted earlier.",
      });
    }

    // ✅ Fetch exam questions
    const questionIds = exam.questionIds.map((id) => Number(id));
    const questions = await QuestionBank.findAll({
      where: { id: { [Op.in]: questionIds } },
      transaction,
    });

    let attempted = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let skipped = 0;
    const finalResponses = [];

    // ✅ Evaluate responses
    for (const q of questions) {
      const correctValue = q.correct ?? q.correctAnswer;
      const userResponse = responses.find(
        (r) => Number(r.questionId) === Number(q.id),
      );

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

      const userSel = String(userResponse.selectedOption).trim();
      const correctStr = String(correctValue).trim();

      if (userSel === correctStr) correctAnswers++;
      else incorrectAnswers++;

      finalResponses.push(baseResponse);
    }

    // ✅ Scoring
    const positiveMarking = exam.positiveMarking || 0;
    const negativeMarking = exam.negativeMarking || 0;

    const score =
      correctAnswers * positiveMarking - incorrectAnswers * negativeMarking;

    const totalMarks = questionIds.length * positiveMarking;
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const passPercentage = 50;
    const resultStatus = percentage >= passPercentage ? "pass" : "fail";

    // ✅ Create exam result
    await ExamResult.create(
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

    // 🚨 FINAL & MOST IMPORTANT FIX
    // AUTO submission ALWAYS forces Disqualified
    candidate.examStatus =
      finalSubmissionType === "AUTO" ? "Disqualified" : "Completed";

    candidate.applicationStage = "Exam Completed";
    candidate.examCompletedAt = new Date();

    await candidate.save({ transaction });

    // ✅ Commit once everything is safe
    await transaction.commit();

    return res.status(200).json({
      message: "✅ Exam submitted successfully.",
      resultStatus,
      score,
    });
  } catch (err) {
    console.error("❌ Submit exam error:", err);

    // 🔄 Safe rollback
    try {
      await transaction.rollback();
    } catch {}

    // ✅ Idempotent handling (duplicate / parallel AUTO submits)
    if (
      err.name === "SequelizeUniqueConstraintError" ||
      err.message?.includes("already submitted")
    ) {
      return res.status(200).json({
        message: "Exam already submitted or processed.",
      });
    }

    return res.status(500).json({ message: "Failed to submit exam" });
  }
};

const getExamQuestionsForUI = asyncHandler(async (req, res) => {
  const candidate = req.candidate; // from token middleware

  const exam = await candidate.getExam();
  if (!exam) {
    return res.status(404).json({ message: "Assigned exam not found." });
  }

  const questionIds = exam.questionIds.map((id) => parseInt(id));

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

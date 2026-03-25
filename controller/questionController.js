const asyncHandler = require("express-async-handler");
// const { QuestionBank, Subject, Level, Department } = require("../models"); // adjust if your index exports differently
const { Op } = require("sequelize");
const XLSX = require("xlsx");
const { DashMatrixDB } = require("../models");
const { QuestionBank, Subject, Level, Department } = DashMatrixDB;

// ✅ Metadata validator
const validateMetadata = (questionType, metadata) => {
  if (questionType === "MCQ") return null;
  if (questionType === "FILL_IN_BLANK") return null;

  // ✅ JOURNAL_ENTRY ka data ab options mein hai, metadata null rahega
  if (questionType === "JOURNAL_ENTRY") return null;

  if (questionType === "PASSAGE") {
    if (!metadata?.passage?.content) {
      return "PASSAGE requires metadata.passage.content";
    }
    if (!metadata?.passage?.passageGroupId) {
      return "PASSAGE requires metadata.passage.passageGroupId";
    }
  }

  return null;
};

// Create Question
const createQuestion = asyncHandler(async (req, res) => {
  const {
    question,
    options,
    correct,
    subjectId,
    levelId,
    departmentId,
    timeLimit,
    isActive = true,
    questionType = "MCQ",
    metadata = null,
  } = req.body;

  // Basic validation
  if (!question || !options || !correct) {
    return res.status(400).json({ message: "Required fields missing" });
  }

  // ✅ Validate metadata based on questionType
  const metaError = validateMetadata(questionType, metadata);
  if (metaError) {
    return res.status(400).json({ message: metaError });
  }

  // Normalize options and correct before save
  const normalizedOptions = options.map((opt) =>
    typeof opt === "object" ? opt : String(opt).trim(),
  );
  const normalizedCorrect = String(correct).trim();

  const newQuestion = await QuestionBank.create({
    question,
    options: normalizedOptions,
    correct: normalizedCorrect,
    subjectId,
    levelId,
    departmentId,
    timeLimit,
    isActive,
    createdBy: req.user?.id,
    questionType,
    metadata,
  });

  res.status(201).json({
    message: "Question created successfully",
    question: newQuestion,
  });
});

// Get All Questions with pagination & filters
const getAllQuestions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 30,
    subjectId,
    levelId,
    departmentId,
    search = "",
    isActive = "all",
  } = req.query;

  const filters = {};
  if (isActive !== "all") {
    filters.isActive = isActive === "true";
  }
  if (subjectId && !isNaN(Number(subjectId)) && subjectId !== "")
    filters.subjectId = subjectId;
  if (levelId && !isNaN(Number(levelId)) && levelId !== "")
    filters.levelId = levelId;
  if (departmentId && !isNaN(Number(departmentId)) && departmentId !== "")
    filters.departmentId = departmentId;
  if (search) filters.question = { [Op.like]: `%${search}%` };

  const offset = (page - 1) * limit;

  const { count, rows } = await QuestionBank.findAndCountAll({
    where: filters,
    include: [
      { model: Subject, attributes: ["id", "name"], as: "subject" },
      { model: Level, attributes: ["id", "name"], as: "level" },
      { model: Department, attributes: ["id", "name"], as: "department" },
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [["id", "DESC"]],
  });

  res.status(200).json({
    message: "Questions fetched successfully",
    questions: rows,
    total: count,
    currentPage: parseInt(page),
    totalPages: Math.ceil(count / limit),
  });
});

// Get Single Question by ID
const getSingleQuestion = asyncHandler(async (req, res) => {
  const question = await QuestionBank.findByPk(req.params.id, {
    include: [
      {
        model: Department,
        as: "department",
        attributes: ["id", "name"],
      },
      {
        model: Subject,
        as: "subject",
        attributes: ["id", "name"],
      },
      {
        model: Level,
        as: "level",
        attributes: ["id", "name"],
      },
    ],
  });
  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }
  res.status(200).json({ message: "Question found", question });
});

// Update Question
const updateQuestion = asyncHandler(async (req, res) => {
  const question = await QuestionBank.findByPk(req.params.id);
  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  const {
    question: questionText,
    options,
    correct,
    subjectId,
    levelId,
    departmentId,
    timeLimit,
    isActive,
    questionType,
    metadata,
  } = req.body;

  // ✅ Validate if questionType or metadata is being updated
  const newType = questionType ?? question.questionType;
  const newMeta = metadata !== undefined ? metadata : question.metadata;
  const metaError = validateMetadata(newType, newMeta);
  if (metaError) {
    return res.status(400).json({ message: metaError });
  }

  await question.update({
    question: questionText ?? question.question,
    options: options
      ? options.map((o) => (typeof o === "object" ? o : String(o).trim()))
      : question.options,
    correct: correct ? String(correct).trim() : question.correct,
    subjectId: subjectId ?? question.subjectId,
    levelId: levelId ?? question.levelId,
    departmentId: departmentId ?? question.departmentId,
    timeLimit: timeLimit ?? question.timeLimit,
    isActive: typeof isActive === "boolean" ? isActive : question.isActive,
    questionType: newType,
    metadata: newMeta,
  });

  res.status(200).json({ message: "Question updated successfully", question });
});

// Delete Question (soft delete by setting isActive = false, or hard delete)
const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await QuestionBank.findByPk(req.params.id);
  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  // Option 1: Soft delete
  await question.update({ isActive: false });

  // Option 2: Hard delete
  // await question.destroy();

  res.status(200).json({ message: "Question deleted successfully" });
});

// Toggle isActive status
const toggleActiveQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const question = await QuestionBank.findByPk(id);
  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }
  question.isActive = !question.isActive;
  await question.save();
  res.status(200).json({
    message: `Question ${
      question.isActive ? "activated" : "deactivated"
    } successfully`,
    question,
  });
});

const bulkUploadQuestions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Excel file is required." });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length)
      return res.status(400).json({ message: "Excel sheet is empty." });
    if (rows.length > 500)
      return res
        .status(400)
        .json({ message: "Maximum 500 rows allowed per upload." });

    const str = (val) => String(val ?? "").trim();

    const departmentNames = [
      ...new Set(rows.map((r) => str(r.department)).filter(Boolean)),
    ];
    const subjectNames = [
      ...new Set(rows.map((r) => str(r.subject)).filter(Boolean)),
    ];
    const levelNames = [
      ...new Set(rows.map((r) => str(r.level)).filter(Boolean)),
    ];

    const [departments, subjects, levels] = await Promise.all([
      Department.findAll({ where: { name: departmentNames } }),
      Subject.findAll({ where: { name: subjectNames } }),
      Level.findAll({ where: { name: levelNames } }),
    ]);

    const departmentMap = Object.fromEntries(
      departments.map((d) => [d.name, d.id]),
    );
    const subjectMap = Object.fromEntries(subjects.map((s) => [s.name, s.id]));
    const levelMap = Object.fromEntries(levels.map((l) => [l.name, l.id]));

    const rawQuestions = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const deptName = str(row.department);
      const subjName = str(row.subject);
      const levelName = str(row.level);
      const qType = str(row.questionType).toUpperCase() || "MCQ";

      // ── Basic validation ──
      if (!deptName || !subjName || !str(row.question)) {
        return res.status(400).json({
          message: `Row ${rowNum}: department, subject and question are required.`,
        });
      }
      if (!departmentMap[deptName]) {
        return res.status(400).json({
          message: `Row ${rowNum}: Department '${deptName}' not found.`,
        });
      }
      if (!subjectMap[subjName]) {
        return res
          .status(400)
          .json({ message: `Row ${rowNum}: Subject '${subjName}' not found.` });
      }
      if (levelName && !levelMap[levelName]) {
        return res
          .status(400)
          .json({ message: `Row ${rowNum}: Level '${levelName}' not found.` });
      }

      // ── correct index validation ──
      const correctIndex = parseInt(str(row.correct));
      if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
        return res
          .status(400)
          .json({ message: `Row ${rowNum}: 'correct' must be 0, 1, 2, or 3.` });
      }

      let finalOptions = [];
      let finalMetadata = null;

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 🔴 CHANGE 1 — JOURNAL_ENTRY
      // dr/cr columns se auto build karo, JSON nahi
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (qType === "JOURNAL_ENTRY") {
        const drLines = [];
        const crLines = [];

        for (let n = 1; n <= 3; n++) {
          const acc = str(row[`dr${n}_account`]);
          const amt = str(row[`dr${n}_amount`]);
          if (acc) drLines.push({ account: acc, amount: amt });
        }

        for (let n = 1; n <= 3; n++) {
          const acc = str(row[`cr${n}_account`]);
          const amt = str(row[`cr${n}_amount`]);
          if (acc) crLines.push({ account: acc, amount: amt });
        }

        if (!drLines.length || !crLines.length) {
          return res.status(400).json({
            message: `Row ${rowNum}: JOURNAL_ENTRY needs at least dr1_account + cr1_account.`,
          });
        }

        finalOptions = [{ drLines, crLines }]; // 1 option per row — grouped below
        finalMetadata = null;

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 🟣 CHANGE 2 — PASSAGE
        // passage_* columns se metadata auto build karo
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      } else if (qType === "PASSAGE") {
        const passageGroupId = str(row.passage_groupId);
        const passageContent = str(row.passage_content);

        if (!passageGroupId || !passageContent) {
          return res.status(400).json({
            message: `Row ${rowNum}: PASSAGE needs passage_groupId and passage_content.`,
          });
        }

        finalOptions = [row.option1, row.option2, row.option3, row.option4]
          .map((o) => str(o))
          .filter(Boolean);

        if (finalOptions.length < 2) {
          return res.status(400).json({
            message: `Row ${rowNum}: PASSAGE needs at least 2 options.`,
          });
        }

        finalMetadata = {
          passage: {
            title: str(row.passage_title) || null,
            passageGroupId,
            content: passageContent,
          },
        };

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 🔵 MCQ / FILL_IN_BLANK — plain options
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      } else {
        finalOptions = [row.option1, row.option2, row.option3, row.option4]
          .map((o) => str(o))
          .filter(Boolean);

        if (finalOptions.length < 2) {
          return res
            .status(400)
            .json({ message: `Row ${rowNum}: At least 2 options required.` });
        }
      }

      rawQuestions.push({
        departmentId: departmentMap[deptName],
        subjectId: subjectMap[subjName],
        levelId: levelName ? levelMap[levelName] : null,
        question: str(row.question),
        options: finalOptions,
        correct: String(correctIndex),
        timeLimit: Number(row.timeLimit) || 60,
        isActive: str(row.isActive).toLowerCase() !== "false",
        createdBy: req.user?.id || null,
        updatedBy: req.user?.id || null,
        questionType: qType,
        metadata: finalMetadata,
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔴 CHANGE 3 — JOURNAL_ENTRY grouping
    // Same question ke multiple rows = multiple options
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const finalQuestions = [];
    const journalMap = new Map(); // question text → index in finalQuestions

    for (const q of rawQuestions) {
      if (q.questionType === "JOURNAL_ENTRY") {
        if (journalMap.has(q.question)) {
          // Same question — append this row's option
          const idx = journalMap.get(q.question);
          finalQuestions[idx].options.push(...q.options);
        } else {
          // New journal question
          journalMap.set(q.question, finalQuestions.length);
          finalQuestions.push({ ...q });
        }
      } else {
        finalQuestions.push(q);
      }
    }

    // Validate each journal question has min 2 options
    for (const q of finalQuestions) {
      if (q.questionType === "JOURNAL_ENTRY" && q.options.length < 2) {
        return res.status(400).json({
          message: `Journal question "${q.question.substring(0, 50)}..." has only ${q.options.length} option. Minimum 2 required.`,
        });
      }
    }

    await QuestionBank.bulkCreate(finalQuestions);

    return res.status(201).json({
      message: "Questions uploaded successfully.",
      totalUploaded: finalQuestions.length,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const exportQuestionsToExcel = async (req, res) => {
  try {
    const questions = await QuestionBank.findAll({
      include: [
        { model: Department, as: "department", attributes: ["name"] },
        { model: Subject, as: "subject", attributes: ["name"] },
        { model: Level, as: "level", attributes: ["name"] },
      ],
    });

    const data = questions.map((q) => ({
      id: q.id,
      department: q.department?.name,
      subject: q.subject?.name,
      level: q.level?.name,
      question: q.question,
      options: JSON.stringify(q.options),
      correct: q.correct,
      timeLimit: q.timeLimit,
      isActive: q.isActive,
      questionType: q.questionType, // ✅ NEW
      metadata: JSON.stringify(q.metadata), // ✅ NEW
      createdAt: q.created_at,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=questions.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.send(buffer);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createQuestion,
  getAllQuestions,
  getSingleQuestion,
  updateQuestion,
  deleteQuestion,
  toggleActiveQuestion,
  bulkUploadQuestions,
  exportQuestionsToExcel,
};

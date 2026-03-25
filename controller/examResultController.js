// controllers/examResultController.js
const { DashMatrixDB } = require("../models");
const { ExamResult, Candidate, Exam, QuestionBank, Department, Level } =
  DashMatrixDB;
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const getAllExamResults = async (req, res) => {
  try {
    const results = await ExamResult.findAll({
      include: [
        {
          model: Candidate,
          as: "candidate",
          attributes: ["id", "name", "email"],
        },
        {
          model: Exam,
          as: "exam",
          attributes: ["id", "name", "departmentId", "levelId"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // ✅ Count per (candidateId + examId)
    const attemptCount = {};
    results.forEach((r) => {
      const key = `${r.candidateId}_${r.examId}`;
      attemptCount[key] = (attemptCount[key] || 0) + 1;
    });

    // ✅ Add multipleAttempts flag
    const enrichedResults = results.map((r) => ({
      id: r.id,
      candidateId: r.candidateId,
      candidateName: r.Candidate?.name,
      examId: r.examId,
      examName: r.Exam?.name,
      resultStatus: r.resultStatus,
      score: r.score,
      multipleAttempts: attemptCount[`${r.candidateId}_${r.examId}`] > 1,
    }));

    return res.status(200).json({
      success: true,
      data: enrichedResults,
    });
  } catch (error) {
    console.error("Error fetching exam results:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch exam results.",
      error: error.message,
    });
  }
};

const getExamResultById = async (req, res) => {
  try {
    const { id } = req.params;

    const examResult = await ExamResult.findOne({
      where: { id },
      include: [
        {
          model: Candidate,
          as: "candidate",
          attributes: ["id", "name", "email"],
        },
        {
          model: Exam,
          as: "exam",
          attributes: [
            "id",
            "name",
            "positiveMarking",
            "negativeMarking",
            "questionIds",
          ], // ✅ questionIds bhi lo
        },
      ],
    });

    if (!examResult) {
      return res
        .status(404)
        .json({ success: false, message: "Exam result not found" });
    }

    // ✅ Exam ka original questionIds order use karo, candidateResponses ka nahi
    const examQuestionOrder = (examResult.exam.questionIds || []).map(Number);

    const questionIds = examResult.candidateResponses.map((q) => q.questionId);
    const orderField = examQuestionOrder.join(",");

    const questions = await QuestionBank.findAll({
      where: { id: questionIds },
      attributes: ["id", "question", "options", "correct"],
      order: [
        [DashMatrixDB.Sequelize.literal(`FIELD(id, ${orderField})`), "ASC"],
      ],
    });

    const candidateResponses = examResult.candidateResponses.map((q) => {
      const question = questions.find((ques) => ques.id === q.questionId);
      const correctIndex = question ? Number(question.correct) : null;
      const selectedIndex =
        q.selectedOption !== null ? Number(q.selectedOption) : null;

      const correctAnswer =
        question?.options?.[correctIndex] ?? question?.correct ?? "[Missing]";
      const selectedAnswer =
        selectedIndex !== null && question?.options?.[selectedIndex]
          ? question.options[selectedIndex]
          : q.selectedOption;

      return {
        ...q,
        question: question?.question || "[Question missing]",
        correctAnswer:
          typeof correctAnswer === "object"
            ? correctAnswer
            : String(correctAnswer).trim(),
        selectedOption:
          typeof selectedAnswer === "object"
            ? selectedAnswer
            : selectedAnswer !== null
              ? String(selectedAnswer)
              : null,
      };
    });

    // ✅ Exam ke original order ke hisaab se responses sort karo
    const orderedResponses = examQuestionOrder
      .map((qid) => candidateResponses.find((r) => r.questionId === qid))
      .filter(Boolean);

    const resultWithDetails = {
      ...examResult.toJSON(),
      candidateResponses: orderedResponses,
      candidateName: examResult.candidate.name,
      examName: examResult.exam.name,
      skipped: examResult.skipped || 0,
    };

    res.json({ success: true, data: resultWithDetails });
  } catch (err) {
    console.error("Error fetching exam result by ID:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getExamResultsGroupedByCandidate = async (req, res) => {
  try {
    const results = await ExamResult.findAll({
      include: [
        {
          model: Candidate,
          as: "candidate",
          attributes: ["id", "name", "email"],
          include: [
            { model: Department, as: "department", attributes: ["id", "name"] },
          ],
        },
        {
          model: Exam,
          as: "exam",
          attributes: ["id", "name"],
          include: [
            { model: Department, as: "department", attributes: ["id", "name"] },
            { model: Level, as: "level", attributes: ["id", "name"] },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    const grouped = {};
    results.forEach((r) => {
      const cid = r.candidateId;
      if (!grouped[cid]) {
        grouped[cid] = {
          candidateId: cid,
          candidateName: r.candidate?.name,
          email: r.candidate?.email,
          candidateDepartment: r.candidate?.department?.name || "N/A",
          latestSubmittedAt: r.submittedAt, // ✅ Track latest date
          exams: [],
        };
      }

      // ✅ Update latestSubmittedAt if this exam is more recent
      if (r.submittedAt > grouped[cid].latestSubmittedAt) {
        grouped[cid].latestSubmittedAt = r.submittedAt;
      }

      grouped[cid].exams.push({
        id: r.id,
        examId: r.examId,
        examName: r.exam?.name,
        examDepartment: r.exam?.department?.name || "N/A",
        examLevel: r.exam?.level?.name || "N/A",
        resultStatus: r.resultStatus,
        score: r.score,
        submittedAt: r.submittedAt,
      });
    });

    // ✅ Sort candidates by most recent exam first
    const sortedData = Object.values(grouped).sort(
      (a, b) => new Date(b.latestSubmittedAt) - new Date(a.latestSubmittedAt),
    );

    return res.status(200).json({
      success: true,
      data: sortedData,
    });
  } catch (error) {
    console.error("Error fetching grouped exam results:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch grouped data" });
  }
};

const generateExamResultPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const examResult = await ExamResult.findOne({
      where: { id },
      include: [
        {
          model: Candidate,
          as: "candidate",
          include: [{ model: Department, as: "department" }],
        },
        {
          model: Exam,
          as: "exam",
          include: [
            { model: Department, as: "department" },
            { model: Level, as: "level" },
          ],
        },
      ],
    });

    if (!examResult)
      return res
        .status(404)
        .json({ success: false, message: "Exam result not found" });

    const doc = new PDFDocument({ margin: 0, size: "A4" });
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res
        .writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=ExamResult_${examResult.candidate.name}.pdf`,
        })
        .end(pdfData);
    });

    // ── Fonts ──────────────────────────────────────────────────────
    const fontDir = path.join(__dirname, "../assets/fonts");
    const regularFont = path.join(fontDir, "Poppins-Regular.ttf");
    const boldFont = path.join(fontDir, "Poppins-Bold.ttf");
    const mediumFont = path.join(fontDir, "Poppins-Medium.ttf");

    if (fs.existsSync(regularFont) && fs.existsSync(boldFont)) {
      doc.registerFont("Poppins", regularFont);
      doc.registerFont("Poppins-Bold", boldFont);
      doc.registerFont("Poppins-Medium", mediumFont);
    } else {
      doc.registerFont("Poppins", "Helvetica");
      doc.registerFont("Poppins-Bold", "Helvetica-Bold");
      doc.registerFont("Poppins-Medium", "Helvetica-Bold");
    }

    // ── Design Tokens ──────────────────────────────────────────────
    const PAGE_W = doc.page.width; // 595
    const PAGE_H = doc.page.height; // 842
    const MARGIN = 40;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    const BLUE_DARK = "#1E3A5F"; // header bg
    const BLUE_MID = "#2563EB"; // section title bar
    const BLUE_LIGHT = "#EFF6FF"; // section body bg
    const BLUE_ACCENT = "#3B82F6"; // badges, highlights
    const GREY_LINE = "#E2E8F0";
    const TEXT_DARK = "#1E293B";
    const TEXT_MUTED = "#64748B";
    const WHITE = "#FFFFFF";

    const candidate = examResult.candidate;
    const exam = examResult.exam;
    const totalMarks = (exam?.positiveMarking || 1) * examResult.totalQuestions;
    const percentage =
      totalMarks > 0 ? Math.round((examResult.score / totalMarks) * 100) : 0;
    const isPassed = examResult.resultStatus?.toLowerCase() === "pass";

    // ══════════════════════════════════════════════════════════════
    // 1. HEADER BAND
    // ══════════════════════════════════════════════════════════════
    doc.rect(0, 0, PAGE_W, 110).fill(BLUE_DARK);

    // Logo (left-aligned inside header)
    const logoPath = path.join(
      __dirname,
      "../assets/images/dinshaw-logo-red-text.png",
    );
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, MARGIN, -40, { width: 200 });
    }

    // Company name + subtitle (right side of header)
    doc
      .font("Poppins-Bold")
      .fontSize(15)
      .fillColor(WHITE)
      .text("Dinshaw's Dairy Food Pvt. Ltd.", 0, 28, {
        align: "right",
        width: PAGE_W - MARGIN,
      });

    doc
      .font("Poppins")
      .fontSize(10)
      .fillColor("#93C5FD") // light blue tint
      .text("Exam Result Report", 0, 48, {
        align: "right",
        width: PAGE_W - MARGIN,
      });

    // Thin accent line at bottom of header
    doc.rect(0, 108, PAGE_W, 2).fill(BLUE_ACCENT);

    // ── Generated date (bottom-right of header) ──
    const now = new Date();
    const date = now.toLocaleDateString("en-GB"); // 05/03/2026
    const time = now.toLocaleTimeString(); // 10:30:45 AM (system default)

    doc
      .font("Poppins")
      .fontSize(8)
      .fillColor("#CBD5E1")
      .text(`Generated: ${date}, ${time}`, 0, 90, {
        align: "right",
        width: PAGE_W - MARGIN,
      });

    // ══════════════════════════════════════════════════════════════
    // 2. RESULT BADGE  (top-right pill — PASS / FAIL)
    // ══════════════════════════════════════════════════════════════
    const badgeColor = isPassed ? "#16A34A" : "#DC2626";
    const badgeX = PAGE_W - MARGIN - 90;
    const badgeY = 120;

    doc.roundedRect(badgeX, badgeY, 90, 28, 14).fill(badgeColor);
    doc
      .font("Poppins-Bold")
      .fontSize(12)
      .fillColor(WHITE)
      .text(isPassed ? "PASSED" : "FAILED", badgeX, badgeY + 7, {
        width: 90,
        align: "center",
      });

    // ══════════════════════════════════════════════════════════════
    // HELPER: Section header bar
    // ══════════════════════════════════════════════════════════════
    const drawSectionHeader = (label, y) => {
      doc.rect(MARGIN, y, CONTENT_W, 24).fill(BLUE_MID);
      doc
        .font("Poppins-Bold")
        .fontSize(10)
        .fillColor(WHITE)
        .text(label, MARGIN + 10, y + 7);
      return y + 24;
    };

    // ══════════════════════════════════════════════════════════════
    // HELPER: Section body box
    // ══════════════════════════════════════════════════════════════
    const drawSectionBody = (y, height) => {
      doc.rect(MARGIN, y, CONTENT_W, height).fill(BLUE_LIGHT);
      // left accent stripe
      doc.rect(MARGIN, y, 3, height).fill(BLUE_ACCENT);
    };

    // ══════════════════════════════════════════════════════════════
    // HELPER: Two-column row inside a section
    // ══════════════════════════════════════════════════════════════
    const drawRow = (
      label1,
      value1,
      label2,
      value2,
      y,
      xOffset = MARGIN + 12,
    ) => {
      const colW = CONTENT_W / 2 - 10;
      const col2X = MARGIN + CONTENT_W / 2 + 5;

      doc
        .font("Poppins")
        .fontSize(9)
        .fillColor(TEXT_MUTED)
        .text(label1, xOffset, y);
      doc
        .font("Poppins-Medium")
        .fontSize(10)
        .fillColor(TEXT_DARK)
        .text(value1 || "N/A", xOffset, y + 12);

      if (label2) {
        doc
          .font("Poppins")
          .fontSize(9)
          .fillColor(TEXT_MUTED)
          .text(label2, col2X, y);
        doc
          .font("Poppins-Medium")
          .fontSize(10)
          .fillColor(TEXT_DARK)
          .text(value2 || "N/A", col2X, y + 12);
      }
    };

    // ══════════════════════════════════════════════════════════════
    // 3. CANDIDATE INFORMATION
    // ══════════════════════════════════════════════════════════════
    // header(110) + accent line(2) + breathing gap(14) = 126
    let curY = 128;

    curY = drawSectionHeader("CANDIDATE INFORMATION", curY);
    drawSectionBody(curY, 115);

    drawRow("Full Name", candidate.name, "Email", candidate.email, curY + 10);
    drawRow(
      "Mobile",
      candidate.mobile || "N/A",
      "Department",
      candidate.department?.name || "N/A",
      curY + 42,
    );
    drawRow(
      "Exam Taken",
      exam?.name,
      "Exam Date",
      new Date(examResult.submittedAt).toLocaleDateString("en-GB") || "N/A",
      curY + 74,
    );

    curY += 115 + 14; // body height + gap

    // ══════════════════════════════════════════════════════════════
    // 4. EXAM INFORMATION
    // ══════════════════════════════════════════════════════════════
    curY = drawSectionHeader("EXAM INFORMATION", curY);
    drawSectionBody(curY, 115);

    drawRow(
      "Level",
      exam?.level?.name || "N/A",
      "Exam Department",
      exam?.department?.name || candidate?.department?.name || "N/A",
      curY + 10,
    );
    drawRow(
      "Positive Marking",
      `+${exam?.positiveMarking || 1} per correct`,
      "Negative Marking",
      `-${exam?.negativeMarking || 0} per wrong`,
      curY + 42,
    );

    curY += 65 + 65;

    // ══════════════════════════════════════════════════════════════
    // 5. RESULT SUMMARY
    // ══════════════════════════════════════════════════════════════
    curY = drawSectionHeader("RESULT SUMMARY", curY);
    drawSectionBody(curY, 110);

    // Stat grid — 4 boxes
    const statBoxW = (CONTENT_W - 3 * 8) / 4; // 4 boxes, 8px gap
    const statBoxH = 55;
    const statBoxY = curY + 10;

    const stats = [
      { label: "Attempted", value: examResult.attempted },
      { label: "Correct", value: examResult.correctAnswers, color: "#16A34A" },
      {
        label: "Incorrect",
        value: examResult.incorrectAnswers,
        color: "#DC2626",
      },
      { label: "Skipped", value: examResult.skipped, color: "#D97706" },
    ];

    stats.forEach((stat, i) => {
      const bx = MARGIN + 3 + i * (statBoxW + 8);
      // box bg
      doc.rect(bx, statBoxY, statBoxW, statBoxH).fill(WHITE);
      // top color stripe
      doc.rect(bx, statBoxY, statBoxW, 4).fill(stat.color || BLUE_ACCENT);
      // value
      doc
        .font("Poppins-Bold")
        .fontSize(20)
        .fillColor(stat.color || BLUE_DARK)
        .text(String(stat.value ?? 0), bx, statBoxY + 10, {
          width: statBoxW,
          align: "center",
        });
      // label
      doc
        .font("Poppins")
        .fontSize(8)
        .fillColor(TEXT_MUTED)
        .text(stat.label, bx, statBoxY + 36, {
          width: statBoxW,
          align: "center",
        });
    });

    // Score + Progress bar row
    const scoreRowY = statBoxY + statBoxH + 8;

    // Score text
    doc
      .font("Poppins-Bold")
      .fontSize(11)
      .fillColor(TEXT_DARK)
      .text(
        `Score: ${examResult.score} / ${totalMarks}`,
        MARGIN + 6,
        scoreRowY + 4,
      );

    // Percentage badge
    doc
      .font("Poppins-Bold")
      .fontSize(11)
      .fillColor(isPassed ? "#16A34A" : "#DC2626")
      .text(`${percentage}%`, MARGIN + 6 + 140, scoreRowY + 4);

    // Progress bar background
    const barX = MARGIN + 6 + 190;
    const barW = CONTENT_W - 200;
    const barH = 14;
    doc.roundedRect(barX, scoreRowY + 4, barW, barH, 7).fill(GREY_LINE);

    // Progress bar fill
    const fillW = Math.max(Math.round((percentage / 100) * barW), 8);
    const fillColor =
      percentage >= 70 ? "#16A34A" : percentage >= 40 ? "#D97706" : "#DC2626";
    doc.roundedRect(barX, scoreRowY + 4, fillW, barH, 7).fill(fillColor);

    curY += 110 + 50;

    // ══════════════════════════════════════════════════════════════
    // 6. FOOTER
    // ══════════════════════════════════════════════════════════════
    // Separator line
    doc.rect(MARGIN, PAGE_H - 70, CONTENT_W, 1).fill(GREY_LINE);

    // Authorized signature
    doc
      .font("Poppins")
      .fontSize(10)
      .fillColor(TEXT_MUTED)
      .text("Authorized By:", MARGIN, PAGE_H - 58);

    doc
      .moveTo(MARGIN + 80, PAGE_H - 44)
      .lineTo(MARGIN + 280, PAGE_H - 44)
      .strokeColor(TEXT_MUTED)
      .lineWidth(0.5)
      .stroke();

    // Footer note
    doc
      .font("Poppins")
      .fontSize(8)
      .fillColor(TEXT_MUTED)
      .text(
        "This is a system-generated document. For queries, contact HR.",
        MARGIN,
        PAGE_H - 32,
        { width: CONTENT_W, align: "center" },
      );

    // Blue bottom strip
    doc.rect(0, PAGE_H - 16, PAGE_W, 16).fill(BLUE_DARK);
    doc
      .font("Poppins")
      .fontSize(7)
      .fillColor("#93C5FD")
      .text(`Dinshaw's Dairy Food Pvt. Ltd.  •  Confidential`, 0, PAGE_H - 12, {
        width: PAGE_W,
        align: "center",
      });

    doc.end();
  } catch (error) {
    console.error("Error generating exam result PDF:", error);
    res.status(500).json({ success: false, message: "Failed to generate PDF" });
  }
};

const generateDetailedExamResultPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const examResult = await ExamResult.findOne({
      where: { id },
      include: [
        {
          model: Candidate,
          as: "candidate",
          include: [{ model: Department, as: "department" }],
        },
        {
          model: Exam,
          as: "exam",
          include: [
            { model: Department, as: "department" },
            { model: Level, as: "level" },
          ],
        },
      ],
    });

    if (!examResult)
      return res
        .status(404)
        .json({ success: false, message: "Exam result not found" });

    // ── Fetch Questions ──────────────────────────────────────────
    const examQuestionOrder = (examResult.exam.questionIds || []).map(Number);
    const questionIds = examResult.candidateResponses.map((q) => q.questionId);
    const orderField = examQuestionOrder.join(",");

    const questions = await QuestionBank.findAll({
      where: { id: questionIds },
      attributes: ["id", "question", "options", "correct"],
      order: [
        [DashMatrixDB.Sequelize.literal(`FIELD(id, ${orderField})`), "ASC"],
      ],
    });

    // ── Helper: Sanitize special characters ─────────────────────
    const sanitizeText = (text) => {
      if (!text) return "";
      return text
        .replace(/‑/g, "-")
        .replace(/–/g, "-")
        .replace(/—/g, "-")
        .replace(/₹/g, "Rs.")
        .replace(/×/g, "x")
        .replace(/→/g, "->")
        .replace(/←/g, "<-")
        .replace(/≥/g, ">=")
        .replace(/≤/g, "<=")
        .replace(/≠/g, "!=")
        .replace(/…/g, "...")
        .replace(/\u00a0/g, " ")
        .replace(/[^\x00-\x7F\u0900-\u097F]/g, "");
    };

    // ── Build ordered responses ──────────────────────────────────
    const candidateResponses = examResult.candidateResponses.map((q) => {
      const question = questions.find((ques) => ques.id === q.questionId);
      const correctIndex = question ? Number(question.correct) : null;
      const selectedIndex =
        q.selectedOption !== null ? Number(q.selectedOption) : null;

      const correctAnswer =
        question?.options?.[correctIndex] ?? question?.correct ?? "[Missing]";
      const selectedAnswer =
        selectedIndex !== null && question?.options?.[selectedIndex]
          ? question.options[selectedIndex]
          : q.selectedOption;

      return {
        ...q,
        questionText: sanitizeText(question?.question || "[Question missing]"),
        correctAnswer: sanitizeText(String(correctAnswer ?? "").trim()),
        selectedAnswer:
          selectedAnswer !== null ? sanitizeText(String(selectedAnswer)) : null,
        isCorrect: selectedIndex !== null && selectedIndex === correctIndex,
        isSkipped: q.selectedOption === null || q.selectedOption === undefined,
      };
    });

    const orderedResponses = examQuestionOrder
      .map((qid) => candidateResponses.find((r) => r.questionId === qid))
      .filter(Boolean);

    // ── PDF Setup ────────────────────────────────────────────────
    const doc = new PDFDocument({ margin: 0, size: "A4", autoFirstPage: true });
    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res
        .writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=DetailedResult_${examResult.candidate.name}.pdf`,
        })
        .end(pdfData);
    });

    // ── Fonts ────────────────────────────────────────────────────
    const fontDir = path.join(__dirname, "../assets/fonts");
    const regularFont = path.join(fontDir, "Poppins-Regular.ttf");
    const boldFont = path.join(fontDir, "Poppins-Bold.ttf");
    const mediumFont = path.join(fontDir, "Poppins-Medium.ttf");

    if (fs.existsSync(regularFont) && fs.existsSync(boldFont)) {
      doc.registerFont("Poppins", regularFont);
      doc.registerFont("Poppins-Bold", boldFont);
      doc.registerFont("Poppins-Medium", mediumFont);
    } else {
      doc.registerFont("Poppins", "Helvetica");
      doc.registerFont("Poppins-Bold", "Helvetica-Bold");
      doc.registerFont("Poppins-Medium", "Helvetica-Bold");
    }

    // ── Tokens ───────────────────────────────────────────────────
    const PAGE_W = doc.page.width;
    const PAGE_H = doc.page.height;
    const MARGIN = 25;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    const BLUE_DARK = "#1E3A5F";
    const BLUE_ACCENT = "#3B82F6";
    const GREY_LINE = "#E2E8F0";
    const GREY_BG = "#F8FAFC";
    const TEXT_DARK = "#1E293B";
    const TEXT_MUTED = "#64748B";
    const WHITE = "#FFFFFF";
    const GREEN = "#16A34A";
    const RED = "#DC2626";
    const YELLOW = "#D97706";

    // ✅ candidate aur exam pehle define karo
    const candidate = examResult.candidate;
    const exam = examResult.exam;

    // ✅ phir inhe use karo
    const positiveMarking = exam?.positiveMarking || 0;
    const negativeMarking = exam?.negativeMarking || 0;
    const totalMarks = positiveMarking * examResult.totalQuestions;
    const isPassed = examResult.resultStatus?.toLowerCase() === "pass";

    // ── Helper: Page Header ──────────────────────────────────────
    const drawPageHeader = () => {
      doc.rect(0, 0, PAGE_W, 110).fill(BLUE_DARK);

      const logoPath = path.join(
        __dirname,
        "../assets/images/dinshaw-logo-red-text.png",
      );
      if (fs.existsSync(logoPath))
        doc.image(logoPath, MARGIN, -40, { width: 200 });

      doc
        .font("Poppins-Bold")
        .fontSize(15)
        .fillColor(WHITE)
        .text("Dinshaw's Dairy Food Pvt. Ltd.", 0, 28, {
          align: "right",
          width: PAGE_W - MARGIN,
        });
      doc
        .font("Poppins")
        .fontSize(10)
        .fillColor("#93C5FD")
        .text("Detailed Exam Result Report", 0, 48, {
          align: "right",
          width: PAGE_W - MARGIN,
        });

      const now = new Date();
      doc
        .font("Poppins")
        .fontSize(8)
        .fillColor("#CBD5E1")
        .text(
          `Generated: ${now.toLocaleDateString("en-GB")}, ${now.toLocaleTimeString()}`,
          0,
          90,
          { align: "right", width: PAGE_W - MARGIN },
        );
      doc.rect(0, 108, PAGE_W, 2).fill(BLUE_ACCENT);
    };

    // ── Helper: Footer ───────────────────────────────────────────
    const drawFooter = () => {
      doc.rect(MARGIN, PAGE_H - 50, CONTENT_W, 1).fill(GREY_LINE);
      doc
        .font("Poppins")
        .fontSize(8)
        .fillColor(TEXT_MUTED)
        .text(
          "This is a system-generated document. For queries, contact HR.",
          MARGIN,
          PAGE_H - 38,
          { width: CONTENT_W, align: "center" },
        );
      doc.rect(0, PAGE_H - 20, PAGE_W, 20).fill(BLUE_DARK);
      doc
        .font("Poppins")
        .fontSize(7)
        .fillColor("#93C5FD")
        .text(
          "Dinshaw's Dairy Food Pvt. Ltd.  •  Confidential",
          0,
          PAGE_H - 13,
          {
            width: PAGE_W,
            align: "center",
          },
        );
    };

    // ── Helper: New page if needed ───────────────────────────────
    const ensurePage = (curY, needed = 60) => {
      if (curY + needed > PAGE_H - 65) {
        doc.addPage();
        doc.rect(0, 0, PAGE_W, 4).fill(BLUE_ACCENT);
        return 20;
      }
      return curY;
    };

    // ════════════════════════════════════════════════════════════
    // PAGE 1 — HEADER
    // ════════════════════════════════════════════════════════════
    drawPageHeader();
    let curY = 128;
    // ✅ Pass/Fail badge + Score
    const badgeW = 140;
    // FAILED/PASSED badge
    // Badges draw karo pehle (curY change mat karo)
    doc
      .roundedRect(PAGE_W - MARGIN - 80, curY, 80, 26, 13)
      .fill(isPassed ? GREEN : RED);
    doc
      .font("Poppins-Bold")
      .fontSize(11)
      .fillColor(WHITE)
      .text(isPassed ? "PASSED" : "FAILED", PAGE_W - MARGIN - 80, curY + 7, {
        width: 80,
        align: "center",
      });

    // Score badge — badge ke neeche
    doc
      .roundedRect(PAGE_W - MARGIN - 80, curY + 32, 80, 22, 11)
      .fill(BLUE_DARK);
    doc
      .font("Poppins-Bold")
      .fontSize(10)
      .fillColor(WHITE)
      .text(
        `${examResult.score} / ${totalMarks}`,
        PAGE_W - MARGIN - 80,
        curY + 38,
        {
          width: 80,
          align: "center",
        },
      );

    // ════════════════════════════════════════════════════════════
    // CANDIDATE + EXAM INFO
    // ════════════════════════════════════════════════════════════
    const col1X = MARGIN;
    const col2X = MARGIN + CONTENT_W / 2 + 10;
    const colW = CONTENT_W / 2 - 100;

    const infoRows = [
      ["Name", candidate.name, "Email", candidate.email],
      [
        "Mobile",
        candidate.mobile || "N/A",
        "Department",
        candidate.department?.name || "N/A",
      ],
      [
        "Exam Name",
        exam?.name || "N/A",
        "Exam Date",
        new Date(examResult.submittedAt).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      ],
    ];

    infoRows.forEach(([l1, v1, l2, v2]) => {
      doc
        .font("Poppins")
        .fontSize(8)
        .fillColor(TEXT_MUTED)
        .text(l1, col1X, curY);
      doc
        .font("Poppins")
        .fontSize(8)
        .fillColor(TEXT_MUTED)
        .text(l2, col2X, curY);
      curY += 11;
      doc
        .font("Poppins-Medium")
        .fontSize(9.5)
        .fillColor(TEXT_DARK)
        .text(v1, col1X, curY, { width: colW, lineBreak: false });
      doc
        .font("Poppins-Medium")
        .fontSize(9.5)
        .fillColor(TEXT_DARK)
        .text(v2, col2X, curY, { width: colW, lineBreak: false });
      curY += 18;
    });

    curY += 6;
    doc.rect(MARGIN, curY, CONTENT_W, 1).fill(GREY_LINE);
    curY += 12;

    // ════════════════════════════════════════════════════════════
    // TABLE
    // ════════════════════════════════════════════════════════════
    const COL_SR = 30;
    const COL_Q = 290;
    const COL_YOUR = 155;
    const COL_COR = CONTENT_W - COL_SR - COL_Q - COL_YOUR;

    const COL_SR_X = MARGIN;
    const COL_Q_X = COL_SR_X + COL_SR;
    const COL_YOUR_X = COL_Q_X + COL_Q;
    const COL_COR_X = COL_YOUR_X + COL_YOUR;

    const ROW_H_HEAD = 22;

    // ── Table Header ─────────────────────────────────────────────
    doc.rect(MARGIN, curY, CONTENT_W, ROW_H_HEAD).fill(BLUE_DARK);
    doc.font("Poppins-Bold").fontSize(9).fillColor(WHITE);
    doc.text("Sr.", COL_SR_X + 6, curY + 7, { width: COL_SR - 6 });
    doc.text("Question", COL_Q_X + 6, curY + 7, { width: COL_Q - 6 });
    doc.text("Candidate Answer", COL_YOUR_X + 6, curY + 7, {
      width: COL_YOUR - 6,
    });
    doc.text("Marks", COL_COR_X + 6, curY + 7, { width: COL_COR - 6 }); // ✅
    curY += ROW_H_HEAD;

    // ── Table Rows ───────────────────────────────────────────────
    orderedResponses.forEach((resp, index) => {
      const isSkipped = resp.isSkipped;
      const isCorrect = resp.isCorrect;

      const yourText = isSkipped
        ? "Not Attempted"
        : resp.selectedAnswer || "N/A";

      // ✅ Marks calculate karo
      const marksEarned = isSkipped
        ? "0"
        : isCorrect
          ? `+${positiveMarking}`
          : negativeMarking > 0
            ? `-${negativeMarking}`
            : "0";

      const marksColor = isSkipped
        ? TEXT_MUTED
        : isCorrect
          ? GREEN
          : negativeMarking > 0
            ? RED
            : TEXT_MUTED;

      const avgCharQ = COL_Q / 6.2;
      const avgCharAns = COL_YOUR / 6.2;

      const qLines = Math.ceil((resp.questionText || "").length / avgCharQ);
      const yourLines = Math.ceil(yourText.length / avgCharAns);

      const maxLines = Math.max(qLines, yourLines, 1);
      const rowH = Math.max(maxLines * 14 + 16, 34);

      curY = ensurePage(curY, rowH + 2);

      // Row background
      const rowBg = index % 2 === 0 ? WHITE : GREY_BG;
      doc.rect(MARGIN, curY, CONTENT_W, rowH).fill(rowBg);

      // Vertical dividers
      [COL_Q_X, COL_YOUR_X, COL_COR_X].forEach((x) => {
        doc.rect(x, curY, 0.5, rowH).fill(GREY_LINE);
      });

      // Sr. No.
      doc
        .font("Poppins")
        .fontSize(9)
        .fillColor(TEXT_MUTED)
        .text(String(index + 1), COL_SR_X + 6, curY + rowH / 2 - 6, {
          width: COL_SR - 6,
          align: "center",
        });

      // Question text
      doc
        .font("Poppins")
        .fontSize(9)
        .fillColor(TEXT_DARK)
        .text(resp.questionText, COL_Q_X + 6, curY + 8, {
          width: COL_Q - 12,
          lineGap: 1,
        });

      // Your Answer
      const yourColor = isSkipped ? YELLOW : isCorrect ? GREEN : RED;
      doc
        .font("Poppins-Medium")
        .fontSize(9)
        .fillColor(yourColor)
        .text(yourText, COL_YOUR_X + 6, curY + 8, {
          width: COL_YOUR - 12,
          lineGap: 1,
        });

      // ✅ Marks
      doc
        .font("Poppins-Bold")
        .fontSize(10)
        .fillColor(marksColor)
        .text(marksEarned, COL_COR_X + 6, curY + rowH / 2 - 6, {
          width: COL_COR - 10,
          align: "center",
        });

      doc.rect(MARGIN, curY + rowH, CONTENT_W, 0.5).fill(GREY_LINE);
      curY += rowH;
    });

    // Table bottom border
    doc.rect(MARGIN, curY, CONTENT_W, 1).fill(BLUE_DARK);

    drawFooter();
    doc.end();
  } catch (error) {
    console.error("Error generating detailed exam result PDF:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate detailed PDF" });
  }
};

// ✅ Export me add karo
module.exports = {
  getAllExamResults,
  getExamResultById,
  getExamResultsGroupedByCandidate,
  generateExamResultPDF,
  generateDetailedExamResultPDF,
};

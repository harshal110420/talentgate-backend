// utils/generateExamResultBuffers.js
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const { DashMatrixDB } = require("../models");

const { ExamResult, Candidate, Exam, QuestionBank, Department, Level } =
  DashMatrixDB;

// ── Helper: common fetch + response builder ────────────────────
const fetchExamData = async (examResultId) => {
  const examResult = await ExamResult.findOne({
    where: { id: examResultId },
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

  if (!examResult) throw new Error("Exam result not found");

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

  const sanitizeText = (text) => {
    if (!text) return "";
    return text
      .replace(/\u2011/g, "-")
      .replace(/\u2013/g, "-")
      .replace(/\u2014/g, "-")
      .replace(/\u20b9/g, "Rs.")
      .replace(/\u00d7/g, "x")
      .replace(/\u2192/g, "->")
      .replace(/\u2190/g, "<-")
      .replace(/\u2265/g, ">=")
      .replace(/\u2264/g, "<=")
      .replace(/\u2260/g, "!=")
      .replace(/\u2026/g, "...")
      .replace(/\u00a0/g, " ")
      .replace(/[^\x00-\x7F\u0900-\u097F]/g, "");
  };

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

  return { examResult, orderedResponses, sanitizeText };
};

// ── Helper: register fonts ─────────────────────────────────────
const registerFonts = (doc) => {
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
};

// ── Helper: PDF buffer promise ─────────────────────────────────
const docToBuffer = (doc) =>
  new Promise((resolve, reject) => {
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
  });

// ══════════════════════════════════════════════════════════════
// 1. SUMMARY PDF BUFFER
// ══════════════════════════════════════════════════════════════
const generateSummaryBuffer = async (examResultId) => {
  const { examResult } = await fetchExamData(examResultId);

  const doc = new PDFDocument({ margin: 0, size: "A4", autoFirstPage: true });
  registerFonts(doc);
  const bufferPromise = docToBuffer(doc);

  const PAGE_W = doc.page.width;
  const PAGE_H = doc.page.height;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const BLUE_DARK = "#1E3A5F",
    BLUE_MID = "#2563EB",
    BLUE_LIGHT = "#EFF6FF";
  const BLUE_ACCENT = "#3B82F6",
    GREY_LINE = "#E2E8F0",
    TEXT_DARK = "#1E293B";
  const TEXT_MUTED = "#64748B",
    WHITE = "#FFFFFF",
    GREEN = "#16A34A";
  const RED = "#DC2626",
    YELLOW = "#D97706";

  const candidate = examResult.candidate;
  const exam = examResult.exam;
  const totalMarks = (exam?.positiveMarking || 1) * examResult.totalQuestions;
  const percentage =
    totalMarks > 0 ? Math.round((examResult.score / totalMarks) * 100) : 0;
  const isPassed = examResult.resultStatus?.toLowerCase() === "pass";

  // Header
  doc.rect(0, 0, PAGE_W, 110).fill(BLUE_DARK);
  const logoPath = path.join(
    __dirname,
    "../assets/images/dinshaw-logo-red-text.png",
  );
  if (fs.existsSync(logoPath)) doc.image(logoPath, MARGIN, -40, { width: 200 });
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
    .text("Exam Result Report", 0, 48, {
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

  // Badge
  doc
    .roundedRect(PAGE_W - MARGIN - 90, 120, 90, 28, 14)
    .fill(isPassed ? GREEN : RED);
  doc
    .font("Poppins-Bold")
    .fontSize(12)
    .fillColor(WHITE)
    .text(isPassed ? "PASSED" : "FAILED", PAGE_W - MARGIN - 90, 127, {
      width: 90,
      align: "center",
    });

  let curY = 155;

  const drawSectionHeader = (label, y) => {
    doc.rect(MARGIN, y, CONTENT_W, 24).fill(BLUE_MID);
    doc
      .font("Poppins-Bold")
      .fontSize(10)
      .fillColor(WHITE)
      .text(label, MARGIN + 10, y + 7);
    return y + 24;
  };
  const drawSectionBody = (y, height) => {
    doc.rect(MARGIN, y, CONTENT_W, height).fill(BLUE_LIGHT);
    doc.rect(MARGIN, y, 3, height).fill(BLUE_ACCENT);
  };
  const drawRow = (label1, value1, label2, value2, y) => {
    const col2X = MARGIN + CONTENT_W / 2 + 5;
    doc
      .font("Poppins")
      .fontSize(9)
      .fillColor(TEXT_MUTED)
      .text(label1, MARGIN + 12, y);
    doc
      .font("Poppins-Medium")
      .fontSize(10)
      .fillColor(TEXT_DARK)
      .text(String(value1 || "N/A"), MARGIN + 12, y + 12);
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
        .text(String(value2 || "N/A"), col2X, y + 12);
    }
  };

  curY = drawSectionHeader("CANDIDATE INFORMATION", curY);
  drawSectionBody(curY, 80);
  drawRow("Full Name", candidate.name, "Email", candidate.email, curY + 8);
  drawRow(
    "Mobile",
    candidate.mobile || "N/A",
    "Department",
    candidate.department?.name || "N/A",
    curY + 42,
  );
  curY += 80 + 10;

  curY = drawSectionHeader("EXAM INFORMATION", curY);
  drawSectionBody(curY, 80);
  drawRow(
    "Exam Name",
    exam?.name,
    "Date",
    new Date(examResult.submittedAt).toLocaleDateString("en-GB"),
    curY + 8,
  );
  drawRow(
    "Level",
    exam?.level?.name || "N/A",
    "Department",
    exam?.department?.name || "N/A",
    curY + 42,
  );
  curY += 80 + 10;

  curY = drawSectionHeader("RESULT SUMMARY", curY);
  drawSectionBody(curY, 105);
  const statBoxW = (CONTENT_W - 3 * 8) / 4;
  const statBoxH = 55;
  const statBoxY = curY + 8;

  [
    { label: "Attempted", value: examResult.attempted, color: BLUE_ACCENT },
    { label: "Correct", value: examResult.correctAnswers, color: GREEN },
    { label: "Incorrect", value: examResult.incorrectAnswers, color: RED },
    { label: "Skipped", value: examResult.skipped, color: YELLOW },
  ].forEach((stat, i) => {
    const bx = MARGIN + 3 + i * (statBoxW + 8);
    doc.rect(bx, statBoxY, statBoxW, statBoxH).fill(WHITE);
    doc.rect(bx, statBoxY, statBoxW, 4).fill(stat.color);
    doc
      .font("Poppins-Bold")
      .fontSize(20)
      .fillColor(stat.color)
      .text(String(stat.value ?? 0), bx, statBoxY + 10, {
        width: statBoxW,
        align: "center",
      });
    doc
      .font("Poppins")
      .fontSize(8)
      .fillColor(TEXT_MUTED)
      .text(stat.label, bx, statBoxY + 36, {
        width: statBoxW,
        align: "center",
      });
  });

  const scoreRowY = statBoxY + statBoxH + 6;
  doc
    .font("Poppins-Bold")
    .fontSize(11)
    .fillColor(TEXT_DARK)
    .text(
      `Score: ${examResult.score} / ${totalMarks}`,
      MARGIN + 6,
      scoreRowY + 3,
    );
  doc
    .font("Poppins-Bold")
    .fontSize(11)
    .fillColor(isPassed ? GREEN : RED)
    .text(`${percentage}%`, MARGIN + 170, scoreRowY + 3);
  const barX = MARGIN + 215,
    barW = CONTENT_W - 220;
  doc.roundedRect(barX, scoreRowY + 3, barW, 14, 7).fill(GREY_LINE);
  const fillColor2 = percentage >= 70 ? GREEN : percentage >= 40 ? YELLOW : RED;
  doc
    .roundedRect(
      barX,
      scoreRowY + 3,
      Math.max(Math.round((percentage / 100) * barW), 8),
      14,
      7,
    )
    .fill(fillColor2);

  // Footer
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
    .text("Dinshaw's Dairy Food Pvt. Ltd.  •  Confidential", 0, PAGE_H - 13, {
      width: PAGE_W,
      align: "center",
    });

  doc.end();
  return { buffer: await bufferPromise, candidateName: candidate.name };
};

// ══════════════════════════════════════════════════════════════
// 2. DETAILED PDF BUFFER
// ══════════════════════════════════════════════════════════════
const generateDetailedBuffer = async (examResultId) => {
  const { examResult, orderedResponses } = await fetchExamData(examResultId);

  const doc = new PDFDocument({ margin: 0, size: "A4", autoFirstPage: true });
  registerFonts(doc);
  const bufferPromise = docToBuffer(doc);

  const PAGE_W = doc.page.width,
    PAGE_H = doc.page.height;
  const MARGIN = 25,
    CONTENT_W = PAGE_W - MARGIN * 2;

  const BLUE_DARK = "#1E3A5F",
    BLUE_ACCENT = "#3B82F6",
    GREY_LINE = "#E2E8F0";
  const GREY_BG = "#F8FAFC",
    TEXT_DARK = "#1E293B",
    TEXT_MUTED = "#64748B";
  const WHITE = "#FFFFFF",
    GREEN = "#16A34A",
    RED = "#DC2626",
    YELLOW = "#D97706";

  const candidate = examResult.candidate;
  const exam = examResult.exam;
  const positiveMarking = exam?.positiveMarking || 0;
  const negativeMarking = exam?.negativeMarking || 0;
  const totalMarks = positiveMarking * examResult.totalQuestions;
  const isPassed = examResult.resultStatus?.toLowerCase() === "pass";

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
      .text("Dinshaw's Dairy Food Pvt. Ltd.  •  Confidential", 0, PAGE_H - 13, {
        width: PAGE_W,
        align: "center",
      });
  };

  const ensurePage = (curY, needed = 60) => {
    if (curY + needed > PAGE_H - 65) {
      doc.addPage();
      doc.rect(0, 0, PAGE_W, 4).fill(BLUE_ACCENT);
      return 20;
    }
    return curY;
  };

  drawPageHeader();

  doc
    .roundedRect(PAGE_W - MARGIN - 80, 118, 80, 26, 13)
    .fill(isPassed ? GREEN : RED);
  doc
    .font("Poppins-Bold")
    .fontSize(11)
    .fillColor(WHITE)
    .text(isPassed ? "PASSED" : "FAILED", PAGE_W - MARGIN - 80, 125, {
      width: 80,
      align: "center",
    });
  doc.roundedRect(PAGE_W - MARGIN - 80, 150, 80, 22, 11).fill(BLUE_DARK);
  doc
    .font("Poppins-Bold")
    .fontSize(10)
    .fillColor(WHITE)
    .text(`${examResult.score} / ${totalMarks}`, PAGE_W - MARGIN - 80, 156, {
      width: 80,
      align: "center",
    });

  let curY = 128;
  const col1X = MARGIN,
    col2X = MARGIN + CONTENT_W / 2 + 10,
    colW = CONTENT_W / 2 - 10;

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
    doc.font("Poppins").fontSize(8).fillColor(TEXT_MUTED).text(l1, col1X, curY);
    doc.font("Poppins").fontSize(8).fillColor(TEXT_MUTED).text(l2, col2X, curY);
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

  const COL_SR = 30,
    COL_Q = 290,
    COL_YOUR = 155;
  const COL_COR = CONTENT_W - COL_SR - COL_Q - COL_YOUR;
  const COL_SR_X = MARGIN,
    COL_Q_X = COL_SR_X + COL_SR;
  const COL_YOUR_X = COL_Q_X + COL_Q,
    COL_COR_X = COL_YOUR_X + COL_YOUR;

  doc.rect(MARGIN, curY, CONTENT_W, 22).fill(BLUE_DARK);
  doc.font("Poppins-Bold").fontSize(9).fillColor(WHITE);
  doc.text("Sr.", COL_SR_X + 6, curY + 7, { width: COL_SR - 6 });
  doc.text("Question", COL_Q_X + 6, curY + 7, { width: COL_Q - 6 });
  doc.text("Your Answer", COL_YOUR_X + 6, curY + 7, { width: COL_YOUR - 6 });
  doc.text("Marks", COL_COR_X + 6, curY + 7, { width: COL_COR - 6 });
  curY += 22;

  orderedResponses.forEach((resp, index) => {
    const isSkipped = resp.isSkipped,
      isCorrect = resp.isCorrect;
    const yourText = isSkipped ? "Not Attempted" : resp.selectedAnswer || "N/A";
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

    const avgCharQ = COL_Q / 6.2,
      avgCharAns = COL_YOUR / 6.2;
    const qLines = Math.ceil((resp.questionText || "").length / avgCharQ);
    const yourLines = Math.ceil(yourText.length / avgCharAns);
    const rowH = Math.max(Math.max(qLines, yourLines, 1) * 14 + 16, 34);

    curY = ensurePage(curY, rowH + 2);

    doc
      .rect(MARGIN, curY, CONTENT_W, rowH)
      .fill(index % 2 === 0 ? WHITE : GREY_BG);
    [COL_Q_X, COL_YOUR_X, COL_COR_X].forEach((x) =>
      doc.rect(x, curY, 0.5, rowH).fill(GREY_LINE),
    );

    doc
      .font("Poppins")
      .fontSize(9)
      .fillColor(TEXT_MUTED)
      .text(String(index + 1), COL_SR_X + 6, curY + rowH / 2 - 6, {
        width: COL_SR - 6,
        align: "center",
      });
    doc
      .font("Poppins")
      .fontSize(9)
      .fillColor(TEXT_DARK)
      .text(resp.questionText, COL_Q_X + 6, curY + 8, {
        width: COL_Q - 12,
        lineGap: 1,
      });
    doc
      .font("Poppins-Medium")
      .fontSize(9)
      .fillColor(isSkipped ? YELLOW : isCorrect ? GREEN : RED)
      .text(yourText, COL_YOUR_X + 6, curY + 8, {
        width: COL_YOUR - 12,
        lineGap: 1,
      });
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

  doc.rect(MARGIN, curY, CONTENT_W, 1).fill(BLUE_DARK);
  drawFooter();
  doc.end();

  return { buffer: await bufferPromise, candidateName: candidate.name };
};

module.exports = { generateSummaryBuffer, generateDetailedBuffer };

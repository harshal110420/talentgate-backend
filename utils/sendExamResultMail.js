const sendEmails = require("../utils/sendEmail");
const {
  generateSummaryBuffer,
  generateDetailedBuffer,
} = require("./generateExamResultBuffers");
const { DashMatrixDB } = require("../models");

const { User, Role, Candidate } = DashMatrixDB;

const sendExamResultMail = async ({ examResultId, examResult, exam }) => {
  try {
    // ── 1. Candidate fetch (assignedRecruiterId ke saath) ─────────
    const candidate = await Candidate.findOne({
      where: { id: examResult.candidateId },
      attributes: ["id", "name", "email", "mobile", "assignedRecruiterId"],
    });

    if (!candidate) {
      console.warn("⚠️ Candidate not found — mail skipped");
      return;
    }

    // ── 2. Recruiter fetch ────────────────────────────────────────
    let recruiterEmail = null;
    let recruiterName = "Recruiter";

    if (candidate.assignedRecruiterId) {
      const recruiter = await User.findOne({
        where: { id: candidate.assignedRecruiterId, isActive: true },
        attributes: ["firstName", "lastName", "mail"],
      });
      if (recruiter) {
        recruiterEmail = recruiter.mail;
        recruiterName = `${recruiter.firstName} ${recruiter.lastName}`;
      }
    }

    if (!recruiterEmail) {
      console.warn(
        `⚠️ No recruiter assigned for candidate ${candidate.name} — mail skipped`,
      );
      return;
    }

    // ── 3. HR users fetch (CC) ────────────────────────────────────
    const hrRole = await Role.findOne({ where: { role_name: "hr" } });
    let ccEmails = [];
    if (hrRole) {
      const hrUsers = await User.findAll({
        where: { roleId: hrRole.id, isActive: true },
        attributes: ["mail"],
      });
      ccEmails = hrUsers
        .map((u) => u.mail)
        .filter((mail) => mail && mail !== recruiterEmail);
    }

    // ── 4. Generate PDF Buffers ───────────────────────────────────
    const [summaryResult, detailedResult] = await Promise.all([
      generateSummaryBuffer(examResultId),
      generateDetailedBuffer(examResultId),
    ]);

    // ── 5. Result details for mail body ──────────────────────────
    const isPassed = examResult.resultStatus?.toLowerCase() === "pass";
    const totalMarks = (exam?.positiveMarking || 1) * examResult.totalQuestions;
    const percentage =
      totalMarks > 0 ? Math.round((examResult.score / totalMarks) * 100) : 0;

    const submittedAt = examResult.submittedAt
      ? new Date(examResult.submittedAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "N/A";

    const resultColor = isPassed ? "#16A34A" : "#DC2626";
    const resultBadge = isPassed ? "PASSED" : "FAILED";
    const resultBgColor = isPassed ? "#F0FDF4" : "#FEF2F2";

    // ── 6. Mail HTML ──────────────────────────────────────────────
    const html = `
      <!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <style>
        body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:0}
        .wrapper{max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}
        .header{background:#DE251E;padding:28px 32px}
        .header h1{color:#fff;margin:0;font-size:20px}
        .header p{color:#fff;margin:4px 0 0;font-size:13px}
        .body{padding:28px 32px}
        .result-badge{display:inline-block;background:${resultColor};color:#fff;font-weight:bold;font-size:14px;padding:6px 20px;border-radius:20px;margin-bottom:20px}
        .info-box{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:18px 20px;margin-bottom:20px}
        .info-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #E2E8F0;font-size:13px}
        .info-row:last-child{border-bottom:none}
        .info-label{color:#64748B}
        .info-value{color:#1E293B;font-weight:600}
        .score-box{background:${resultBgColor};border:1px solid ${resultColor}33;border-radius:8px;padding:16px 20px;text-align:center;margin-bottom:20px}
        .score-number{font-size:28px;font-weight:bold;color:${resultColor}}
        .score-label{font-size:12px;color:#64748B;margin-top:4px}
        .footer{background:#DE251E;padding:16px 32px;text-align:center}
        .footer p{color:#fff;font-size:11px;margin:0}
      </style></head>
      <body><div class="wrapper">
        <div class="header">
          <h1>Dinshaw's Dairy Food Pvt. Ltd.</h1>
          <p>Exam Result Notification</p>
        </div>
        <div class="body">
          <p style="font-size:15px;color:#334155;margin-bottom:16px">Dear <strong>${recruiterName}</strong>,</p>
          <p style="font-size:14px;color:#475569;margin-bottom:16px">The following candidate has completed their exam. Details and PDFs are attached.</p>
          <div class="info-box">
            <div class="info-row"><span class="info-label">Candidate Name</span><span class="info-value">${candidate.name}</span></div>
            <div class="info-row"><span class="info-label">Email</span><span class="info-value">${candidate.email}</span></div>
            <div class="info-row"><span class="info-label">Mobile</span><span class="info-value">${candidate.mobile || "N/A"}</span></div>
            <div class="info-row"><span class="info-label">Exam Name</span><span class="info-value">${exam?.name || "N/A"}</span></div>
            <div class="info-row"><span class="info-label">Submitted At</span><span class="info-value">${submittedAt}</span></div>
          </div>
          <div class="score-box">
            <div class="score-number">${examResult.score} / ${totalMarks}</div>
            <div class="score-label">Score &nbsp;|&nbsp; ${percentage}% &nbsp;|&nbsp; Correct: ${examResult.correctAnswers} &nbsp;|&nbsp; Wrong: ${examResult.incorrectAnswers} &nbsp;|&nbsp; Skipped: ${examResult.skipped}</div>
          </div>
          <p style="font-size:13px;color:#64748B">Please find the Summary and Detailed PDFs attached.</p>
        </div>
        <div class="footer"><p>Dinshaw's Dairy Food Pvt. Ltd. &nbsp;•&nbsp; Automated Notification</p></div>
      </div></body></html>
    `;

    // ── 7. Mail bhejo with attachments ───────────────────────────
    await sendEmails({
      to: recruiterEmail,
      cc: ccEmails.length > 0 ? ccEmails.join(",") : undefined,
      subject: `Exam Result: ${candidate.name} — ${resultBadge} | ${exam?.name || "Exam"}`,
      html,
      attachments: [
        {
          filename: `ExamResult_${candidate.name}.pdf`,
          content: summaryResult.buffer,
          contentType: "application/pdf",
        },
        {
          filename: `DetailedResult_${candidate.name}.pdf`,
          content: detailedResult.buffer,
          contentType: "application/pdf",
        },
      ],
    });

    console.log(`✅ Exam result mail sent with PDFs for: ${candidate.name}`);
  } catch (error) {
    console.error("❌ Failed to send exam result mail:", error.message);
  }
};

module.exports = sendExamResultMail;

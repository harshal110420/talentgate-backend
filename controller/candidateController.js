// controllers/candidateController.js
const asyncHandler = require("express-async-handler");
const { Op } = require("sequelize");
const { DashMatrixDB } = require("../models");
const jwt = require("jsonwebtoken");
const sendEmails = require("../utils/sendEmail");
const {
  Candidate,
  Exam,
  Department,
  JobOpening,
  Interview,
  InterviewPanel,
  User,
} = DashMatrixDB;

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

const sanitizeNumber = (val, fallback = null) => {
  if (val === undefined || val === null || val === "" || val === "null")
    return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

const sanitizeBoolean = (val, fallback) => {
  if (typeof val === "boolean") return val;
  if (val === "true") return true;
  if (val === "false") return false;
  return fallback;
};

// ─────────────────────────────────────────
// STANDARD INCLUDES (reusable)
// ─────────────────────────────────────────

const candidateListIncludes = [
  { model: Exam, as: "exam", attributes: ["id", "name"] },
  { model: Department, as: "department", attributes: ["id", "name"] },
  {
    model: JobOpening,
    as: "job",
    attributes: ["id", "jobCode", "title", "designation"],
  },
];

const candidateDetailIncludes = [
  {
    model: Department,
    as: "department",
    attributes: ["id", "name", "isActive"],
  },
  {
    model: JobOpening,
    as: "job",
    attributes: ["id", "jobCode", "title", "designation"],
  },
  {
    model: Exam,
    as: "exam",
    attributes: ["id", "name", "positiveMarking", "negativeMarking", "levelId"],
  },
  {
    model: Interview,
    as: "interviews",
    required: false,
    separate: true,
    attributes: [
      "id",
      "round",
      "interviewType",
      "interviewDate",
      "startTime",
      "endTime",
      "status",
      "meetingLink",
      "location",
      "completedAt",
      "createdAt",
    ],
    order: [["interviewDate", "ASC"]],
    include: [
      {
        model: User,
        as: "scheduler",
        attributes: ["id", "firstName", "lastName", "mail"],
      },
      {
        model: InterviewPanel,
        as: "panel",
        required: false,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "mail"],
          },
          {
            model: User,
            as: "addedByUser",
            attributes: ["id", "firstName", "lastName"],
          },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────
// CREATE CANDIDATE
// ─────────────────────────────────────────

const createCandidate = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    mobile,
    experience,
    examId,
    departmentId,
    isActive = true,
    source = "offline",
    jobId,
    jobCode,
    assignedRecruiterId,
    remarks,
    resumeReviewed = false,
    hrRating,
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required" });
  }

  const finalExamId = sanitizeNumber(examId);

  // ✅ Parallel validation
  const [existingCandidate, department, job] = await Promise.all([
    Candidate.findOne({ where: { email } }),
    departmentId
      ? Department.findOne({ where: { id: departmentId, isActive: true } })
      : Promise.resolve(null),
    jobId
      ? JobOpening.findOne({ where: { id: jobId, isPublished: true } })
      : Promise.resolve(null),
  ]);

  if (existingCandidate) {
    return res
      .status(400)
      .json({ message: "Candidate with this email already exists" });
  }

  if (departmentId && !department) {
    return res
      .status(400)
      .json({ message: "Selected department is inactive or does not exist" });
  }

  if (jobId && !job) {
    return res
      .status(400)
      .json({ message: "Selected job opening is inactive or does not exist" });
  }

  // ─── Derived stage logic ───
  const isOffline = source === "offline";
  let applicationStage = "Applied";
  let finalResumeReviewed = resumeReviewed;
  let resumeReviewedAt = null;
  let shortlistedForExamAt = null;

  if (isOffline && finalExamId) {
    applicationStage = "Exam Assigned";
    finalResumeReviewed = true;
    resumeReviewedAt = new Date();
    shortlistedForExamAt = new Date();
  } else if (isOffline && !finalExamId) {
    applicationStage = "Resume Reviewed";
    finalResumeReviewed = true;
    resumeReviewedAt = new Date();
  }

  const candidate = await Candidate.create({
    name,
    email,
    mobile,
    experience,
    examId: finalExamId,
    departmentId: sanitizeNumber(departmentId),
    isActive,
    resumeUrl: req.file?.path || null,
    source,
    jobId: sanitizeNumber(jobId),
    jobCode,
    applicationStage,
    assignedRecruiterId: sanitizeNumber(assignedRecruiterId),
    remarks,
    resumeReviewed: finalResumeReviewed,
    resumeReviewedAt,
    shortlistedForExamAt,
    hrRating: sanitizeNumber(hrRating),
    examStatus: finalExamId ? "Assigned" : "Not assigned",
    examAssignedAt: finalExamId ? new Date() : null,
    created_by: req.user?.id || null,
  });

  res.status(201).json({
    message: "Candidate created successfully",
    candidate,
  });
});

// ─────────────────────────────────────────
// GET ALL CANDIDATES (with pagination + filters)
// ─────────────────────────────────────────

const getAllCandidates = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const {
    search = "",
    departmentId = "",
    jobId = "",
    applicationStage = "",
    examStatus = "",
    isActive = "",
    source = "",
  } = req.query;

  const where = {};

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { mobile: { [Op.like]: `%${search}%` } },
    ];
  }

  if (isActive !== "") where.isActive = isActive === "true";
  if (applicationStage) where.applicationStage = applicationStage;
  if (source) where.source = source;
  if (departmentId) where.departmentId = departmentId;
  if (jobId) where.jobId = jobId;
  if (examStatus) where.examStatus = examStatus;

  const { count, rows: candidates } = await Candidate.findAndCountAll({
    where,
    include: candidateListIncludes,
    distinct: true,
    limit,
    offset,
    order: [["id", "DESC"]],
  });

  res.status(200).json({
    message: "Candidates fetched successfully",
    candidates,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalCandidates: count,
      limit,
    },
  });
});

// ─────────────────────────────────────────
// GET ACTIVE CANDIDATES
// ─────────────────────────────────────────

const getActiveCandidates = asyncHandler(async (req, res) => {
  const candidates = await Candidate.findAll({
    where: { isActive: true },
    include: candidateListIncludes,
    order: [["id", "DESC"]],
  });

  res.status(200).json({
    message: "Active candidates fetched successfully",
    candidates,
  });
});

// ─────────────────────────────────────────
// GET CANDIDATE BY ID
// ─────────────────────────────────────────

const getCandidateById = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findByPk(req.params.id, {
    include: candidateDetailIncludes,
  });

  if (!candidate) {
    return res.status(404).json({ message: "Candidate not found" });
  }

  res.status(200).json({
    message: "Candidate fetched successfully",
    candidate,
  });
});

// ─────────────────────────────────────────
// UPDATE CANDIDATE
// ─────────────────────────────────────────

const updateCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findByPk(req.params.id);
  if (!candidate) {
    return res.status(404).json({ message: "Candidate not found" });
  }

  const {
    name,
    email,
    mobile,
    experience,
    examId,
    departmentId,
    isActive,
    resumeUrl,
    source,
    jobId,
    jobCode,
    applicationStage,
    assignedRecruiterId,
    remarks,
    resumeReviewed,
    hrRating,
  } = req.body;

  // ─── Sanitize ───
  const sanitizedExamId = sanitizeNumber(examId);
  const sanitizedDepartmentId = sanitizeNumber(
    departmentId,
    candidate.departmentId,
  );
  const sanitizedJobId = sanitizeNumber(jobId, candidate.jobId);
  const sanitizedAssignedRecruiterId = sanitizeNumber(
    assignedRecruiterId,
    candidate.assignedRecruiterId,
  );
  const sanitizedHrRating = sanitizeNumber(hrRating, candidate.hrRating);
  const sanitizedIsActive = sanitizeBoolean(isActive, candidate.isActive);
  const sanitizedResumeReviewed = sanitizeBoolean(
    resumeReviewed,
    candidate.resumeReviewed,
  );

  // ─── Email uniqueness check (only if email changed) ───
  if (email && email !== candidate.email) {
    const emailExists = await Candidate.findOne({ where: { email } });
    if (emailExists) {
      return res
        .status(400)
        .json({ message: "Candidate with this email already exists" });
    }
  }

  // ─── Business validations ───
  if (
    applicationStage === "Shortlisted for Exam" &&
    !candidate.resumeReviewed &&
    sanitizedResumeReviewed !== true
  ) {
    return res.status(400).json({
      message: "Candidate can be shortlisted only after resume is reviewed.",
    });
  }

  const ALLOWED_EXAM_ASSIGN_STAGES = [
    "Shortlisted for Exam",
    "Exam Assigned",
    "Exam Completed",
  ];

  if (
    sanitizedExamId &&
    sanitizedExamId !== candidate.examId &&
    !ALLOWED_EXAM_ASSIGN_STAGES.includes(candidate.applicationStage)
  ) {
    return res.status(400).json({
      message:
        "Exam can be assigned only to candidates shortlisted for exam or already in exam stage.",
    });
  }

  const updatedFields = {};

  if (name !== undefined && name.trim() !== "") updatedFields.name = name;
  if (email !== undefined && email.trim() !== "") updatedFields.email = email;
  if (mobile !== undefined && mobile.trim() !== "")
    updatedFields.mobile = mobile;
  if (experience !== undefined) updatedFields.experience = experience;
  if (source !== undefined) updatedFields.source = source;
  if (jobCode !== undefined) updatedFields.jobCode = jobCode;
  if (remarks !== undefined) updatedFields.remarks = remarks;

  if (sanitizedDepartmentId !== null)
    updatedFields.departmentId = sanitizedDepartmentId;
  if (sanitizedJobId !== null) updatedFields.jobId = sanitizedJobId;
  if (sanitizedHrRating !== null) updatedFields.hrRating = sanitizedHrRating;
  if (sanitizedAssignedRecruiterId !== null)
    updatedFields.assignedRecruiterId = sanitizedAssignedRecruiterId;

  if (isActive !== undefined) updatedFields.isActive = sanitizedIsActive;
  if (resumeReviewed !== undefined)
    updatedFields.resumeReviewed = sanitizedResumeReviewed;

  if (req.file?.path || resumeUrl)
    updatedFields.resumeUrl = req.file?.path || resumeUrl;

  // No changes check
  if (Object.keys(updatedFields).length === 0) {
    return res.status(400).json({ message: "No changes detected to update" });
  }

  updatedFields.updated_by = req.user?.id || null;

  // ─── Auto stage: Applied → Resume Reviewed ───
  if (
    sanitizedResumeReviewed === true &&
    !candidate.resumeReviewed &&
    candidate.applicationStage === "Applied"
  ) {
    updatedFields.applicationStage = "Resume Reviewed";
    updatedFields.resumeReviewedAt = new Date();
  }

  // ─── Manual stage override ───
  if (applicationStage) {
    updatedFields.applicationStage = applicationStage;
  }

  // ─── Exam assigned ───
  if (sanitizedExamId && sanitizedExamId !== candidate.examId) {
    updatedFields.examId = sanitizedExamId; // ✅ YE LINE ADD KAR
    updatedFields.examStatus = "Assigned";
    updatedFields.applicationStage = "Exam Assigned";
    updatedFields.examAssignedAt = new Date();
  }

  // ─── Exam removed ───
  // ✅ Ab examId "" aayega frontend se jab remove hoga
  if (examId !== undefined && !sanitizedExamId && candidate.examId) {
    updatedFields.examStatus = "Not assigned";
    updatedFields.examId = null;
    // ✅ Stage bhi wapas karo agar exam remove ho raha hai
    if (candidate.applicationStage === "Exam Assigned") {
      updatedFields.applicationStage = "Shortlisted for Exam";
    }
  }

  await candidate.update(updatedFields);

  // ✅ Reload to get fresh data with associations
  await candidate.reload({ include: candidateDetailIncludes });

  res.status(200).json({
    message: "Candidate updated successfully",
    candidate,
  });
});

// ─────────────────────────────────────────
// DELETE CANDIDATE (Soft Delete)
// ─────────────────────────────────────────

const deleteCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findByPk(req.params.id);
  if (!candidate) {
    return res.status(404).json({ message: "Candidate not found" });
  }

  // ✅ Soft delete — consistent with User controller
  await candidate.update({
    isActive: false,
    deleted_at: new Date(),
    updated_by: req.user?.id || null,
  });

  res.status(200).json({ message: "Candidate deactivated successfully" });
});

const sendExamMailToCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;

    // 1. Get candidate with exam
    const candidate = await Candidate.findByPk(candidateId, {
      include: candidateDetailIncludes,
    });

    console.log("candidate info", candidate);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // 2. Check exam assignment
    if (!candidate.examId || candidate.examStatus === "Not assigned") {
      return res.status(400).json({
        message: "Assign an exam before sending the mail.",
      });
    }

    // 3. Check if mail was already sent recently
    if (candidate.examStatus === "In Progress") {
      const now = new Date();
      const lastSent = candidate.lastMailSentAt;

      if (lastSent) {
        const oneHour = 60 * 60 * 1000; // 1 hour in ms
        const diff = now - new Date(lastSent);

        if (diff < oneHour) {
          const minutesLeft = Math.ceil((oneHour - diff) / (60 * 1000));
          return res.status(400).json({
            message: `Mail already sent. You can resend after ${minutesLeft} min.`,
          });
        }
      }
    }

    // 4. Generate secure token
    const token = jwt.sign(
      {
        candidateId: candidate.id,
        examId: candidate.examId,
      },
      process.env.JWT_SECRET_EXAM,
      { expiresIn: "24h" },
    );
    const baseUrl = process.env.FRONTEND_URL || "https://talentgate.in/exam";
    const examLink = `${baseUrl}/exam-login?token=${token}`;
    const sentAt = new Date(); // mail send time
    const validityHours = 24;

    // ---- Date helpers ----
    const formatDateTime = (date) => {
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };
    const validTill = new Date(
      sentAt.getTime() + validityHours * 60 * 60 * 1000,
    );
    const startTime = formatDateTime(sentAt);
    const endTime = formatDateTime(validTill);

    // 5. Prepare mail
    const mailOptions = {
      to: candidate.email,
      subject: `Dinshaw's Online Assessment Invitation`,
      text: `Dear ${candidate.name}, You have been invited to an online assessment for ${candidate.job?.title || "the position"} at Talent Gate.`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Assessment Invitation</title>
  <style>
    @media only screen and (max-width: 620px) {
      .email-wrapper { padding: 16px 8px !important; }
      .email-card { border-radius: 10px !important; }
      .header-cell { padding: 22px 20px !important; }
      .header-title { font-size: 20px !important; }
      .section-pad { padding: 20px 20px 0 !important; }
      .card-pad { padding: 14px 20px !important; }
      .inner-card { padding: 14px 16px !important; }
      .cta-pad { padding: 6px 20px 22px !important; }
      .cta-btn { padding: 13px 32px !important; font-size: 15px !important; }
      .instr-pad { padding: 0 20px 22px !important; }
      .signoff-pad { padding: 0 20px 22px !important; }
      .footer-pad { padding: 16px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" class="email-wrapper" style="background-color:#f0f4f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" class="email-card" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.09);">

          <!-- HEADER -->
          <tr>
            <td class="header-cell" style="background-color:#DE251E;padding:28px 32px;text-align:center;">
              <h1 class="header-title" style="margin:0;color:#FEFEFE;font-size:22px;font-weight:700;line-height:1.3;">
                Dinshaw's Online Assessment
              </h1>
              <p style="margin:8px 0 0;color:#FEFEFE;font-size:13px;opacity:0.9;">
                You have been selected to take an assessment
              </p>
            </td>
          </tr>

          <!-- GREETING -->
          <tr>
            <td class="section-pad" style="padding:28px 32px 0;">
              <p style="margin:0;font-size:15px;color:#1e293b;line-height:1.6;">
                Dear ${candidate.name},
              </p>
              <p style="margin:10px 0 0;font-size:14px;color:#475569;line-height:1.7;">
                Congratulations! You have been officially invited to complete an online assessment
                as part of the selection process for the following position:
              </p>
            </td>
          </tr>

          <!-- JOB + EXAM DETAILS CARD -->
          <tr>
            <td class="card-pad" style="padding:18px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;">
                <tr>
                  <td class="inner-card" style="padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:#475569;line-height:1.8;">
                      <strong style="color:#1e293b;">Link Validity :</strong> ${startTime} &nbsp;<strong>To</strong>&nbsp; ${endTime}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA BUTTON -->
          <tr>
            <td class="cta-pad" style="padding:6px 32px 26px;text-align:center;">
              <a href="${examLink}" target="_blank" rel="noopener noreferrer"
                class="cta-btn" style="display:inline-block;padding:14px 44px;background-color:#DE251E;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:9px;box-shadow:0 4px 12px rgba(222,37,30,0.30);letter-spacing:0.02em;">
                Start Assessment →
              </a>
              <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;">
                You will be asked to review instructions before the exam begins
              </p>
            </td>
          </tr>

          <!-- INSTRUCTIONS -->
          <tr>
            <td class="instr-pad" style="padding:0 32px 26px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#9a3412;text-transform:uppercase;letter-spacing:0.05em;">
                      ⚠️ Important Instructions
                    </p>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      ${[
                        "This exam link is valid for <strong>24 hours</strong> only.",
                        "The exam can be attempted <strong>once only</strong>.",
                        "Ensure a <strong>stable internet connection</strong> before starting.",
                        "Do <strong>not refresh or close</strong> the browser during the exam.",
                        "A <strong>webcam</strong> is required throughout the assessment.",
                      ]
                        .map(
                          (item) => `
                        <tr>
                          <td valign="top" style="padding:3px 0;width:16px;">
                            <span style="color:#ea580c;font-size:13px;">•</span>
                          </td>
                          <td style="padding:3px 0 3px 4px;font-size:12px;color:#7c3400;line-height:1.6;">
                            ${item}
                          </td>
                        </tr>
                      `,
                        )
                        .join("")}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SIGN OFF -->
          <tr>
            <td class="signoff-pad" style="padding:0 32px 26px;">
              <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
                We wish you the very best for your assessment.<br/>
                If you face any technical issues, please contact our support team.
              </p>
              <p style="margin:16px 0 0;font-size:14px;color:#1e293b;">
                Warm regards,<br/>
                <strong style="color:#DE251E;">Dinshaw's HR Team</strong><br/>
                <span style="font-size:12px;color:#94a3b8;">Powered by Talent Gate</span>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="footer-pad" style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                This is an automated email. Please do not reply to this message.<br/>
                © ${new Date().getFullYear()} Dinshaw's | Powered by Talent Gate
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `,
    };

    // 6. Send email
    await sendEmails(mailOptions);

    // 7. Update status and mail sent time
    candidate.examStatus = "In Progress";
    candidate.lastMailSentAt = sentAt;
    await candidate.save();

    return res.status(200).json({
      message:
        "Exam mail sent successfully. Status updated to In Progress. Token expires in 24 hours.",
    });
  } catch (err) {
    console.error("Send mail error:", err);
    return res.status(500).json({ message: "Failed to send exam mail." });
  }
};

const startExam = async (req, res) => {
  try {
    const candidate = req.candidate; // ✅ From verifyExamToken middleware
    const exam = await candidate.getExam(); // Get exam details via association

    if (!exam) {
      return res
        .status(404)
        .json({ message: "Exam not found for this candidate." });
    }

    // ✅ If exam already completed
    if (candidate.examStatus === "Completed") {
      return res.status(400).json({ message: "Exam already submitted." });
    }

    // ✅ If exam already started, return existing start time
    if (candidate.examStatus === "In Progress") {
      return res.status(200).json({
        message: "Exam already started.",
        startedAt: candidate.startedAt,
        exam: {
          id: exam.id,
          name: exam.name,
          totalQuestions: exam.questionIds?.length || 0,
          positiveMarking: exam.positiveMarking,
          negativeMarking: exam.negativeMarking,
        },
      });
    }

    // ✅ Mark exam as started
    candidate.examStatus = "In progress";
    candidate.startedAt = new Date(); // store UTC (DB converts automatically)
    await candidate.save();

    return res.status(200).json({
      message: "✅ Exam started successfully.",
      candidate: {
        id: candidate.id,
        name: candidate.name,
        examStatus: candidate.examStatus,
        startedAt: candidate.startedAt,
      },
      exam: {
        id: exam.id,
        name: exam.name,
        totalQuestions: exam.questionIds?.length || 0,
        positiveMarking: exam.positiveMarking,
        negativeMarking: exam.negativeMarking,
      },
    });
  } catch (err) {
    console.error("❌ Start exam error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const reassignExam = async (req, res) => {
  try {
    const { candidateId, examId } = req.body;

    if (!candidateId || !examId)
      return res.status(400).json({ message: "candidateId & examId required" });

    const candidate = await Candidate.findByPk(candidateId);
    if (!candidate)
      return res.status(404).json({ message: "Candidate not found" });

    candidate.examId = examId;
    // Reset exam status
    candidate.examStatus = "Assigned";
    candidate.examReassignedAt = new Date();
    await candidate.save();

    return res.json({ message: "Exam reassigned successfully", candidate });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

const markResumeReviewed = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findByPk(req.params.id);

  if (!candidate) {
    return res.status(404).json({ message: "Candidate not found" });
  }

  // ⛔ backward flow protection
  if (
    ["Exam Assigned", "Exam Completed"].includes(candidate.applicationStage)
  ) {
    return res.status(400).json({
      message: "Resume review not allowed after exam has been assigned.",
    });
  }

  // ✅ SYNC FIX: agar resumeReviewed true hai but stage old hai
  if (
    candidate.resumeReviewed === true &&
    candidate.applicationStage === "Applied"
  ) {
    candidate.applicationStage = "Resume Reviewed";
    await candidate.save();

    return res.json({
      message: "Stage automatically synced with resume review",
      candidate,
    });
  }

  // ⛔ normal duplicate prevention
  if (candidate.resumeReviewed === true) {
    return res.status(400).json({
      message: "Resume already reviewed",
    });
  }

  // ✅ standard success flow
  candidate.resumeReviewed = true;
  candidate.applicationStage = "Resume Reviewed";
  candidate.resumeReviewedAt = new Date();
  await candidate.save();

  res.json({
    message: "Resume marked as reviewed successfully",
    candidate,
  });
});

const shortlistCandidateForExam = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findByPk(req.params.id);

  if (!candidate) {
    return res.status(404).json({ message: "Candidate not found" });
  }

  // ⛔ safety — resume must be reviewed
  if (!candidate.resumeReviewed) {
    return res.status(400).json({
      message: "Resume must be reviewed before shortlisting",
    });
  }

  // ⛔ already shortlisted
  if (candidate.applicationStage === "Shortlisted for Exam") {
    return res.status(400).json({
      message: "Candidate is already Shortlisted for Exam",
    });
  }

  // ⛔ prevent backward workflow changes
  if (
    ["Exam Assigned", "Exam Completed"].includes(candidate.applicationStage)
  ) {
    return res.status(400).json({
      message: "Cannot shortlist candidate after exam has started.",
    });
  }

  // ✅ stage automation
  candidate.applicationStage = "Shortlisted for Exam";
  candidate.shortlistedForExamAt = new Date();
  await candidate.save();

  res.json({
    message: "Candidate shortlisted successfully",
    candidate,
  });
});

const rejectCandidate = asyncHandler(async (req, res) => {
  const { remarks } = req.body;

  if (!remarks || remarks.trim() === "") {
    return res.status(400).json({
      message: "Rejection remark is required",
    });
  }

  const candidate = await Candidate.findByPk(req.params.id);

  if (!candidate) {
    return res.status(404).json({ message: "Candidate not found" });
  }

  // ⛔ Already hired
  if (candidate.applicationStage === "Hired") {
    return res.status(400).json({
      message: "Cannot reject a hired candidate",
    });
  }

  // ⛔ already rejected
  if (candidate.applicationStage === "Rejected") {
    return res.status(400).json({
      message: "Candidate already rejected",
    });
  }

  // ✅ Reject candidate
  candidate.applicationStage = "Rejected";
  candidate.rejectedAt = new Date();
  candidate.remarks = remarks;

  // ✅ Cleanup exam flow
  if (
    candidate.examStatus === "Assigned" ||
    candidate.examStatus === "In progress"
  ) {
    candidate.examStatus = "Expired";
  }

  await candidate.save();

  res.json({
    message: "Candidate rejected successfully",
    candidate,
  });
});

const shortlistCandidateForInterview = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findByPk(req.params.id);

  if (!candidate) {
    return res.status(404).json({ message: "Candidate not found" });
  }
  // ⛔ safety — exam must be completed
  if (candidate.applicationStage !== "Exam Completed") {
    return res.status(400).json({
      message: "Candidate must complete exam before shortlisting for interview",
    });
  }

  // ⛔ already shortlisted for interview
  if (candidate.applicationStage === "Interview Scheduled") {
    return res.status(400).json({
      message: "Candidate is already Shortlisted for Interview",
    });
  }

  // ✅ stage automation
  candidate.applicationStage = "Shortlisted for Interview";
  candidate.shortlistedForInterviewAt = new Date();
  await candidate.save();

  res.json({
    message: "Candidate shortlisted for interview successfully",
    candidate,
  });
});

const scheduleInterview = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findByPk(req.params.id);

  if (!candidate) {
    return res.status(404).json({ message: "Candidate not found" });
  }

  // 🔒 Stage Protection
  if (candidate.applicationStage !== "Shortlisted for Interview") {
    return res.status(400).json({
      message:
        "Interview can be scheduled only after candidate is shortlisted for interview",
    });
  }

  // Only stage update now
  candidate.applicationStage = "Interview Scheduled";
  candidate.interviewScheduledAt = new Date();
  await candidate.save();

  res.json({
    success: true,
    message: "Interview scheduled successfully",
    candidate,
  });
});

const markInterviewCompleted = asyncHandler(async (req, res) => {
  const interview = await Interview.findByPk(req.params.interviewId);

  if (!interview) {
    return res.status(404).json({ message: "Interview not found" });
  }

  if (interview.status !== "Scheduled") {
    return res.status(400).json({
      message: "Only scheduled interviews can be completed",
    });
  }

  interview.status = "Completed";
  interview.completedAt = new Date();
  await interview.save();

  const candidate = await Candidate.findByPk(interview.candidateId);

  await candidate.update({
    applicationStage: "Interview Completed",
    interviewCompletedAt: new Date(),
  });

  res.json({
    message: "Interview completed successfully",
    candidate,
  });
});

const markInterviewCancelled = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const { cancelReason } = req.body;

  const interview = await Interview.findByPk(interviewId);

  if (!interview) {
    return res.status(404).json({ message: "Interview not found" });
  }

  if (interview.status !== "Scheduled") {
    return res.status(400).json({
      message: "Only scheduled interviews can be cancelled",
    });
  }

  if (!cancelReason || !cancelReason.trim()) {
    return res.status(400).json({
      message: "Cancel reason is required",
    });
  }

  // ✅ Update interview
  await interview.update({
    status: "Cancelled",
    cancelReason,
  });

  // ✅ Update candidate stage
  const candidate = await Candidate.findByPk(interview.candidateId);

  await candidate.update({
    applicationStage: "Interview Cancelled",
    interviewCancledAt: new Date(),
  });

  res.json({
    message: "Interview cancelled successfully",
    candidate,
    interview,
  });
});

const markSelected = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findByPk(req.params.id);

  if (!candidate) {
    return res.status(404).json({ message: "Candidate not found" });
  }

  // ⛔ Workflow safety
  if (candidate.applicationStage === "Rejected") {
    return res
      .status(400)
      .json({ message: "Rejected candidate cannot be selected" });
  }

  if (candidate.applicationStage === "Hired") {
    return res.status(400).json({ message: "Candidate already hired" });
  }

  // ✅ Only from interview pass
  if (candidate.applicationStage !== "Interview Completed") {
    return res.status(400).json({
      message: "Candidate must complete interview before selection",
    });
  }

  // ✅ Mark selected
  candidate.applicationStage = "Selected";
  candidate.selectedAt = new Date();
  await candidate.save();

  res.json({
    message: "Candidate selected successfully",
    candidate,
  });
});

const markHired = asyncHandler(async (req, res) => {
  const { joiningDate } = req.body;

  if (!joiningDate) {
    return res.status(400).json({
      message: "Joining date is required",
    });
  }

  const candidate = await Candidate.findByPk(req.params.id);

  if (!candidate) {
    return res.status(404).json({
      message: "Candidate not found",
    });
  }

  // ⛔ VALIDATIONS
  if (candidate.applicationStage === "Rejected") {
    return res.status(400).json({
      message: "Rejected candidate cannot be hired",
    });
  }

  if (candidate.applicationStage === "Hired") {
    return res.status(400).json({
      message: "Candidate already hired",
    });
  }

  if (candidate.applicationStage !== "Selected") {
    return res.status(400).json({
      message: "Candidate must be Selected before hiring",
    });
  }

  // ✅ MARK AS HIRED
  candidate.applicationStage = "Hired";
  candidate.joiningDate = joiningDate;

  await candidate.save();

  res.json({
    message: "Candidate hired successfully",
    candidate,
  });
});

module.exports = {
  createCandidate,
  getAllCandidates,
  getActiveCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  sendExamMailToCandidate,
  startExam,
  reassignExam,
  markResumeReviewed,
  shortlistCandidateForExam,
  shortlistCandidateForInterview,
  rejectCandidate,
  scheduleInterview,
  markInterviewCompleted,
  markInterviewCancelled,
  markSelected,
  markHired,
};

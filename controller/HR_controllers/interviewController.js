const asyncHandler = require("express-async-handler");

const { DashMatrixDB } = require("../../models");
const {
  Candidate,
  JobOpening,
  ExamResult,
  Department,
  Interview,
  InterviewPanel,
  User,
  InterviewScore,
} = DashMatrixDB;

// Fetch candidates with related job & exam info
const { Op } = require("sequelize");
const { sendNotification } = require("../../utils/notificationService");
const { io } = require("../../server");
const getCandidatesOverview = asyncHandler(async (req, res) => {
  const {
    departmentId,
    jobId,
    resultStatus,
    startDate,
    endDate,
    search,
    limit = 10,
    offset = 0,
    sortBy = "created_at",
    sortOrder = "DESC",
  } = req.query;

  // =====================================================
  // 🎯 INTERVIEW PIPELINE STAGES ONLY
  // =====================================================
  const INTERVIEW_STAGES = [
    "Shortlisted for Interview",
    "Interview Scheduled",
    "Interview Rescheduled",
    "Interview Completed",
    "Interview Cancelled",
    "Selected",
    "Rejected",
    "Hired",
  ];

  // =====================================================
  // 🔎 BASE WHERE CONDITION
  // =====================================================
  const whereCondition = {
    applicationStage: {
      [Op.in]: INTERVIEW_STAGES,
    },
  };

  // 🔹 Department Filter
  if (departmentId) {
    whereCondition.departmentId = departmentId;
  }

  // 🔹 Job Filter
  if (jobId) {
    whereCondition.jobId = jobId;
  }

  // 🔹 Date Range Filter
  if (startDate && endDate) {
    whereCondition.created_at = {
      [Op.between]: [new Date(startDate), new Date(endDate)],
    };
  }

  // 🔹 Search Filter (name | email | mobile)
  if (search) {
    whereCondition[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { mobile: { [Op.like]: `%${search}%` } },
    ];
  }

  // =====================================================
  // 🔃 SORTING MAP
  // =====================================================
  const sortableFields = {
    name: ["name", sortOrder],
    created_at: ["created_at", sortOrder],
    date: ["created_at", sortOrder],
    score: [{ model: ExamResult, as: "examResults" }, "score", sortOrder],
  };

  const orderBy = sortableFields[sortBy] || ["created_at", "DESC"];

  // =====================================================
  // 🔥 MAIN QUERY
  // =====================================================
  const candidates = await Candidate.findAndCountAll({
    where: whereCondition,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [orderBy],

    attributes: [
      "id",
      "name",
      "email",
      "mobile",
      "applicationStage",
      "examStatus",
      "created_at",
    ],

    include: [
      {
        model: JobOpening,
        as: "job",
        attributes: ["id", "jobCode", "title", "designation", "departmentId"],
      },
      {
        model: Department,
        as: "department",
        attributes: ["id", "name"],
      },
      {
        model: ExamResult,
        as: "examResults",
        attributes: ["resultStatus"],
        where: resultStatus ? { resultStatus } : undefined,
        required: false,
      },
      {
        model: Interview,
        as: "interviews",
        attributes: [
          "id",
          "round",
          "status",
          "interviewDate",
          "startTime",
          "endTime",
        ],
        required: false,
        separate: true,
        limit: 1,
        order: [["createdAt", "DESC"]],
      },
    ],
  });

  // =====================================================
  // ✅ RESPONSE
  // =====================================================
  res.status(200).json({
    success: true,
    totalRecords: candidates.count,
    pageRecords: candidates.rows.length,
    candidates: candidates.rows,
  });
});

// -------------------- CREATE INTERVIEW --------------------

const createInterview = asyncHandler(async (req, res) => {
  const {
    candidateId,
    jobId,
    round,
    interviewType,
    interviewDate,
    startTime,
    endTime,
    status,
    meetingLink,
    location,
    notes,
    panel, // [{ userId, role }]
  } = req.body;

  const createdBy = req.user.id; // from auth token

  // =============================
  // BASIC VALIDATION
  // =============================
  if (
    !candidateId ||
    !jobId ||
    !round ||
    !interviewDate ||
    !startTime ||
    !endTime
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // =============================
  // FETCH CANDIDATE
  // =============================
  const candidate = await Candidate.findByPk(candidateId);

  if (!candidate) {
    return res.status(404).json({ message: "Candidate not found" });
  }

  // =============================
  // ELIGIBILITY CHECK (FINAL LOGIC)
  // =============================
  if (
    candidate.applicationStage === "Rejected" ||
    candidate.applicationStage === "Hired"
  ) {
    return res.status(400).json({
      message: "Cannot schedule interview for this candidate",
    });
  }

  // =============================
  // BLOCK MULTIPLE ACTIVE INTERVIEWS
  // =============================
  const activeInterview = await Interview.findOne({
    where: {
      candidateId,
      status: "Scheduled",
    },
  });

  if (activeInterview) {
    return res.status(400).json({
      message: "Candidate already has a scheduled interview",
    });
  }

  // =============================
  // CREATE INTERVIEW
  // =============================
  const interview = await Interview.create({
    candidateId,
    jobId,
    round,
    interviewType: interviewType || "Online",
    interviewDate,
    startTime,
    endTime,
    status: status || "Scheduled",
    meetingLink,
    location,
    notes,
    createdBy,
  });

  // =============================
  // UPDATE CANDIDATE STAGE
  // =============================
  await candidate.update({
    applicationStage: "Interview Scheduled",
    interviewScheduledAt: new Date(),
  });

  // =============================
  // PANEL MEMBERS (OPTIONAL)
  // =============================
  let panelMembers = [];
  const interviewDateTime = new Date(`${interviewDate}T${startTime}:00`);
  const istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const formattedISTDateTime = istFormatter.format(interviewDateTime);

  if (panel && Array.isArray(panel) && panel.length > 0) {
    const allowedRoles = ["Lead", "Panelist", "Observer"];
    const userIds = panel.map((p) => p.userId);

    const users = await User.findAll({
      where: { id: userIds },
      attributes: ["id"],
    });
    const validUserIds = users.map((u) => u.id);

    const invalidUsers = userIds.filter((id) => !validUserIds.includes(id));
    if (invalidUsers.length > 0)
      return res
        .status(400)
        .json({ message: "Invalid panel members", invalidUsers });

    const panelData = panel.map((p) => ({
      interviewId: interview.id,
      userId: p.userId,
      role: allowedRoles.includes(p.role) ? p.role : "Panelist",
      addedBy: createdBy,
    }));

    await InterviewPanel.bulkCreate(panelData);

    // --- Notifications ---
    for (const member of panel) {
      await sendNotification({
        userId: member.userId,
        title: "New Interview Assigned",
        message: `You have been assigned to Interview Round ${round} for ${candidate.name} on ${formattedISTDateTime} (IST).`,
        type: "INTERVIEW",
        interviewId: interview.id,
      });
    }
  }

  return res.status(201).json({
    message: "Interview scheduled successfully",
    interviewId: interview.id,
  });
});

// -------------------- RESCHEDULE INTERVIEW --------------------

const rescheduleInterview = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const {
    interviewDate,
    startTime,
    endTime,
    interviewType,
    meetingLink,
    location,
    notes,
  } = req.body;

  // =============================
  // FETCH OLD INTERVIEW
  // =============================
  const oldInterview = await Interview.findByPk(interviewId);

  if (!oldInterview) {
    return res.status(404).json({ message: "Interview not found" });
  }

  if (oldInterview.status !== "Scheduled") {
    return res.status(400).json({
      message: "Only scheduled interviews can be rescheduled",
    });
  }

  // =============================
  // MARK OLD AS RESCHEDULED
  // =============================
  await oldInterview.update({ status: "Rescheduled" });

  // =============================
  // CREATE NEW INTERVIEW
  // =============================
  const newInterview = await Interview.create({
    candidateId: oldInterview.candidateId,
    jobId: oldInterview.jobId,
    round: oldInterview.round,
    interviewType,
    interviewDate,
    startTime,
    endTime,
    meetingLink,
    location,
    notes,
    createdBy: req.user.id,
    status: "Scheduled",
    rescheduledFromId: oldInterview.id,
  });

  // =============================
  // UPDATE CANDIDATE STAGE
  // =============================
  await Candidate.update(
    {
      applicationStage: "Interview Rescheduled",
    },
    {
      where: { id: oldInterview.candidateId },
    }
  );

  return res.json({
    message: "Interview rescheduled successfully",
    interview: newInterview,
  });
});

// -------------------- GET MY INTERVIEWS --------------------
// GET /api/interview/my
// ===============================
const getMyInterviews = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const interviews = await Interview.findAll({
    distinct: true, // 🔥 again important

    include: [
      {
        model: InterviewPanel,
        as: "panel",
        where: { userId },
        attributes: [],
      },
      {
        model: Candidate,
        as: "candidate",
        attributes: ["id", "name", "email", "mobile", "applicationStage"],
      },
      {
        model: JobOpening,
        as: "jobOpening",
        attributes: ["id", "jobCode", "title"],
      },
      {
        model: InterviewScore, // 👈  **score status yaha se aayega**
        as: "interviewScore",
        attributes: ["status"], // sirf status chahiye
        required: false, // 👈 if no score exists, still return interview
      },
    ],

    order: [["interviewDate", "ASC"]],
  });

  res.status(200).json({
    success: true,
    interviews,
  });
});

// -------------------- GET ALL INTERVIEWS --------------------
// GET /api/interview
// ===============================
const getAllInterviews = asyncHandler(async (req, res) => {
  const interviews = await Interview.findAll({
    distinct: true, // 🔥 VERY IMPORTANT

    include: [
      {
        model: Candidate,
        as: "candidate",
        attributes: ["id", "name", "email", "applicationStage"],
      },
      {
        model: JobOpening,
        as: "jobOpening",
        attributes: ["id", "jobCode", "title"],
      },
      {
        model: InterviewPanel,
        as: "panel",
        required: false, // 👈 safe join
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "mail"],
          },
        ],
      },
    ],

    order: [["createdAt", "DESC"]],
  });

  res.status(200).json({
    success: true,
    interviews,
  });
});

module.exports = {
  getCandidatesOverview,
  createInterview,
  rescheduleInterview,
  getMyInterviews,
  getAllInterviews,
};

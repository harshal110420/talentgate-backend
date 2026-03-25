const asyncHandler = require("express-async-handler");
const { DashMatrixDB } = require("../../models");
const { InterviewScore, Interview, Candidate, User, Department, Role } =
  DashMatrixDB;

const saveDraftScore = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const interviewerId = req.user.id;

  const { score, recommendation, strengths, weaknesses, comments } = req.body;

  const interview = await Interview.findByPk(interviewId);
  if (!interview) {
    return res.status(404).json({ message: "Interview not found." });
  }

  let interviewScore = await InterviewScore.findOne({
    where: { interviewId, interviewerId },
  });

  if (interviewScore && interviewScore.status !== "Draft") {
    return res.status(409).json({
      message: "Submitted score cannot be edited.",
    });
  }

  const payload = {
    interviewId,
    interviewerId,
    candidateId: interview.candidateId,
    round: interview.round,
    score,
    recommendation,
    strengths,
    weaknesses,
    comments,
    status: "Draft",
  };

  interviewScore = interviewScore
    ? await interviewScore.update(payload)
    : await InterviewScore.create(payload);

  res.status(200).json({
    message: "Draft saved successfully.",
    data: interviewScore,
  });
});

const submitInterviewScore = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const interviewerId = req.user.id;

  const { score, recommendation, strengths, weaknesses, comments } = req.body;

  // Strict validation
  if (score === undefined || score < 0 || score > 10) {
    return res.status(400).json({
      message: "Score must be between 0 and 10.",
    });
  }

  const interview = await Interview.findByPk(interviewId);
  if (!interview) {
    return res.status(404).json({ message: "Interview not found." });
  }

  let interviewScore = await InterviewScore.findOne({
    where: { interviewId, interviewerId },
  });

  if (interviewScore?.status === "Submitted") {
    return res.status(409).json({
      message: "Score already submitted.",
    });
  }

  const payload = {
    interviewId,
    interviewerId,
    candidateId: interview.candidateId,
    round: interview.round,
    score,
    recommendation,
    strengths,
    weaknesses,
    comments,
    status: "Submitted",
    submittedAt: new Date(),
  };

  interviewScore = interviewScore
    ? await interviewScore.update(payload)
    : await InterviewScore.create(payload);

  // ✅ Update candidate application stage
  await Candidate.update(
    { applicationStage: "Interview Completed" },
    { where: { id: interview.candidateId } },
  );
  await Interview.update(
    { status: "Completed" },
    { where: { id: interviewId } },
  );
  res.status(201).json({
    message: "Interview score submitted successfully.",
    data: interviewScore,
  });
});

const fetchMyInterviewScore = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const interviewerId = req.user.id;

  const interview = await Interview.findByPk(interviewId);
  if (!interview) {
    return res.status(404).json({ message: "Interview not found." });
  }

  const score = await InterviewScore.findOne({
    where: { interviewId, interviewerId },
  });

  res.status(200).json({
    message: "Your interview score fetched successfully.",
    data: score || null,
  });
});

const fetchInterviewScores = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;

  const interview = await Interview.findByPk(interviewId);
  if (!interview) {
    return res.status(404).json({ message: "Interview not found." });
  }

  const scores = await InterviewScore.findAll({
    where: { interviewId },
    order: [["createdAt", "ASC"]],
    include: [
      {
        model: User,
        as: "interviewer",
        attributes: ["id", "firstName", "lastName", "mail"],
        include: [
          {
            model: Department,
            as: "department",
            attributes: ["id", "name"],
          },
          {
            model: Role,
            as: "role",
            attributes: ["id", "displayName"],
          },
        ],
      },
      {
        model: Candidate,
        as: "candidate",
        attributes: ["id", "name", "email"],
      },
    ],
  });

  res.status(200).json({
    message: "Interview scores fetched successfully.",
    data: scores,
  });
});

/**
 * 🔒 Lock Interview Scores (HR only)
 * Rule:
 * 1. All scores must be Submitted
 * 2. Status -> Locked
 */
const lockInterviewScores = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;

  // 1️⃣ Fetch all scores for interview
  const scores = await InterviewScore.findAll({
    where: { interviewId },
  });

  if (!scores.length) {
    return res.status(404).json({
      success: false,
      message: "No interview scores found.",
    });
  }

  // 2️⃣ Ensure all are Submitted
  const hasDraft = scores.some((s) => s.status !== "Submitted");

  if (hasDraft) {
    return res.status(400).json({
      success: false,
      message: "All interviewers must submit scores before locking.",
    });
  }

  // 3️⃣ Lock all scores
  await InterviewScore.update({ status: "Locked" }, { where: { interviewId } });

  // 4️⃣ (Optional but recommended)
  // await Interview.update(
  //   { status: "Completed" },
  //   { where: { id: interviewId } }
  // );

  res.status(200).json({
    success: true,
    message: "Interview scores locked successfully.",
  });
});

module.exports = {
  saveDraftScore,
  submitInterviewScore,
  fetchMyInterviewScore,
  fetchInterviewScores,
  lockInterviewScores,
};

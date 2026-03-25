// const asyncHandler = require("express-async-handler");
// const { DashMatrixDB } = require("../../models");

// const { Candidate, JobOpening } = DashMatrixDB;

// const applyForJob = asyncHandler(async (req, res) => {
//   const { jobCode, name, email, mobile, experience } = req.body;

//   if (!jobCode || !name || !email) {
//     return res.status(400).json({
//       success: false,
//       message: "Required fields missing",
//     });
//   }

//   // ✅ Verify Job
//   const job = await JobOpening.findOne({
//     where: {
//       jobCode,
//       status: "Open",
//       isPublished: true,
//     },
//   });

//   if (!job) {
//     return res.status(404).json({
//       success: false,
//       message: "Job no longer available",
//     });
//   }

//   // ✅ Duplicate Prevention
//   const exists = await Candidate.findOne({
//     where: {
//       email,
//       jobId: job.id,
//     },
//   });

//   if (exists) {
//     return res.status(409).json({
//       success: false,
//       message: "Already applied for this job",
//     });
//   }

//   // ✅ Resume from Cloudinary
//   let resumeUrl = req.file?.path || null;

//   // ✅ Save candidate
//   const candidate = await Candidate.create({
//     name,
//     email,
//     mobile,
//     experience,

//     resumeUrl,

//     jobId: job.id,
//     jobCode: job.jobCode,
//     departmentId: job.departmentId,

//     source: "online",
//     applicationStage: "Applied",
//     resumeReviewed: false,

//     isActive: true,
//     created_by: 0,
//   });

//   res.status(201).json({
//     success: true,
//     message: "Application submitted successfully",
//     data: candidate,
//   });
// });

// module.exports = { applyForJob };

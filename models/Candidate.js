const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db");

module.exports = () => {
  const Candidate = dashMatrixSequelize.define(
    "Candidate",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      /* =====================
          BASIC PROFILE
      ====================== */

      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      mobile: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      experience: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      resumeUrl: {
        type: DataTypes.STRING,
        allowNull: true, // Cloudinary link
      },

      source: {
        type: DataTypes.ENUM("online", "offline"),
        defaultValue: "offline",
      },

      /* =====================
          JOB TRACKING
      ====================== */

      jobId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      jobCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      departmentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      applicationStage: {
        type: DataTypes.ENUM(
          "Applied",
          "Resume Reviewed",
          "Shortlisted for Exam",
          "Exam Assigned",
          "Exam Completed",
          "Shortlisted for Interview",
          "Interview Scheduled",
          "Interview Rescheduled",
          "Interview Completed",
          "Interview Cancelled",
          "Selected",
          "Rejected",
          "Hired",
        ),
        defaultValue: "Applied",
      },

      /* =====================
         OFFER / JOINING
       ===================== */

      joiningDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      /* =====================
          SCREENING / HR TOOLS
      ====================== */

      assignedRecruiterId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      resumeReviewed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      hrRating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5,
        },
      },

      /* =====================
          EXAM WORKFLOW
      ====================== */

      examId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      examStatus: {
        type: DataTypes.ENUM(
          "Not assigned",
          "Assigned",
          "In progress",
          "Completed",
          "Disqualified",
          "Expired",
        ),
        defaultValue: "Not assigned",
      },

      lastMailSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      /* =====================
          STAGE TIMELINE
        ====================== */

      resumeReviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
          const raw = this.getDataValue("resumeReviewedAt");
          return raw
            ? new Date(raw).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : null;
        },
      },

      shortlistedForExamAt: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
          const raw = this.getDataValue("shortlistedForExamAt");
          return raw
            ? new Date(raw).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : null;
        },
      },

      shortlistedForInterviewAt: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
          const raw = this.getDataValue("shortlistedForInterviewAt");
          return raw
            ? new Date(raw).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : null;
        },
      },

      examAssignedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
          const raw = this.getDataValue("examAssignedAt");
          return raw
            ? new Date(raw).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : null;
        },
      },

      examReassignedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
          const raw = this.getDataValue("examReassignedAt");
          return raw
            ? new Date(raw).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : null;
        },
      },

      examCompletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
          const raw = this.getDataValue("examCompletedAt");
          return raw
            ? new Date(raw).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : null;
        },
      },

      interviewScheduledAt: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
          const raw = this.getDataValue("interviewScheduledAt");
          return raw
            ? new Date(raw).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : null;
        },
      },

      interviewCompletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
          const raw = this.getDataValue("interviewCompletedAt");
          return raw
            ? new Date(raw).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : null;
        },
      },

      interviewCancledAt: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
          const raw = this.getDataValue("interviewCancledAt");
          return raw
            ? new Date(raw).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : null;
        },
      },

      selectedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
          const raw = this.getDataValue("selectedAt");
          return raw
            ? new Date(raw).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : null;
        },
      },

      rejectedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        get() {
          const raw = this.getDataValue("rejectedAt");
          return raw
            ? new Date(raw).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : null;
        },
      },

      /* =====================
          SYSTEM
      ====================== */

      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "candidates",
      timestamps: true, // will generate created_at, updated_at
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return Candidate;
};

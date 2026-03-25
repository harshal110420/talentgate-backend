const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db");

module.exports = () => {
  const CandidateExam = dashMatrixSequelize.define(
    "CandidateExam",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      /* =====================
          RELATIONS
      ====================== */

      candidateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      examId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      attemptNo: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },

      /* =====================
          EXAM SHORTLISTING
      ====================== */

      shortlistedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      /* =====================
          TOKEN & ACCESS
      ====================== */

      examToken: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      tokenExpiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      /* =====================
          EXAM STATUS
      ====================== */

      examStatus: {
        type: DataTypes.ENUM(
          "Assigned",
          "In progress",
          "Completed",
          "Expired",
          "Disqualified",
        ),
        defaultValue: "Assigned",
      },

      /* =====================
          TIMELINE
      ====================== */

      mailSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      /* =====================
          SUBMISSION META
      ====================== */

      submissionType: {
        type: DataTypes.ENUM("AUTO", "MANUAL"),
        allowNull: true,
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
      tableName: "candidate_exams",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["candidateId"] },
        { fields: ["examId"] },
        { fields: ["examToken"], unique: true },
      ],
    },
  );

  return CandidateExam;
};

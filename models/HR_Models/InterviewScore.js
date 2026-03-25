const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../../config/db");

module.exports = () => {
  const InterviewScore = dashMatrixSequelize.define(
    "InterviewScore",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      interviewId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      interviewerId: {
        type: DataTypes.INTEGER, // userId
        allowNull: false,
      },

      candidateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      round: {
        type: DataTypes.STRING, // Tech / HR / Managerial (denormalized for ease)
        allowNull: false,
      },

      score: {
        type: DataTypes.DECIMAL(5, 2), // e.g. 8.5 / 10
        allowNull: true,
      },

      recommendation: {
        type: DataTypes.ENUM("Strong Yes", "Yes", "Neutral", "No", "Strong No"),
        allowNull: true,
      },

      strengths: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      weaknesses: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM("Draft", "Submitted", "Locked"),
        defaultValue: "Draft",
      },

      submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "interview_scores",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["interviewId", "interviewerId"],
        },
      ],
    }
  );

  return InterviewScore;
};

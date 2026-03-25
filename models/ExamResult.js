// models/ExamResult.js

const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db"); // ✅ Import the correct Sequelize instance

module.exports = () => {
  const ExamResult = dashMatrixSequelize.define(
    "ExamResult",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      candidateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      examId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      totalQuestions: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      attempted: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      correctAnswers: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      incorrectAnswers: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      skipped: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      candidateResponses: {
        type: DataTypes.JSON, // Array of { questionId, selectedOption }
        allowNull: false,
      },
      score: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      resultStatus: {
        type: DataTypes.ENUM("pass", "fail", "pending"),
        defaultValue: "pending",
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "exam_results",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return ExamResult;
};

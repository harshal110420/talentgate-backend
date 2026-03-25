const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db");

module.exports = () => {
  const QuestionBank = dashMatrixSequelize.define(
    "QuestionBank",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      question: { type: DataTypes.TEXT, allowNull: false },
      options: { type: DataTypes.JSON, allowNull: false },
      correct: { type: DataTypes.STRING, allowNull: false },
      subjectId: { type: DataTypes.INTEGER, allowNull: true },
      levelId: { type: DataTypes.INTEGER, allowNull: true },
      departmentId: { type: DataTypes.INTEGER, allowNull: true },
      timeLimit: { type: DataTypes.INTEGER },
      createdBy: { type: DataTypes.INTEGER },
      updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },

      // ✅ NEW FIELDS
      questionType: {
        type: DataTypes.ENUM(
          "MCQ",
          "JOURNAL_ENTRY",
          "PASSAGE",
          "FILL_IN_BLANK",
        ),
        allowNull: false,
        defaultValue: "MCQ",
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      tableName: "questionbank",
      timestamps: false,
    },
  );

  return QuestionBank;
};

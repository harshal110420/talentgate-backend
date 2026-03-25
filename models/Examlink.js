// models/ExamLink.js
const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db");

module.exports = () => {
  const ExamLink = dashMatrixSequelize.define(
    "ExamLink",
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

      examCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },

      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "exam_links",
    },
  );
  return ExamLink;
};

const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../../config/db");

module.exports = () => {
  const InterviewPanel = dashMatrixSequelize.define(
    "InterviewPanel",
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

      userId: {
        type: DataTypes.INTEGER, // interviewer (users.id)
        allowNull: false,
      },

      role: {
        type: DataTypes.ENUM("Lead", "Panelist", "Observer"),
        defaultValue: "Panelist",
      },

      status: {
        type: DataTypes.ENUM("Invited", "Accepted", "Declined"),
        defaultValue: "Invited",
      },

      addedBy: {
        type: DataTypes.INTEGER, // HR userId
        allowNull: false,
      },
    },
    {
      tableName: "interview_panels",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["interviewId", "userId"],
        },
      ],
    }
  );

  return InterviewPanel;
};

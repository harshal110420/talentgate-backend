const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../../config/db");

module.exports = () => {
  const Interview = dashMatrixSequelize.define(
    "Interview",
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

      jobId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      round: {
        type: DataTypes.STRING, // HR, Technical, Managerial
        allowNull: false,
      },

      interviewType: {
        type: DataTypes.ENUM("Online", "Offline", "Telephonic"),
        defaultValue: "Online",
      },

      interviewDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      startTime: {
        type: DataTypes.TIME,
        allowNull: false,
      },

      endTime: {
        type: DataTypes.TIME,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM(
          "Scheduled",
          "Completed",
          "Cancelled",
          "Rescheduled",
          "No Show",
        ),
        defaultValue: "Scheduled",
      },

      meetingLink: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      location: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      rescheduledFromId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      cancelReason: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "interviews",
      timestamps: true,
    },
  );

  return Interview;
};

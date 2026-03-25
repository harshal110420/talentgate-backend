const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db");

module.exports = () => {
  const CandidateDecision = dashMatrixSequelize.define(
    "CandidateDecision",
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

      jobId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      /* =====================
          FINAL DECISION
      ====================== */

      decision: {
        type: DataTypes.ENUM("Selected", "Rejected", "On Hold"),
        allowNull: false,
      },

      decisionAt: {
        type: DataTypes.DATE,
        allowNull: false,
        get() {
          const raw = this.getDataValue("decisionAt");
          return raw
            ? new Date(raw).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : null;
        },
      },

      decisionBy: {
        type: DataTypes.INTEGER, // HR / Admin userId
        allowNull: true,
      },

      remarks: {
        type: DataTypes.TEXT,
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
      tableName: "candidate_decisions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["candidateId"] },
        { fields: ["jobId"] },
        { fields: ["decision"] },
      ],
    },
  );

  return CandidateDecision;
};

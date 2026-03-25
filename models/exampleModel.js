const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db"); // ✅ Import the correct Sequelize instance

module.exports = () => {
  const Candidate = dashMatrixSequelize.define(
    "Candidate",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
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
      examId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      departmentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      examStatus: {
        type: DataTypes.ENUM(
          "Not assigned",
          "Assigned",
          "In progress",
          "Completed",
          "Expired"
        ),
        defaultValue: "Not assigned",
      },
      lastMailSentAt: { type: DataTypes.DATE, allowNull: true }, // 🆕
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      // 🆕 Audit Fields
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
    }
  );

  // 🔗 Associations

  return Candidate;
};

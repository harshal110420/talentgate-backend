const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db"); // ✅ Import the correct Sequelize instance

module.exports = () => {
  const Exam = dashMatrixSequelize.define(
    "Exam",
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
      questionIds: {
        type: DataTypes.JSON, // ["1","2", "3"]
        allowNull: false,
      },
      levelId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      departmentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      positiveMarking: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      negativeMarking: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
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
      tableName: "exams",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  

  return Exam;
};

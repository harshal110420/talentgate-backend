const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db"); // ✅ Import the correct Sequelize instance

module.exports = () => {
  const Module = dashMatrixSequelize.define(
    "Module",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      moduleId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      }, // e.g., "ACCOUNTS"
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      }, // e.g., "Accounts"
      path: {
        type: DataTypes.STRING,
        allowNull: false,
      }, // e.g., "accounts-module"
      version: {
        type: DataTypes.STRING,
        defaultValue: "1.0",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      orderBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // 🆕 Audit fields
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
      tableName: "modules",
      timestamps: true, // This will automatically add created_at and updated_at
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

 

  return Module;
};

const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db"); // ✅ Import the correct Sequelize instance

module.exports = () => {
  const Department = dashMatrixSequelize.define(
    "Department",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "departments",
      timestamps: false,
    }
  );

 
  return Department;
};

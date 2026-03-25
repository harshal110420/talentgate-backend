const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db"); // ✅ Import the correct Sequelize instance

module.exports = () => {
  const Level = dashMatrixSequelize.define(
    "Level",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
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
      tableName: "levels",
      timestamps: false,
    }
  );
  
  return Level;
};

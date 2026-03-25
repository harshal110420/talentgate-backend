const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db"); // ✅ Import the correct Sequelize instance

module.exports = () => {
  const Menu = dashMatrixSequelize.define(
    "Menu",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      parentCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      moduleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("Master", "Transaction", "Report"),
        allowNull: false,
      },
      menuId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
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
      tableName: "menus",
      timestamps: true, // Adds created_at & updated_at
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

 

  return Menu;
};

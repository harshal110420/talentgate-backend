const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db"); // your DB instance

module.exports = () => {
  const Notification = dashMatrixSequelize.define(
    "Notification",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM("interview", "task", "system", "general"),
        allowNull: false,
        defaultValue: "general",
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: dashMatrixSequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: dashMatrixSequelize.literal("CURRENT_TIMESTAMP"),
      },
    },
    {
      tableName: "notifications",
      timestamps: true,
    }
  );

  return Notification;
};

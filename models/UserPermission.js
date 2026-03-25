const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db");

module.exports = () => {
  const UserPermission = dashMatrixSequelize.define(
    "UserPermission",
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

      menuId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      actions: {
        type: DataTypes.JSON,
        allowNull: false,
        validate: {
          isValidActionArray(value) {
            const allowed = [
              "new",
              "edit",
              "view",
              "print",
              "delete",
              "export",
              "upload",
              "details",
            ];
            if (!Array.isArray(value)) {
              throw new Error("Actions must be an array.");
            }
            const invalid = value.filter((v) => !allowed.includes(v));
            if (invalid.length > 0) {
              throw new Error(`Invalid actions: ${invalid.join(", ")}`);
            }
          },
        },
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
      tableName: "user_permissions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return UserPermission;
};

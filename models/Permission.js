const { DataTypes } = require("sequelize");
const { dashMatrixSequelize } = require("../config/db"); // ✅ Import the correct Sequelize instance

module.exports = () => {
  const Permission = dashMatrixSequelize.define(
    "Permission",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      menuId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      actions: {
        type: DataTypes.JSON, // because MySQL doesn’t support ARRAY
        allowNull: false,
        validate: {
          isValidActionArray(value) {
            const allowed = [
              "new",
              "edit",
              "view",
              "details",
              "print",
              "delete",
              "export",
              "upload",
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
      tableName: "permissions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

 

  return Permission;
};

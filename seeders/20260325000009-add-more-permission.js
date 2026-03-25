"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("permissions", [
      {
        roleId: 1, // ✅ Replace with real Role ID
        menuId: 2, // ✅ Replace with real Menu ID
        actions: JSON.stringify(["new", "view", "edit", "delete"]), // 👈 JSON format
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        roleId: 1, // ✅ Replace with real Role ID
        menuId: 3, // ✅ Replace with real Menu ID
        actions: JSON.stringify(["new", "view", "edit", "delete"]), // 👈 JSON format
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("permissions", null, {});
  },
};

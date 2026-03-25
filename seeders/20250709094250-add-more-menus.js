"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("menus", [
      {
        parentCode: "ROOT",
        moduleId: 2, // ⚠️ Replace with your actual module ID
        name: "Menu Management",
        type: "Master",
        menuId: "menu_management",
        isActive: true,
        orderBy: 1,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        parentCode: "ROOT",
        moduleId: 2, // ⚠️ Replace with your actual module ID
        name: "Permission Management",
        type: "Master",
        menuId: "permission_management",
        isActive: true,
        orderBy: 2,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("menus", null, {});
  },
};

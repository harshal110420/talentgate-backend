"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("menus", [
      {
        parentCode: "ROOT",
        moduleId: 1, // 
        name: "User Management",
        type: "Master",
        menuId: "user_management",
        isActive: true,
        orderBy: 1,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        parentCode: "ROOT",
        moduleId: 1, // 
        name: "Role Management",
        type: "Master",
        menuId: "role_management",
        isActive: true,
        orderBy: 2,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        parentCode: "ROOT",
        moduleId: 1, // 
        name: "Department Management",
        type: "Master",
        menuId: "department_management",
        isActive: true,
        orderBy: 3,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        parentCode: "ROOT",
        moduleId: 1, // 
        name: "Level Management",
        type: "Master",
        menuId: "level_management",
        isActive: true,
        orderBy: 4,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        parentCode: "ROOT",
        moduleId: 2, // 
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
        moduleId: 2, // 
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
      {
        parentCode: "ROOT",
        moduleId: 2, // 
        name: "Module Management",
        type: "Master",
        menuId: "module_management",
        isActive: true,
        orderBy: 3,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        parentCode: "ROOT",
        moduleId: 3, // 
        name: "Candidate Management",
        type: "Master",
        menuId: "candidate_management",
        isActive: true,
        orderBy: 1,
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

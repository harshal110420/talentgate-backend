"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const [modules] = await queryInterface.sequelize.query(
      `SELECT id, moduleId FROM modules ORDER BY id ASC`,
    );

    // moduleId string se actual id dhundho
    const getModuleId = (moduleIdStr) => {
      const found = modules.find((m) => m.moduleId === moduleIdStr);
      return found ? found.id : null;
    };

    await queryInterface.bulkInsert("menus", [
      {
        parentCode: "ROOT",
        moduleId: getModuleId("ADMIN"),
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
        moduleId: getModuleId("ADMIN"),
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
        moduleId: getModuleId("ADMIN"),
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
        moduleId: getModuleId("ADMIN"),
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
        moduleId: getModuleId("SYSTEM"),
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
        moduleId: getModuleId("SYSTEM"),
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
        moduleId: getModuleId("SYSTEM"),
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
        moduleId: getModuleId("EXAM"),
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

"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const [roles] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE role_name = 'system_admin' LIMIT 1`,
    );
    const [menus] = await queryInterface.sequelize.query(
      `SELECT id FROM menus ORDER BY id ASC`,
    );

    await queryInterface.bulkInsert(
      "permissions",
      menus.map((menu) => ({
        roleId: roles[0].id,
        menuId: menu.id,
        actions: JSON.stringify(["new", "view", "edit", "delete"]),
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("permissions", null, {});
  },
};

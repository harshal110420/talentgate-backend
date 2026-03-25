"use strict";

const bcrypt = require("bcryptjs");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPass1 = await bcrypt.hash("Admin@123", 10);
    // pehle role aur department ka actual id fetch karo
    const [roles] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE role_name = 'system_admin' LIMIT 1`,
    );
    const [departments] = await queryInterface.sequelize.query(
      `SELECT id FROM departments WHERE name = 'system_department' LIMIT 1`,
    );
    await queryInterface.bulkInsert("users", [
      {
        firstName: "Harshal",
        lastName: "Nanoti",
        username: "harshaln",
        password: hashedPass1,
        mail: "harshalnanoti85@gmail.com",
        mobile: "9209038248",
        roleId: roles[0].id, // ← dynamic
        departmentId: departments[0].id, // ← dynamic
        isActive: true,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("users", {
      username: { [Sequelize.Op.in]: ["harshaln", "adarshc"] },
    });
  },
};

"use strict";

const bcrypt = require("bcryptjs");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPass1 = await bcrypt.hash("Admin@123", 10);
    const hashedPass2 = await bcrypt.hash("Admin@123", 10);

    await queryInterface.bulkInsert("users", [
      {
        username: "harshaln",
        password: hashedPass1,
        mail: "harshalnanoti85@gmail.com",
        mobile: "9209038248",
        roleId: 1, // ✅ make sure Role with id 1 exists
        departmentId: 1, // ✅ optional, if exists
        isActive: true,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        username: "adarshc",
        password: hashedPass2,
        mail: "adarshchourasiya277@gmail.com",
        mobile: "9039221415",
        roleId: 1,
        departmentId: 1,
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

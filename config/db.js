const { Sequelize } = require("sequelize");
require("dotenv").config();

const dashMatrixSequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || "mysql",
    port: process.env.DB_PORT || 3306,
    pool: {
      max: 15,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    logging: false,
    // ── SSL for Aiven ─────────────────────────────────────────
    ...(process.env.MYSQL_SSL === "true" && {
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    }),
  },
);

module.exports = { dashMatrixSequelize };

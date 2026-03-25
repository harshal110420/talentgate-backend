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

    // 🔥 PERFORMANCE OPTIMIZATION
    pool: {
      max: 15, // max connections
      min: 0,
      acquire: 30000, // wait time before throwing error
      idle: 10000, // close idle connections
    },

    logging: false,

    dialectOptions: {
      connectTimeout: 30000,
    },
  },
);

module.exports = { dashMatrixSequelize };

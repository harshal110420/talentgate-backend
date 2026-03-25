// const { DataTypes } = require("sequelize");
// const { sequelizeWebsite } = require("../config/db"); // ✅ Import the correct Sequelize instance

// module.exports = () => {
//   const CareerApplication = sequelizeWebsite.define(
//     "CareerApplication",
//     {
//       fullName: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//       email: {
//         type: DataTypes.STRING,
//         allowNull: false,
//         validate: { isEmail: true },
//       },
//       phone: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//       location: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//       experience: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//       education: {
//         type: DataTypes.STRING,
//         allowNull: false,
//       },
//       resume: {
//         type: DataTypes.STRING, // yaha sirf file path save hoga
//         allowNull: false,
//       },
//       whyJoin: {
//         type: DataTypes.TEXT,
//         allowNull: false,
//       },
//     },
//     {
//       tableName: "CareerApplications",
//       timestamps: true,
//     }
//   );
//   return CareerApplication;
// };

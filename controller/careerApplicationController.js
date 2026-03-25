// // controller/careerApplicationController.js
// const { Op } = require("sequelize");
// const { WebsiteDB } = require("../models");
// const { CareerApplicationModel } = WebsiteDB;

// const getAllCareerApplications = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, search = "" } = req.query;

//     const offset = (page - 1) * limit;

//     // 🔍 Search condition
//     const searchCondition = search
//       ? {
//           [Op.or]: [
//             { name: { [Op.like]: `%${search}%` } },
//             { email: { [Op.like]: `%${search}%` } },
//             { positionApplied: { [Op.like]: `%${search}%` } },
//           ],
//         }
//       : {};

//     // 🔹 Fetch paginated + searchable results
//     const { count, rows } = await CareerApplicationModel.findAndCountAll({
//       where: searchCondition,
//       order: [["createdAt", "DESC"]],
//       offset,
//       limit: parseInt(limit),
//     });

//     res.status(200).json({
//       success: true,
//       message: "Career applications fetched successfully",
//       data: rows,
//       pagination: {
//         total: count,
//         page: parseInt(page),
//         totalPages: Math.ceil(count / limit),
//         limit: parseInt(limit),
//       },
//     });
//   } catch (error) {
//     console.error("❌ Error fetching career applications:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch career applications",
//       error: error.message,
//     });
//   }
// };

// module.exports = {
//   getAllCareerApplications,
// };

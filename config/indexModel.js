// const { Sequelize, DataTypes } = require("sequelize");
// const sequelize = require("./db");

// // All models
// const User = require("../models/User")(sequelize, DataTypes);
// const Role = require("../models/Role")(sequelize, DataTypes);
// const Permission = require("../models/Permission")(sequelize, DataTypes);
// const Department = require("../models/Department")(sequelize, DataTypes);
// const Subject = require("../models/Subject")(sequelize, DataTypes);
// const Level = require("../models/Level")(sequelize, DataTypes);
// const QuestionBank = require("../models/QuestionBank")(sequelize, DataTypes);
// const Exam = require("../models/Exam")(sequelize, DataTypes);
// const Candidate = require("../models/Candidate")(sequelize, DataTypes);
// const ExamResult = require("../models/ExamResult")(sequelize, DataTypes);

// // ---------------------------------------------------------
// // ⬇️ Define Associations
// // ---------------------------------------------------------

// // Role - Permission
// Role.belongsTo(Permission, { foreignKey: "permissionId" });
// Permission.hasMany(Role, { foreignKey: "permissionId" });

// // User - Role
// User.belongsTo(Role, { foreignKey: "roleId" });
// Role.hasMany(User, { foreignKey: "roleId" });

// // User - Department
// User.belongsTo(Department, { foreignKey: "departmentId" });
// Department.hasMany(User, { foreignKey: "departmentId" });

// // Subject - Department
// Subject.belongsTo(Department, { foreignKey: "departmentId" });
// Department.hasMany(Subject, { foreignKey: "departmentId" });

// // QuestionBank - Subject, Level, Department, User (createdBy)
// QuestionBank.belongsTo(Subject, { foreignKey: "subjectId" });
// Subject.hasMany(QuestionBank, { foreignKey: "subjectId" });

// QuestionBank.belongsTo(Level, { foreignKey: "levelId" });
// Level.hasMany(QuestionBank, { foreignKey: "levelId" });

// QuestionBank.belongsTo(Department, { foreignKey: "departmentId" });
// Department.hasMany(QuestionBank, { foreignKey: "departmentId" });

// QuestionBank.belongsTo(User, { foreignKey: "createdBy" });
// User.hasMany(QuestionBank, { foreignKey: "createdBy" });

// // Exam - Level, Department, User(createdBy)
// Exam.belongsTo(Level, { foreignKey: "levelId" });
// Level.hasMany(Exam, { foreignKey: "levelId" });

// Exam.belongsTo(Department, { foreignKey: "departmentId" });
// Department.hasMany(Exam, { foreignKey: "departmentId" });

// Exam.belongsTo(User, { foreignKey: "createdBy" });
// User.hasMany(Exam, { foreignKey: "createdBy" });

// // Candidate - Exam, Department, User(createdBy), ExamResult
// Candidate.belongsTo(Exam, { foreignKey: "examId" });
// Exam.hasMany(Candidate, { foreignKey: "examId" });

// Candidate.belongsTo(Department, { foreignKey: "departmentId" });
// Department.hasMany(Candidate, { foreignKey: "departmentId" });

// Candidate.belongsTo(User, { foreignKey: "createdBy" });
// User.hasMany(Candidate, { foreignKey: "createdBy" });

// Candidate.belongsTo(ExamResult, { foreignKey: "resultId" });
// ExamResult.hasOne(Candidate, { foreignKey: "resultId" });

// // ExamResult - Candidate (bidirectional for flexibility)
// ExamResult.belongsTo(Candidate, { foreignKey: "candidateId" });
// Candidate.hasMany(ExamResult, { foreignKey: "candidateId" });

// // ---------------------------------------------------------
// // Export all
// // ---------------------------------------------------------

// const db = {
//   sequelize,
//   Sequelize,
//   User,
//   Role,
//   Permission,
//   Department,
//   Subject,
//   Level,
//   QuestionBank,
//   Exam,
//   Candidate,
//   ExamResult,
// };

// module.exports = db;

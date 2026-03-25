const { sequelize } = require("../models");
// const redis = require("../utils/redisClient"); // Redis is optional and currently disabled

const getQuestionReport = async ({
  departmentId,
  subjectId,
  fromDate,
  toDate,
}) => {
  let query = `
    SELECT 
      d.name AS department_name,
      s.name AS subject_name,
      COUNT(q.id) AS total_questions
    FROM questionBank q
    JOIN subjects s ON q.subjectId = s.id
    JOIN departments d ON q.departmentId = d.id
    WHERE 1=1
  `;
  const params = [];

  if (departmentId) {
    query += ` AND d.id = ?`;
    params.push(departmentId);
  }

  if (subjectId) {
    query += ` AND s.id = ?`;
    params.push(subjectId);
  }

  if (fromDate && toDate) {
    query += ` AND q.updatedAt BETWEEN ? AND ?`;
    params.push(fromDate, toDate);
  }

  query += ` GROUP BY d.name, s.name ORDER BY d.name`;

  const [result] = await sequelize.query(query, { replacements: params });

  // console.log("Query executed:", query, "Params:", params);
  // console.log("Result:", result);
  return result;
};

const getDetailedQuestionReport = async ({
  departmentId,
  subjectId,
  fromDate,
  toDate,
}) => {
  let query = `
    SELECT 
      d.name AS department_name,
      s.name AS subject_name,
      l.name AS level_name,
      q.question,
      q.options,
      q.correct,
      q.createdBy
    FROM questionBank q
    JOIN subjects s ON q.subjectId = s.id
    JOIN departments d ON q.departmentId = d.id
    LEFT JOIN levels l ON q.levelId = l.id
    WHERE 1=1
  `;
  const params = [];

  if (departmentId) {
    query += ` AND d.id = ?`;
    params.push(departmentId);
  }

  if (subjectId) {
    query += ` AND s.id = ?`;
    params.push(subjectId);
  }

  if (fromDate && toDate) {
    query += ` AND q.updatedAt BETWEEN ? AND ?`;
    params.push(fromDate, toDate);
  }

  query += ` ORDER BY q.updatedAt DESC`;

  const [result] = await sequelize.query(query, { replacements: params });
  // console.log("Query executed 2:", query, "Params 2:", params);
  // console.log("Result 2:", result);
  return result;
};

module.exports = {
  getQuestionReport,
  getDetailedQuestionReport, // 👈 new method added here
};

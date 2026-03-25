// utils/generateExamCode.js
const crypto = require("crypto");

const generateExamCode = () => {
  // 6 hex chars => short + safe
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();

  // Optional prefix for clarity
  return `TG-${randomPart}`;
};

module.exports = generateExamCode;

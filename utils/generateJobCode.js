// utils/generateJobCode.js

const { Op } = require("sequelize");
const { DashMatrixDB } = require("../models");
const JobOpening = DashMatrixDB.JobOpening;

// console.log("JobOpening model:", JobOpening);

module.exports = async () => {
  const year = new Date().getFullYear();

  // find last job for current year
  const lastJob = await JobOpening.findOne({
    where: {
      jobCode: {
        [Op.like]: `JOB-${year}-%`,
      },
    },
    order: [["created_at", "DESC"]],
  });

  let nextNumber = 1;

  if (lastJob) {
    const lastCode = lastJob.jobCode;
    const numberPart = lastCode.split("-")[2];
    nextNumber = parseInt(numberPart) + 1;
  }

  const padded = String(nextNumber).padStart(3, "0");

  return `JOB-${year}-${padded}`;
};

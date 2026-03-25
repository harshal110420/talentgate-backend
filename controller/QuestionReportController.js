const {
  getQuestionReport,
  getDetailedQuestionReport,
} = require("../services/QuestionReportService");

const getReport = async (req, res) => {
  try {
    const filters = {
      departmentId: req.query.departmentId,
      subjectId: req.query.subjectId,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
    };

    const report = await getQuestionReport(filters);
    res.status(200).json({ success: true, data: report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getDetailedReport = async (req, res) => {
  try {
    const data = await getDetailedQuestionReport(req.query);
    res.json(data);
  } catch (error) {
    console.error("Detailed Report Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { getReport,getDetailedReport };

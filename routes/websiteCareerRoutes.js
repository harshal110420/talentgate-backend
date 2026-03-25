// // routes/websiteCareerRoutes.js
// const express = require("express");
// const router = express.Router();
// const authMiddleware = require("../middleware/authMiddleware");
// const checkPermission = require("../middleware/checkPermission");
// const {
//   getAllCareerApplications,
// } = require("../controller/careerApplicationController");
// const MENU_CODE = "website_career_application";

// // ✅ GET all career applications
// router.get(
//   "/get_all_application",
//   authMiddleware,
//   checkPermission(MENU_CODE, "view"),
//   getAllCareerApplications
// );

// module.exports = router;

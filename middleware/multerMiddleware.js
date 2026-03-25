const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "TalentGate/Resumes",
    resource_type: "raw", // ✅ Important for PDF/DOC
    allowed_formats: ["pdf", "doc", "docx"],
    public_id: (req, file) =>
      `${Date.now()}-${file.originalname.split(".")[0]}`,
  },
});

const upload = multer({ storage });

module.exports = upload;

const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage(); // using memory to avoid writing to disk
const upload = multer({ storage });

module.exports = upload;

const path = require("path");
const dotenv = require("dotenv");

const envPath = path.resolve(__dirname, "../.env");
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error("❌ Failed to load .env:", result.error);
} else {
  // console.log("✅ Environment variables loaded from .env");
}

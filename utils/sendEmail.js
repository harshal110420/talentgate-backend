// utils/sendEmails.js

const nodemailer = require("nodemailer");
// const logger = require("./winston"); // Your custom logger
require("dotenv").config(); // Make sure this is loaded globally too

// Create transporter with Office365 SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false, // TLS upgrade will be handled automatically
  auth: {
    user: process.env.MAIL_USER, // no-reply@dinshaws.co.in
    pass: process.env.MAIL_PASS, // Stored securely in .env
  },
});

// Default email structure
const defaultOptions = {
  from: `"Dinshaws Dairy Foods" <${process.env.MAIL_USER}>`,
  to: process.env.MAIL_USER, // fallback receiver
  subject: "Email from Dinshaw's",
  text: "This is a default email body.",
  html: "<p>This is a default email body.</p>",
};

const sendEmails = async (mailOptions = {}) => {
  const emailData = { ...defaultOptions, ...mailOptions };

  // Auto-fill HTML if not provided
  if (!emailData.html && emailData.text) {
    emailData.html = `<p>${emailData.text}</p>`;
  }

  try {
    const info = await transporter.sendMail(emailData);
    // logger.info(
    //   `✅ Mail sent to ${emailData.to} | Message ID: ${info.messageId}`
    // );
    return info;
  } catch (error) {
    // logger.error("❌ Failed to send mail:", error);
    throw error;
  }
};

module.exports = sendEmails;

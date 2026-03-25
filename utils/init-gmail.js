const nodemailer = require("nodemailer");
const logger = require("./winston");

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: "no-reply@dinshaws.co.in", // generated ethereal user
    pass: "Smtpmailonly@12", // generated ethereal password
  },
});

// send mail with defined transport object
async function sendEmails(mailOptions) {
  // check if mailOptions has all the required property, if not replace with default options
  const defaultOptions = {
    from: "Dinshaws Dairy Foods <no-reply@dinshaws.co.in>",
    to: "no-reply@dinshaws.co.in",
    cc: "",
    bcc: "",
    subject: "Email from Dinshaws website ",
    text: "Default text of email from Dinshaws website ",
  };
  const normalizedEmailOptions = { ...defaultOptions, ...mailOptions };
  normalizedEmailOptions.html = normalizedEmailOptions.text; // copy text to add html option also
  // console.log(normalizedEmailOptions);

  transporter.sendMail(normalizedEmailOptions, (error, info) => {
    if (error) {
      return logger.error(error);
    }
    return logger.info("Message sent: %s", info.messageId);
  });
}

module.exports = sendEmails;

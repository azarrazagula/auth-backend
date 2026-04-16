const nodemailer = require("nodemailer");

/**
 * Send email using Nodemailer with SendGrid transport
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const senderEmail = process.env.EMAIL_FROM || "no-reply@yourdomain.com";

  if (!apiKey) {
    console.warn("[Email] [DEV MODE] Missing SENDGRID_API_KEY. OTP will only show in terminal.");
    return { success: true, mock: true };
  }

  // Configure Nodemailer with SendGrid
  // SendGrid allows using 'apikey' as the user and the actual key as password
  const transporter = nodemailer.createTransport({
    host: "smtp.sendgrid.net",
    port: 587,
    auth: {
      user: "apikey",
      pass: apiKey,
    },
  });

  const mailOptions = {
    from: `"Auth System" <${senderEmail}>`,
    to: to,
    subject: subject,
    html: html,
  };

  try {
    console.log(`[Email] Attempting to send email to ${to} via SendGrid SMTP...`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`[Email] Success! Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] SendGrid SMTP Error: ${error.message}`);
    
    // In development mode, mock success so the flow doesn't break
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV !== "production") {
      console.warn("[Email] [NON-PROD] Mocking success despite SMTP failure.");
      if (html.includes("OTP")) {
          const otpMatch = html.match(/>(\d{6})</);
          if (otpMatch) console.log(`[Email] [DEV OTP] The code is: ${otpMatch[1]}`);
      }
      return { success: true, mock: true };
    }
    
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

module.exports = sendEmail;

const nodemailer = require('nodemailer');

/**
 * Send an email
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
  let transporter;
  const emailUser = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
  const isMock = emailUser === 'your_actual_email@gmail.com' || !emailUser;

  console.log(`[Email] isMock=${isMock}, emailUser="${emailUser}"`);

  if (isMock) {
    // Generate a mock email account for development/testing
    console.log('[Email] Creating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      connectionTimeout: 10000,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("⚠️ Using mock email service (Ethereal) because .env has placeholder credentials.");
  } else {
    // Use real credentials from .env
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  const mailOptions = {
    from: isMock ? '"Auth App" <mock@ethereal.email>' : `"Auth App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  console.log(`[Email] Sending email to ${to}...`);
  const info = await transporter.sendMail(mailOptions);
  console.log('[Email] Email sent successfully!');
  const previewUrl = isMock ? nodemailer.getTestMessageUrl(info) : null;

  if (isMock) {
    // Log the clickable link to the mock email in the terminal
    console.log("✅ Mock Email Sent! Preview URL: %s", previewUrl);
  }

  return { info, previewUrl };
};

module.exports = sendEmail;

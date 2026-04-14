const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  // Fallback to a default sender if EMAIL_FROM is not set in your .env
  const senderEmail = process.env.EMAIL_FROM || "no-reply@yourdomain.com";

  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not defined in environment variables");
  }

  const payload = {
    personalizations: [
      {
        to: [{ email: to }],
        subject: subject,
      },
    ],
    from: { email: senderEmail, name: "Auth App" },
    content: [
      {
        type: "text/html",
        value: html,
      },
    ],
  };

  try {
    console.log(`[Email] Sending SendGrid email to ${to}...`);
    // Using native fetch API to call SendGrid's v3 endpoint
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`SendGrid API Error (${response.status}): ${JSON.stringify(errorData)}`);
    }

    console.log(`[Email] Email sent successfully to ${to} via SendGrid!`);
    return { success: true };
  } catch (error) {
    console.error("[Email] CRITICAL ERROR sending email:", error.message);
    throw error;
  }
};

module.exports = sendEmail;

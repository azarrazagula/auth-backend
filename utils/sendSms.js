const axios = require("axios");

/**
 * Send a verification code using Twilio Verify API
 * This uses the Service SID (VA...) provided by the user.
 */
const sendVerifyCode = async (phoneNumber) => {
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!apiKeySid || !apiKeySecret || !serviceSid) {
    throw new Error("Twilio Verify configuration is missing in .env");
  }

  // Ensure E.164 format (adding +91 for India if no + exists)
  const formattedPhone = phoneNumber.startsWith("+")
    ? phoneNumber
    : `+91${phoneNumber}`;
  const auth = Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString("base64");

  try {
    console.log(`[Twilio Verify] Requesting code for ${formattedPhone}...`);

    const params = new URLSearchParams();
    params.append("To", formattedPhone);
    params.append("Channel", "sms");

    const response = await axios.post(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      params.toString(),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    return { success: true, sid: response.data.sid };
  } catch (error) {
    const errorData = error.response
      ? error.response.data
      : { message: error.message };
    console.error(`[Twilio Verify] Send Error: ${JSON.stringify(errorData)}`);

    // In development mode, allow fallback if account is not active
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Twilio Verify] [DEV MODE] Mocking success because API failed.",
      );
      return { success: true, mock: true };
    }

    throw new Error(errorData.message || "Failed to send verification code");
  }
};

/**
 * Check if the code entered by the user is correct using Twilio Verify API
 */
const checkVerifyCode = async (phoneNumber, code) => {
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  const formattedPhone = phoneNumber.startsWith("+")
    ? phoneNumber
    : `+91${phoneNumber}`;
  const auth = Buffer.from(`${apiKeySid}:${apiKeySecret}`).toString("base64");

  try {
    console.log(`[Twilio Verify] Checking code for ${formattedPhone}...`);

    const params = new URLSearchParams();
    params.append("To", formattedPhone);
    params.append("Code", code);

    const response = await axios.post(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      params.toString(),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    return response.data; // .status will be 'approved' if correct
  } catch (error) {
    const errorData = error.response
      ? error.response.data
      : { message: error.message };
    console.error(`[Twilio Verify] Check Error: ${JSON.stringify(errorData)}`);

    // In development mode, check for special "mock" case or just fail
    if (process.env.NODE_ENV === "development" && code === "123456") {
      return { status: "approved", mock: true };
    }

    return { status: "failed", message: errorData.message };
  }
};

module.exports = { sendVerifyCode, checkVerifyCode };

const crypto = require('crypto');

/**
 * Generate a 6-digit OTP and an expiry timestamp (10 minutes from now)
 */
const generateOtp = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return { otp, otpExpiry };
};

module.exports = generateOtp;

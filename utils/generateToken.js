const jwt = require("jsonwebtoken");

// ✅ Access Token
const generateAccessToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "1d",
  });
};

// ✅ Refresh Token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });
};

// ✅ Export correctly
module.exports = {
  generateAccessToken,
  generateRefreshToken,
};

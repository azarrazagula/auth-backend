const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect routes — verifies the JWT access token
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    if (!process.env.JWT_ACCESS_SECRET) {
      console.error('CRITICAL: JWT_ACCESS_SECRET is not defined in environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    return res.status(401).json({ 
      message: `Not authorized, token invalid or expired: ${err.message}`,
      errorType: err.name 
    });
  }
};

/**
 * Restrict access to specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      console.log(`Authorization failed for user ${req.user.email}. Role: ${req.user.role}, Required: ${roles}`);
      return res.status(403).json({
        message: `Role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };

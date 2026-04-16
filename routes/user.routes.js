const express = require("express");
const { check, validationResult } = require("express-validator");
const router = express.Router();

const {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  updateMe,
} = require("../controllers/auth.controller");

const { protect } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

// Reusable validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg).join(". ");
    return res.status(400).json({ message: errorMessages });
  }

  next();
};

/**
 * @desc Register user
 */
router.post(
  "/register",
  authLimiter,
  [
    check("firstName", "First Name is required")
      .not()
      .isEmpty()
      .trim()
      .escape(),
    check("lastName", "Last Name is required").not().isEmpty().trim().escape(),
    check("email", "Please include a valid email").isEmail().normalizeEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters",
    ).isLength({ min: 6 }),
    check("confirmPassword", "Passwords do not match").custom(
      (value, { req }) => value === req.body.password,
    ),
    check("age", "Age must be a number")
      .optional({ nullable: true })
      .isInt({ min: 18, max: 100 }),
  ],
  validate,
  register,
);

/**
 * @desc Login user
 */
router.post(
  "/login",
  authLimiter,
  [
    check("email", "Please include a valid email").isEmail().normalizeEmail(),
    check("password", "Password is required").exists(),
  ],
  validate,
  login,
);

/**
 * @desc Refresh token
 */
router.post("/refresh-token", refreshToken);

/**
 * @desc Logout
 */
router.post("/logout", protect, logout);

/**
 * @desc Forgot password (SMS OTP)
 */
router.post(
  "/forgot-password",
  authLimiter,
  [
    check("phoneNumber", "Please include a valid phone number")
      .not()
      .isEmpty()
      .trim(),
  ],
  validate,
  forgotPassword,
);

/**
 * @desc Reset password (SMS OTP)
 */
router.put(
  "/reset-password",
  [
    check("phoneNumber", "Phone number is required").not().isEmpty(),
    check("otp", "Verification code is required").not().isEmpty(),
    check(
      "password",
      "Please enter a password with 6 or more characters",
    ).isLength({ min: 6 }),
  ],
  validate,
  resetPassword,
);

/**
 * @desc Get current user profile
 */
router.get("/me", protect, getMe);

/**
 * @desc Update current user profile
 */
router.put("/me", protect, updateMe);

module.exports = router;

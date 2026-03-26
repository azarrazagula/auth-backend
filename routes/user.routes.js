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
    return res.status(400).json({ errors: errors.array() });
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
 * @desc Forgot password
 */
router.post(
  "/forgot-password",
  authLimiter,
  [check("email", "Please include a valid email").isEmail().normalizeEmail()],
  validate,
  forgotPassword,
);

/**
 * @desc Reset password
 */
router.put(
  "/reset-password/:resettoken",
  [
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

const express = require("express");
const { check, validationResult } = require("express-validator");
const router = express.Router();

const {
  adminLogin,
  adminLogout,
  adminRefreshToken,
  getAdminMe,
  adminForgotPassword,
  adminResetPassword,
  getAllUsers,
  deleteUser,
  deleteAllUsers,
} = require("../../controllers/Admin/admin.controller");

const { protect, authorize } = require("../../middleware/auth");

// Reusable validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Admin-only guard
const adminProtect = [protect, authorize("admin")];

/**
 * @desc Admin login
 */
router.post(
  "/login",
  [
    check("email", "Please include a valid email").isEmail().normalizeEmail(),
    check("password", "Password is required").exists(),
  ],
  validate,
  adminLogin,
);

/**
 * @desc Admin logout
 */
router.post("/logout", adminProtect, adminLogout);

/**
 * @desc Refresh admin token
 */
router.post("/refresh-token", adminRefreshToken);

/**
 * @desc Get current admin profile
 */
router.get("/me", adminProtect, getAdminMe);

/**
 * @desc Admin forgot password (OTP via phone number)
 */
router.post(
  "/forgot-password",
  [check("phoneNumber", "Please include a valid phone number").not().isEmpty()],
  validate,
  adminForgotPassword,
);

/**
 * @desc Admin reset password via OTP
 */
router.put(
  "/reset-password",
  [
    check("phoneNumber", "Please include a valid phone number").not().isEmpty(),
    check("otp", "Please include a valid 6-digit OTP").isLength({ min: 6, max: 6 }),
    check(
      "password",
      "Please enter a password with 6 or more characters",
    ).isLength({ min: 6 }),
  ],
  validate,
  adminResetPassword,
);

// ─── User Management ────────────────────────────────────

/**
 * @desc Get all users
 */
router.get("/users", getAllUsers);

/**
 * @desc Delete all users
 */
router.delete("/users", deleteAllUsers);

/**
 * @desc Delete user by id
 */
router.delete("/users/:id", deleteUser);

module.exports = router;

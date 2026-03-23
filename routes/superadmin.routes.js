const express = require("express");
const router = express.Router();
const {
  getAllAdmins,
  createAdmin,
  deleteAdmin,
  getSystemStats,
  getAllUsersFull,
} = require("../controllers/superadmin.controller");
const { adminLogin } = require("../controllers/admin.controller");
const { protect, authorize } = require("../middleware/auth");

/**
 * @desc Public Login for Super Admin
 */
router.post("/login", adminLogin);

/**
 * @desc Test route
 */
router.get("/test", (req, res) =>
  res.json({ message: "Superadmin routes are working!" }),
);

// Protect all routes below - Super Admin only
router.use(protect);
router.use(authorize("superadmin"));

/**
 * @desc Get all admins
 */
router.get("/admins", getAllAdmins);

/**
 * @desc Promote user to admin
 */
router.post("/admins", createAdmin);

/**
 * @desc Delete/Demote admin
 */
router.delete("/admins/:id", deleteAdmin);

/**
 * @desc Permanently delete any user
 */
router.delete("/users/:id", (req, res, next) => {
  // Alias to controllers.deleteUserFull or create it
  const { deleteUserFull } = require("../controllers/superadmin.controller");
  return deleteUserFull(req, res, next);
});

/**
 * @desc Tolerant path (matches /api/superadmin/ID)
 * Helps if frontend misses /admins or /users
 */
router.delete("/:id", deleteAdmin);

/**
 * @desc Get system statistics
 */
router.get("/stats", getSystemStats);

/**
 * @desc Get all users with full details
 */
router.get("/users", getAllUsersFull);

module.exports = router;

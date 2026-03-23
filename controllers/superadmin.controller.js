const User = require("../models/User");

/**
 * @desc    Get all admins
 * @route   GET /api/superadmin/admins
 * @access  Private (Super Admin)
 */
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select(
      "-password -confirmPassword -refreshTokens -resetPasswordToken -resetPasswordExpiry",
    );
    res.status(200).json({ success: true, count: admins.length, admins });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Promote user to admin
 * @route   POST /api/superadmin/admins
 * @access  Private (Super Admin)
 */
exports.createAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // If user exists, promote to admin
      user.role = "admin";
      await user.save({ validateBeforeSave: false });
      return res.status(200).json({
        success: true,
        message: `${user.firstName || 'User'} is now an admin`,
        admin: user,
      });
    }

    // If user doesn't exist, create a new admin
    if (!password) {
      return res.status(400).json({ message: "Password is required for new admin creation" });
    }

    const newAdmin = await User.create({
      firstName: firstName || "Admin",
      lastName: lastName || "User",
      email,
      password,
      confirmPassword: confirmPassword || password,
      role: "admin",
      isVerified: true
    });

    res.status(201).json({
      success: true,
      message: "New administrator created successfully",
      admin: newAdmin,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete/Demote admin
 * @route   DELETE /api/superadmin/admins/:id
 * @access  Private (Super Admin)
 */
exports.deleteAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (user.role !== "admin") {
      return res.status(400).json({ message: "User is not an admin" });
    }

    // You can choose to delete or just demote. Let's demote to 'user' for safety.
    user.role = "user";
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: `${user.firstName} ${user.lastName} has been demoted to user`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Permanently delete user
 * @route   DELETE /api/superadmin/users/:id
 * @access  Private (Super Admin)
 */
exports.deleteUserFull = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ success: true, message: "User permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get system statistics
 * @route   GET /api/superadmin/stats
 * @access  Private (Super Admin)
 */
exports.getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const adminCount = await User.countDocuments({ role: "admin" });
    const superAdminCount = await User.countDocuments({ role: "superadmin" });
    const regularUserCount = await User.countDocuments({ role: "user" });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        adminCount,
        superAdminCount,
        regularUserCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all users with full details
 * @route   GET /api/superadmin/users
 * @access  Private (Super Admin)
 */
exports.getAllUsersFull = async (req, res) => {
  try {
    const users = await User.find({}).select(
      "-password -confirmPassword -refreshTokens",
    );
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

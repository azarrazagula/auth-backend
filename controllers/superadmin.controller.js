const User = require("../models/User");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");

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
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      phoneNumber,
      age,
      dateOfBirth,
    } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });

    // Helper to parse DOB (handles DD.MM.YYYY)
    let parsedDOB = null;
    if (dateOfBirth) {
      const parts = String(dateOfBirth).split(".");
      if (parts.length === 3) {
        parsedDOB = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        parsedDOB = new Date(dateOfBirth);
      }
    }

    if (user) {
      // If user exists, promote to admin and update additional details
      user.role = "admin";
      if (phoneNumber) user.phoneNumber = phoneNumber;
      if (age) user.age = age;
      if (parsedDOB) user.dateOfBirth = parsedDOB;
      await user.save({ validateBeforeSave: false });
      return res.status(200).json({
        success: true,
        message: `${user.firstName || "User"} is now an admin`,
        admin: user,
      });
    }

    // If user doesn't exist, create a new admin
    if (!password) {
      return res
        .status(400)
        .json({ message: "Password is required for new admin creation" });
    }

    const newAdmin = await User.create({
      firstName: firstName || "Admin",
      lastName: lastName || "User",
      email,
      password,
      confirmPassword: confirmPassword || password,
      phoneNumber,
      age,
      dateOfBirth: parsedDOB,
      role: "admin",
      isVerified: true,
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

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `${user.firstName || "Admin"} has been permanently deleted from the system`,
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
    res
      .status(200)
      .json({ success: true, message: "User permanently deleted" });
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
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const verifiedUsers = await User.countDocuments({
      role: "user",
      isVerified: true,
    });

    // Calculate login percentage (users who have at least one recorded login)
    const loggedInCount = await User.countDocuments({
      lastLogin: { $ne: null },
    });
    const loginPercentage =
      totalUsers > 0
        ? `${Math.round((loggedInCount / totalUsers) * 100)}%`
        : "0%";

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalAdmins,
        verifiedUsers,
        loginPercentage,
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
    const users = await User.find({ role: "user" }).select(
      "-password -confirmPassword -refreshTokens",
    );
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Superadmin request password reset
 * @route   POST /api/superadmin/forgot-password
 * @access  Public
 */
exports.superAdminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Enforce generic response to prevent email enumeration
    const genericResponse = {
      success: true,
      message:
        "If an account matching that email exists and has Superadmin privileges, a password reset link has been sent.",
    };

    if (!user || user.role !== "superadmin") {
      // Delay to mitigate timing attacks compared to a successful lookup
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 500 + 500),
      );
      return res.status(200).json(genericResponse);
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save({ validateBeforeSave: false });

    // Send email with unhashed token
    // In development, use LOCAL_ADMIN_URL so mock email links open localhost
    const adminUrl =
      process.env.NODE_ENV === "development"
        ? process.env.LOCAL_ADMIN_URL || "http://localhost:3001"
        : process.env.CLIENT_ADMIN_URL;
    const resetUrl = `${adminUrl}/superadmin/reset-password/${resetToken}`;

    const message = `
      <h1>Superadmin Password Reset Request</h1>
      <p>You have requested to reset your Superadmin password.</p>
      <p>Please click the link below to reset your password. This link is valid for 15 minutes.</p>
      <a href="${resetUrl}" clicktracking="off">${resetUrl}</a>
      <p>If you did not make this request, please ignore this email.</p>
    `;

    try {
      const emailResult = await sendEmail({
        to: user.email,
        subject: "Superadmin Password Reset",
        html: message,
      });

      res.status(200).json({
        ...genericResponse,
        previewUrl: emailResult.previewUrl,
      });
    } catch (err) {
      console.error("FORGOT PASSWORD EMAIL ERROR:", err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ 
        message: "Email could not be sent",
        error: err.message,
        details: err.code || "No error code"
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Superadmin reset password
 * @route   PUT /api/superadmin/reset-password/:token
 * @access  Public
 */
exports.superAdminResetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpiry: { $gt: Date.now() },
    }).select("+refreshTokens");

    if (!user || user.role !== "superadmin") {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = password;
    user.confirmPassword = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;

    // Invalidate all existing refresh tokens for security
    user.refreshTokens = [];

    await user.save();

    res.status(200).json({
      success: true,
      message: "Superadmin password updated successfully. Please log in.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Superadmin direct reset password (Tokenless)
 * @route   PUT /api/superadmin/reset-password/
 * @access  Public
 */
exports.superAdminDirectResetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findOne({ role: "superadmin" }).select(
      "+refreshTokens",
    );

    if (!user) {
      return res.status(404).json({ message: "Superadmin not found" });
    }

    user.password = password;
    user.confirmPassword = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;

    user.refreshTokens = [];

    await user.save();

    res.status(200).json({
      success: true,
      message: "Superadmin password updated successfully. Please log in.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/**
 * @desc    Superadmin login
 * @route   POST /api/superadmin/login
 * @access  Public
 */
exports.superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Must select refreshTokens because they are select: false in the model
    const user = await User.findOne({ email }).select(
      "+password +refreshTokens",
    );

    if (!user || user.role !== "superadmin") {
      return res
        .status(401)
        .json({ message: "Invalid credentials or unauthorized" });
    }

    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last login
    user.lastLogin = Date.now();

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to DB
    if (!user.refreshTokens) user.refreshTokens = [];
    user.refreshTokens.push(refreshToken);
    await user.save({ validateBeforeSave: false });

    res
      .status(200)
      .cookie("sa_refreshToken", refreshToken, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      })
      .json({
        success: true,
        accessToken,
        user: {
          id: user._id,
          name: user.name || `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
        },
      });
  } catch (error) {
    console.error("SUPERADMIN LOGIN ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

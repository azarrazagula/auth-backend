const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");

/**
 * Helper: send token response with httpOnly cookie
 */
const sendTokenResponse = (user, statusCode, res) => {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  if (!user.refreshTokens) user.refreshTokens = [];
  user.refreshTokens.push(refreshToken);
  user.save({ validateBeforeSave: false });

  res
    .status(statusCode)
    .cookie("adminRefreshToken", refreshToken, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    })
    .json({
      success: true,
      accessToken,
      admin: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
};

/**
 * @desc    Admin login
 * @route   POST /api/admin/login
 * @access  Public
 */
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select(
      "+password +refreshTokens",
    );

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Admin logout
 * @route   POST /api/admin/logout
 * @access  Private (Admin)
 */
exports.adminLogout = async (req, res) => {
  try {
    const refreshToken = req.cookies.adminRefreshToken;

    if (refreshToken && req.user) {
      const user = await User.findById(req.user.id).select("+refreshTokens");
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(
          (t) => t !== refreshToken,
        );
        await user.save({ validateBeforeSave: false });
      }
    }

    res.clearCookie("adminRefreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res
      .status(200)
      .json({ success: true, message: "Admin logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Refresh admin access token
 * @route   POST /api/admin/refresh-token
 * @access  Public
 */
exports.adminRefreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.adminRefreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select("+refreshTokens");

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    // Rotate token
    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshTokens.push(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    res
      .status(200)
      .cookie("adminRefreshToken", newRefreshToken, {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      })
      .json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Invalid or expired refresh token" });
  }
};

/**
 * @desc    Get current admin profile
 * @route   GET /api/admin/me
 * @access  Private (Admin)
 */
exports.getAdminMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Admin not found" });
    res.status(200).json({ success: true, admin: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Admin forgot password
 * @route   POST /api/admin/forgot-password
 * @access  Public
 */
exports.adminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ message: "There is no admin with that email" });
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    // In local development, we return the token directly in the response
    res.status(200).json({
      success: true,
      message: "Password reset token generated",
      resetToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Admin reset password
 * @route   PUT /api/admin/reset-password/:resettoken
 * @access  Public
 */
exports.adminResetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resettoken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    user.password = password;
    user.confirmPassword = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;

    // Invalidate all existing refresh tokens
    user.refreshTokens = [];

    await user.save();

    res.status(200).json({
      success: true,
      message: "Admin password updated successfully. Please log in.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Public
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select(
      "-password -confirmPassword -refreshTokens -resetPasswordToken -resetPasswordExpiry",
    );
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete user by ID
 * @route   DELETE /api/admin/users/:id
 * @access  Public
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete ALL users
 * @route   DELETE /api/admin/users
 * @access  Public
 */
exports.deleteAllUsers = async (req, res) => {
  try {
    await User.deleteMany({});
    res.status(200).json({ success: true, message: "All users deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

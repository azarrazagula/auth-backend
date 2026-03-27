const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const UserBillingDetails = require("../../models/UserBillingDetails");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/generateToken");
const generateOtp = require("../../utils/generateOtp");

/**
 * Helper: send token response with httpOnly cookie
 */
const sendTokenResponse = (user, statusCode, res) => {
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets are not defined in environment variables");
  }

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
        phoneNumber: user.phoneNumber,
        age: user.age,
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

    // Update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

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

    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error("JWT_REFRESH_SECRET is undefined");
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
    const { phoneNumber } = req.body;

    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res
        .status(404)
        .json({ message: "There is no admin with that phone number" });
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    // Generate 6-digit OTP
    const { otp, otpExpiry } = generateOtp();

    // Save to user (don't validate before save)
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save({ validateBeforeSave: false });

    // In a real application, you'd send this OTP via SMS here.
    console.log(`[OTP GENERATED] Admin OTP for ${phoneNumber} is: ${otp}`);

    res.status(200).json({
      success: true,
      message: "OTP sent to your phone number",
      // Dev mode: returning OTP directly to test it. Remove in production!
      otp, 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Admin reset password via OTP
 * @route   PUT /api/admin/reset-password
 * @access  Public
 */
exports.adminResetPassword = async (req, res) => {
  try {
    const { phoneNumber, otp, password } = req.body;

    const user = await User.findOne({
      phoneNumber,
      otp,
      otpExpiry: { $gt: Date.now() },
    }).select("+otp +otpExpiry +refreshTokens");

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    // Reset password and clear OTP fields
    user.password = password;
    user.confirmPassword = password;
    user.otp = undefined;
    user.otpExpiry = undefined;

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
    const users = await User.find({ role: "user" }).sort({ createdAt: -1 }).select(
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
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Protection: Prevent deleting admins or superadmins through this route
    if (user.role !== "user") {
      return res.status(403).json({ 
        message: "Access denied. Cannot delete Administrators from the standard user route." 
      });
    }

    await User.findByIdAndDelete(req.params.id);
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

/**
 * @desc    Get ALL users billing details
 * @route   GET /api/admin/billing
 * @access  Private (Admin)
 */
exports.getAllBillingDetails = async (req, res) => {
  try {
    const billingDetails = await UserBillingDetails.find({})
      .populate("user", "firstName lastName email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: billingDetails.length,
      data: billingDetails,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get billing details for a specific user by ID
 * @route   GET /api/admin/billing/:userId
 * @access  Private (Admin)
 */
exports.getUserBillingById = async (req, res) => {
  try {
    const billingDetails = await UserBillingDetails.findOne({
      user: req.params.userId,
    }).populate("user", "firstName lastName email role");

    if (!billingDetails) {
      return res.status(404).json({
        success: false,
        message: "No billing details found for this user",
      });
    }

    res.status(200).json({ success: true, data: billingDetails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

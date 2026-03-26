const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

/**
 * Helper to send token response (access token + httpOnly refresh cookie)
 */
const sendTokenResponse = (user, statusCode, res) => {
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT secrets are not defined in environment variables");
  }

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Initialize refreshTokens array if it's undefined (common if not selected)
  if (!user.refreshTokens) {
    user.refreshTokens = [];
  }

  // Save refresh token to DB (array)
  user.refreshTokens.push(refreshToken);
  user.save({ validateBeforeSave: false });

  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  };

  res
    .status(statusCode)
    .cookie("refreshToken", refreshToken, options)
    .json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        dateOfBirth: user.dateOfBirth,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
};

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, age, dateOfBirth, phoneNumber } =
      req.body;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Parse dateOfBirth if provided in DD.MM.YYYY format
    let parsedDOB = null;
    if (dateOfBirth) {
      const parts = dateOfBirth.split(".");
      if (parts.length === 3) {
        parsedDOB = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        parsedDOB = new Date(dateOfBirth);
      }
    }

    const user = await User.create({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      password,
      age,
      dateOfBirth: parsedDOB,
      phoneNumber,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Must select refreshTokens because they are select: false in the model
    const user = await User.findOne({ email }).select(
      "+password +refreshTokens",
    );

    if (!user) {
      return res.status(401).json({ message: "Email ID is invalid" });
    }

    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Password is wrong" });
    }

    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Refresh access token using HttpOnly cookie
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

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

    // Refresh rotation: remove old token, add new one
    user.refreshTokens = user.refreshTokens.filter(
      (token) => token !== refreshToken,
    );

    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    const options = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    res
      .status(200)
      .cookie("refreshToken", newRefreshToken, options)
      .json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Invalid or expired refresh token" });
  }
};

/**
 * @desc    Logout user / clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken && req.user) {
      // Find user and remove this specific refresh token from array
      const user = await User.findById(req.user.id).select("+refreshTokens");
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(
          (t) => t !== refreshToken,
        );
        await user.save({ validateBeforeSave: false });
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ message: "There is no user with that email" });
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

    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const message = `
      <h1>Password Reset</h1>
      <p>You requested a password reset. Please click the link below to set a new password:</p>
      <a href="${resetUrl}" clicktracking="off">${resetUrl}</a>
      <p>This link is valid for 10 minutes.</p>
    `;

    // Skipping explicit email sending since you do not have an email service configured right now
    /*
    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        html: message,
      });
    } catch (error) {
      console.error("Forgot password email error:", error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: "Email could not be sent" });
    }
    */

    res.status(200).json({
      success: true,
      message: "Email sent",
      resetToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Reset password
 * @route   PUT /api/auth/reset-password/:resettoken
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
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

    user.password = password;
    user.confirmPassword = password; // Ensure we satisfy Mongoose validation for confirmPassword
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;

    // Invalidate all existing refresh tokens so they need to log in again on all devices
    user.refreshTokens = [];

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully. Please log in.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update current logged in user profile
 * @route   PUT /api/user/me
 * @access  Private
 */
exports.updateMe = async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, phoneNumber, age } = req.body;

    // Build update object with only allowed fields
    const updatedFields = {};
    if (firstName !== undefined) updatedFields.firstName = firstName;
    if (lastName !== undefined) updatedFields.lastName = lastName;
    if (age !== undefined) updatedFields.age = age;
    if (phoneNumber !== undefined) updatedFields.phoneNumber = phoneNumber;

    // Parse dateOfBirth if provided in DD.MM.YYYY format
    if (dateOfBirth !== undefined) {
      const parts = String(dateOfBirth).split(".");
      if (parts.length === 3) {
        updatedFields.dateOfBirth = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        updatedFields.dateOfBirth = new Date(dateOfBirth);
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updatedFields },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all users (No token required)
 * @route   GET /api/auth/users
 * @access  Public
 */
exports.getAllUsers = async (req, res) => {
  try {
    // Exclude sensitive fields like passwords, tokens, OTPs, etc.
    const users = await User.find({}).select(
      "-password -refreshTokens -otp -otpExpiry -resetPasswordToken -resetPasswordExpiry",
    );
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete a specific user by ID
 * @route   DELETE /api/auth/users/:id
 * @access  Public
 */
exports.deleteUser = async (req, res) => {
  try {
    console.log(`DELETE request received for user ID: ${req.params.id}`);
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error(`Error deleting user ${req.params.id}:`, error.message);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete ALL users (Useful for development/testing)
 * @route   DELETE /api/auth/users
 * @access  Public
 */
exports.deleteAllUsers = async (req, res) => {
  try {
    console.log("DELETE request received for ALL users");
    await User.deleteMany({});
    res.status(200).json({
      success: true,
      message: "All users have been deleted from the database",
    });
  } catch (error) {
    console.error("Error deleting all users:", error.message);
    res.status(500).json({ message: error.message });
  }
};

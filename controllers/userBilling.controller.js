const UserBillingDetails = require("../models/UserBillingDetails");

/**
 * @desc    Get logged in user's billing details
 * @route   GET /api/billing
 * @access  Private
 */
exports.getBillingDetails = async (req, res) => {
  try {
    const billingDetails = await UserBillingDetails.findOne({
      user: req.user.id,
    });

    if (!billingDetails) {
      return res.status(404).json({
        success: false,
        message: "No billing details found for this user",
      });
    }

    res.status(200).json({
      success: true,
      data: billingDetails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Create or update user billing details
 * @route   POST /api/billing
 * @access  Private
 */
exports.saveBillingDetails = async (req, res) => {
  try {
    const {
      fullName,
      email,
      address,
      city,
      state,
      zipCode,
      country,
      paymentMethod,
    } = req.body;

    // Fields to be saved
    const billingFields = {
      user: req.user.id,
      fullName,
      email,
      address,
      city,
      state,
      zipCode,
      country,
      paymentMethod: paymentMethod || "credit_card",
    };

    let billingDetails = await UserBillingDetails.findOne({
      user: req.user.id,
    });

    if (billingDetails) {
      // Update existing
      billingDetails = await UserBillingDetails.findOneAndUpdate(
        { user: req.user.id },
        { $set: billingFields },
        { new: true, runValidators: true }
      );
      
      return res.status(200).json({
        success: true,
        message: "Billing details updated successfully",
        data: billingDetails,
      });
    }

    // Create new
    billingDetails = await UserBillingDetails.create(billingFields);
    res.status(201).json({
      success: true,
      message: "Billing details saved successfully",
      data: billingDetails,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Delete user billing details
 * @route   DELETE /api/billing
 * @access  Private
 */
exports.deleteBillingDetails = async (req, res) => {
  try {
    const billingDetails = await UserBillingDetails.findOneAndDelete({
      user: req.user.id,
    });

    if (!billingDetails) {
      return res.status(404).json({
        success: false,
        message: "No billing details found to delete",
      });
    }

    res.status(200).json({
      success: true,
      message: "Billing details deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Get ALL billing details (for internal use or superadmin-level access via user routes)
 * @route   GET /api/billing/all
 * @access  Private
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

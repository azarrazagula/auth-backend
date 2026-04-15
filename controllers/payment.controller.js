const crypto = require("crypto");
const Payment = require("../models/Payment");
const razorpay = require("../config/razorpay");

// ─────────────────────────────────────────────────────────────
// @desc    Create a Payment Order
// @route   POST /api/payment/create-order
// @access  Private (logged-in user)
// ─────────────────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const {
      amount,
      currency = "INR",
      description = "Food Order",
      metadata = {},
    } = req.body;

    // Validate amount
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "A valid amount is required (in paise). Example: ₹499 → send 49900",
      });
    }

    // Create real order via Razorpay SDK
    const options = {
      amount: Math.round(Number(amount)),
      currency,
      receipt: `rcpt_${Date.now()}_${req.user.id.toString().slice(-6)}`,
    };

    const order = await razorpay.orders.create(options);

    // Save as "created" in MongoDB
    const payment = await Payment.create({
      user: req.user.id,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: "created",
      description,
      metadata,
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID, // Frontend needs this!
        description,
        paymentRecordId: payment._id,
      },
    });
  } catch (error) {
    console.error("RAZORPAY CREATE ORDER ERROR:", {
      message: error.message,
      code: error.code,
      description: error.description,
      metadata: error.metadata
    });
    res.status(500).json({ 
      success: false, 
      message: error.description || error.message || "Failed to create Razorpay order" 
    });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Simulate paying (LEGACY MOCK - No longer needed in live)
// ─────────────────────────────────────────────────────────────
exports.mockPay = async (req, res) => {
  res.status(410).json({ 
    success: false, 
    message: "Mock payment is disabled. Use the real Razorpay checkout frontend." 
  });
};

// ─────────────────────────────────────────────────────────────
// @desc    Verify payment signature & mark as paid
// @route   POST /api/payment/verify
// @access  Private (logged-in user)
// ─────────────────────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentMethod,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing required Razorpay verification fields",
      });
    }

    // Official verification logic
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: "failed" }
      );
      return res.status(400).json({
        success: false,
        message: "Crucial! Payment verification failed. Invalid signature.",
      });
    }

    // Mark as paid in MongoDB
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "paid",
        paymentMethod: paymentMethod || "UPI/Card",
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment verified successfully ✅",
      data: payment,
    });
  } catch (error) {
    console.error("verifyPayment Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get current user's payment history
// @route   GET /api/payment/history
// @access  Private
// ─────────────────────────────────────────────────────────────
exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select("-razorpaySignature");

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get ALL payments — Admin / Superadmin
// @route   GET /api/payment/all
// @access  Private (admin, superadmin)
// ─────────────────────────────────────────────────────────────
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate("user", "firstName lastName email role")
      .sort({ createdAt: -1 });

    const totalRevenuePaise = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      count: payments.length,
      totalRevenue: `₹${(totalRevenuePaise / 100).toFixed(2)}`,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

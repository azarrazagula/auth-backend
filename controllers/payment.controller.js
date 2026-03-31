const crypto = require("crypto");
const Payment = require("../models/Payment");

/**
 * Simulates a payment gateway without any external API.
 * Generates realistic order IDs and payment IDs just like Razorpay would.
 * When you have real Razorpay/Stripe keys, only this helper section changes.
 */
const mockGateway = {
  // Simulate creating a payment order
  createOrder: ({ amount, currency, receipt, description }) => {
    return {
      id: "order_mock_" + crypto.randomBytes(8).toString("hex"),
      amount,
      currency,
      receipt,
      description,
      status: "created",
    };
  },

  // Simulate a payment being processed
  processPayment: (orderId) => {
    // In test mode: always succeed
    // Return same shape as Razorpay payment response
    const paymentId = "pay_mock_" + crypto.randomBytes(8).toString("hex");
    const body = orderId + "|" + paymentId;
    const signature = crypto
      .createHmac("sha256", "mock_secret_key")
      .update(body)
      .digest("hex");
    return { paymentId, signature };
  },

  // Verify the signature (mirrors how Razorpay verification works)
  verifySignature: ({ orderId, paymentId, signature }) => {
    const body = orderId + "|" + paymentId;
    const expected = crypto
      .createHmac("sha256", "mock_secret_key")
      .update(body)
      .digest("hex");
    return expected === signature;
  },
};

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

    // Create order via mock gateway
    const order = mockGateway.createOrder({
      amount: Math.round(Number(amount)),
      currency,
      receipt: `receipt_${Date.now()}_${req.user.id}`,
      description,
    });

    // --- LIVE MODE (swap comment when you have Razorpay keys) ---
    // const order = await razorpay.orders.create({ amount, currency, receipt });

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
      message: "Order created. Proceed to payment.",
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        description,
        paymentRecordId: payment._id,
        // In live mode you'd also return: keyId (Razorpay publishable key)
      },
    });
  } catch (error) {
    console.error("createOrder Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Simulate paying for an order (test/mock mode only)
// @route   POST /api/payment/pay (mock only — not needed in live mode)
// @access  Private (logged-in user)
// ─────────────────────────────────────────────────────────────
exports.mockPay = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required",
      });
    }

    // Check order exists in DB
    const existing = await Payment.findOne({ razorpayOrderId: orderId });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (existing.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "This order is already paid",
      });
    }

    // Simulate gateway processing
    const { paymentId, signature } = mockGateway.processPayment(orderId);

    // Return what the frontend would normally receive from Razorpay checkout
    res.status(200).json({
      success: true,
      message:
        "Mock payment processed. Send these to POST /api/payment/verify to confirm.",
      data: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      },
    });
  } catch (error) {
    console.error("mockPay Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
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
        message:
          "razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required",
      });
    }

    // Verify signature (mock or real — same call shape)
    const isValid = mockGateway.verifySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    // --- LIVE MODE (swap comment when you have Razorpay keys) ---
    // const body = razorpay_order_id + "|" + razorpay_payment_id;
    // const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body).digest("hex");
    // const isValid = expected === razorpay_signature;

    if (!isValid) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: "failed" }
      );
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature.",
      });
    }

    // Mark as paid in MongoDB
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "paid",
        paymentMethod: paymentMethod || "Card",
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
      message: "Payment verified and confirmed ✅",
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

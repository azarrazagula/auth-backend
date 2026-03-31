const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Razorpay Order ID (created on backend before payment)
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    // Razorpay Payment ID (returned after successful payment)
    razorpayPaymentId: {
      type: String,
      default: null,
    },

    // Razorpay Signature (used for verification)
    razorpaySignature: {
      type: String,
      default: null,
    },

    // Amount in paise (100 paise = ₹1)
    // e.g. ₹499 = 49900 paise
    amount: {
      type: Number,
      required: true,
    },

    // Currency (default: INR)
    currency: {
      type: String,
      default: "INR",
    },

    // Payment status
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },

    // Optional: what this payment is for (e.g. "Food Order", "Subscription")
    description: {
      type: String,
      default: "Food Order",
    },

    // Optional: extra info like food items, billing address, etc.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Payment method used (Card, PayPal, Apple, GPay, etc.)
    paymentMethod: {
      type: String,
      default: "Card",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);

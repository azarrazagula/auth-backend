const express = require("express");
const router = express.Router();

const {
  createOrder,
  mockPay,
  verifyPayment,
  getPaymentHistory,
  getAllPayments,
} = require("../controllers/payment.controller");

const { protect, authorize } = require("../middleware/auth");

// All routes require a logged-in user
router.use(protect);

/**
 * STEP 1 — Create a payment order
 * POST /api/payment/create-order
 * Body: { amount (in paise), currency?, description?, metadata? }
 * Example: ₹499 → amount: 49900
 */
router.post("/create-order", createOrder);

/**
 * STEP 2 (MOCK/TEST ONLY) — Simulate paying
 * POST /api/payment/mock-pay
 * Body: { orderId }
 * Returns the 3 verification fields (razorpay_order_id, razorpay_payment_id, razorpay_signature)
 * In live mode: this step is done by Razorpay's checkout popup on the frontend
 */
router.post("/mock-pay", mockPay);

/**
 * STEP 3 — Verify payment & mark as paid in DB
 * POST /api/payment/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
router.post("/verify", verifyPayment);

/**
 * GET /api/payment/history
 * Returns the logged-in user's payment history
 */
router.get("/history", getPaymentHistory);

/**
 * GET /api/payment/all
 * Admin & Superadmin only — all payments with user details + total revenue
 */
router.get("/all", authorize("admin", "superadmin"), getAllPayments);

module.exports = router;

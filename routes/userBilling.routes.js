const express = require("express");
const router = express.Router();

const {
  getBillingDetails,
  saveBillingDetails,
  deleteBillingDetails,
  getAllBillingDetails,
} = require("../controllers/userBilling.controller");

// Auth Middleware
const { protect } = require("../middleware/auth");

// All routes here should be protected (require a user to be logged in)
router.use(protect);

// GET all billing details (all users) - useful for reporting
router.get("/getallbillingdetails", getAllBillingDetails);

// GET, POST, DELETE own billing details
router
  .route("/")
  .get(getBillingDetails)
  .post(saveBillingDetails)
  .delete(deleteBillingDetails);

module.exports = router;

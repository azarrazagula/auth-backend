const express = require("express");
const router = express.Router();
const {
  addFoodItem,
  removeFoodItem,
  getAllFoodItems,
} = require("../../controllers/Admin/food.controller");
const { protect, authorize } = require("../../middleware/auth");

// Public route to see food
router.get("/", getAllFoodItems);

// Admin only routes
router.use(protect);
router.use(authorize("admin", "superadmin"));

router.post("/", addFoodItem);
router.delete("/:id", removeFoodItem);

module.exports = router;

const Food = require("../../models/Food");

// @desc    Add new food item
// @route   POST /api/admin/food
// @access  Private (Admin)
exports.addFoodItem = async (req, res) => {
  try {
    const { name, description, price, category, image } = req.body;

    if (!name || !description || !price || !category) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    const food = await Food.create({
      name,
      description,
      price,
      category,
      image,
    });

    res.status(201).json({
      success: true,
      message: "Food item added successfully",
      data: food,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove food item
// @route   DELETE /api/admin/food/:id
// @access  Private (Admin)
exports.removeFoodItem = async (req, res) => {
  try {
    const food = await Food.findByIdAndDelete(req.params.id);

    if (!food) {
      return res.status(404).json({ success: false, message: "Food item not found" });
    }

    res.status(200).json({
      success: true,
      message: "Food item removed successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all food items
// @route   GET /api/food
// @access  Public
exports.getAllFoodItems = async (req, res) => {
  try {
    const foods = await Food.find();
    res.status(200).json({
      success: true,
      count: foods.length,
      data: foods,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

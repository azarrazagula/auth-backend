const mongoose = require('mongoose');
const Food = require('./models/Food');
require('dotenv').config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/auth-system');
    console.log('Connected to MongoDB');

    const sampleFood = {
      name: "Classic Cheeseburger",
      description: "A delicious classic cheeseburger with lettuce, tomato, and our secret sauce.",
      price: 12.99,
      category: "Burgers",
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80",
      isAvailable: true
    };

    const existing = await Food.findOne({ name: sampleFood.name });
    if (existing) {
      console.log('Sample food already exists');
    } else {
      await Food.create(sampleFood);
      console.log('Sample food created successfully');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error seeding:', err);
    process.exit(1);
  }
};

seed();

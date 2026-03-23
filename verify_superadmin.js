require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function verify() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/auth-db");
    console.log("Connected to MongoDB");

    // 1. Create a test superadmin if not exists
    const email = "superadmin@example.com";
    let superAdmin = await User.findOne({ email });

    if (!superAdmin) {
      superAdmin = await User.create({
        firstName: "Super",
        lastName: "Admin",
        email: email,
        password: "password123",
        confirmPassword: "password123",
        role: "superadmin",
        isVerified: true
      });
      console.log("Created test superadmin");
    } else {
      superAdmin.role = "superadmin";
      await superAdmin.save();
      console.log("Ensured test user is superadmin");
    }

    // 2. Create a test user to promote
    const userEmail = "testuser@example.com";
    let testUser = await User.findOne({ email: userEmail });
    if (!testUser) {
      testUser = await User.create({
        firstName: "Test",
        lastName: "User",
        email: userEmail,
        password: "password123",
        confirmPassword: "password123",
        role: "user",
        isVerified: true
      });
      console.log("Created test user");
    }

    console.log("Verification data prepared.");
    console.log("Superadmin ID:", superAdmin._id);
    console.log("Test User ID:", testUser._id);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verify();

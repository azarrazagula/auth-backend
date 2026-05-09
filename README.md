# DUMA Backend - Secure Auth & Management API

The robust Node.js/Express backend powering the DUMA Admin Panel. This API handles authentication, user management, product catalogs, and payment gateway integrations.

[![Status](https://img.shields.io/badge/Status-Complete-brightgreen)](#)
[![Node](https://img.shields.io/badge/Node.js-18+-6DA55F)](#)
[![Express](https://img.shields.io/badge/Express-5.0-000000)](#)
[![Database](https://img.shields.io/badge/MongoDB-Atlas-47A248)](#)

---

## 🛠️ Key Features

- **Robust Authentication**: JWT-based auth with secure cookie handling and bcrypt password hashing.
- **Role-Based Access Control (RBAC)**: Distinct permissions for Users, Admins, and SuperAdmins.
- **Payment Integration**: Seamless **Razorpay** gateway integration for processing transactions.
- **Image Management**: Integrated with **Cloudinary** for scalable, persistent image hosting.
- **Security Middleware**: Implements `helmet`, `cors`, `express-rate-limit`, and `express-validator` for API hardening.
- **Admin Utilities**: Built-in scripts for superadmin verification and administrator account creation.

---

## 🚀 Step-by-Step Implementation

1.  **API Architecture**: Designed a modular structure with separate Controllers, Routes, Models, and Middleware.
2.  **Database Design**: Implemented Mongoose schemas for Users, Products, Categories, and Orders with proper indexing.
3.  **Authentication Flow**: Developed custom JWT strategies and middleware (`auth.js`, `adminAuth.js`) to protect sensitive endpoints.
4.  **Security Hardening**: Integrated rate limiting to prevent Brute Force attacks and Helmet for secure HTTP headers.
5.  **Service Integration**:
    - **Razorpay**: Set up order creation and verification endpoints.
    - **Cloudinary**: Configured storage engines for product image uploads.
    - **Nodemailer**: Integrated for automated email notifications and password resets.
6.  **Administrative Tools**: Created CLI scripts (`make_admin.js`, `verify_superadmin.js`) for system maintenance.

---

## 📦 Project Structure

```text
├── config/             # Database & Service configurations
├── controllers/        # Business logic for routes
├── models/             # Mongoose schemas (User, Product, etc.)
├── routes/             # API endpoint definitions
├── middleware/         # Auth, Validation & Security logic
├── utils/              # Helper functions (email, cloudinary)
└── server.js           # Express application entry point
```

---

## ⚙️ Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/azarrazagula/auth-backend.git
   cd auth-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file and fill in the following:
   ```env
   PORT=5001
   MONGODB_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_jwt_secret
   RAZORPAY_KEY_ID=your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   CLOUDINARY_CLOUD_NAME=your_name
   CLOUDINARY_API_KEY=your_key
   CLOUDINARY_API_SECRET=your_secret
   EMAIL_USER=your_email
   EMAIL_PASS=your_app_password
   ```

4. **Run the server**:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

---

## 📄 License

This project is licensed under the ISC License.

---
*Built for the DUMA Ecosystem.*

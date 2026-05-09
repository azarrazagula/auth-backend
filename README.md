# Auth Backend - Secure Auth & Management API

The robust Node.js/Express backend powering the Food App Admin Panel. This API handles authentication, user management, food catalogs, and payment gateway integrations.

[![Status](https://img.shields.io/badge/Status-Complete-brightgreen)](#)
[![Node](https://img.shields.io/badge/Node.js-18+-6DA55F)](#)
[![Express](https://img.shields.io/badge/Express-5.0-000000)](#)
[![Database](https://img.shields.io/badge/MongoDB-Atlas-47A248)](#)

---

## 🛠️ Key Features

- **Robust Authentication**: Dual-token JWT system (Access & Refresh) with secure cookie handling.
- **Role-Based Access Control (RBAC)**: Specific logic for Users, Admins, and SuperAdmins.
- **Service Integrations**:
  - **Razorpay**: Secure payment gateway for processing transactions.
  - **SendGrid**: Email services for notifications and account verification.
  - **Twilio**: SMS and Verify services for identity management.
- **Security Middleware**: Implements `helmet`, `cors`, `express-rate-limit`, and `express-validator`.
- **Maintenance Tools**: Built-in scripts for superadmin verification and database seeding.

---

## 🚀 Step-by-Step Implementation

1.  **API Architecture**: Designed a modular structure with separate Controllers, Routes, Models, and Middleware.
2.  **Database Design**: Implemented Mongoose schemas for Users, Food Items, Billing, and Payments.
3.  **Authentication Flow**: Developed JWT strategies with high-security secret rotation and expiry management.
4.  **Security Hardening**: Integrated rate limiting to prevent brute-force attacks and Helmet for secure HTTP headers.
5.  **Multi-Service Integration**:
    - **Payments**: Set up Razorpay order creation and verification.
    - **Communications**: Integrated SendGrid for email and Twilio for secure messaging.
6.  **Administrative Utilities**: Created CLI scripts for initializing superadmin accounts and resetting system states.

---

## 📦 Project Structure

```text
├── config/             # Database & Service configurations
├── controllers/        # Business logic (Auth, Payment, SuperAdmin)
├── models/             # Mongoose schemas
├── routes/             # API endpoint definitions (Admin, Food, User)
├── middleware/         # Security, Auth & Rate limiting
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
   MONGO_URI=your_mongodb_uri
   JWT_ACCESS_SECRET=your_access_secret
   JWT_REFRESH_SECRET=your_refresh_secret
   SENDGRID_API_KEY=your_sendgrid_key
   EMAIL_FROM=your_email
   RAZORPAY_KEY_ID=your_razorpay_id
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_API_KEY_SID=your_twilio_key_id
   TWILIO_API_KEY_SECRET=your_twilio_key_secret
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

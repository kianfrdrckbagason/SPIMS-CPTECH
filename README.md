# 🔧 SPIMS - Spare Parts Inventory Management System

> A full-stack MERN web application designed to modernize and simplify spare parts inventory management for organizations currently using manual or spreadsheet-based inventory tracking.

---

## 📖 Overview

SPIMS (Spare Parts Inventory Management System) is a web-based inventory management solution developed using the **MERN Stack (MongoDB, Express.js, React, Node.js)**.

The primary goal of the system is to provide an efficient, secure, and user-friendly platform for managing spare parts inventory, stock movement, inventory adjustments, reporting, and user access.

This project is currently under active development.

---

# 🎯 Project Objectives

The system aims to:

- Replace manual inventory monitoring using spreadsheets.
- Provide accurate real-time inventory tracking.
- Record every inventory transaction.
- Improve inventory visibility and accountability.
- Generate inventory reports.
- Manage user authentication and authorization.
- Support future deployment within a company network.

---

# 🚀 Tech Stack

## Frontend

- React 19
- Vite
- React Router DOM
- Axios
- React Icons
- React Toastify
- SweetAlert2
- Day.js
- Material UI (MUI)

---

## Backend

- Node.js
- Express.js 5
- MongoDB
- Mongoose
- JWT Authentication
- bcrypt
- dotenv
- helmet
- cors
- cookie-parser
- multer
- morgan

---

# 📁 Project Structure

```
SPIMS
│
├── client/                 # React Frontend
│
├── server/                 # Express Backend
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   │
│   └── .env
│
├── .gitignore
└── README.md
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/<YOUR_USERNAME>/SPIMS.git

cd SPIMS
```

---

## Backend Setup

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory.

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/spims
```

Run the backend server.

```bash
npm run dev
```

Expected output:

```
MongoDB Connected: 127.0.0.1
🚀 Server running on port 5000
```

---

## Frontend Setup

```bash
cd client
npm install
npm run dev
```

The React application runs at:

```
http://localhost:5173
```

---

# 🧪 API Testing

The backend can be tested using **Postman**.

Current available endpoint:

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | API Health Check |

Expected Response

```json
{
  "success": true,
  "message": "SPIMS API is running...",
  "version": "1.0.0"
}
```

---

# 📌 Current Development Status

## ✅ Completed

### Project Initialization

- [x] Git Repository
- [x] GitHub Repository
- [x] React + Vite Setup
- [x] Express Server
- [x] MongoDB Integration
- [x] Mongoose Configuration
- [x] Environment Variables
- [x] ES Modules Configuration
- [x] Folder Structure
- [x] API Health Endpoint
- [x] Backend Successfully Connected to MongoDB
- [x] Initial Git Commits
- [x] Postman API Testing

---

## 🚧 In Progress

- Authentication Module

---

## 📅 Development Roadmap

### Phase 1 — Backend Foundation ✅

- [x] Express Setup
- [x] MongoDB Connection
- [x] Environment Variables
- [x] Project Structure
- [x] Initial API Testing

---

### Phase 2 — Authentication

- [ ] User Model
- [ ] Login API
- [ ] JWT Authentication
- [ ] Password Hashing
- [ ] Protected Routes
- [ ] User Roles (Admin / Staff)

---

### Phase 3 — Dashboard

- [ ] Dashboard UI
- [ ] Dashboard Statistics
- [ ] Summary Cards

---

### Phase 4 — Inventory Management

- [ ] Categories
- [ ] Spare Parts CRUD
- [ ] Consumables CRUD
- [ ] Suppliers

---

### Phase 5 — Inventory Transactions

- [ ] Stock In
- [ ] Stock Out
- [ ] Inventory Adjustment
- [ ] Transaction History

---

### Phase 6 — Tool Management

- [ ] Borrowed Tools
- [ ] Return Tracking

---

### Phase 7 — Reports

- [ ] Inventory Reports
- [ ] Export to Excel
- [ ] Printable Reports

---

### Phase 8 — Notifications

- [ ] Low Stock Alerts
- [ ] Critical Stock Alerts
- [ ] Notification Center

---

### Phase 9 — Deployment

- [ ] Production Build
- [ ] Docker Support
- [ ] Internal Network Deployment

---

# 🔐 Planned Security Features

- JWT Authentication
- Password Encryption (bcrypt)
- Role-Based Access Control
- Protected API Routes
- Secure Environment Variables
- HTTP Security Headers (Helmet)

---

# 💻 Development Workflow

```
GitHub
      ▲
      │
git push
      │
Laptop A  ◄────────►  Laptop B
      │                 │
 git pull           git pull
```

All project changes are synchronized using Git and GitHub.

---

# 👨‍💻 Author

**Kian Fredrick Bagason**

Bachelor of Science in Information Technology

Developing SPIMS as a real-world MERN Stack inventory management system for professional use and continuous learning.

---

# 📄 License

This project is currently intended for educational, portfolio, and internal organizational use.

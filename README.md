# ⚡ Nexus Task Manager

Nexus is a premium, high-performance team task management application designed with a stunning **White & Gold Bento-Box UI**. It combines advanced glassmorphism aesthetics with robust backend functionality to help teams collaborate seamlessly.

![Nexus Preview](frontend/landing.html) <!-- Note: User can add a real screenshot here later -->

## ✨ Features

- **💎 Advanced Bento UI**: A modern, asymmetrical grid layout inspired by premium dashboard designs.
- **🎨 Premium White & Gold Theme**: An elegant, light-mode aesthetic with golden gradients and 3D micro-interactions.
- **🚀 Real-time Dashboard**: Track project health, task status, and team activity at a glance.
- **🛡️ Role-Based Access**: Specialized views and permissions for Admins and Members.
- **📱 Fully Responsive**: Optimized for desktop, tablet, and mobile viewing.
- **📦 Deployment Ready**: Includes Docker support and detailed guides for Render/Railway/VPS.

## 🛠️ Tech Stack

- **Frontend**: Pure HTML5, Vanilla CSS3 (Custom Design System), JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: SQLite (via `sql.js` for portability)
- **Security**: JWT Authentication, Bcrypt Password Hashing

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)

### 2. Installation
```bash
# Navigate to the backend
cd backend

# Install dependencies
npm install
```

### 3. Run Locally
```bash
# Start the server
npm start
```
The app will be running at `http://localhost:3000`.

## 🚢 Deployment

### Railway (Zero-Config)
1.  **Fork** this repository to your GitHub.
2.  Go to [Railway.app](https://railway.app) and create a new project.
3.  Connect your GitHub repository.
4.  **Click Deploy.** That's it!

> [!NOTE]
> Nexus is configured with **Automatic Defaults**. You do NOT need to enter any environment variables manually. It will work out of the box with built-in secrets and database paths.

For more detailed instructions, including Docker and VPS, please refer to the [DEPLOYMENT.md](./DEPLOYMENT.md) guide.

## 📄 License
This project is for demonstration purposes.

---
*Created with ❤️ by the Nexus Team.*

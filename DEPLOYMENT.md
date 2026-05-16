# Nexus Task Manager — Deployment Guide

This document outlines the steps required to deploy the Nexus Task Manager to a production environment. The application is built using Node.js (Express), SQLite (`sql.js`), and pure HTML/CSS/JS on the frontend. 

## Prerequisites
- Node.js (v18 or higher)
- Optional: Docker & Docker Compose

---

## Method 1: Deploying with Docker (Recommended)
Docker ensures that your app runs exactly the same everywhere. It's the most reliable way to deploy Nexus.

1. **Build the image**:
   ```bash
   docker build -t nexus-taskmanager .
   ```

2. **Run the container**:
   ```bash
   docker run -d -p 3000:3000 \
     -v nexus_data:/usr/src/app/backend/data \
     -e JWT_SECRET="your_secure_random_string_here" \
     nexus-taskmanager
   ```
   *Note: We mount a volume (`nexus_data`) to `/usr/src/app/backend/data` to ensure your database (`taskmanager.db`) persists across container restarts.*

---

## Method 2: Deploying to Render / Railway / Heroku

These Platforms-as-a-Service (PaaS) providers make deployment simple.

1. **Connect your GitHub repository** to the PaaS provider.
2. **Configure the Service**:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
3. **Environment Variables**:
   - `JWT_SECRET`: Generate a long random string.
   - `NODE_ENV`: Set to `production`.
4. **Persistent Storage (CRITICAL)**:
   - PaaS platforms usually have "ephemeral" storage, meaning your database will be wiped every time the app deploys or restarts.
   - **Render**: Create a "Disk" and mount it to `/data`. Then add an Environment Variable: `DB_PATH=/data/taskmanager.db`.
   - **Railway**: Add a "Volume" and set the `DB_PATH` accordingly.

---

## Method 3: Deploying on a VPS (DigitalOcean, AWS EC2, Ubuntu)

1. **Clone your code** to the server.
2. **Install PM2** (Process Manager) globally:
   ```bash
   npm install -g pm2
   ```
3. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```
4. **Set Environment Variables**:
   Create a `.env` file inside the `backend` folder:
   ```env
   PORT=80
   JWT_SECRET=super_secret_key
   ```
5. **Start the App with PM2**:
   ```bash
   pm2 start server.js --name "nexus"
   pm2 save
   pm2 startup
   ```
6. **Reverse Proxy (Optional but recommended)**:
   Set up Nginx or Caddy to route traffic from port 80/443 (HTTP/HTTPS) to port 3000 internally.

---

## Security & Best Practices Check
✅ **API URLs are relative**: The frontend now uses `/api` instead of `http://localhost:3000/api`, ensuring it works smoothly on any domain.
✅ **JWT Secret**: Always use a secure string for `JWT_SECRET` in production instead of the default fallback.
✅ **Password Hashing**: User passwords are securely hashed using `bcryptjs` before being stored in SQLite.
✅ **Role Checks**: Backend API endpoints correctly verify `admin` vs `member` roles to prevent unauthorized access.

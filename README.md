# 4 in a Row (Connect Four)

A real-time multiplayer game capable of 1v1 matches and bot fallback, built with Node.js, React, and TypeScript.

## 🚀 Features

- **Real-time Gameplay**: Play against other players instantly using WebSockets.
- **Competitive Bot**: Automatically matches with a smart Minimax bot if no player joins in 10s.
- **Leaderboard**: Tracks top winners using PostgreSQL.
- **Game Analytics**: Decoupled analytics events processed via Kafka.
- **Reconnection**: Seamlessly rejoin active games if you disconnect.

## 🛠 Tech Stack

- **Backend**: Node.js, Express, Socket.io, TypeScript
- **Frontend**: React, Vite, TypeScript
- **Database**: PostgreSQL
- **Message Broker**: Kafka & Zookeeper

## 🏃 Setup & Running Locally

### Prerequisites

- **Node.js** (v18+)
- **PostgreSQL** (Connected via NeonDB URL in `.env`)
- **Kafka & Zookeeper** (Requires local installation for Analytics, optional)

### 1. Database

The backend is configured to use a live NeonDB database. No local Postgres setup is required.

### 2. Kafka (Optional)

To enable game analytics, run the included `start-kafka.bat` script:

```bash
.\start-kafka.bat
```

This opens Zookeeper and Kafka windows. Keep them running.
_If skipped, the app will run in degraded mode (no analytics)._

### 3. Backend

```bash
cd backend
npm install
npm start
```

Runs on `http://localhost:3001`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`.

## 🚀 Deployment Guide (Render)

This project is configured for deployment on **Render**.

### 1. Push to GitHub

Ensure this repository is pushed to your GitHub account.

### 2. Deploy Backend (Web Service)

1. Go to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repo.
4. **Settings**:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build` (if using TS) or just `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `DATABASE_URL`: _Your NeonDB URL_
     - `PORT`: `3001` (Render automatically sets `PORT`, but good to be explicit)
5. **Deploy**. Copy the provided URL (e.g., `https://connect4-backend.onrender.com`).

### 3. Deploy Frontend (Static Site)

1. Click **New +** -> **Static Site**.
2. Connect the same GitHub repo.
3. **Settings**:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variables**:
     - `VITE_BACKEND_URL`: _Paste your Backend URL from Step 2_ (e.g., `https://connect4-backend.onrender.com`)
4. **Deploy**.

Your game is now live!

## 🧠 Bot Logic

The bot uses a **Minimax algorithm** with Alpha-Beta pruning (depth 4) to make strategic moves, blocking opponent wins and pursuing its own victory.

## 📊 Analytics

Game completion events are produced to a Kafka topic `game-events`. A consumer listens to these events for analytics (currently logging to console, extensible to DB).

<div align="center">
  <img src="frontend/public/shelftalk-logo-navbar.png" alt="ShelfTalk Logo" width="320" />

# ShelfTalk
### *Books don't talk. We do.*

Turn every reading list into a living conversation.

  <p>
    <a href="https://shelftalk-community.vercel.app/">🌐 Live Demo</a> •
    <a href="#-quick-setup">⚡ Quick Setup</a> •
    <a href="#-core-features">✨ Features</a> •
    <a href="#-tech-stack">🛠 Tech Stack</a>
  </p>

  ![Node.js](https://img.shields.io/badge/Node.js-v14+-339933?style=flat-square&logo=node.js&logoColor=white)
  ![React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react&logoColor=black)
  ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
  ![Socket.io](https://img.shields.io/badge/Socket.io-Real--Time-010101?style=flat-square&logo=socket.io)
  ![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat-square&logo=vercel)

</div>

---

## 📖 What is ShelfTalk?

**ShelfTalk** is a full-stack social community platform built for book lovers. Think of it as a blend of Goodreads and Discord — readers can share updates, annotate passages, join genre-based clubs, chat in real-time, and coordinate live reading sessions together.

Originally built as a college project, ShelfTalk has since been revived and significantly expanded with real-time infrastructure, a live reading room feature, a personal reading diary, an invite friends feature to help the community grow, cloud file storage, and more.

---

## ✨ Core Features

### 📝 Community Posts
- Publish reading updates and annotate favourite passages
- Threaded comments keep every discussion organized
- Reactions and saves from your personal dashboard

### 🔍 Powerful Discovery
- Filter readers by genre, location, and interests
- Browse vibrant clubs and grow your reading circle
- Deep profile search to find readers that match your taste

### 💬 Real-Time Chat *(New)*
- Private 1-on-1 conversations with live presence indicators
- Built a full Socket.io implementation for instant updates
- Group-synced messaging keeps clubs coordinated

### 👥 Reader Groups & Clubs
- Create or join genre-based clubs
- Manage invites from a collaborative hub
- Coordinate meetups and group activity feeds

### 📖 Live Reading Rooms *(New)*
- Groups can start synchronized live reading sessions
- Members join a shared space to read and discuss in real time

### 📔 Reading Diary *(New)*
- Log daily reading activity in a personal diary format
- Track your reading journey over time

### 📨 Invite Friends
- Send and manage group invites directly from the platform to help the community grow
- Share a personal invite link to bring friends onto the platform

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), Socket.io-client |
| **Backend** | Node.js, Express, Socket.io |
| **Database** | MongoDB Atlas |
| **Auth** | JWT (JSON Web Tokens) |
| **File Storage** | MongoDB (GridFS / binary storage) |
| **Deployment** | Vercel (frontend), Render (backend), MongoDB Atlas (DB) |
| **Analytics** | Vercel Analytics |

---

## 🗂 Repository Layout

```
ShelfTalk/
├─ backend/           # Node + Express API
│  ├─ src/
│  │  ├─ config/      # DB and env configurations
│  │  ├─ controllers/ # Route logic
│  │  ├─ models/      # Mongoose schemas
│  │  ├─ routes/      # API endpoints
│  │  ├─ services/    # Business logic
│  │  ├─ socket/      # Socket.io logic
│  │  ├─ utils/       # Helpers
│  │  ├─ seedData.js  # Database seeder
│  │  └─ server.js    # Entry point
│  ├─ package.json
│  └─ .env.example
├─ frontend/          # React + Vite app
│  ├─ public/         # Static assets
│  ├─ src/
│  │  ├─ components/  # Reusable UI components
│  │  ├─ context/     # React Context for state
│  │  ├─ lib/         # Third-party lib setup (Axios, Socket)
│  │  ├─ pages/       # App routes/views
│  │  ├─ styles/      # Global styling
│  │  └─ main.jsx     # Vite React entry point
│  ├─ package.json
│  ├─ vite.config.mjs # Vite configuration
│  └─ .env.example

└─ README.md
```

---

## ⚙️ Prerequisites

- **Node.js** v14 or higher
- **npm** or **yarn**
- **MongoDB** — local `mongod` or a [MongoDB Atlas](https://www.mongodb.com/atlas) instance

---

## ⚡ Quick Setup

### Step 1 — Clone the repo

```bash
git clone https://github.com/JaniDhruv/ShelfTalk.git
cd ShelfTalk
```

### Step 2 — Environment Variables

**Backend** (`backend/.env`):
```bash
cd backend
cp .env.example .env
```
Fill in:
```env
MONGO_URI=mongodb://localhost:27017/shelftalk
PORT=5000
JWT_SECRET=your_secret_key
```

**Frontend** (`frontend/.env`):
```bash
cd frontend
cp .env.example .env
```
Fill in:
```env
VITE_API_BASE=http://localhost:5000
```

### Step 3 — Seed Database

```bash
cd backend && npm run seed
```

### Step 4 — Start Backend

```bash
cd backend && npm install && npm run dev
```
Runs on **http://localhost:5000**

### Step 5 — Start Frontend

```bash
cd frontend && npm install && npm run dev
```
Runs on **http://localhost:3000**

> ⚠️ Make sure the backend is running before starting the frontend.

---

## 🧭 User Journey

1. **Create your space** — Sign up, personalise your profile, and show what you're currently reading.
2. **Share the conversation** — Draft posts, reply with comments, and react to discussions.
3. **Connect intentionally** — Follow readers, join clubs, and slide into DMs.
4. **Go live** — Start a Live Reading Room with your group and read together in real time.
5. **Stay in the loop** — Group feeds surface invites, reactions, and new posts so you never miss a moment.

---

## 🚀 What's New (Finish-Up-A-Thon)

This project originally started as a college project, but then for the **GitHub Finish-Up-A-Thon Challenge**, it was revived, polished, and significantly expanded.

### 🔄 The Before & After Journey
- **Before:** A basic REST API with polling for chat, local file uploads that broke in production, a local MongoDB setup, and an unpolished React (CRA) frontend.
- **After:** A fully real-time experience using Socket.io, robust cloud file storage (GridFS) and database (MongoDB Atlas), a lightning-fast Vite frontend, new features like Live Reading Rooms and Reading Diaries, and a deployed, polished application on Vercel.

### 🤖 How GitHub Copilot Helped
GitHub Copilot was instrumental in this revival:
- **Live Reading Rooms:** Used Copilot Chat to understand the best approach for synchronizing state across multiple clients. It accurately scaffolded the Socket.io logic needed for users to join and interact in a shared reading space.
- **Reading Diary:** Used Copilot Chat to brainstorm what data points would make the diary appealing and useful. It guided the structure for the Mongoose schemas and suggested the best ways to display the entries on the frontend.
- **Bug Fixes & Configuration:** Relied on inline suggestions to quickly resolve type mismatches, configuration issues, and import errors, especially during the Vite migration.
- **CSS & UI Tweaks:** Asked Copilot for styling suggestions to elevate the app's look. It effortlessly autocompleted flexbox layouts and provided responsive CSS classes for the new chat bubbles, saving me from constantly referencing documentation.

| Area | What Changed |
|---|---|
| **Real-Time Chat** | Replaced REST polling with Socket.io for true real-time messaging |
| **Live Reading Rooms** | Brand new feature — synchronized group reading sessions |
| **Reading Diary** | Personal daily activity logging in diary format |
| **Invite System** | Full group invite flow implemented end-to-end |
| **File Storage** | Migrated file uploads to MongoDB Atlas storage |
| **Database** | Migrated from local MongoDB to MongoDB Atlas |
| **Frontend Build** | Migrated from CRA to Vite for faster dev experience |
| **Auth** | Properly implemented JWT across all protected routes |
| **UI Polish** | Enhanced Chat, Groups, Reading Rooms, and Post pages |
| **Landing Page** | Redesigned and updated |
| **Deployment** | Added Vercel Analytics; resolved deployment config issues |

---

## 🧩 Future Enhancements

- Push notifications for group activity
- Bookmarking and reading history
- AI-powered book recommendations
- Mobile-friendly UI revamp

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

<div align="center">
  Made with ☕ and too many late nights · <a href="https://shelftalk-community.vercel.app/">shelftalk-community.vercel.app</a>
</div>
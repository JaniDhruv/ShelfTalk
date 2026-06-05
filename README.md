<div align="center">
  <img src="frontend/public/shelftalk-logo-navbar.png" alt="ShelfTalk Logo" width="320" />

  <h3>Turn every reading list into a living conversation.</h3>

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

Originally built as a hackathon project, ShelfTalk has since been revived and significantly expanded with real-time infrastructure, a live reading room feature, a personal reading diary, group invite system, cloud file storage, and more.

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

### 💬 Real-Time Chat *(Socket.io)*
- Private 1-on-1 conversations with live presence indicators
- Replaced REST polling with a full Socket.io implementation for instant updates
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

### 📨 Invite System *(New)*
- Send and manage group invites directly from the platform

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), Socket.io-client |
| **Backend** | Node.js, Express, Socket.io |
| **Database** | MongoDB Atlas |
| **Auth** | JWT (JSON Web Tokens) |
| **File Storage** | MongoDB (GridFS / binary storage) |
| **Deployment** | Vercel (frontend), MongoDB Atlas (DB) |
| **Analytics** | Vercel Analytics |

---

## 🗂 Repository Layout

```
ShelfTalk/
├─ backend/           # Node + Express API
│  ├─ src/
│  │  ├─ server.js    # Entry point
│  │  ├─ routes/
│  │  ├─ models/
│  │  └─ socket/      # Socket.io logic
│  ├─ package.json
│  └─ .env.example
├─ frontend/          # React + Vite app
│  ├─ public/
│  ├─ src/
│  ├─ package.json
│  └─ .env.example
├─ db-backup/         # MongoDB dump (shelftalk/)
├─ uploads/           # Uploaded files
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
REACT_APP_API_BASE=http://localhost:5000
```

### Step 3 — Restore MongoDB Backup *(Recommended)*

```bash
# From repo root
mongorestore --drop --db shelftalk ./db-backup/shelftalk
```

On Windows (PowerShell):
```powershell
& "C:\Program Files\MongoDB\Tools\100\bin\mongorestore.exe" --drop --db shelftalk .\db-backup\shelftalk
```

Or seed via script:
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

This project was originally built as a hackathon submission. Here's what was added and improved:

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
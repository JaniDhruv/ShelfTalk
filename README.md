
<div align="center">
				<img src="frontend/public/shelftalk-logo-navbar.png" alt="ShelfTalk Logo" width="320" />
</div>

# 📚 ShelfTalk — Setup & Overview

> **Turn every reading list into a living conversation.**

ShelfTalk is a **community platform for book lovers** — combining posts, discovery, real-time chat, and reader groups.  
Below is a short project overview followed by concise setup instructions for running the app locally or submitting it.

---

## 🌟 Core Features

- **Community Posts** — Publish reading updates, annotate favourite passages, and keep every conversation threaded with comments.  
- **Powerful Discovery** — Filter readers by genre, location, and interests, or browse vibrant clubs to grow your circle.  
- **Real-Time Chat** — Start or rejoin private conversations, keep tabs on presence, and bring book club chatter online.  
- **Reader Groups** — Create or join genre clubs, coordinate meetups, and manage invites from one collaborative hub.

---

## ✨ Experience Highlights

- **Posts & Reactions:** Share quick updates, follow comment threads, and revisit saved discussions from your dashboard.  
- **Discovery & Profiles:** Deep search tools reveal readers, authors, and clubs that match your taste while profiles showcase your voice.  
- **Chat & Group Sync:** Private chat, structured group spaces, and synchronized updates keep clubs coordinated.

---

## 🧭 How It Flows (User Journey)

1. **Create your space** — Sign up, personalise your profile, and show what you're reading.  
2. **Share the conversation** — Draft posts and reply with comments to keep discussions flowing.  
3. **Connect intentionally** — Follow readers, join clubs, and move between the feed and DMs.  
4. **Stay in the loop** — Group feeds surface invites, reactions, and new posts so you never miss a moment.

---

## 🧩 Future Enhancements

- Push notifications for group activity  
- Bookmarking / Reading history  
- AI-powered book recommendations  
- Mobile-friendly UI revamp  

---

## 🗂️ Repository Layout

```
ShelfTalk/
├─ backend/         # Node + Express API (source under backend/src/)
│  ├─ src/
│  ├─ package.json
│  ├─ .env.example
├─ frontend/        # React app
│  ├─ public/
│  ├─ src/
│  ├─ package.json
│  ├─ .env.example
├─ db-backup/       # MongoDB dump (shelftalk/)
├─ uploads/         # Uploaded files
├─ .gitignore
└─ README.md        # This file
```

---

## ⚙️ Prerequisites

- **Node.js** (v14 or higher recommended)  
- **npm** (or **yarn**)  
- **MongoDB** — either local `mongod` or MongoDB Atlas instance

---

## ⚡ Quick Setup (for Local Testing)

If you just want to run the app quickly after cloning the project, use the commands below.

✅ Step 1 — Restore MongoDB Backup (Recommended)

Windows PowerShell (adjust path if your Tools version is different):

```powershell
& "C:\Program Files\MongoDB\Tools\100\bin\mongorestore.exe" --drop --db shelftalk .\db-backup\shelftalk
```

If you’re using another OS or have `mongorestore` on your PATH, you can run:

```bash
mongorestore --drop --db shelftalk ./db-backup/shelftalk
```

✅ Step 2 — Start Backend (Server)

```powershell
cd backend; npm install; npm run dev
```

POSIX / Git Bash / WSL (single line):
```bash
cd backend && npm install && npm run dev
```

Runs the Express + MongoDB backend on http://localhost:5000

✅ Step 3 — Start Frontend (React)

PowerShell (single line):
```powershell
cd frontend; npm install; npm install @fortawesome/fontawesome-free --save; npm run dev
```

POSIX / Git Bash / WSL (single line):
```bash
cd frontend && npm install && npm install @fortawesome/fontawesome-free --save && npm run dev
```

Runs the React app on http://localhost:3000

Make sure your backend is already running before starting the frontend.

✅ Step 4 — Environment Variables

Before running, copy and fill in the example .env files:

Backend
```powershell
cd backend
cp .env.example .env
```

Then open `backend/.env` and fill in:

```
MONGO_URI=mongodb://localhost:27017/shelftalk
PORT=5000
JWT_SECRET=your_secret_key
```

Frontend
```powershell
cd frontend
cp .env.example .env
```

Then open `frontend/.env` and set:

```
REACT_APP_API_BASE=http://localhost:5000
```

This Quick Setup assumes you want a fast evaluator-run path (restore DB, start backend, start frontend). For more troubleshooting or alternatives (seed script, Atlas connection), see the full setup sections below.

## 🔑 Environment Setup (Important!)

> ⚠️ **Do NOT commit real `.env` files.**  
> Every developer who clones this repo must create their own `.env` files by copying the provided templates.

### 🔹 Backend
```bash
cd backend
cp .env.example .env
# Then open backend/.env and fill in:
MONGO_URI=<your mongo uri>
PORT=5000
JWT_SECRET=<your jwt secret>
```

### 🔹 Frontend
```bash
cd frontend
cp .env.example .env
# Then open frontend/.env and set:
REACT_APP_API_BASE=http://localhost:5000
```

✅ The `.env.example` files are templates — never push real credentials to version control.

---

## 🛠️ Setup — Backend

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Create environment file
See the **Environment Setup** section above for the exact `.env` templates and values.

### 3. Seed the database (optional)
There are two options to load initial data:

**Option 1 — Restore the provided Mongo dump (recommended):**
```bash
# From repository root
mongorestore --db shelftalk ./db-backup/shelftalk
```

If your system doesn't have `mongorestore` on PATH (common on Windows), run the tool with its full path. Example (PowerShell) for the default MongoDB Database Tools install location:

```powershell
& "C:\Program Files\MongoDB\Tools\100\bin\mongorestore.exe" --db shelftalk .\db-backup\shelftalk
```

Replace the path above with your installed Tools path/version if different.

**Option 2 — Run the seed script:**
```bash
cd backend
npm run seed
```

### 4. Start the backend
```bash
cd backend
npm run dev    # starts nodemon src/server.js
# or
npm start      # starts node src/server.js
```

> The backend entry point is located at **backend/src/server.js**.  
> Package scripts are already configured for the `src/` folder.

---

## 💻 Setup — Frontend


### 1. Install dependencies
```bash
cd frontend
npm install
```

#### If you see errors about missing FontAwesome icons:
```bash
npm install @fortawesome/fontawesome-free --save
```
This package is required for icons in the UI and may not always be installed by default.

### 2. Create environment file
See the **Environment Setup** section above for the exact `.env` templates and values.

### 3. Start the frontend
```bash
cd frontend
npm run dev
# or
npm start
```

By default:
- Frontend runs on **http://localhost:3000**  
- Backend runs on **http://localhost:5000**

---
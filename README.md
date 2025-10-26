
<div align="center">
			<img src="frontend/public/shelftalk-logo-navbar.png" alt="ShelfTalk Logo" width="200" />
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
├─ README.md        # This file
└─ .gitignore
```

---

## ⚙️ Prerequisites

- **Node.js** (v14 or higher recommended)  
- **npm** (or **yarn**)  
- **MongoDB** — either local `mongod` or MongoDB Atlas instance

---

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
```bash
cd backend
cp .env.example .env
# Then edit backend/.env and set MONGO_URI and JWT_SECRET
```

### 3. Seed the database (optional)
There are two options to load initial data:

**Option 1 — Restore the provided Mongo dump (recommended):**
```bash
# From repository root
mongorestore --db shelftalk ./db-backup/shelftalk
```

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

### 2. Create environment file
```bash
cd frontend
cp .env.example .env
# Edit frontend/.env to set REACT_APP_API_BASE if needed
```

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
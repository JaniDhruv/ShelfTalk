# ShelfTalk

ShelfTalk is a MERN (MongoDB, Express, React, Node) social app for book lovers. This README explains how to set up the project locally, restore the database, and prepare the repository for submission (ZIP).

Repository layout

```
ShelfTalk/
├─ backend/         # Node + Express API (source is under backend/src/)
│  ├─ src/
│  ├─ package.json
│  ├─ .env.example
├─ frontend/        # React app
│  ├─ public/
│  ├─ src/
│  ├─ package.json
│  ├─ .env.example
├─ db-backup/       # MongoDB dump (shelftalk/)
├─ uploads/         # uploaded files
├─ README.md        # this file
└─ .gitignore       # repository-level ignore file
```

Prerequisites

- Node.js (v14+ recommended)
- npm (or yarn)
- MongoDB (local `mongod`) or MongoDB Atlas

Important: Do NOT check real `.env` files into source control. Use the provided `.env.example` files as a template.

Environment variables (examples)

- Backend (`backend/.env.example`)

```
MONGO_URI=<your mongo uri>
PORT=5000
JWT_SECRET=<your jwt secret>
```

- Frontend (`frontend/.env.example`)

```
REACT_APP_API_BASE=http://localhost:5000
```

Setup — Backend

1. Install dependencies

```powershell
cd backend
npm install
```

2. Create an environment file

Copy the example and fill the values (never commit real secrets):

```powershell
cd backend
copy .env.example .env
# Then edit backend\.env and set MONGO_URI and JWT_SECRET
```

3. Seed the database (OPTIONAL)

There are two options to get initial data into the DB:

- Restore the provided dump (recommended for exact dataset):

```powershell
# From repository root (PowerShell)
mongorestore --db shelftalk .\db-backup\shelftalk
```

- Or run the seed script which programmatically creates sample users, profiles, groups, posts, etc. Ensure `backend/.env` points at your DB, then:

```powershell
cd backend
npm run seed
```

4. Start the backend

```powershell
cd backend
npm run dev    # starts nodemon src/server.js
# or
npm start      # starts node src/server.js
```

The backend entrypoint lives at `backend/src/server.js`. Package scripts are already updated to point to `src/`.

Setup — Frontend

1. Install dependencies

```powershell
cd frontend
npm install
```

2. Create environment file

```powershell
cd frontend
copy .env.example .env
# Edit frontend\.env to set REACT_APP_API_BASE if needed
```

3. Start the frontend

```powershell
cd frontend
npm run dev
# or
npm start
```
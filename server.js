import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import userRoutes from './backend/routes/UserRoutes.js';
import postRoutes from './backend/routes/PostRoutes.js';
import commentRoutes from './backend/routes/CommentRoutes.js';
import groupRoutes from './backend/routes/GroupRoutes.js';
import notificationRoutes from './backend/routes/NotificationRoutes.js';
import profileRoutes from './backend/routes/ProfileRoutes.js';
import chatRoutes from './backend/routes/ChatRoutes.js';
import discoveryRoutes from './backend/routes/DiscoveryRoutes.js';
import authRoutes from "./backend/routes/AuthRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Static uploads folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Simple route for testing
app.get('/', (req, res) => {
  res.send('ShelfTalk API is running...');
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/discover', discoveryRoutes);

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/shelftalk';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB Connected');
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
})
.catch((error) => {
  console.error('❌ MongoDB Connection Failed:', error.message);
});

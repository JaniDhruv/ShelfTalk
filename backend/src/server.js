import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

import userRoutes from './routes/UserRoutes.js';
import postRoutes from './routes/PostRoutes.js';
import commentRoutes from './routes/CommentRoutes.js';
import groupRoutes from './routes/GroupRoutes.js';
import notificationRoutes from './routes/NotificationRoutes.js';
import profileRoutes from './routes/ProfileRoutes.js';
import chatRoutes from './routes/ChatRoutes.js';
import discoveryRoutes from './routes/DiscoveryRoutes.js';
import authRoutes from './routes/AuthRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import readingSessionRoutes from './routes/readingSessionRoutes.js';
import groupLibraryRoutes from './routes/groupLibraryRoutes.js';
import diaryRoutes from './routes/diaryRoutes.js';
import fileRoutes from './routes/FileRoutes.js';
import Profile from './models/Profile.js';
import { configureChatSocket } from './socket/chatSocket.js';


dotenv.config();

const app = express();
const server = http.createServer(app);
const io = configureChatSocket(server);

app.set('io', io);

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// GridFS uploads route
app.use('/uploads', fileRoutes);

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
app.use('/api/books', bookRoutes);
app.use('/api/groups/:groupId/library', groupLibraryRoutes);
app.use('/api/sessions', readingSessionRoutes);
app.use('/api/diary', diaryRoutes);


// MongoDB Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/shelftalk';
mongoose.connect(mongoURI)
.then(async () => {
  console.log('✅ MongoDB Connected');

  try {
    await Profile.updateMany(
      { isOnline: true },
      { $set: { isOnline: false, lastSeen: new Date() } }
    );
  } catch (err) {
    console.error('⚠️ Failed to reset online statuses on startup:', err.message);
  }

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

  let isShuttingDown = false;
  const handleShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n${signal} received. Marking users offline before shutdown...`);
    try {
      await Profile.updateMany(
        { isOnline: true },
        { $set: { isOnline: false, lastSeen: new Date() } }
      );
    } catch (err) {
      console.error('⚠️ Failed to mark users offline during shutdown:', err.message);
    } finally {
      server.close(() => {
        process.exit(0);
      });
      setTimeout(() => process.exit(0), 5000).unref();
    }
  };

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => handleShutdown(signal));
  });
})
.catch((error) => {
  console.error('❌ MongoDB Connection Failed:', error.message);
});

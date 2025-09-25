import express from 'express';
import {
  createNotification,
  getNotificationsByUser,
  markAsRead,
  deleteNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// POST: Create new notification
router.post('/', createNotification);

// GET: All notifications for a user
router.get('/user/:userId', getNotificationsByUser);

// PATCH: Mark as read
router.patch('/:id/read', markAsRead);

// DELETE: Remove a notification
router.delete('/:id', deleteNotification);

export default router;

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // recipient
  type: { type: String, enum: ['like', 'comment', 'mention', 'group_invite'], required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  relatedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }, // optional
  relatedGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' } // optional
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);

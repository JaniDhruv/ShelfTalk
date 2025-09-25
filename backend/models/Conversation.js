import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  type: { type: String, enum: ['dm', 'group'], required: true },
  name: { type: String },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  lastMessageAt: { type: Date, default: Date.now },
  lastMessage: { type: String, default: '' },
  lastSender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
}, { timestamps: true });

export default mongoose.model('Conversation', conversationSchema);

import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  joinRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  invites: [{
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model('Group', groupSchema);

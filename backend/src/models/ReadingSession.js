import mongoose from 'mongoose';

const readingParticipantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  currentPage: { type: Number, default: 1, min: 1 },
  joinedAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
}, { _id: false });

const readingReactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  page: { type: Number, required: true, min: 1 },
  emoji: { type: String, required: true },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const readingCheckpointSchema = new mongoose.Schema({
  chapter: { type: String, required: true },
  targetPage: { type: Number, required: true, min: 1 },
  completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  discussionThreadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
}, { _id: false });

const readingSessionSchema = new mongoose.Schema({
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupBook', required: true, index: true },
  title: { type: String, required: true },
  authors: [{ type: String }],
  coverImage: { type: String, default: '' },
  pageCount: { type: Number, default: 0 },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  hostedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active', index: true },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  participants: { type: [readingParticipantSchema], default: [] },
  annotations: { type: [readingReactionSchema], default: [] },
  checkpoints: { type: [readingCheckpointSchema], default: [] },
}, { timestamps: true });


readingSessionSchema.index(
  { groupId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

export default mongoose.model('ReadingSession', readingSessionSchema);
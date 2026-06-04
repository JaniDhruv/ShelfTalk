import mongoose from 'mongoose';

const groupBookSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    title: { type: String, default: '' },
    pageCount: { type: Number, default: 0 },
    fileSize: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    coverImage: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('GroupBook', groupBookSchema);


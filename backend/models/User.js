import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String },
  profilePic: { type: String }, // optional
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }], // joined groups
  profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }, // user profile
}, { timestamps: true });

export default mongoose.model('User', userSchema);

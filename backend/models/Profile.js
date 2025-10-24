import mongoose from 'mongoose';

const favoriteGenreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  count: { type: Number, default: 0 },
}, { _id: false });

const currentBookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  isbn: { type: String, default: '' },
  progress: { type: Number, default: 0 },
  totalPages: { type: Number, default: 0 },
  startDate: { type: Date, default: Date.now },
  genre: { type: String, default: '' },
}, { _id: false });

const socialStatsSchema = new mongoose.Schema({
  followers: { type: Number, default: 0 },
  following: { type: Number, default: 0 },
  bookClubs: { type: Number, default: 0 },
  discussions: { type: Number, default: 0 },
  posts: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
}, { _id: false });

const profileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  fullName: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 500 },
  avatar: { type: String, default: null },
  location: { type: String, default: '' },
  website: { type: String, default: '' },
  dateOfBirth: { type: Date, default: null },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: null },
  joinDate: { type: Date, default: Date.now },
  isPublic: { type: Boolean, default: true },
  languagesSpoken: { type: [String], default: [] },
  timeZone: { type: String, default: '' },
  favoriteGenres: { type: [favoriteGenreSchema], default: [] },
  favoriteAuthors: { type: [String], default: [] },
  currentlyReadingBooks: { type: [currentBookSchema], default: [] },
  socialStats: { type: socialStatsSchema, default: () => ({}) },
}, { timestamps: true });

export default mongoose.model('Profile', profileSchema);

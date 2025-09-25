import mongoose from 'mongoose';

const readingStatsSchema = new mongoose.Schema({
  booksRead: { type: Number, default: 0 },
  pagesRead: { type: Number, default: 0 },
  currentlyReading: { type: Number, default: 0 },
  toRead: { type: Number, default: 0 },
  reviewsWritten: { type: Number, default: 0 },
  avgRating: { type: Number, default: 0 },
  readingGoal: { type: Number, default: 0 },
  goalProgress: { type: Number, default: 0 },
  readingStreak: { type: Number, default: 0 },
  favoriteFormat: { type: String, enum: ['Physical', 'E-book', 'Audiobook', 'Any'], default: 'Any' },
  readingSpeed: { type: String, enum: ['Slow', 'Average', 'Fast'], default: 'Average' },
}, { _id: false });

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
  showReadingGoal: { type: Boolean, default: true },
  allowMessagesFrom: { type: String, enum: ['Everyone', 'Followers', 'Nobody'], default: 'Everyone' },
  languagesSpoken: { type: [String], default: [] },
  timeZone: { type: String, default: '' },
  readingStats: { type: readingStatsSchema, default: () => ({}) },
  favoriteGenres: { type: [favoriteGenreSchema], default: [] },
  favoriteAuthors: { type: [String], default: [] },
  currentlyReadingBooks: { type: [currentBookSchema], default: [] },
  socialStats: { type: socialStatsSchema, default: () => ({}) },
}, { timestamps: true });

export default mongoose.model('Profile', profileSchema);

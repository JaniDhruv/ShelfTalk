import User from '../models/User.js';
import Group from '../models/Group.js';
import Profile from '../models/Profile.js';

export const discoverUsers = async (req, res) => {
  try {
    const { search, location, genres, authors, readingFormat, readingSpeed, languages, sortBy, limit } = req.query;
    
    console.log('Discovery request params:', req.query);
    
    // Build user filter for search
    const userFilter = {};
    if (search) {
      userFilter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Build profile filter for more specific criteria
    const profileFilter = {};
    
    // Only add isPublic filter if we have other specific criteria
    // This allows showing all users by default, even without complete profiles
    const hasSpecificFilters = location || genres || authors || readingFormat !== 'Any' || readingSpeed !== 'Any' || languages;
    
    if (hasSpecificFilters) {
      profileFilter.isPublic = true; // Only filter by public when using specific criteria
    }
    
    if (location) {
      profileFilter.location = { $regex: location, $options: 'i' };
    }
    
    if (genres) {
      const genreList = genres.split(',').map(g => g.trim());
      profileFilter['favoriteGenres.name'] = { $in: genreList };
    }
    
    if (authors) {
      const authorList = authors.split(',').map(a => a.trim());
      profileFilter.favoriteAuthors = { $in: authorList };
    }
    
    if (readingFormat && readingFormat !== 'Any') {
      profileFilter['readingStats.favoriteFormat'] = readingFormat;
    }
    
    if (readingSpeed && readingSpeed !== 'Any') {
      profileFilter['readingStats.readingSpeed'] = readingSpeed;
    }
    
    if (languages) {
      const languageList = languages.split(',').map(l => l.trim());
      profileFilter.languagesSpoken = { $in: languageList };
    }
    
    // Get users with their profiles
    let users;
    if (hasSpecificFilters && Object.keys(profileFilter).length > 0) {
      // If we have specific profile filters, start with profiles
      const profiles = await Profile.find(profileFilter)
        .populate({
          path: 'user',
          match: userFilter,
          select: 'username email'
        });
      
      users = profiles
        .filter(p => p.user) // Only profiles with matching users
        .map(p => ({
          _id: p.user._id,
          username: p.user.username,
          email: p.user.email,
          profile: {
            fullName: p.fullName,
            bio: p.bio,
            location: p.location,
            website: p.website,
            favoriteGenres: p.favoriteGenres,
            favoriteAuthors: p.favoriteAuthors,
            languagesSpoken: p.languagesSpoken,
            readingStats: p.readingStats,
            socialStats: p.socialStats,
            currentlyReadingBooks: p.currentlyReadingBooks,
            joinDate: p.joinDate,
            isOnline: p.isOnline,
            lastSeen: p.lastSeen
          }
        }));
    } else {
      // If no specific profile filters, start with users and populate all profiles
      users = await User.find(userFilter)
        .select('username email')
        .populate('profile')
        .lean();
      
      users = users.map(user => ({
        _id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile || {
          fullName: user.username || '',
          bio: '',
          location: '',
          website: '',
          favoriteGenres: [],
          favoriteAuthors: [],
          languagesSpoken: [],
          readingStats: { 
            booksRead: 0, 
            currentlyReading: 0, 
            toRead: 0,
            reviewsWritten: 0,
            readingGoal: 0,
            goalProgress: 0,
            readingStreak: 0,
            favoriteFormat: 'Any',
            readingSpeed: 'Average'
          },
          socialStats: { 
            followers: 0, 
            following: 0, 
            posts: 0,
            bookClubs: 0,
            discussions: 0,
            likes: 0
          },
          joinDate: user.createdAt,
          isOnline: false,
          lastSeen: null
        }
      }));
    }
    
    // Sort results
    if (sortBy === 'followers') {
      users.sort((a, b) => (b.profile?.socialStats?.followers || 0) - (a.profile?.socialStats?.followers || 0));
    } else if (sortBy === 'books_read') {
      users.sort((a, b) => (b.profile?.readingStats?.booksRead || 0) - (a.profile?.readingStats?.booksRead || 0));
    } else if (sortBy === 'recent') {
      users.sort((a, b) => new Date(b.profile?.joinDate || 0) - new Date(a.profile?.joinDate || 0));
    } else if (sortBy === 'online') {
      users.sort((a, b) => {
        if (a.profile?.isOnline && !b.profile?.isOnline) return -1;
        if (!a.profile?.isOnline && b.profile?.isOnline) return 1;
        return 0;
      });
    } else {
      users.sort((a, b) => a.username.localeCompare(b.username));
    }
    
    // Apply limit if specified
    if (limit) {
      users = users.slice(0, parseInt(limit));
    }
    
    console.log('Returning users:', users.length);
    res.json(users);
  } catch (err) {
    console.error('Discovery error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const discoverClubs = async (_req, res) => {
  try {
    const groups = await Group.find({ visibility: 'public' }).select('name description members createdAt');
    const mapped = groups.map(g => ({
      id: g._id,
      name: g.name,
      description: g.description,
      members: g.members?.length || 0,
      activeReads: 0,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const discoverChallenges = async (_req, res) => {
  try {
    const challenges = [
      { id: 1, name: '2025 Reading Challenge', description: 'Read 52 books in 2025', participants: 0, timeLeft: 'TBD', progress: 0, goal: 52, difficulty: 'Standard', rewards: ['Badge'] },
    ];
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

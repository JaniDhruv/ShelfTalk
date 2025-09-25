import Profile from '../models/Profile.js';
import User from '../models/User.js';

export const getProfileByUserId = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    let profile = await Profile.findOne({ user: id });
    if (!profile) {
      profile = await Profile.create({ user: id, fullName: user.username });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { id } = req.params; // userId
    const updates = req.body;
    const profile = await Profile.findOneAndUpdate({ user: id }, updates, {
      new: true,
      upsert: true,
      runValidators: true,
    });
    res.json(profile);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const searchProfiles = async (req, res) => {
  try {
    const { q, location, genres } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } },
      ];
    }
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (genres) filter['favoriteGenres.name'] = { $in: genres.split(',') };
    const profiles = await Profile.find(filter).limit(50);
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

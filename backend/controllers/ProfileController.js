import Profile from '../models/Profile.js';
import User from '../models/User.js';

const ensureUserProfileLink = async (userDoc, profileDoc) => {
  if (!userDoc || !profileDoc) return;
  const linkedId = userDoc.profile?.toString?.();
  const profileId = profileDoc._id?.toString?.();
  if (profileId && linkedId !== profileId) {
    userDoc.profile = profileDoc._id;
    try {
      await userDoc.save({ validateBeforeSave: false });
    } catch (err) {
      console.error('Failed to link profile to user', err);
    }
  }
};

export const getProfileByUserId = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    let profile = await Profile.findOne({ user: id });
    if (!profile) {
      profile = await Profile.create({ user: id, fullName: user.username });
    }
    await ensureUserProfileLink(user, profile);
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

export const setOnlineStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ message: 'isOnline boolean value is required' });
    }

    const update = {
      isOnline,
      lastSeen: new Date(),
    };

    const profile = await Profile.findOneAndUpdate(
      { user: id },
      {
        $set: update,
        $setOnInsert: { user: id },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const userDoc = await User.findById(id);
    await ensureUserProfileLink(userDoc, profile);

    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

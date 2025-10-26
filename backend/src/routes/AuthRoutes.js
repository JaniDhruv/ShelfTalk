import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Profile from '../models/Profile.js';

const router = express.Router();

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Validate email
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      password: hashedPassword,
      email: email.trim()
    });

    await user.save();

    // Ensure a profile document exists for this user
    await Profile.findOneAndUpdate(
      { user: user._id },
      {
        $setOnInsert: {
          fullName: username,
          isOnline: false,
          lastSeen: new Date(),
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid username or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid username or password' });

    const now = new Date();
    await Profile.findOneAndUpdate(
      { user: user._id },
      {
        $set: { isOnline: true, lastSeen: now },
        $setOnInsert: { fullName: user.username },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Optionally, generate a JWT token here
    res.json({
      user: { username: user.username, email: user.email, _id: user._id },
      online: true,
      lastSeen: now,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGOUT
router.post('/logout', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const now = new Date();
    await Profile.findOneAndUpdate(
      { user: userId },
      { $set: { isOnline: false, lastSeen: now } },
      { new: true }
    );

    res.json({ message: 'Logout successful', lastSeen: now });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

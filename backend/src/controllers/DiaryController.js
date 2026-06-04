import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Group from '../models/Group.js';
import ReadingSession from '../models/ReadingSession.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const toId = (v) => (v?._id || v ? v.toString() : '');

const formatDate = (d) => new Date(d).toISOString().split('T')[0];

const getDayLabel = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

export const getDiaryRange = async (req, res) => {
  try {
    const { userId } = req.params;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const [posts, comments, groups, sessions] = await Promise.all([
      Post.find({ author: userId, createdAt: { $gte: startDate, $lte: endDate } }),
      Comment.find({ author: userId, createdAt: { $gte: startDate, $lte: endDate } }).populate('post'),
      Group.find({ createdBy: userId, createdAt: { $gte: startDate, $lte: endDate } }),
      ReadingSession.find({
        $or: [
          { 'participants.userId': userId },
          { 'annotations.userId': userId },
        ],
      }).populate('bookId')
    ]);

    // Bucket activities by date (YYYY-MM-DD)
    const activitiesByDate = {};

    const addActivity = (dateObj, activity) => {
      const d = new Date(dateObj);
      if (d < startDate || d > endDate) return;
      const dateStr = formatDate(d);
      if (!activitiesByDate[dateStr]) activitiesByDate[dateStr] = [];
      activitiesByDate[dateStr].push(activity);
    };

    // Process Posts
    posts.forEach(p => {
      addActivity(p.createdAt, {
        type: 'post_created',
        text: 'Shared a thought with the community',
        icon: '✍️',
        timestamp: p.createdAt
      });
    });

    // Process Comments
    comments.forEach(c => {
      addActivity(c.createdAt, {
        type: 'comment_made',
        text: 'Joined a discussion',
        icon: '💬',
        timestamp: c.createdAt
      });
    });

    // Process Groups
    groups.forEach(g => {
      addActivity(g.createdAt, {
        type: 'group_joined',
        text: `Started the group "${g.name}"`,
        icon: '👥',
        timestamp: g.createdAt
      });
    });

    // Process Reading Sessions
    sessions.forEach(s => {
      const bookTitle = s.title || s.bookId?.title || 'a book';
      
      const me = s.participants.find(p => p.userId.toString() === userId);
      if (me) {
        // Session Joined
        if (me.joinedAt) {
          addActivity(me.joinedAt, {
            type: 'session_joined',
            text: `Joined the reading session for ${bookTitle}`,
            icon: '📖',
            timestamp: me.joinedAt
          });
        }
        
        // Session Completed
        if (me.completedAt) {
          addActivity(me.completedAt, {
            type: 'session_completed',
            text: `Finished ${bookTitle}!`,
            icon: '🎉',
            isMilestone: true,
            bookTitle,
            coverImage: s.bookId?.coverImage || '',
            pages: s.pageCount,
            timestamp: me.completedAt
          });
        }

        // Reading Progress (approx using lastActive)
        if (me.lastActive && !me.completedAt && me.currentPage > 1) {
          addActivity(me.lastActive, {
            type: 'session_progress',
            text: `Read up to page ${me.currentPage} of ${bookTitle}`,
            icon: '🔖',
            timestamp: me.lastActive
          });
        }
      }

      // Process Annotations
      s.annotations.forEach(a => {
        if (a.userId.toString() === userId) {
          addActivity(a.createdAt, {
            type: 'reaction_dropped',
            text: `Left a ${a.emoji} on page ${a.page} of ${bookTitle}`,
            icon: '📌',
            timestamp: a.createdAt
          });
        }
      });
    });

    // Fill every day in the range
    const days = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = formatDate(currentDate);
      let dayActivities = activitiesByDate[dateStr] || [];
      
      dayActivities.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Determine mood and highlights
      let mood = 'quiet';
      let highlight = null;
      let isMilestone = false;
      let milestoneData = null;

      if (dayActivities.length > 0) {
        mood = dayActivities.length > 3 ? 'active' : 'steady';
        
        const completedAct = dayActivities.find(a => a.type === 'session_completed');
        if (completedAct) {
          mood = 'milestone';
          highlight = completedAct.text;
          isMilestone = true;
          milestoneData = completedAct;
        } else {
          highlight = dayActivities[0].text; // Just pick the first as highlight
        }
      }

      if (dayActivities.length === 0) {
        dayActivities.push({
          type: 'quiet_day',
          text: 'A quiet day. Sometimes rest is part of the story.',
          icon: '☁️',
          timestamp: new Date(currentDate).toISOString()
        });
      }

      days.push({
        date: dateStr,
        dayLabel: getDayLabel(dateStr),
        activities: dayActivities,
        mood,
        highlight,
        isMilestone,
        milestoneData
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.status(200).json({ days });
  } catch (error) {
    console.error('Diary range error:', error);
    res.status(500).json({ message: 'Failed to generate diary pages' });
  }
};

export const getDiarySummary = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [postCount, sessions] = await Promise.all([
      Post.countDocuments({ author: userId }),
      ReadingSession.find({ 'participants.userId': userId })
    ]);

    let booksFinished = 0;
    let pagesRead = 0;
    let reactionsDropped = 0;

    sessions.forEach(s => {
      const me = s.participants.find(p => p.userId.toString() === userId);
      if (me) {
        if (me.completedAt) booksFinished++;
        pagesRead += (me.currentPage || 0);
      }
      reactionsDropped += s.annotations.filter(a => a.userId.toString() === userId).length;
    });

    res.status(200).json({
      startDate: user.createdAt,
      stats: {
        booksFinished,
        pagesRead,
        postsWritten: postCount,
        reactionsDropped
      }
    });

  } catch (error) {
    console.error('Diary summary error:', error);
    res.status(500).json({ message: 'Failed to get diary summary' });
  }
};

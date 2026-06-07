import axios from 'axios';
import Group from '../models/Group.js';
import ReadingSession from '../models/ReadingSession.js';
import GroupBook from '../models/GroupBook.js';
import User from '../models/User.js';


const FIXED_REACTIONS = ['😮', '😭', '😂', '🔥', '❤️', '😱', '🤯', '👏', '💔', '⚡'];

const toId = (value) => {
  if (!value) return '';
  return (value._id || value).toString();
};

const resolveUsername = async (userId, fallback) => {
  if (fallback) return fallback;
  const user = await User.findById(userId).select('username');
  return user?.username || 'Reader';
};

const buildBookInfo = async (bookId) => {
  const book = await GroupBook.findById(bookId);
  if (!book) return null;
  return {
    bookId: book._id,
    title: book.title || book.originalName || 'Untitled',
    authors: [],
    coverImage: book.coverImage || '',
    pageCount: Number(book.pageCount || 0) || 0,
    filename: book.filename,
    originalName: book.originalName,
    uploadedAt: book.uploadedAt,
  };
};

const isGroupMember = (group, userId) => {
  const targetId = toId(userId);
  return (group?.members || []).some((member) => toId(member) === targetId);
};

const canManageGroupSession = (group, userId) => {
  const targetId = toId(userId);
  return toId(group?.createdBy) === targetId || (group?.moderators || []).some((member) => toId(member) === targetId);
};

const buildSessionPopulation = async (session) => {
  if (!session) return session;
  await session.populate([
    { path: 'bookId', select: 'title originalName filename fileSize' },
    { path: 'groupId', select: 'name description members createdBy moderators visibility', populate: [
      { path: 'members', select: 'username profile' },
      { path: 'createdBy', select: 'username profile' },
      { path: 'moderators', select: 'username profile' },
    ] },
    { path: 'hostedBy', select: 'username profile' },
  ]);
  return session;
};

const getActiveSessionForGroup = async (groupId) => ReadingSession.findOne({ groupId, status: 'active' });

const ensureActiveSession = async (sessionId) => {
  const session = await ReadingSession.findById(sessionId);
  if (!session) {
    const error = new Error('Reading session not found');
    error.status = 404;
    throw error;
  }
  if (session.status !== 'active') {
    const error = new Error('Reading session is no longer active');
    error.status = 409;
    throw error;
  }
  return session;
};

const syncCompletion = async (session) => {
  if (!session || session.status !== 'active') return session;

  const pageCount = Number(session.pageCount || 0);
  const everyoneDone = session.participants.length > 0 && session.participants.every((participant) => {
    const currentPage = Number(participant.currentPage || 0);
    return Boolean(participant.completedAt) || (pageCount > 0 && currentPage >= pageCount);
  });

  if (!everyoneDone) return session;

  session.status = 'completed';
  session.completedAt = session.completedAt || new Date();
  session.participants = session.participants.map((participant) => {
    if (!participant.completedAt && pageCount > 0 && Number(participant.currentPage || 0) >= pageCount) {
      participant.completedAt = new Date();
    }
    return participant;
  });
  await session.save();
  return session;
};

const createReadingSessionSnapshot = async (sessionId) => {
  const session = await ReadingSession.findById(sessionId);
  if (!session) return null;
  return buildSessionPopulation(session);
};

export const searchBooks = async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query) {
      return res.status(400).json({ message: 'Search query is required', books: [] });
    }

    const googleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY;
    if (!googleBooksApiKey) {
      return res.status(500).json({
        message: 'Google Books API key is missing on server (GOOGLE_BOOKS_API_KEY)',
        books: [],
      });
    }

    const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
      params: {
        q: query,
        maxResults: 12,
        printType: 'books',
        projection: 'lite',
        key: googleBooksApiKey,
      },
      timeout: 10000,
    });

    // Map all results returned by Google (up to maxResults).
    const books = (response.data?.items || []).map((item) => {
      const info = item.volumeInfo || {};
      const image = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
      return {
        id: item.id,
        title: info.title || 'Untitled',
        authors: info.authors || [],
        coverImage: image ? image.replace('http://', 'https://') : '',
        pageCount: Number(info.pageCount || 0),
      };
    });

    // Client-side substring safety: ensure that for a query like "mat" we don't miss items whose title contains it.
    // (Keeps existing Google ranking/order.)
    const qLower = query.toLowerCase();
    const filtered = books.filter((b) => {
      const title = String(b.title || '').toLowerCase();
      if (title.includes(qLower)) return true;
      const authors = Array.isArray(b.authors) ? b.authors : [];
      return authors.some((a) => String(a || '').toLowerCase().includes(qLower));
    });

    return res.status(200).json({ books: filtered.length ? filtered : books });
  } catch (error) {
    // Axios error may include Google response details (often the reason for a 403).
    const status = error?.response?.status || 500;
    const googleMessage = error?.response?.data?.error?.message || error?.response?.data?.message;
    return res.status(status).json({
      message: googleMessage || error.message,
      books: [],
      googleError: error?.response?.data || null,
    });
  }
};

export const createSession = async (req, res) => {
  try {
    const { groupId, userId, bookId } = req.body;
    if (!groupId || !userId || !bookId) {
      return res.status(400).json({ message: 'Group, user, and bookId are required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!isGroupMember(group, userId)) {
      return res.status(403).json({ message: 'You must be a member of this group' });
    }
    if (!canManageGroupSession(group, userId)) {
      return res.status(403).json({ message: 'Only the owner or a moderator can start a reading session' });
    }

    const activeSession = await getActiveSessionForGroup(groupId);
    if (activeSession) {
      return res.status(409).json({ message: 'This group already has an active reading session' });
    }

    const bookInfo = await buildBookInfo(bookId);
    if (!bookInfo) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const username = await resolveUsername(userId, req.body.username);
    const joinedAt = new Date();
    const session = await ReadingSession.create({
      bookId: bookInfo.bookId,
      title: bookInfo.title,
      authors: Array.isArray(bookInfo.authors) ? bookInfo.authors : [],
      coverImage: bookInfo.coverImage || '',
      pageCount: Number(bookInfo.pageCount || 0),
      groupId,
      hostedBy: userId,
      startedAt: joinedAt,
      participants: [{
        userId,
        username,
        currentPage: 1,
        joinedAt,
        lastActive: joinedAt,
        completedAt: null,
      }],
    });

    // if (Number(session.pageCount || 0) <= 1) {
    //   session.status = 'completed';
    //   session.completedAt = joinedAt;
    //   await session.save();
    // }

    const hydrated = await buildSessionPopulation(session);
    return res.status(201).json({ session: hydrated });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};

export const getSessionByGroup = async (req, res) => {
  try {
    const session = await getActiveSessionForGroup(req.params.groupId);
    if (!session) {
      return res.status(200).json({ session: null });
    }

    const hydrated = await buildSessionPopulation(session);
    return res.status(200).json({ session: hydrated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const joinSession = async (req, res) => {
  try {
    const session = await ensureActiveSession(req.params.sessionId);
    const { userId, username } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'User is required' });
    }

    const group = await Group.findById(session.groupId);
    if (!group || !isGroupMember(group, userId)) {
      return res.status(403).json({ message: 'You must be a member of this group to join the reading room' });
    }

    const now = new Date();
    const participantUsername = await resolveUsername(userId, username);
    const participantIndex = session.participants.findIndex((participant) => toId(participant.userId) === toId(userId));

    if (participantIndex === -1) {
      session.participants.push({
        userId,
        username: participantUsername,
        currentPage: 1,
        joinedAt: now,
        lastActive: now,
        completedAt: null,
      });
    } else {
      session.participants[participantIndex].username = participantUsername;
      session.participants[participantIndex].lastActive = now;
    }

    await session.save();
    const hydrated = await buildSessionPopulation(session);
    return res.status(200).json({ session: hydrated });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};

export const updatePage = async (req, res) => {
  try {
    const session = await ensureActiveSession(req.params.sessionId);
    const { userId, currentPage, username } = req.body;
    const numericPage = Number(currentPage);
    if (!userId || !Number.isFinite(numericPage) || numericPage < 1) {
      return res.status(400).json({ message: 'Valid user and page are required' });
    }

    const participantIndex = session.participants.findIndex((participant) => toId(participant.userId) === toId(userId));
    if (participantIndex === -1) {
      return res.status(403).json({ message: 'Join the reading room before updating progress' });
    }

    const now = new Date();
    const participant = session.participants[participantIndex];
    participant.currentPage = Math.min(numericPage, Number(session.pageCount || numericPage));
    participant.lastActive = now;
    participant.username = await resolveUsername(userId, username || participant.username);

    if (Number(session.pageCount || 0) > 0 && participant.currentPage >= Number(session.pageCount)) {
      participant.completedAt = participant.completedAt || now;
    } else if (participant.currentPage < Number(session.pageCount || 0)) {
      participant.completedAt = null;
    }

    await session.save();
    const completedSession = await syncCompletion(session);
    const hydrated = await buildSessionPopulation(completedSession || session);
    return res.status(200).json({ session: hydrated, participant: hydrated.participants.find((item) => toId(item.userId) === toId(userId)) });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};

export const addReaction = async (req, res) => {
  try {
    const session = await ensureActiveSession(req.params.sessionId);
    const { userId, username, page, emoji, note = '' } = req.body;
    const numericPage = Number(page);
    if (!userId || !Number.isFinite(numericPage) || numericPage < 1 || !emoji) {
      return res.status(400).json({ message: 'Valid reaction data is required' });
    }
    if (!FIXED_REACTIONS.includes(emoji)) {
      return res.status(400).json({ message: 'Unsupported reaction emoji' });
    }

    const participant = session.participants.find((item) => toId(item.userId) === toId(userId));
    if (!participant) {
      return res.status(403).json({ message: 'Join the reading room before posting reactions' });
    }
    if (numericPage > Number(participant.currentPage || 0)) {
      participant.currentPage = numericPage;
      participant.lastActive = new Date();
      if (Number(session.pageCount || 0) > 0 && numericPage >= Number(session.pageCount)) {
        participant.completedAt = participant.completedAt || new Date();
      } else {
        participant.completedAt = null;
      }
    }

    const reaction = {
      userId,
      username: await resolveUsername(userId, username || participant.username),
      page: numericPage,
      emoji,
      note: String(note || '').trim().slice(0, 140),
      createdAt: new Date(),
    };

    session.annotations.push(reaction);
    await session.save();
    const hydrated = await buildSessionPopulation(session);
    return res.status(201).json({ session: hydrated, reaction });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};

export const getVisibleReactions = async (req, res) => {
  try {
    const session = await ReadingSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Reading session not found', reactions: [] });
    }

    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User is required', reactions: [] });
    }

    const participant = session.participants.find((item) => toId(item.userId) === toId(userId));
    if (!participant) {
      return res.status(403).json({ message: 'Join the reading room before viewing reactions', reactions: [] });
    }

    const maxVisiblePage = Math.min(Number(req.params.page || participant.currentPage || 0), Number(participant.currentPage || 0));
    const reactions = session.annotations
      .filter((reaction) => Number(reaction.page || 0) <= maxVisiblePage)
      .sort((a, b) => Number(a.page || 0) - Number(b.page || 0) || new Date(a.createdAt) - new Date(b.createdAt));

    return res.status(200).json({ reactions });
  } catch (error) {
    return res.status(500).json({ message: error.message, reactions: [] });
  }
};

export const handleSocketJoinRoom = async ({ groupId, sessionId, userId, username }) => {
  const targetSession = sessionId ? await ReadingSession.findById(sessionId) : await getActiveSessionForGroup(groupId);
  if (!targetSession) {
    const error = new Error('Reading session not found');
    error.status = 404;
    throw error;
  }

  const group = await Group.findById(targetSession.groupId);
  if (!group || !isGroupMember(group, userId)) {
    const error = new Error('You must be a member of this group to join the reading room');
    error.status = 403;
    throw error;
  }

  const now = new Date();
  const participantUsername = await resolveUsername(userId, username);
  let participant = targetSession.participants.find((item) => toId(item.userId) === toId(userId));
  if (!participant) {
    targetSession.participants.push({
      userId,
      username: participantUsername,
      currentPage: 1,
      joinedAt: now,
      lastActive: now,
      completedAt: null,
    });
  } else {
    participant.username = participantUsername;
    participant.lastActive = now;
  }

  await targetSession.save();
  return createReadingSessionSnapshot(targetSession._id);
};

export const handleSocketPageUpdate = async ({ sessionId, userId, currentPage, username }) => {
  const session = await ensureActiveSession(sessionId);
  const numericPage = Number(currentPage);
  if (!Number.isFinite(numericPage) || numericPage < 1) {
    throw Object.assign(new Error('Valid page is required'), { status: 400 });
  }

  const participant = session.participants.find((item) => toId(item.userId) === toId(userId));
  if (!participant) {
    throw Object.assign(new Error('Join the reading room before updating progress'), { status: 403 });
  }

  participant.currentPage = Math.min(numericPage, Number(session.pageCount || numericPage));
  participant.lastActive = new Date();
  participant.username = await resolveUsername(userId, username || participant.username);
  if (Number(session.pageCount || 0) > 0 && participant.currentPage >= Number(session.pageCount)) {
    participant.completedAt = participant.completedAt || new Date();
  }

  await session.save();
  const completedSession = await syncCompletion(session);
  return createReadingSessionSnapshot(completedSession?._id || session._id);
};

export const handleSocketReaction = async ({ sessionId, userId, page, emoji, note = '', username }) => {
  const session = await ensureActiveSession(sessionId);
  const participant = session.participants.find((item) => toId(item.userId) === toId(userId));
  const numericPage = Number(page);
  if (!participant) {
    throw Object.assign(new Error('Join the reading room before posting reactions'), { status: 403 });
  }
  if (!FIXED_REACTIONS.includes(emoji)) {
    throw Object.assign(new Error('Unsupported reaction emoji'), { status: 400 });
  }
  if (!Number.isFinite(numericPage) || numericPage < 1) {
    throw Object.assign(new Error('Invalid page number'), { status: 400 });
  }

  if (numericPage > Number(participant.currentPage || 0)) {
    participant.currentPage = numericPage;
    participant.lastActive = new Date();
    if (Number(session.pageCount || 0) > 0 && numericPage >= Number(session.pageCount)) {
      participant.completedAt = participant.completedAt || new Date();
    } else {
      participant.completedAt = null;
    }
  }

  session.annotations.push({
    userId,
    username: await resolveUsername(userId, username || participant.username),
    page: numericPage,
    emoji,
    note: String(note || '').trim().slice(0, 140),
    createdAt: new Date(),
  });
  await session.save();
  return createReadingSessionSnapshot(session._id);
};

export const handleSocketReaderCompleted = async ({ sessionId, userId, currentPage, username }) => {
  const session = await ensureActiveSession(sessionId);
  const participant = session.participants.find((item) => toId(item.userId) === toId(userId));
  if (!participant) {
    throw Object.assign(new Error('Join the reading room before marking completion'), { status: 403 });
  }

  const finishedAt = new Date();
  participant.currentPage = Math.max(Number(currentPage || participant.currentPage || 0), Number(session.pageCount || currentPage || 0));
  participant.completedAt = finishedAt;
  participant.lastActive = finishedAt;
  participant.username = await resolveUsername(userId, username || participant.username);
  await session.save();
  const completedSession = await syncCompletion(session);
  return createReadingSessionSnapshot(completedSession?._id || session._id);
};

export const handleSocketCheckCompletion = async ({ sessionId }) => {
  const session = await ensureActiveSession(sessionId);
  const completedSession = await syncCompletion(session);
  return createReadingSessionSnapshot(completedSession?._id || session._id);
};

export const cancelSession = async (req, res) => {
  try {
    const session = await ensureActiveSession(req.params.sessionId);
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'User is required' });

    const group = await Group.findById(session.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!canManageGroupSession(group, userId)) {
      return res.status(403).json({ message: 'Only the owner or a moderator can cancel a session' });
    }

    session.status = 'cancelled';
    session.completedAt = new Date();
    await session.save();

    const hydrated = await buildSessionPopulation(session);
    return res.status(200).json({ session: hydrated });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
};

export const getReadingRoomState = async (groupId) => {
  const session = await getActiveSessionForGroup(groupId);
  if (!session) return null;
  return createReadingSessionSnapshot(session._id);
};
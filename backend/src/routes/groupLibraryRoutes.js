import express from 'express';
import multer from 'multer';
import path from 'path';

import GroupBook from '../models/GroupBook.js';
import Group from '../models/Group.js';
import { uploadFileToGridFS, deleteFileFromGridFS } from '../utils/gridfs.js';

const router = express.Router({ mergeParams: true });

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

const toId = (v) => (v?._id || v ? (v._id ? v._id.toString() : v.toString()) : '');

const ensureGroupMember = async (groupId, userId) => {
  const group = await Group.findById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    throw err;
  }
  const isMember = (group.members || []).some((m) => toId(m) === toId(userId));
  if (!isMember) {
    const err = new Error('You must be a member of this group');
    err.status = 403;
    throw err;
  }
  return group;
};

router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    if (!groupId || !userId) return res.status(400).json({ message: 'groupId and userId are required' });

    const group = await ensureGroupMember(groupId, userId);

    // Only owner or moderators can upload PDFs
    const isOwnerOrModerator =
      toId(group.createdBy) === toId(userId) || (group.moderators || []).some((m) => toId(m) === toId(userId));
    if (!isOwnerOrModerator) return res.status(403).json({ message: 'Only owner/moderator can upload books' });

    if (!req.file) return res.status(400).json({ message: 'PDF file is required' });

    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${unique}-${req.file.originalname}`;
    await uploadFileToGridFS(req.file.buffer, filename, req.file.mimetype);

    const book = await GroupBook.create({
      groupId,
      uploadedBy: userId,
      filename: filename,
      originalName: req.file.originalname,
      title: req.body.title || path.parse(req.file.originalname).name,
      fileSize: req.file.size,
      uploadedAt: new Date(),
      pageCount: Number(req.body.pageCount || 0) || 0,
      coverImage: req.body.coverImage || '',
    });

    return res.status(201).json({ book });
  } catch (e) {
    return res.status(e.status || 500).json({ message: e.message || 'Upload failed' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    await ensureGroupMember(groupId, userId);

    const books = await GroupBook.find({ groupId }).sort({ uploadedAt: -1 });
    return res.status(200).json({ books });
  } catch (e) {
    return res.status(e.status || 500).json({ message: e.message || 'Failed to list library' });
  }
});

router.delete('/:bookId', async (req, res) => {
  try {
    const { groupId, bookId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const group = await ensureGroupMember(groupId, userId);
    const isOwnerOrModerator =
      toId(group.createdBy) === toId(userId) || (group.moderators || []).some((m) => toId(m) === toId(userId));
    if (!isOwnerOrModerator) return res.status(403).json({ message: 'Only owner/moderator can delete books' });

    const book = await GroupBook.findById(bookId);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    if (toId(book.groupId) !== toId(groupId)) return res.status(404).json({ message: 'Book not in this group' });

    try {
      await deleteFileFromGridFS(book.filename);
    } catch (err) {
      console.error('Failed to delete from GridFS:', err);
    }

    await GroupBook.findByIdAndDelete(bookId);
    return res.status(200).json({ message: 'Book deleted' });
  } catch (e) {
    return res.status(e.status || 500).json({ message: e.message || 'Failed to delete book' });
  }
});

export default router;


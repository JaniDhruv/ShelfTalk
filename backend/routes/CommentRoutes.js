import express from 'express';
import {
  createComment,
  getComments,
  getCommentsByPost,
  updateComment,
  deleteComment,
  toggleCommentLike
} from '../controllers/commentController.js';

const router = express.Router();

router.post('/', createComment);              // Create a comment
router.get('/', getComments);                // Get all comments
router.get('/post/:postId', getCommentsByPost); // Get comments for a specific post
router.put('/:id', updateComment);           // Update a comment
router.delete('/:id', deleteComment);        // Delete a comment
router.put('/:id/like', toggleCommentLike);  // Toggle like on comment

export default router;

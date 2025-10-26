import Comment from '../models/Comment.js';
import Post from '../models/Post.js';

// Create a new comment
export const createComment = async (req, res) => {
  try {
    const { text, author, post, parentComment } = req.body;

    // Check if post exists
    const postExists = await Post.findById(post);
    if (!postExists) return res.status(404).json({ message: 'Post not found' });

    // If parentComment exists, verify it exists and belongs to same post
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent || parent.post.toString() !== post) {
        return res.status(400).json({ message: 'Invalid parent comment' });
      }
    }

    const newComment = new Comment({ text, author, post, parentComment });
    await newComment.save();
    
    // Populate author for response
    await newComment.populate('author', 'username');

    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: 'Error creating comment', error: error.message });
  }
};

// Get all comments
export const getComments = async (req, res) => {
  try {
    const comments = await Comment.find()
      .populate('author', 'username')
      .populate('post', 'content');
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments', error: error.message });
  }
};

// Get comments for a specific post
export const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ post: postId })
      .populate('author', 'username')
      .populate('likes', 'username')
      .sort({ createdAt: 1 });
    
    // Organize comments into tree structure
    const commentMap = {};
    const rootComments = [];
    
    comments.forEach(comment => {
      commentMap[comment._id] = { ...comment.toObject(), replies: [] };
    });
    
    comments.forEach(comment => {
      if (comment.parentComment) {
        if (commentMap[comment.parentComment]) {
          commentMap[comment.parentComment].replies.push(commentMap[comment._id]);
        }
      } else {
        rootComments.push(commentMap[comment._id]);
      }
    });
    
    res.status(200).json(rootComments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments for post', error: error.message });
  }
};

// Update a comment
export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, authorId } = req.body;

    if (!text || !authorId) {
      return res.status(400).json({ 
        success: false,
        message: 'Text and authorId are required' 
      });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ 
        success: false,
        message: 'Comment not found' 
      });
    }

    // Check if the user is the author of the comment
    if (comment.author.toString() !== authorId) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only edit your own comments' 
      });
    }

    comment.text = text;
    await comment.save();

    // Populate author data before sending response
    await comment.populate('author', 'username');

    res.status(200).json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating comment', 
      error: error.message 
    });
  }
};

// Delete a comment
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { authorId } = req.body;

    if (!authorId) {
      return res.status(400).json({ 
        success: false,
        message: 'AuthorId is required' 
      });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ 
        success: false,
        message: 'Comment not found' 
      });
    }

    // Check if the user is the author of the comment
    if (comment.author.toString() !== authorId) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only delete your own comments' 
      });
    }

    await Comment.findByIdAndDelete(id);

    res.status(200).json({ 
      success: true,
      message: 'Comment deleted successfully' 
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting comment', 
      error: error.message 
    });
  }
};

// Toggle like on comment
export const toggleCommentLike = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    
    const likeIndex = comment.likes.indexOf(userId);
    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
    } else {
      comment.likes.push(userId);
    }
    
    await comment.save();
    res.status(200).json({ message: 'Like toggled', likes: comment.likes });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling like', error: error.message });
  }
};

import Post from '../models/Post.js';
import User from '../models/User.js';
import Group from '../models/Group.js';

// @desc Create a new post
// @route POST /api/posts
export const createPost = async (req, res) => {
  try {
    const { content, author, group } = req.body;

    if (!content || !author) {
      return res.status(400).json({ 
        success: false,
        message: 'Content and author are required' 
      });
    }

    // Check if user exists
    const userExists = await User.findById(author);
    if (!userExists) {
      return res.status(404).json({ 
        success: false,
        message: 'Author not found' 
      });
    }

    // If group is provided, check if group exists
    if (group) {
      const groupExists = await Group.findById(group);
      if (!groupExists) {
        return res.status(404).json({ 
          success: false,
          message: 'Group not found' 
        });
      }
    }

    const post = new Post({
      content,
      author,
      group: group || null
    });
    await post.save();
    
    // Populate author data before sending response
    await post.populate({
      path: 'author',
      select: 'username email profile',
      populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
    });
    if (group) {
      await post.populate('group', 'name visibility members');
    }

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating post', 
      error: error.message 
    });
  }
};

// ... rest of your controller methods remain the same
// @desc Get all posts
// @route GET /api/posts
export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate({
        path: 'author',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
  .populate('group', 'name visibility members');
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts', error: error.message });
  }
};

// @desc Get single post by ID
// @route GET /api/posts/:id
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate({
        path: 'author',
        select: 'username email profile',
        populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
      })
  .populate('group', 'name visibility members');

    if (!post) return res.status(404).json({ message: 'Post not found' });

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching post', error: error.message });
  }
};

// @desc Update a post
// @route PUT /api/posts/:id
export const updatePost = async (req, res) => {
  try {
    const { content, authorId } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ 
      success: false,
      message: 'Post not found' 
    });

    // Check if the user is the author of the post
    if (post.author.toString() !== authorId) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only edit your own posts' 
      });
    }

    if (content) post.content = content;

    await post.save();
    
    // Populate author data before sending response
    await post.populate({
      path: 'author',
      select: 'username email profile',
      populate: { path: 'profile', select: 'fullName isOnline lastSeen' }
    });
    if (post.group) {
      await post.populate('group', 'name visibility members');
    }

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating post', 
      error: error.message 
    });
  }
};

// @desc Delete a post
// @route DELETE /api/posts/:id
export const deletePost = async (req, res) => {
  try {
    const { authorId } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ 
      success: false,
      message: 'Post not found' 
    });

    // Check if the user is the author of the post
    if (post.author.toString() !== authorId) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only delete your own posts' 
      });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.status(200).json({ 
      success: true,
      message: 'Post deleted successfully' 
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting post', 
      error: error.message 
    });
  }
};

// @desc Like/Unlike a post
// @route PUT /api/posts/:id/like
export const toggleLike = async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: 'Post not found' });

    const index = post.likes.indexOf(userId);
    if (index === -1) {
      post.likes.push(userId);
    } else {
      post.likes.splice(index, 1);
    }

    await post.save();
    res.status(200).json({ message: 'Like status updated', likes: post.likes });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling like', error: error.message });
  }
};

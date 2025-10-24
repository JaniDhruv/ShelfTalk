import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './PostsPage.css';
import './Discover.css';
import ConfirmationModal from '../components/ConfirmationModal';

const buildPresence = (user) => {
  const profile = user?.profile;
  if (!profile) {
    return { isOnline: false, lastSeen: null };
  }
  const lastSeenDate = profile.lastSeen ? new Date(profile.lastSeen) : null;
  const validLastSeen = lastSeenDate && !Number.isNaN(lastSeenDate.getTime()) ? lastSeenDate : null;
  const isOnlineFlag = profile.isOnline === true || profile.isOnline === 'true' || profile.isOnline === 1;
  return {
    isOnline: isOnlineFlag,
    lastSeen: validLastSeen,
  };
};

const humanizeLastSeen = (date) => {
  if (!date) return null;
  const reference = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(reference.getTime())) return null;
  const diffMs = Date.now() - reference.getTime();
  if (diffMs < 0) return null;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return reference.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatPresenceLabel = (presence) => {
  if (!presence) return 'Offline';
  if (presence.isOnline) return 'Online';
  const humanized = humanizeLastSeen(presence.lastSeen);
  return humanized ? `Last seen ${humanized}` : 'Offline';
};

export default function PostsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState('');
  // Active section for navigation: create | all | my | liked
  const [activeSection, setActiveSection] = useState('all');
  
  // Comment state
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [showComments, setShowComments] = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});
  const [sharePostId, setSharePostId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState({});
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
  // User popover state
  const [openUserMenu, setOpenUserMenu] = useState(null); // post id keyed
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setOpenUserMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleUsernameAction = (postAuthorId, action, conversationIdHint) => {
    if (!postAuthorId) return;
    if (action === 'profile') {
      navigate(`/profile/${postAuthorId}`);
      return;
    }
    if (action === 'message') {
      // If we already know a conversation id, navigate directly
      if (conversationIdHint) {
        navigate(`/chat?conversation=${conversationIdHint}`);
      } else {
        // Fallback: pass user param so Chat page can start or locate convo
        navigate(`/chat?user=${postAuthorId}`);
      }
    }
  };
  

  // Fetch posts
  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    const loadConversations = async () => {
      if (!user?._id) return;
      try {
        const resp = await fetch(`${API_BASE}/api/chat/conversations/${user._id}`);
        if (resp.ok) {
          const data = await resp.json();
          setConversations(data);
        }
      } catch {}
    };
    loadConversations();
  }, [user]);

  const fetchPosts = async () => {
    try {
      setPostsLoading(true);
      const response = await fetch('http://localhost:5000/api/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
        
        // Fetch comment counts for each post
        const counts = {};
        for (const post of data) {
          try {
            const commentResponse = await fetch(`http://localhost:5000/api/comments/post/${post._id}`);
            if (commentResponse.ok) {
              const postComments = await commentResponse.json();
              counts[post._id] = postComments.length;
            } else {
              counts[post._id] = 0;
            }
          } catch (err) {
            counts[post._id] = 0;
          }
        }
        
        // Update posts with comment counts
        const postsWithCounts = data.map(post => ({
          ...post,
          commentCount: counts[post._id] || 0
        }));
        setPosts(postsWithCounts);
      } else {
        setError('Failed to load posts');
      }
    } catch (err) {
      setError('Something went wrong while loading posts');
    } finally {
      setPostsLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    
    if (!user || !user._id) {
      setError('You must be logged in to create a post');
      return;
    }

    if (!content.trim()) {
      setError('Post content cannot be empty');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: content.trim(), 
          author: user._id 
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        const created = payload?.data || payload; // support both shapes
        // Ensure author object is present immediately
        const authorObj = created.author?._id ? created.author : { _id: user._id, username: user.username };
        const newPost = {
          ...created,
          author: authorObj,
          likes: created.likes || [],
          commentCount: 0,
        };
        setPosts(prev => [newPost, ...prev]);
        setContent('');
      } else {
        setError('Failed to create post');
      }
    } catch (err) {
      setError('Something went wrong while creating the post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (postId) => {
    if (!user) {
      setError('You must be logged in to like posts');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/posts/${postId}/like`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });

      if (response.ok) {
        // Refresh posts to show updated likes
        fetchPosts();
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleEditPost = (post) => {
    setEditingPost(post._id);
    setEditContent(post.content);
  };

  const handleSaveEdit = async (postId) => {
    if (!editContent.trim()) {
      setError('Post content cannot be empty');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: editContent.trim(),
          authorId: user._id 
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update post');
      }

      setEditingPost(null);
      setEditContent('');
      await fetchPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      setError(`Failed to update post: ${error.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditContent('');
  };

  const handleDeletePost = (postId) => {
    setDeleteTarget({ type: 'post', id: postId });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'post') {
        const res = await fetch(`http://localhost:5000/api/posts/${deleteTarget.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authorId: user._id })
        });

        if (!res.ok) throw new Error('Failed to delete post');
        
        await fetchPosts();
      } else if (deleteTarget.type === 'comment') {
        const res = await fetch(`http://localhost:5000/api/comments/${deleteTarget.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authorId: user._id })
        });

        if (!res.ok) throw new Error('Failed to delete comment');
        
        await fetchComments(deleteTarget.postId);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      setError(`Failed to delete ${deleteTarget.type}`);
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  // Comment functions
  const fetchComments = async (postId) => {
    try {
      setCommentsLoading(prev => ({ ...prev, [postId]: true }));
      const response = await fetch(`http://localhost:5000/api/comments/post/${postId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(prev => ({ ...prev, [postId]: data }));
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setCommentsLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleToggleComments = async (postId) => {
    const isShowing = showComments[postId];
    setShowComments(prev => ({ ...prev, [postId]: !isShowing }));
    
    if (!isShowing && !comments[postId]) {
      await fetchComments(postId);
    }
  };

  const handleAddComment = async (postId) => {
    const text = commentText[postId];
    
    if (!user || !user._id) {
      setError('You must be logged in to comment');
      return;
    }

    if (!text?.trim()) {
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          author: user._id,
          post: postId
        }),
      });

      if (response.ok) {
        // Clear the input
        setCommentText(prev => ({ ...prev, [postId]: '' }));
        
        // Refresh comments
        await fetchComments(postId);
        
        // Update the comment count for this specific post
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === postId 
              ? { ...post, commentCount: (post.commentCount || 0) + 1 }
              : post
          )
        );
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleLikeComment = async (commentId, postId) => {
    if (!user) {
      setError('You must be logged in to like comments');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/comments/${commentId}/like`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });

      if (response.ok) {
        // Refresh comments to show updated likes
        await fetchComments(postId);
      }
    } catch (err) {
      console.error('Error liking comment:', err);
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment._id);
    setEditCommentText(comment.text);
  };

  const handleSaveEditComment = async (commentId, postId) => {
    if (!editCommentText.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: editCommentText.trim(),
          authorId: user._id 
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update comment');
      }

      setEditingComment(null);
      setEditCommentText('');
      await fetchComments(postId);
    } catch (error) {
      console.error('Error updating comment:', error);
      setError(`Failed to update comment: ${error.message}`);
    }
  };

  const handleCancelEditComment = () => {
    setEditingComment(null);
    setEditCommentText('');
  };

  const handleDeleteComment = (commentId, postId) => {
    setDeleteTarget({ type: 'comment', id: commentId, postId });
    setShowDeleteModal(true);
  };

  const handleReply = (comment) => {
    setReplyingTo(comment._id);
    setReplyText('');
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  const handleSubmitReply = async (postId, parentCommentId) => {
    if (!replyText.trim()) {
      setError('Reply cannot be empty');
      return;
    }

    if (!user || !user._id) {
      setError('You must be logged in to reply');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: replyText.trim(),
          author: user._id,
          post: postId,
          parentComment: parentCommentId
        }),
      });

      if (response.ok) {
        setReplyText('');
        setReplyingTo(null);
        await fetchComments(postId);
        
        // Update the comment count for this specific post
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === postId 
              ? { ...post, commentCount: (post.commentCount || 0) + 1 }
              : post
          )
        );
      } else {
        setError('Failed to add reply');
      }
    } catch (err) {
      console.error('Error adding reply:', err);
      setError('Failed to add reply');
    }
  };

  const toggleReplies = (commentId) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  // Recursive comment component
  const CommentItem = ({ comment, postId, level = 0 }) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isShowingReplies = showReplies[comment._id];
    const isReplying = replyingTo === comment._id;
    const isEditing = editingComment === comment._id;

    return (
      <div className={`comment-item ${comment.likes?.includes(user._id) ? 'comment-liked-by-user' : ''}`} style={{ marginLeft: level * 20 }}>
        <div className="comment-avatar">
          {comment.author?.username ? comment.author.username[0].toUpperCase() : 'U'}
        </div>
        <div className="comment-content">
          <div className="comment-header">
            <span className="comment-author">{comment.author?.username}</span>
            <span className="comment-time">
              {new Date(comment.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </span>
            {user && comment.author?._id === user._id && (
              <div className="comment-actions-menu">
                <button className="comment-menu-trigger">
                  <i className="fas fa-ellipsis-h"></i>
                </button>
                <div className="comment-menu-options">
                  <button onClick={() => handleEditComment(comment)} className="comment-menu-option edit">
                    <i className="fas fa-edit"></i>
                    <span>Edit</span>
                  </button>
                  <button onClick={() => handleDeleteComment(comment._id, postId)} className="comment-menu-option delete">
                    <i className="fas fa-trash"></i>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {isEditing ? (
            <div className="edit-form-container">
              <textarea
                value={editCommentText}
                onChange={(e) => setEditCommentText(e.target.value)}
                className="themed-textarea"
                placeholder="Edit your comment..."
              />
              <div className="form-actions">
                <button
                  onClick={() => handleSaveEditComment(comment._id, postId)}
                  className="btn-form-primary"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEditComment}
                  className="btn-form-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="comment-text">{comment.text}</p>
          )}
          
          <div className="comment-actions-bar">
            {(() => {
              const uid = user?._id || user?.id;
              const isLiked = (comment.likes || []).some(l => {
                const id = (typeof l === 'string' || typeof l === 'number') ? l : (l?._id || l?.id);
                return id === uid;
              });
              return (
                <>
                  <button
                    className={`comment-action-btn btn-like btn-like-sm ${isLiked ? 'liked' : ''}`}
                    onClick={() => handleLikeComment(comment._id, postId)}
                  >
                    <i className={`${isLiked ? 'fas fa-heart' : 'far fa-heart'}`}></i>
                    {comment.likes?.length > 0 && <span>{comment.likes.length}</span>}
                  </button>

                  <button
                    className="comment-action-btn reply"
                    onClick={() => handleReply(comment)}
                  >
                    <i className="far fa-reply"></i>
                    Reply
                  </button>

                  {hasReplies && (
                    <button
                      className="comment-action-btn"
                      onClick={() => toggleReplies(comment._id)}
                      style={{ color: '#6b7280' }}
                    >
                      <i className={`fas fa-chevron-${isShowingReplies ? 'up' : 'down'}`}></i>
                      {isShowingReplies ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          {/* Reply Form */}
          {isReplying && (
            <div className="reply-form-container">
              <div className="reply-form-wrapper">
                <div className="reply-user-avatar">
                  {user.username ? user.username[0].toUpperCase() : 'U'}
                </div>
                <div className="form-input-container">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${comment.author?.username}...`}
                    className="themed-textarea"
                  />
                  <div className="form-actions">
                    <button
                      onClick={handleCancelReply}
                      className="btn-form-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSubmitReply(postId, comment._id)}
                      className="btn-form-primary"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Replies */}
          {hasReplies && isShowingReplies && (
            <div style={{ marginTop: '12px' }}>
              {comment.replies.map(reply => (
                <CommentItem key={reply._id} comment={reply} postId={postId} level={level + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const myPostsCount = user ? posts.filter(p => p.author?._id === user._id).length : 0;
  const likedPostsCount = user ? posts.filter(post => {
    const uid = user?._id || user?.id;
    return (post.likes || []).some(l => {
      const id = (typeof l === 'string' || typeof l === 'number') ? l : (l?._id || l?.id);
      return id === uid;
    });
  }).length : 0;

  const filteredPosts = posts.filter(post => {
    if (activeSection === 'my') return user && post.author?._id === user._id;
    if (activeSection === 'liked') {
      const uid = user?._id || user?.id;
      return (post.likes || []).some(l => {
        const id = (typeof l === 'string' || typeof l === 'number') ? l : (l?._id || l?.id);
        return id === uid;
      });
    }
    return true; // 'all' or 'create' (create section won't show posts list anyway)
  });

  if (!user) {
    return (
      <div className="social-feed-container">
        <div className="auth-required">
          <h2>📚 Join the BookTalk Community</h2>
          <p>Connect with fellow readers and share your literary journey</p>
          <div className="auth-buttons">
            <Link to="/login" className="btn-primary">Login</Link>
            <Link to="/signup" className="btn-secondary">Sign Up</Link>
          </div>
        </div>
      </div>
    );
  }
  /* Unified themed layout */
  return (
    <div className="social-feed-container discover-container fade-in" style={{ overflow: 'visible' }}>
      <section className="sm-header-section">
        <div className="sm-header-content">
          <div>
            <h1 className="sm-title">BookTalk Posts</h1>
            <p className="sm-subtitle">Share reviews, thoughts & spark literary conversations</p>
          </div>
        </div>
      </section>
      <div className="discover-navigation" style={{ position: 'sticky', top: '76px', zIndex: 100 }}>
        <div className="nav-container">
          <button className={`nav-tab ${activeSection === 'create' ? 'active' : ''}`} onClick={() => setActiveSection('create')}>
            <i className="fas fa-pen-nib"></i> Create
          </button>
          <button className={`nav-tab ${activeSection === 'all' ? 'active' : ''}`} onClick={() => setActiveSection('all')}>
            <i className="fas fa-globe"></i> All Posts {posts.length > 0 && <span className="sm-badge">{posts.length}</span>}
          </button>
          <button className={`nav-tab ${activeSection === 'my' ? 'active' : ''}`} onClick={() => setActiveSection('my')}>
            <i className="fas fa-user"></i> My Posts {myPostsCount > 0 && <span className="sm-badge">{myPostsCount}</span>}
          </button>
          <button className={`nav-tab ${activeSection === 'liked' ? 'active' : ''}`} onClick={() => setActiveSection('liked')}>
            <i className="fas fa-heart"></i> Liked {likedPostsCount > 0 && <span className="sm-badge">{likedPostsCount}</span>}
          </button>
        </div>
      </div>
      <div className="discover-content" style={{ maxWidth: '750px' }}>
        {activeSection === 'create' && (
          <div className="create-post-card">
            <div className="create-post-header">
              <div className="user-avatar">{user.username ? user.username[0].toUpperCase() : 'U'}</div>
              <div className="user-info">
                <h3>{user.username}</h3>
                <p>Share your thoughts with the community</p>
              </div>
            </div>
            <form onSubmit={handleCreatePost}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What book are you reading? Share a recommendation, review, or start a discussion..."
                className="post-textarea"
                rows={4}
                disabled={isLoading}
                maxLength={500}
              />
              <div className="create-post-footer">
                <div className={`character-count ${content.length > 450 ? 'warning' : ''}`}>{content.length}/500 characters</div>
                <button type="submit" className="btn-post" disabled={isLoading || !content.trim()}>
                  {isLoading ? (
                    <>
                      <div className="loading-spinner"></div> Sharing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i> Share Post
                    </>
                  )}
                </button>
              </div>
            </form>
            {error && (
              <div className="error-message slide-up">
                <i className="fas fa-exclamation-triangle"></i> {error}
              </div>
            )}
          </div>
        )}
        {activeSection !== 'create' && (
          <div className="posts-feed">
            {postsLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="post-skeleton">
                    <div className="skeleton-header">
                      <div className="skeleton-avatar"></div>
                      <div className="skeleton-text"></div>
                    </div>
                    <div className="skeleton-content"></div>
                    <div className="skeleton-actions"></div>
                  </div>
                ))}
              </>
            ) : filteredPosts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📚</div>
                <h3>No posts yet</h3>
                <p>
                  {activeSection === 'my' && "You haven't shared any posts yet. Start the conversation!"}
                  {activeSection === 'liked' && "You haven't liked any posts yet. Tap the heart on posts you enjoy."}
                  {activeSection === 'all' && "Be the first to share something amazing with the community!"}
                </p>
              </div>
            ) : (
              <>
                {filteredPosts.map(post => {
                  const presence = buildPresence(post.author);
                  const presenceLabel = formatPresenceLabel(presence);
                  return (
                  <article key={post._id} className="post-card">
                    <div className="post-header">
                      <div className="post-author">
                        <div className="post-author-avatar">{post.author?.username ? post.author.username[0].toUpperCase() : 'U'}</div>
                        <div
                          className="post-author-info user-popover-wrapper"
                          ref={openUserMenu === post._id ? userMenuRef : null}
                          onMouseLeave={() => setOpenUserMenu(prev => prev === post._id ? null : prev)}
                        >
                          <button
                            type="button"
                            className="username-trigger"
                            onClick={() => setOpenUserMenu(prev => prev === post._id ? null : post._id)}
                            onMouseEnter={() => setOpenUserMenu(post._id)}
                          >
                            {post.author?.username || 'Unknown User'}
                          </button>
                          <p className="post-time-stamp">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                          <div
                            className={`presence-pill ${presence.isOnline ? 'online' : 'offline'}`}
                            title={presence.isOnline ? 'User is online' : (presence.lastSeen ? `Last seen ${presence.lastSeen.toLocaleString()}` : 'User is offline')}
                          >
                            <span className={`status-dot ${presence.isOnline ? 'online' : 'offline'}`}></span>
                            <span>{presenceLabel}</span>
                          </div>
                          {openUserMenu === post._id && (
                            <div className="user-popover" role="menu">
                              <button
                                className="user-popover-item"
                                onClick={() => handleUsernameAction(post.author?._id, 'profile')}
                              >
                                <i className="fas fa-user-circle"></i> View Profile
                              </button>
                              {user && post.author?._id !== user._id && (
                                <button
                                  className="user-popover-item"
                                  onClick={() => handleUsernameAction(post.author?._id, 'message', post.conversationId)}
                                >
                                  <i className="fas fa-comment-dots"></i> Message
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="post-time">
                        {user && post.author?._id === user._id && (
                          <div className="post-actions-menu">
                            <span className="your-post-badge">Your Post</span>
                            <div className="post-menu-dropdown">
                              <button className="post-menu-trigger"><i className="fas fa-ellipsis-h"></i></button>
                              <div className="post-menu-options">
                                <button onClick={() => handleEditPost(post)} className="post-menu-option edit">
                                  <i className="fas fa-edit"></i><span>Edit Post</span>
                                </button>
                                <button onClick={() => handleDeletePost(post._id)} className="post-menu-option delete">
                                  <i className="fas fa-trash"></i><span>Delete Post</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="post-content">
                      {editingPost === post._id ? (
                        <div className="edit-form-container">
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="themed-textarea" placeholder="Edit your post..." style={{ minHeight: '100px' }} />
                          <div className="form-actions">
                            <button onClick={() => handleSaveEdit(post._id)} className="btn-form-primary">Save</button>
                            <button onClick={handleCancelEdit} className="btn-form-secondary">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p>{post.content}</p>
                      )}
                    </div>
                    <div className="post-actions">
                      {(() => {
                        const uid = user?._id || user?.id;
                        const isPostLiked = (post.likes || []).some(l => {
                          const id = (typeof l === 'string' || typeof l === 'number') ? l : (l?._id || l?.id);
                          return id === uid;
                        });
                        return (
                          <>
                            <button className={`action-btn btn-like ${isPostLiked ? 'liked' : ''}`} onClick={() => handleLike(post._id)}>
                              <i className={`${isPostLiked ? 'fas fa-heart' : 'far fa-heart'}`}></i><span>{post.likes?.length || 0}</span>
                            </button>
                            <button className="action-btn comment-btn" onClick={() => handleToggleComments(post._id)}>
                              <i className="far fa-comment"></i><span>{post.commentCount || 0}</span>
                            </button>
                            <button className="action-btn share-btn" onClick={() => setSharePostId(post._id)}>
                              <i className="fas fa-share"></i><span>Share</span>
                            </button>
                          </>
                        );
                      })()}
                    </div>
                    {showComments[post._id] && (
                      <div className="comments-section">
                        <div className="add-comment-form">
                          <div className="comment-input-wrapper">
                            <div className="comment-user-avatar">{user.username ? user.username[0].toUpperCase() : 'U'}</div>
                            <div className="comment-input-container">
                              <textarea value={commentText[post._id] || ''} onChange={e => setCommentText(prev => ({ ...prev, [post._id]: e.target.value }))} placeholder="Write a comment..." className="comment-textarea" rows={2} maxLength={500} />
                              <div className="comment-actions">
                                <span className="comment-char-count">{(commentText[post._id] || '').length}/500</span>
                                <button className="btn-comment-post" onClick={() => handleAddComment(post._id)} disabled={!(commentText[post._id]?.trim())}>
                                  <i className="fas fa-paper-plane"></i> Post
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="comments-list">
                          {commentsLoading[post._id] ? (
                            <div className="comments-loading">
                              {[...Array(2)].map((_, i) => (
                                <div key={i} className="comment-skeleton">
                                  <div className="comment-skeleton-avatar"></div>
                                  <div className="comment-skeleton-content">
                                    <div className="comment-skeleton-text"></div>
                                    <div className="comment-skeleton-actions"></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : comments[post._id]?.length > 0 ? (
                            <>
                              {comments[post._id].map(comment => (
                                <CommentItem key={comment._id} comment={comment} postId={post._id} />
                              ))}
                            </>
                          ) : (
                            <div className="no-comments">
                              <i className="far fa-comment"></i>
                              <p>No comments yet. Be the first to comment!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
                })}
              </>
            )}
          </div>
        )}
      </div>
      {sharePostId && createPortal((
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setSharePostId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2147483647, padding: '16px' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '520px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div className="modal-header">
              <h3><i className="fas fa-share"></i> Share Post</h3>
              <button className="modal-close-btn" onClick={() => setSharePostId(null)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '10px' }}>
                <button className="btn btn-copy-link" onClick={() => { const url = `${window.location.origin}/posts/${sharePostId}`; navigator.clipboard.writeText(url); setSharePostId(null); }}>Copy Link</button>
              </div>
              <h4>Send to a conversation</h4>
              <div className="user-list">
                {conversations.map(c => {
                  const uid = user?._id || user?.id;
                  const other = (c.members || []).find(m => (m?._id || m) !== uid);
                  const fullName = other?.profile?.fullName || other?.username || 'User';
                  return (
                    <div key={c._id} className="user-result-item">
                      <div className="user-info">
                        <div className="user-avatar">
                          <div className="avatar-circle" style={{ background: '#2e3192' }}>
                            {c.type === 'group' ? <i className="fas fa-users"></i> : (fullName[0] || 'U').toUpperCase()}
                          </div>
                        </div>
                        <div className="user-details">
                          <span className="user-name">{c.type === 'group' ? (c.name || 'Group') : fullName}</span>
                        </div>
                      </div>
                      <button className="btn btn-primary" disabled={shareLoading} onClick={async () => {
                        try {
                          setShareLoading(true);
                          const url = `${window.location.origin}/posts/${sharePostId}`;
                          const senderId = user?._id || user?.id;
                          const post = (posts || []).find(p => p._id === sharePostId);
                          const authorName = post?.author?.profile?.fullName || post?.author?.username || 'the author';
                          const label = `Check out this post by ${authorName}`;
                          const content = `LINKMSG::${label}::${url}`;
                          const resp = await fetch(`${API_BASE}/api/chat/messages/${c._id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senderId, content }) });
                          if (resp.ok) setSharePostId(null);
                        } finally { setShareLoading(false); }
                      }}>{shareLoading ? 'Sharing…' : 'Send Link'}</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
        onConfirm={confirmDelete}
        title={deleteTarget?.type === 'post' ? 'Delete Post' : 'Delete Comment'}
        message={deleteTarget?.type === 'post' ? 'Are you sure you want to delete this post? This action cannot be undone.' : 'Are you sure you want to delete this comment? This action cannot be undone.'}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
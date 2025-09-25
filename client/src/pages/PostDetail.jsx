import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PostsPage.css';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [pRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/api/posts/${id}`),
          fetch(`${API_BASE}/api/comments/post/${id}`)
        ]);
        if (!pRes.ok) throw new Error('Failed to load post');
        const p = await pRes.json();
        const c = cRes.ok ? await cRes.json() : [];
        setPost(p);
        setComments(c);
      } catch (e) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleLike = async () => {
    if (!user || !post) return;
    try {
      const response = await fetch(`${API_BASE}/api/posts/${post._id}/like`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });
      if (response.ok) {
        const data = await response.json();
        setPost(prev => ({ ...prev, likes: data.likes }));
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleAddComment = async () => {
    if (!user || !commentText.trim()) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: commentText.trim(),
          author: user._id,
          post: post._id
        }),
      });

      if (response.ok) {
        setCommentText('');
        // Reload comments
        const cRes = await fetch(`${API_BASE}/api/comments/post/${id}`);
        if (cRes.ok) {
          const newComments = await cRes.json();
          setComments(newComments);
        }
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE}/api/comments/${commentId}/like`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });
      if (response.ok) {
        // Reload comments
        const cRes = await fetch(`${API_BASE}/api/comments/post/${id}`);
        if (cRes.ok) {
          const newComments = await cRes.json();
          setComments(newComments);
        }
      }
    } catch (err) {
      console.error('Error liking comment:', err);
    }
  };

  const handleReply = (comment) => {
    setReplyingTo(comment._id);
    setReplyText('');
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  const handleSubmitReply = async (parentCommentId) => {
    if (!replyText.trim()) return;
    if (!user || !user._id) return;
    try {
      const response = await fetch(`${API_BASE}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: replyText.trim(),
          author: user._id,
          post: post._id,
          parentComment: parentCommentId
        }),
      });
      if (response.ok) {
        setReplyText('');
        setReplyingTo(null);
        const cRes = await fetch(`${API_BASE}/api/comments/post/${id}`);
        if (cRes.ok) {
          const newComments = await cRes.json();
          setComments(newComments);
        }
      }
    } catch (err) {
      console.error('Error adding reply:', err);
    }
  };

  const toggleReplies = (commentId) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  if (loading) return (
    <div className="social-feed-container fade-in">
      <div className="post-skeleton">
        <div className="skeleton-header">
          <div className="skeleton-avatar"></div>
          <div className="skeleton-text"></div>
        </div>
        <div className="skeleton-content"></div>
        <div className="skeleton-actions"></div>
      </div>
    </div>
  );

  if (error) return (
    <div className="social-feed-container">
      <div className="error-message">
        <i className="fas fa-exclamation-triangle"></i>
        {error}
      </div>
    </div>
  );

  if (!post) return (
    <div className="social-feed-container">
      <div className="empty-state">
        <div className="empty-state-icon">📚</div>
        <h3>Post not found</h3>
        <p>The post you're looking for doesn't exist or has been deleted.</p>
      </div>
    </div>
  );

  return (
    <div className="social-feed-container fade-in">
      {/* Header */}
      <header className="social-header">
        <div className="social-header-content">
          <Link to="/posts" className="back-link">
            <i className="fas fa-arrow-left"></i> Back to Posts
          </Link>
          <h1>📖 Post Details</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="social-main">
        {/* Single Post */}
        <article className="post-card">
          <div className="post-header">
            <div className="post-author">
              <div className="post-author-avatar">
                {post.author?.username ? post.author.username[0].toUpperCase() : 'U'}
              </div>
              <div className="post-author-info">
                <h4>{post.author?.username || 'Unknown User'}</h4>
                <p>{new Date(post.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}</p>
              </div>
            </div>
            <div className="post-time">
              {user && post.author?._id === user._id && (
                <div className="post-actions-menu">
                  <span className="your-post-badge">Your Post</span>
                </div>
              )}
            </div>
          </div>

          <div className="post-content">
            <p>{post.content}</p>
          </div>

          <div className="post-actions">
            {(() => {
              const uid = user?._id || user?.id;
              const isPostLiked = (post.likes || []).some(l => {
                const id = (typeof l === 'string' || typeof l === 'number') ? l : (l?._id || l?.id);
                return id === uid;
              });
              return (
                <button
                  className={`action-btn btn-like ${isPostLiked ? 'liked' : ''}`}
                  onClick={handleLike}
                >
                  <i className={`${isPostLiked ? 'fas fa-heart' : 'far fa-heart'}`}></i>
                  <span>{post.likes?.length || 0}</span>
                </button>
              );
            })()}
            
            <button className="action-btn comment-btn">
              <i className="far fa-comment"></i>
              <span>{comments.length || 0}</span>
            </button>
            
            <button className="action-btn share-btn">
              <i className="fas fa-share"></i>
              <span>Share</span>
            </button>
          </div>

          {/* Comments Section - Always Shown */}
          <div className="comments-section">
            {/* Add Comment Form */}
            <div className="add-comment-form">
              <div className="comment-input-wrapper">
                <div className="comment-user-avatar">
                  {user?.username ? user.username[0].toUpperCase() : 'U'}
                </div>
                <div className="comment-input-container">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="comment-textarea"
                    rows={2}
                    maxLength={500}
                  />
                  <div className="comment-actions">
                    <span className="comment-char-count">
                      {commentText.length}/500
                    </span>
                    <button
                      className="btn-comment-post"
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                    >
                      <i className="fas fa-paper-plane"></i>
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments List with Replies */}
            <div className="comments-list">
              {comments.length === 0 ? (
                <div className="no-comments">
                  <i className="far fa-comment"></i>
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              ) : (
                <>
                  {comments
                    .filter(comment => !comment.parentComment)
                    .map((comment) => (
                      <CommentItem key={comment._id} comment={comment} level={0} />
                    ))}
                </>
              )}
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}

function CommentItem({ comment, level = 0 }) {
  const { user } = useAuth();
  const { id } = useParams();
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
  const [showReplies, setShowRepliesLocal] = useState(false);
  const [replyingToLocal, setReplyingToLocal] = useState(false);
  const [replyText, setReplyText] = useState('');

  const isLiked = (() => {
    const uid = user?._id || user?.id;
    return (comment.likes || []).some(l => {
      const lid = (typeof l === 'string' || typeof l === 'number') ? l : (l?._id || l?.id);
      return lid === uid;
    });
  })();

  const handleLikeComment = async (commentId) => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE}/api/comments/${commentId}/like`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });
      if (!response.ok) return;
      // No parent state here; optimistic update for local UI
      // A full page re-fetch occurs on main interactions
    } catch {}
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;
    if (!user || !user._id) return;
    try {
      const response = await fetch(`${API_BASE}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: replyText.trim(),
          author: user._id,
          post: id,
          parentComment: comment._id
        }),
      });
      if (response.ok) {
        setReplyText('');
        setReplyingToLocal(false);
        // Let the parent list refresh on next navigation; could add a callback prop to refresh
      }
    } catch {}
  };

  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div className={`comment-item ${isLiked ? 'comment-liked-by-user' : ''}`} style={{ marginLeft: level * 20 }}>
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
        </div>
        <p className="comment-text">{comment.text}</p>
        <div className="comment-actions-bar">
          <button
            className={`comment-action-btn btn-like btn-like-sm ${isLiked ? 'liked' : ''}`}
            onClick={() => handleLikeComment(comment._id)}
          >
            <i className={`${isLiked ? 'fas fa-heart' : 'far fa-heart'}`}></i>
            {comment.likes?.length > 0 && <span>{comment.likes.length}</span>}
          </button>

          <button
            className="comment-action-btn reply"
            onClick={() => setReplyingToLocal(v => !v)}
          >
            <i className="far fa-reply"></i>
            Reply
          </button>

          {hasReplies && (
            <button
              className="comment-action-btn"
              onClick={() => setShowRepliesLocal(v => !v)}
              style={{ color: '#6b7280' }}
            >
              <i className={`fas fa-chevron-${showReplies ? 'up' : 'down'}`}></i>
              {showReplies ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>

        {replyingToLocal && (
          <div className="reply-form-container">
            <div className="reply-form-wrapper">
              <div className="reply-user-avatar">
                {user?.username ? user.username[0].toUpperCase() : 'U'}
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
                    onClick={() => setReplyingToLocal(false)}
                    className="btn-form-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReply}
                    className="btn-form-primary"
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {hasReplies && showReplies && (
          <div style={{ marginTop: '12px' }}>
            {comment.replies.map(reply => (
              <CommentItem key={reply._id} comment={reply} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

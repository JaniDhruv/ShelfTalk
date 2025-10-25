import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PostsPage.css';
import './Discover.css';

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

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
  const isGuest = !user;
  const [guestPrompt, setGuestPrompt] = useState('');
  const viewerId = user?._id || user?.id || null;
  const normalizedViewerId = viewerId ? viewerId.toString() : null;

  const canViewPost = useMemo(() => {
    if (!post) return true;
    const group = post.group;
    if (!group || group.visibility !== 'private') {
      return true;
    }
    const members = Array.isArray(group.members) ? group.members : [];
    if (!normalizedViewerId) return false;
    return members.some(member => {
      if (!member) return false;
      if (typeof member === 'string') return member === normalizedViewerId;
      if (typeof member === 'object') {
        const memberId = member._id || member.id || (typeof member.toString === 'function' ? member.toString() : null);
        return memberId === normalizedViewerId;
      }
      return false;
    });
  }, [post, normalizedViewerId]);

  const isPrivateGroupPost = post?.group?.visibility === 'private';
  const showRestrictedNotice = Boolean(isPrivateGroupPost && !canViewPost);

  useEffect(() => {
    if (!guestPrompt) return;
    const timer = setTimeout(() => setGuestPrompt(''), 3500);
    return () => clearTimeout(timer);
  }, [guestPrompt]);

  const requireAuth = (message = 'Please sign in to continue.') => {
    setGuestPrompt(message);
  };

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
  }, [id, API_BASE]);

  const handleLike = async () => {
    if (!canViewPost) return;
    if (isGuest || !post) {
      requireAuth('Sign in to appreciate this post.');
      return;
    }
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
    if (isGuest) {
      requireAuth('Sign in to add a comment.');
      return;
    }
    if (!commentText.trim()) return;
    
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

  if (loading) return (
    <div className="social-feed-container discover-container" style={{ minHeight: '60vh' }}>
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
    <div className="social-feed-container discover-container" style={{ minHeight: '40vh' }}>
      <div className="error-message">
        <i className="fas fa-exclamation-triangle"></i>
        {error}
      </div>
    </div>
  );

  if (!post) return (
    <div className="social-feed-container discover-container" style={{ minHeight: '40vh' }}>
      <div className="empty-state">
        <div className="empty-state-icon">📚</div>
        <h3>Post not found</h3>
        <p>The post you're looking for doesn't exist or has been deleted.</p>
      </div>
    </div>
  );

  const authorPresence = buildPresence(post.author);
  const presenceLabel = formatPresenceLabel(authorPresence);

  return (
    <div className="social-feed-container discover-container" style={{ overflow: 'visible' }}>
      <section className="sm-header-section">
        <div className="sm-header-content">
          <div>
            <h1 className="sm-title">Post Details</h1>
            <p className="sm-subtitle">Revisit the conversation and see how readers responded.</p>
          </div>
        </div>
      </section>

      <div className="discover-content" style={{ maxWidth: '750px' }}>
        <div style={{ margin: '24px 0 16px' }}>
          <Link to="/posts" className="back-link">
            <i className="fas fa-arrow-left"></i> Back to Posts
          </Link>
        </div>

        {isGuest && canViewPost && (
          <div className="guest-readonly-banner">
            <div className="guest-readonly-message">
              <i className="fas fa-user-lock" aria-hidden="true"></i>
              <div>
                <h3>Reading in guest mode</h3>
                <p>Log in to like this post, join the discussion, and share your thoughts.</p>
              </div>
            </div>
            <div className="guest-readonly-actions">
              <Link to="/login" className="btn btn-primary">Log In</Link>
              <Link to="/signup" className="btn btn-secondary guest-signup-btn">Sign Up</Link>
            </div>
          </div>
        )}

        {guestPrompt && (
          <div className="guest-prompt">
            <i className="fas fa-lock" aria-hidden="true"></i>
            <span>{guestPrompt}</span>
            <div className="guest-readonly-actions" style={{ marginLeft: 'auto' }}>
              <Link to="/login" className="btn btn-primary btn-sm">Log In</Link>
              <Link to="/signup" className="btn btn-secondary guest-signup-btn btn-sm">Sign Up</Link>
            </div>
            <button
              type="button"
              className="guest-prompt-dismiss"
              onClick={() => setGuestPrompt('')}
              aria-label="Dismiss guest prompt"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        {showRestrictedNotice ? (
          <div className="guest-readonly-banner" style={{ marginTop: '16px' }}>
            <div className="guest-readonly-message">
              <i className="fas fa-lock" aria-hidden="true"></i>
              <div>
                <h3>Private group post</h3>
                <p>
                  This post belongs to the private group{' '}
                  {post.group?.name ? <strong>{post.group.name}</strong> : 'selected by its author'}. Only group members can view the content.
                </p>
              </div>
            </div>
            <div className="guest-readonly-actions">
              {isGuest ? (
                <>
                  <Link to="/login" className="btn btn-primary">Log In</Link>
                  <Link to="/signup" className="btn btn-secondary guest-signup-btn">Sign Up</Link>
                  <Link to="/posts" className="btn btn-secondary">Back to Posts</Link>
                </>
              ) : (
                <>
                  {(post.group?._id || post.group?.id) && (
                    <Link to={`/groups/${post.group._id || post.group.id}`} className="btn btn-primary">
                      View Group
                    </Link>
                  )}
                  <Link to="/posts" className="btn btn-secondary">
                    Back to Posts
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : (
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
                <div
                  className={`presence-pill ${authorPresence.isOnline ? 'online' : 'offline'}`}
                  title={authorPresence.isOnline ? 'User is online' : (authorPresence.lastSeen ? `Last seen ${authorPresence.lastSeen.toLocaleString()}` : 'User is offline')}
                >
                  <span className={`status-dot ${authorPresence.isOnline ? 'online' : 'offline'}`}></span>
                  <span>{presenceLabel}</span>
                </div>
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
                  className={`action-btn btn-like ${isPostLiked ? 'liked' : ''} ${isGuest ? 'guest-locked' : ''}`}
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
            
            <button
              className={`action-btn share-btn ${isGuest ? 'guest-locked' : ''}`}
              onClick={() => {
                if (isGuest) {
                  requireAuth('Sign in to share posts with friends.');
                }
              }}
            >
              <i className="fas fa-share"></i>
              <span>Share</span>
            </button>
          </div>

          {/* Comments Section - Always Shown */}
          <div className="comments-section">
            {/* Add Comment Form */}
            {isGuest ? (
              <div className="comment-login-prompt">
                <div className="comment-login-text">
                  <i className="fas fa-comments" aria-hidden="true"></i>
                  <span>Sign in to join the conversation and reply to fellow readers.</span>
                </div>
                <div className="comment-login-actions">
                  <Link to="/login" className="btn btn-primary btn-sm">Log In</Link>
                  <Link to="/signup" className="btn btn-secondary guest-signup-btn btn-sm">Sign Up</Link>
                </div>
              </div>
            ) : (
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
            )}

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
                      <CommentItem
                        key={comment._id}
                        comment={comment}
                        level={0}
                        currentUser={user}
                        onGuestAction={requireAuth}
                      />
                    ))}
                </>
              )}
            </div>
          </div>
          </article>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment, level = 0, currentUser, onGuestAction }) {
  const { id } = useParams();
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
  const [showReplies, setShowRepliesLocal] = useState(false);
  const [replyingToLocal, setReplyingToLocal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const viewer = currentUser;
  const isGuest = !viewer;

  const isLiked = (() => {
    const uid = viewer?._id || viewer?.id;
    return (comment.likes || []).some(l => {
      const lid = (typeof l === 'string' || typeof l === 'number') ? l : (l?._id || l?.id);
      return lid === uid;
    });
  })();

  const handleLikeComment = async (commentId) => {
    if (!viewer) {
      onGuestAction?.('Sign in to react to comments.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/comments/${commentId}/like`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: viewer._id }),
      });
      if (!response.ok) return;
      // No parent state here; optimistic update for local UI
      // A full page re-fetch occurs on main interactions
    } catch {}
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;
    if (!viewer || !viewer._id) {
      onGuestAction?.('Sign in to reply to comments.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: replyText.trim(),
          author: viewer._id,
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
            className={`comment-action-btn btn-like btn-like-sm ${isLiked ? 'liked' : ''} ${isGuest ? 'guest-locked' : ''}`}
            onClick={() => handleLikeComment(comment._id)}
          >
            <i className={`${isLiked ? 'fas fa-heart' : 'far fa-heart'}`}></i>
            {comment.likes?.length > 0 && <span>{comment.likes.length}</span>}
          </button>

          <button
            className={`comment-action-btn reply ${isGuest ? 'guest-locked' : ''}`}
            onClick={() => {
              if (isGuest) {
                onGuestAction?.('Sign in to reply to comments.');
                return;
              }
              setReplyingToLocal(v => !v);
            }}
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

        {replyingToLocal && !isGuest && (
          <div className="reply-form-container">
            <div className="reply-form-wrapper">
              <div className="reply-user-avatar">
                {viewer?.username ? viewer.username[0].toUpperCase() : 'U'}
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
              <CommentItem
                key={reply._id}
                comment={reply}
                level={level + 1}
                currentUser={viewer}
                onGuestAction={onGuestAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from '../components/ConfirmationModal';
import './PostsPage.css';

export default function GroupPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feed, setFeed] = useState([]);
  const [composer, setComposer] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [showComments, setShowComments] = useState({});
  const [activeTab, setActiveTab] = useState('forum'); // forum, chat, members
  
  // Group chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatError, setChatError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const chatMessagesEndRef = useRef(null);
  
  // Enhanced forum states
  const [postFilter, setPostFilter] = useState('all'); // 'all', 'my', 'liked'
  const [editingPost, setEditingPost] = useState(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [forumInfo, setForumInfo] = useState('');
  const [sharePostId, setSharePostId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState({});
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

  const isMember = user && user._id && group && group.members?.some(m => (m._id || m) === user._id);
  const isOwner = user && user._id && group && (group.createdBy?._id || group.createdBy) === user._id;
  const isModerator = user && user._id && group && group.moderators?.some(m => (m._id || m) === user._id);
  const canModerate = isOwner || isModerator;
  const isPrivate = group && (group.visibility === 'private');

  const fetchGroup = useCallback(async () => {
    try {
      setLoading(true);
      const [gRes, pRes] = await Promise.all([
        fetch(`http://localhost:5000/api/groups/${id}`),
        fetch('http://localhost:5000/api/posts')
      ]);
      if (!gRes.ok) throw new Error('Failed to load group');
      const gData = await gRes.json();
      setGroup(gData);
      if (!pRes.ok) throw new Error('Failed to load posts');
      const allPosts = await pRes.json();
      const groupPosts = allPosts.filter(p => p.group && (p.group._id === id || p.group === id));

      // Compute comment counts to match PostsPage
      const counts = {};
      for (const p of groupPosts) {
        try {
          const cRes = await fetch(`http://localhost:5000/api/comments/post/${p._id}`);
          if (cRes.ok) {
            const list = await cRes.json();
            counts[p._id] = list.length;
          } else {
            counts[p._id] = 0;
          }
        } catch {
          counts[p._id] = 0;
        }
      }

      const withCounts = groupPosts.map(p => ({ ...p, commentCount: counts[p._id] || 0 }));
      setFeed(withCounts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  // Load user conversations for Share modal (parity with PostsPage)
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

  const joinGroup = async () => {
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${id}/add-member`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user._id })
      });
      if (!res.ok) throw new Error('Failed to join');
      await fetchGroup();
    } catch (e) { setError(e.message); }
  };

  const leaveGroup = async () => {
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${id}/remove-member`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user._id })
      });
      if (!res.ok) throw new Error('Failed to leave');
      await fetchGroup();
    } catch (e) { setError(e.message); }
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!composer.trim() || !user || !user._id) return;
    try {
      setPosting(true);
      const res = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: composer.trim(), author: user._id, group: id })
      });
      if (!res.ok) throw new Error('Failed to create post');
      setComposer('');
      await fetchGroup();
    } catch (e) { setError(e.message); } finally { setPosting(false); }
  };

  const likePost = async (postId) => {
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${postId}/like`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user._id })
      });
      if (!res.ok) throw new Error('Failed to like');
      await fetchGroup();
    } catch (e) { setError(e.message); }
  };

  const updatePost = async (postId, newContent) => {
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${postId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newContent, authorId: user._id })
      });
      if (!res.ok) throw new Error('Failed to update post');
      setEditingPost(null);
      setEditPostContent('');
      await fetchGroup();
    } catch (e) { setError(e.message); }
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
        await fetchGroup();
      } else if (deleteTarget.type === 'comment') {
        const res = await fetch(`http://localhost:5000/api/comments/${deleteTarget.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete comment');
        const postId = deleteTarget.postId;
        await fetchComments(postId);
        // Update post comment count
        setFeed(prev => prev.map(p => 
          p._id === postId ? { ...p, commentCount: Math.max(0, (p.commentCount || 1) - 1) } : p
        ));
      }
    } catch (err) {
      setError(deleteTarget.type === 'post' ? 'Failed to delete post' : 'Failed to delete comment');
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  // Comments functions
  const fetchComments = async (postId) => {
    try {
      setCommentsLoading(prev => ({ ...prev, [postId]: true }));
      const res = await fetch(`http://localhost:5000/api/comments/post/${postId}`);
      if (!res.ok) throw new Error('Failed to load comments');
      const data = await res.json();
      setCommentsByPost(prev => ({ ...prev, [postId]: data }));
    } catch (e) { setError(e.message); } finally {
      setCommentsLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleComments = (postId) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
    if (!showComments[postId] && !commentsByPost[postId]) {
      fetchComments(postId);
    }
  };

  const addComment = async (postId, text, parentCommentId = null) => {
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch('http://localhost:5000/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, author: user._id, post: postId, parentComment: parentCommentId })
      });
      if (!res.ok) throw new Error('Failed to add comment');
      await fetchComments(postId);
    } catch (e) { setError(e.message); }
  };

  const likeComment = async (commentId) => {
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch(`http://localhost:5000/api/comments/${commentId}/like`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user._id })
      });
      if (!res.ok) throw new Error('Failed to like comment');
      const postId = Object.keys(commentsByPost).find(id => 
        commentsByPost[id].some(c => c._id === commentId || c.replies?.some(r => r._id === commentId))
      );
      if (postId) await fetchComments(postId);
    } catch (e) { setError(e.message); }
  };

  const deleteComment = (commentId, postId) => {
    setDeleteTarget({ type: 'comment', id: commentId, postId });
    setShowDeleteModal(true);
  };

  const editComment = async (commentId, newText) => {
    try {
      const res = await fetch(`http://localhost:5000/api/comments/${commentId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newText })
      });
      if (!res.ok) throw new Error('Failed to update comment');
      const postId = Object.keys(commentsByPost).find(id => 
        commentsByPost[id].some(c => c._id === commentId || c.replies?.some(r => r._id === commentId))
      );
      if (postId) await fetchComments(postId);
    } catch (e) { setError(e.message); }
  };

  // Group Chat Functions
  const initializeGroupChat = async () => {
    if (!group?._id || !isMember || !user?._id) return;
    
    try {
      // Create or get group conversation
      const resp = await fetch(`${API_BASE}/api/chat/groups/${group._id}/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });
      if (resp.ok) {
        // Conversation is ready, now fetch messages
        await fetchChatMessages();
      } else {
        try {
          const error = await resp.json();
          setError(error.message || 'Failed to initialize group chat');
        } catch {
          setError('Failed to initialize group chat');
        }
      }
    } catch (e) {
      setError('Failed to initialize group chat');
    }
  };

  const fetchChatMessages = async () => {
    if (!group?._id || !isMember || !user?._id) return;
    try {
      setLoadingChat(true);
      setChatError('');
      const resp = await fetch(`${API_BASE}/api/chat/groups/${group._id}/messages?userId=${user._id}`);
      if (resp.ok) {
        const data = await resp.json();
        setChatMessages(data || []);
        setLastRefresh(new Date());
      } else {
        try {
          const error = await resp.json();
          setChatError(error.message || 'Failed to load chat messages');
        } catch {
          setChatError('Failed to load chat messages');
        }
      }
    } catch (e) {
      setChatError('Connection error. Please check your internet connection.');
    } finally {
      setLoadingChat(false);
    }
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !group?._id || !user?._id || sendingMessage) return;
    
    const messageContent = chatMessage.trim();
    setChatMessage(''); // Clear input immediately for better UX
    setSendingMessage(true);
    setChatError(''); // Clear any previous errors
    
    try {
      const resp = await fetch(`${API_BASE}/api/chat/groups/${group._id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          senderId: user._id, 
          content: messageContent,
          type: 'text'
        }),
      });
      if (resp.ok) {
        const saved = await resp.json();
        setChatMessages(prev => [...prev, saved]);
      } else {
        try {
          const err = await resp.json();
          setChatError(err?.message || 'Failed to send message');
        } catch {
          setChatError('Failed to send message');
        }
        setChatMessage(messageContent); // Restore message on error
      }
    } catch (e) {
      setChatError('Connection error. Message not sent.');
      setChatMessage(messageContent); // Restore message on error
    } finally {
      setSendingMessage(false);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Load chat messages when switching to chat tab
  useEffect(() => {
    if (activeTab === 'chat' && group && isMember) {
      initializeGroupChat();
    }
  }, [activeTab, group, isMember]);

  // Auto-refresh messages every 10 seconds when chat tab is active
  useEffect(() => {
    let interval;
    if (activeTab === 'chat' && group && isMember && !loadingChat) {
      interval = setInterval(() => {
        fetchChatMessages();
      }, 10000); // Refresh every 10 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, group, isMember, loadingChat]);

  return (
  <div style={{ minHeight: '100vh', backgroundColor: '#F9F4E8' }}>
      {/* Page Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 20%, #CD853F 60%, #DEB887 90%, #F5DEB3 100%)', 
        color: '#FFFEF7', 
        padding: '2rem 0' 
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <button 
                onClick={() => navigate('/groups')} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  border: '1px solid rgba(255, 255, 255, 0.3)', 
                  color: 'white', 
                  padding: '8px 16px', 
                  borderRadius: '25px', 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                ← Back to Groups
              </button>
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              <i className="fas fa-users" style={{ marginRight: '8px' }}></i>
              Community Hub
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
          <div style={{ 
            color: '#dc2626', 
            padding: '16px 20px', 
            background: '#fee2e2', 
            border: '1px solid #fecaca', 
            borderRadius: '12px', 
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <i className="fas fa-exclamation-circle" style={{ fontSize: '18px' }}></i>
            {error}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        {/* Group Header Card */}
        {loading || !group ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '18px', color: '#64748b' }}>Loading group...</div>
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            marginBottom: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decorative background element */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '120px',
              height: '120px',
              background: 'linear-gradient(135deg, transparent 50%, rgba(184, 134, 11, 0.06) 50%)',
              borderBottomLeftRadius: '100%'
            }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 20%, #CD853F 60%, #DEB887 90%, #F5DEB3 100%)',
                    color: '#FFFEF7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '20px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                    border: '2px solid rgba(255,255,255,0.7)'
                  }}>
                    {group?.photo ? (
                      <img
                        src={group.photo}
                        alt={group?.name || 'Group'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      (group?.name?.[0] ? group.name[0].toUpperCase() : (
                        <i className="fas fa-users" style={{ fontSize: '18px' }}></i>
                      ))
                    )}
                  </div>
                  <h1 style={{ 
                    margin: 0, 
                    color: '#0f172a', 
                    fontSize: '2.25rem', 
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, #8B3A3A, #B8860B)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {group.name}
                  </h1>
                  <span style={{
                    fontSize: '12px',
                    color: group.visibility === 'private' ? '#ef4444' : '#16a34a',
                    background: group.visibility === 'private' ? '#fee2e2' : '#dcfce7',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontWeight: '600',
                    border: `1px solid ${group.visibility === 'private' ? '#fecaca' : '#bbf7d0'}`
                  }}>
                    <i className={`fas fa-${group.visibility === 'private' ? 'lock' : 'globe'}`} style={{ marginRight: '4px' }}></i>
                    {group.visibility === 'private' ? 'Private' : 'Public'}
                  </span>
                </div>

                <p style={{ 
                  color: '#64748b', 
                  fontSize: '18px', 
                  lineHeight: '1.6', 
                  marginBottom: '16px',
                  maxWidth: '70%'
                }}>
                  {group.description || 'A vibrant community space for meaningful discussions and connections.'}
                </p>

                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '20px', 
                  fontSize: '14px', 
                  color: '#475569' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      background: 'rgba(184, 134, 11, 0.10)',
                      color: '#B8860B',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <i className="fas fa-users" style={{ fontSize: '12px' }}></i>
                    </div>
                    <span><strong>{group.members?.length || 0}</strong> members</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      background: 'rgba(184, 134, 11, 0.10)',
                      color: '#B8860B',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <i className="fas fa-user-crown" style={{ fontSize: '12px' }}></i>
                    </div>
                    <span>Created by <strong>{group.createdBy?.username || 'Unknown'}</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {!isMember ? (
                  <button 
                    onClick={joinGroup} 
                    style={{
                      background: 'linear-gradient(135deg, #B8860B, #DAA520)',
                      color: '#FFFEF7',
                      border: 'none',
                      borderRadius: '25px',
                      padding: '12px 24px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      boxShadow: '0 4px 12px rgba(184, 134, 11, 0.30)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 16px rgba(184, 134, 11, 0.40)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(184, 134, 11, 0.30)';
                    }}
                  >
                    <i className="fas fa-user-plus" style={{ marginRight: '8px' }}></i>
                    {isPrivate ? 'Request to Join' : 'Join Group'}
                  </button>
                ) : (
                  <button 
                    onClick={leaveGroup} 
                    style={{
                      background: '#f8f9fa',
                      color: '#6b7280',
                      border: '1px solid #e5e7eb',
                      borderRadius: '25px',
                      padding: '12px 24px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = '#fee2e2';
                      e.target.style.color = '#8B3A3A';
                      e.target.style.borderColor = 'rgba(139, 58, 58, 0.30)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = '#f8f9fa';
                      e.target.style.color = '#6b7280';
                      e.target.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <i className="fas fa-sign-out-alt" style={{ marginRight: '8px' }}></i>
                    Leave Group
                  </button>
                )}
              </div>
            </div>

            {/* Requests Section */}
            <div style={{ marginTop: '32px', paddingTop: 0 }}>
              <div style={{
                height: 6,
                borderRadius: '10px',
                background: 'linear-gradient(90deg, #8B3A3A, #B8860B, #87A96B)',
                marginBottom: '16px'
              }} />
              <h3 style={{ 
                margin: '0 0 20px', 
                fontSize: '20px', 
                fontWeight: '700', 
                color: '#111827',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fas fa-envelope" style={{ color: '#B8860B' }}></i>
                Requests & Invitations
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ 
                  border: '2px solid rgba(184, 134, 11, 0.25)', 
                  borderRadius: '12px', 
                  padding: '20px',
                  background: '#FFFEF7'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '12px', color: '#722F37', fontSize: '16px' }}>
                    <i className="fas fa-user-clock" style={{ marginRight: '8px', color: '#B8860B' }}></i>
                    Join Requests
                  </div>
                  {(group.joinRequests || []).length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>No pending requests</div>
                  ) : (
                    (group.joinRequests || []).map(r => (
                      <div key={r._id || r} style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        alignItems: 'center', 
                        marginBottom: '16px',
                        padding: '12px',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid rgba(184, 134, 11, 0.25)'
                      }}>
                        <div style={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: '50%', 
                          background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 20%, #CD853F 60%, #DEB887 90%, #F5DEB3 100%)', 
                          color: '#FFFEF7', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '14px', 
                          fontWeight: 'bold' 
                        }}>
                          {((r.username || '?')[0] || '?').toUpperCase()}
                        </div>
                        <div style={{ flex: 1, fontWeight: '500' }}>{r.username || 'User'}</div>
                        {isOwner && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={async () => { 
                                await fetch(`http://localhost:5000/api/groups/${id}/approve`, { 
                                  method: 'POST', 
                                  headers: { 'Content-Type': 'application/json' }, 
                                  body: JSON.stringify({ requesterId: r._id || r, actorId: user._id }) 
                                }); 
                                await fetchGroup(); 
                              }} 
                              style={{ 
                                background: '#6B8E5A', 
                                color: '#FFFEF7', 
                                border: 'none', 
                                borderRadius: '6px', 
                                padding: '6px 12px', 
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}
                            >
                              <i className="fas fa-check" style={{ marginRight: '4px' }}></i>
                              Approve
                            </button>
                            <button 
                              onClick={async () => { 
                                await fetch(`http://localhost:5000/api/groups/${id}/decline`, { 
                                  method: 'POST', 
                                  headers: { 'Content-Type': 'application/json' }, 
                                  body: JSON.stringify({ requesterId: r._id || r, actorId: user._id }) 
                                }); 
                                await fetchGroup(); 
                              }} 
                              style={{ 
                                background: '#8B3A3A', 
                                color: '#FFFEF7', 
                                border: 'none', 
                                borderRadius: '6px', 
                                padding: '6px 12px', 
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}
                            >
                              <i className="fas fa-times" style={{ marginRight: '4px' }}></i>
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                
                <div style={{ 
                  border: '2px solid rgba(114, 47, 55, 0.20)', 
                  borderRadius: '12px', 
                  padding: '20px',
                  background: '#F9F4E8'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '12px', color: '#722F37', fontSize: '16px' }}>
                    <i className="fas fa-paper-plane" style={{ marginRight: '8px', color: '#B8860B' }}></i>
                    Sent Invitations
                  </div>
                  {(group.invites || []).length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>No pending invites</div>
                  ) : (
                    (group.invites || []).map(inv => (
                      <div key={(inv.to?._id || inv.to) + '-' + (inv.from?._id || inv.from)} style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        alignItems: 'center', 
                        marginBottom: '12px',
                        padding: '12px',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid rgba(114, 47, 55, 0.20)'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500', fontSize: '14px' }}>To: {inv.to?.username || inv.to}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>From: {inv.from?.username || inv.from}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Invite Users Section */}
            {(isOwner || isModerator) && (
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(139, 69, 19, 0.15)' }}>
                <h4 style={{ 
                  margin: '0 0 16px', 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <i className="fas fa-user-plus" style={{ color: '#B8860B' }}></i>
                  Invite New Members
                </h4>
                <InviteSearch group={group} groupId={id} actorId={user?._id} onDone={fetchGroup} />
              </div>
            )}
          </div>
        )}

        {/* Tabbed Navigation */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '2px solid rgba(184, 134, 11, 0.25)',
          overflow: 'hidden'
        }}>
          <div style={{ height: 6, background: 'linear-gradient(90deg, #8B3A3A, #B8860B, #87A96B)' }} />
          
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(184, 134, 11, 0.15)',
            background: 'linear-gradient(135deg, rgba(184, 134, 11, 0.05), rgba(114, 47, 55, 0.05))'
          }}>
            {[
              { id: 'forum', label: 'Online Forum', icon: 'fas fa-comments' },
              { id: 'chat', label: 'Group Chat', icon: 'fas fa-comment-dots' },
              { id: 'members', label: 'Members', icon: 'fas fa-users' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '20px 24px',
                  background: activeTab === tab.id 
                    ? 'linear-gradient(135deg, #B8860B, #DAA520)' 
                    : 'transparent',
                  color: activeTab === tab.id ? '#FFFEF7' : '#722F37',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.background = 'rgba(184, 134, 11, 0.1)';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.background = 'transparent';
                  }
                }}
              >
                <i className={tab.icon}></i>
                {tab.label}
                {activeTab === tab.id && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: '#FFFEF7',
                    borderRadius: '3px 3px 0 0'
                  }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {/* Online Forum Tab */}
          {activeTab === 'forum' && (
            <div>
            {/* Access Gate for Private Groups */}
            {isPrivate && !isMember && (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                border: '2px solid #fecaca'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <i className="fas fa-lock" style={{ color: '#dc2626', fontSize: 18 }}></i>
                  <div style={{ color: '#111827' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>This group is private</div>
                    <div style={{ color: '#64748b', fontSize: 14 }}>You need to join to view posts and members. Click "{isOwner ? 'Approve' : isMember ? 'Leave Group' : isPrivate ? 'Request to Join' : 'Join Group'}" to continue.</div>
                  </div>
                </div>
              </div>
            )}

            {/* Post Composer */}
            {isMember && (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                border: '2px solid rgba(184, 134, 11, 0.25)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: 6,
                  borderRadius: 8,
                  background: 'linear-gradient(90deg,#B8860B,#DAA520)',
                  marginBottom: 16
                }} />
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, transparent 50%, rgba(184, 134, 11, 0.06) 50%)',
                }}></div>

                <form onSubmit={createPost}>
                  <h3 style={{ 
                    marginTop: 0, 
                    marginBottom: '16px', 
                    color: '#722F37',
                    fontSize: '20px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="fas fa-pen" style={{ color: '#B8860B' }}></i>
                    Share with {group?.name}
                  </h3>
                  
                  <textarea 
                    value={composer} 
                    onChange={e => setComposer(e.target.value)} 
                    placeholder={`What's on your mind? Share with ${group?.name}...`} 
                    rows={4} 
                    style={{ 
                      width: '100%', 
                      padding: '16px', 
                      borderRadius: '12px', 
                      border: '1px solid #e5e7eb', 
                      marginBottom: '16px',
                      fontSize: '16px',
                      lineHeight: '1.5',
                      resize: 'vertical',
                      transition: 'all 0.3s ease'
                    }} 
                    onFocus={(e) => {
                      e.target.style.borderColor = '#B8860B';
                      e.target.style.boxShadow = '0 0 0 3px rgba(184, 134, 11, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      type="submit" 
                      disabled={posting || !composer.trim()} 
                      style={{ 
                        background: posting || !composer.trim() 
                          ? '#cbd5e1' 
                          : 'linear-gradient(135deg, #722F37, #B8860B)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '25px', 
                        padding: '12px 24px', 
                        cursor: posting || !composer.trim() ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        boxShadow: posting || !composer.trim() ? 'none' : '0 4px 12px rgba(184, 134, 11, 0.30)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <i className={`fas fa-${posting ? 'spinner fa-spin' : 'paper-plane'}`} style={{ marginRight: '8px' }}></i>
                      {posting ? 'Posting...' : 'Share Post'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Post Filters */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid rgba(184, 134, 11, 0.20)'
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ color: '#722F37' }}>Filter:</strong>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'my', label: 'My Posts' },
                  { id: 'liked', label: 'Liked' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setPostFilter(f.id)}
                    style={{
                      background: postFilter === f.id ? 'linear-gradient(135deg, #B8860B, #DAA520)' : '#f8fafc',
                      color: postFilter === f.id ? '#FFFEF7' : '#64748b',
                      border: `1px solid ${postFilter === f.id ? '#fbbf24' : '#e5e7eb'}`,
                      borderRadius: 9999,
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {forumInfo && (
              <div style={{
                background: 'rgba(184,134,11,0.08)',
                color: '#722F37',
                border: '1px solid rgba(184,134,11,0.25)',
                borderRadius: 10,
                padding: '8px 12px',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <i className="fas fa-info-circle"></i>
                {forumInfo}
              </div>
            )}

            {/* Posts Feed */}
            {isPrivate && !isMember ? (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '48px 32px',
                textAlign: 'center',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                border: '1px dashed #fecaca'
              }}>
                <i className="fas fa-user-lock" style={{ 
                  fontSize: '48px', 
                  color: '#dc2626', 
                  marginBottom: '16px',
                  opacity: 0.8
                }}></i>
                <h3 style={{ color: '#b91c1c', marginBottom: '8px', fontSize: '20px', fontWeight: '600' }}>
                  Posts are visible to members only
                </h3>
                <p style={{ color: '#64748b', margin: 0, fontSize: '16px' }}>
                  {user ? 'Request to join to see the content.' : 'Please log in and request to join to see the content.'}
                </p>
              </div>
            ) : loading ? (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '32px',
                textAlign: 'center',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                fontSize: '18px',
                color: '#64748b'
              }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: '12px', fontSize: '20px' }}></i>
                Loading posts...
              </div>
            ) : feed.length === 0 ? (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '48px 32px',
                textAlign: 'center',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                border: '1px dashed rgba(184, 134, 11, 0.25)'
              }}>
                <i className="fas fa-comments" style={{ 
                  fontSize: '48px', 
                  color: '#B8860B', 
                  marginBottom: '16px',
                  opacity: 0.8
                }}></i>
                <h3 style={{ color: '#722F37', marginBottom: '8px', fontSize: '20px', fontWeight: '600' }}>
                  No posts yet
                </h3>
                <p style={{ color: '#64748b', margin: 0, fontSize: '16px' }}>
                  Be the first to start a conversation in this group!
                </p>
              </div>
            ) : (
              (feed || [])
                .filter(p => {
                  if (postFilter === 'my') return (p.author?._id === user?._id);
                  if (postFilter === 'liked') {
                    const uid = user?._id || user?.id;
                    return (p.likes || []).some(l => {
                      const id = (typeof l === 'string' || typeof l === 'number') ? l : (l?._id || l?.id);
                      return id === uid;
                    });
                  }
                  return true;
                })
                .map(p => (
                <div key={p._id} style={{
                  background: 'white',
                  borderRadius: '16px',
                  marginBottom: '20px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                  border: '2px solid rgba(184, 134, 11, 0.25)',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
                }}
                >
                  <div style={{ height: 4, background: 'linear-gradient(90deg,#8B3A3A,#B8860B)' }} />
                  {/* Post Header */}
                  <div style={{
                    background: 'white',
                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                    padding: '20px 24px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 20%, #CD853F 60%, #DEB887 90%, #F5DEB3 100%)',
                        color: '#FFFEF7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '18px',
                        position: 'relative',
                        boxShadow: '0 4px 12px rgba(114, 47, 55, 0.20)'
                      }}>
                        {(p.author?.username?.[0] || '?').toUpperCase()}
                        <div style={{
                          position: 'absolute',
                          top: '-2px',
                          left: '-2px',
                          right: '-2px',
                          bottom: '-2px',
                          borderRadius: '50%',
                          border: '2px solid rgba(255, 255, 255, 0.7)',
                          opacity: 0.5
                        }}></div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '16px', color: '#111827' }}>
                          {p.author?.username || 'User'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          {new Date(p.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div style={{ padding: '24px' }}>
                    {editingPost === p._id ? (
                      <div style={{ marginBottom: 16 }}>
                        <textarea
                          value={editPostContent}
                          onChange={e => setEditPostContent(e.target.value)}
                          rows={4}
                          style={{
                            width: '100%', padding: 12, borderRadius: 12,
                            border: '1px solid #e5e7eb', fontSize: 16
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button
                            onClick={() => updatePost(p._id, editPostContent.trim())}
                            disabled={!editPostContent.trim()}
                            style={{
                              background: !editPostContent.trim() ? '#e5e7eb' : 'linear-gradient(135deg, #6B8E5A, #87A96B)',
                              color: !editPostContent.trim() ? '#9ca3af' : '#FFFEF7',
                              border: 'none', borderRadius: 9999, padding: '8px 14px',
                              cursor: !editPostContent.trim() ? 'not-allowed' : 'pointer', fontWeight: 600
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingPost(null); setEditPostContent(''); }}
                            style={{
                              background: '#f8fafc', border: '1px solid #e5e7eb', color: '#111827',
                              borderRadius: 9999, padding: '8px 14px', cursor: 'pointer', fontWeight: 600
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        marginBottom: '20px',
                        color: '#111827',
                        fontSize: '16px',
                        lineHeight: '1.6'
                      }}>
                        {p.content}
                      </div>
                    )}

                    {/* Post Actions */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      paddingTop: '16px',
                      borderTop: '1px solid #f3f4f6'
                    }}>
                      <button
                        onClick={() => likePost(p._id)}
                        disabled={!user}
                        style={{
                          background: (() => {
                            const uid = user?._id || user?.id;
                            const liked = (p.likes || []).some(l => {
                              const id = (typeof l === 'string' || typeof l === 'number') ? l : (l?._id || l?.id);
                              return id === uid;
                            });
                            return liked ? '#fee2e2' : '#f8fafc';
                          })(),
                          border: (() => {
                            const uid = user?._id || user?.id;
                            const liked = (p.likes || []).some(l => {
                              const id = (typeof l === 'string' || typeof l === 'number') ? l : (l?._id || l?.id);
                              return id === uid;
                            });
                            return `1px solid ${liked ? '#fecaca' : '#e5e7eb'}`;
                          })(),
                          color: (() => {
                            const uid = user?._id || user?.id;
                            const liked = (p.likes || []).some(l => {
                              const id = (typeof l === 'string' || typeof l === 'number') ? l : (l?._id || l?.id);
                              return id === uid;
                            });
                            return liked ? '#dc2626' : '#64748b';
                          })(),
                          borderRadius: '25px',
                          padding: '8px 16px',
                          cursor: user ? 'pointer' : 'not-allowed',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          if (user) {
                            e.target.style.transform = 'scale(1.05)';
                          }
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        <i className={`fas fa-${p.likes?.includes(user?._id) ? 'heart' : 'heart'}`}></i>
                        {p.likes?.length || 0} likes
                      </button>

                      <button
                        onClick={() => toggleComments(p._id)}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e5e7eb',
                          color: '#64748b',
                          borderRadius: '25px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = 'rgba(184, 134, 11, 0.08)';
                          e.target.style.borderColor = '#B8860B';
                          e.target.style.color = '#B8860B';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = '#f8fafc';
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.color = '#64748b';
                        }}
                      >
                        <i className="fas fa-comment"></i>
                        Comments ({commentsByPost[p._id]?.length || p.commentCount || 0})
                      </button>

                      {(canModerate || (p.author?._id === user?._id)) && (
                        <>
                          {editingPost !== p._id && (p.author?._id === user?._id) && (
                            <button
                              onClick={() => { setEditingPost(p._id); setEditPostContent(p.content || ''); }}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #e5e7eb',
                                color: '#64748b',
                                borderRadius: '25px',
                                padding: '8px 16px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <i className="fas fa-pen"></i>
                              Edit
                            </button>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => setSharePostId(p._id)}
                        style={{
                          background: '#fef3c7',
                          border: '1px solid #fbbf24',
                          color: '#92400e',
                          borderRadius: '25px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="fas fa-share"></i>
                        Share
                      </button>

                      {(canModerate || (p.author?._id === user?._id)) && (
                        <button
                          onClick={() => {
                            setDeleteTarget({ type: 'post', id: p._id });
                            setShowDeleteModal(true);
                          }}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            borderRadius: '25px',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = '#dc2626';
                            e.target.style.color = 'white';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = '#fee2e2';
                            e.target.style.color = '#dc2626';
                          }}
                        >
                          <i className="fas fa-trash-alt"></i>
                          Delete
                        </button>
                      )}
                    </div>

                    {/* Comments Section */}
                    {showComments[p._id] && (
                      <CommentsSection
                        postId={p._id}
                        comments={commentsByPost[p._id] || []}
                        onAddComment={addComment}
                        onLikeComment={likeComment}
                        onDeleteComment={deleteComment}
                        onEditComment={editComment}
                        canModerate={canModerate}
                        currentUserId={user?._id}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
            </div>
          )}

          {/* Group Chat Tab */}
          {activeTab === 'chat' && (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
              border: '2px solid rgba(184, 134, 11, 0.25)',
              overflow: 'hidden',
              height: '600px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ height: 6, background: 'linear-gradient(90deg, #8B3A3A, #B8860B, #87A96B)' }} />
              
              {/* Chat Header */}
              <div style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #8B3A3A, #B8860B)',
                color: '#FFFEF7',
                borderBottom: '1px solid rgba(184, 134, 11, 0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{
                  fontWeight: '700',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '18px'
                }}>
                  <i className="fas fa-comment-dots"></i>
                  Group Chat
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '400',
                    opacity: 0.8,
                    background: 'rgba(255, 255, 255, 0.2)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    marginLeft: 'auto'
                  }}>
                    {group?.members?.length || 0} members
                  </span>
                </h3>
                {isMember && (
                  <button
                    onClick={fetchChatMessages}
                    disabled={loadingChat}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '20px',
                      cursor: loadingChat ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => !loadingChat && (e.target.style.background = 'rgba(255, 255, 255, 0.3)')}
                    onMouseOut={(e) => !loadingChat && (e.target.style.background = 'rgba(255, 255, 255, 0.2)')}
                  >
                    <i className={`fas ${loadingChat ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                    {loadingChat ? 'Refreshing...' : 'Refresh'}
                  </button>
                )}
              </div>

              {/* Debug banner removed for production */}

              {/* Status bar */}
              {isMember && lastRefresh && (
                <div style={{
                  padding: '8px 24px',
                  background: 'rgba(184, 134, 11, 0.05)',
                  borderBottom: '1px solid rgba(184, 134, 11, 0.1)',
                  fontSize: '12px',
                  color: '#64748b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>
                    <i className="fas fa-circle" style={{ color: '#22c55e', fontSize: '8px', marginRight: '6px' }}></i>
                    Connected
                  </span>
                  <span>
                    Last updated: {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              {!isMember ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '16px',
                  color: '#64748b'
                }}>
                  <i className="fas fa-lock" style={{ fontSize: '48px', color: '#dc2626' }}></i>
                  <h3>Join the group to participate in chat</h3>
                  <p>Group chat is available to members only</p>
                </div>
              ) : (
                <>
                  {/* Messages Area */}
                  <div style={{
                    flex: 1,
                    padding: '16px 24px',
                    overflowY: 'auto',
                    background: '#f8fafc'
                  }}>
                    {chatError && (
                      <div style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px'
                      }}>
                        <i className="fas fa-exclamation-triangle"></i>
                        {chatError}
                        <button
                          onClick={() => setChatError('')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            marginLeft: 'auto',
                            fontSize: '16px'
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                    {loadingChat ? (
                      <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px' }}></i>
                        <div>Loading messages...</div>
                      </div>
                    ) : chatMessages.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        color: '#64748b',
                        padding: '40px 20px'
                      }}>
                        <i className="fas fa-comments" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
                        <h3>No messages yet</h3>
                        <p>Be the first to start a conversation in this group chat!</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {chatMessages.map(msg => (
                          <div key={msg._id} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignSelf: (msg.sender?._id || msg.senderId) === user?._id ? 'flex-end' : 'flex-start',
                            maxWidth: '70%'
                          }}>
                            <div style={{
                              background: (msg.sender?._id || msg.senderId) === user?._id 
                                ? 'linear-gradient(135deg, #B8860B, #DAA520)' 
                                : 'white',
                              color: (msg.sender?._id || msg.senderId) === user?._id ? 'white' : '#111827',
                              padding: '12px 16px',
                              borderRadius: '18px',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                              border: (msg.sender?._id || msg.senderId) === user?._id ? 'none' : '1px solid #e5e7eb',
                              wordWrap: 'break-word'
                            }}>
                              {msg.content}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#64748b',
                              marginTop: '4px',
                              textAlign: (msg.sender?._id || msg.senderId) === user?._id ? 'right' : 'left'
                            }}>
                              {(msg.sender?._id || msg.senderId) === user?._id ? 'You' : (msg.sender?.username || 'User')} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                        <div ref={chatMessagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid rgba(184, 134, 11, 0.15)',
                    background: 'white'
                  }}>
                    <form onSubmit={sendChatMessage} style={{ display: 'flex', gap: '12px' }}>
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Type your message..."
                        disabled={sendingMessage}
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '25px',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          opacity: sendingMessage ? 0.7 : 1
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#B8860B';
                          e.target.style.boxShadow = '0 0 0 3px rgba(184, 134, 11, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.boxShadow = 'none';
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendChatMessage(e);
                          }
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!chatMessage.trim() || sendingMessage}
                        style={{
                          background: (!chatMessage.trim() || sendingMessage) ? '#e5e7eb' : 'linear-gradient(135deg, #B8860B, #DAA520)',
                          color: (!chatMessage.trim() || sendingMessage) ? '#9ca3af' : 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '44px',
                          height: '44px',
                          cursor: (!chatMessage.trim() || sendingMessage) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {sendingMessage ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fas fa-paper-plane"></i>
                        )}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
              border: '2px solid rgba(184, 134, 11, 0.25)',
              overflow: 'hidden'
            }}>
              <div style={{ height: 6, background: 'linear-gradient(90deg, #8B3A3A, #B8860B, #87A96B)' }} />
              
              {/* Members Header */}
              <div style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #8B3A3A, #B8860B)',
                color: '#FFFEF7',
                borderBottom: '1px solid rgba(184, 134, 11, 0.15)'
              }}>
                <h3 style={{
                  fontWeight: '700',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '18px'
                }}>
                  <i className="fas fa-users"></i>
                  {isPrivate && !isMember ? 'Members (Restricted)' : `Members (${group?.members?.length || 0})`}
                </h3>
              </div>

              {/* Members Content */}
              <div style={{ padding: '0' }}>
                {isPrivate && !isMember ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    Members list is visible to group members only.
                  </div>
                ) : group?.members?.length ? (
                  <div>
                    {group.members.map(m => {
                      const isOwner = (group.createdBy?._id || group.createdBy) === (m._id || m);
                      const isMod = group.moderators?.some(mod => (mod._id || mod) === (m._id || m));
                      const role = isOwner ? 'Owner' : isMod ? 'Moderator' : 'Member';

                      return (
                        <div key={m._id || m} style={{
                          padding: '16px 20px',
                          borderBottom: '1px solid rgba(0,0,0,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(184, 134, 11, 0.06)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'white';
                        }}
                        >
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: isOwner 
                              ? 'linear-gradient(135deg, #dc2626, #b91c1c)' 
                              : isMod 
                                ? 'linear-gradient(135deg, #B8860B, #DAA520)' 
                                : 'linear-gradient(135deg, #9333ea, #7c3aed)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
                          }}>
                            {((m.username || '?')[0] || '?').toUpperCase()}
                          </div>
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#111827', fontSize: '15px', fontWeight: '600' }}>
                              {m.username || 'Member'}
                            </div>
                            <div style={{
                              color: isOwner ? '#8B3A3A' : isMod ? '#B8860B' : '#64748b',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <i className={`fas fa-${isOwner ? 'crown' : isMod ? 'shield-alt' : 'user'}`}></i>
                              {role}
                            </div>
                          </div>

                          {/* Role Management Dropdown */}
                          {user && (user._id === (group.createdBy?._id || group.createdBy)) && !isOwner && (
                            <select
                              value={isMod ? 'Moderator' : 'Member'}
                              onChange={async (e) => {
                                if (e.target.value === 'Moderator' && !isMod) {
                                  await fetch(`http://localhost:5000/api/groups/${id}/add-moderator`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: m._id || m, actorId: user._id })
                                  });
                                  await fetchGroup();
                                } else if (e.target.value === 'Member' && isMod) {
                                  await fetch(`http://localhost:5000/api/groups/${id}/remove-moderator`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: m._id || m, actorId: user._id })
                                  });
                                  await fetchGroup();
                                }
                              }}
                              style={{
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                border: '1px solid #e5e7eb',
                                background: 'white'
                              }}
                            >
                              <option value="Member">Member</option>
                              <option value="Moderator">Moderator</option>
                            </select>
                          )}

                          {/* Owner Badge */}
                          {isOwner && m._id === user._id && (
                            <span style={{
                              color: '#dc2626',
                              fontWeight: '600',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <i className="fas fa-crown"></i>
                              Owner
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                    <i className="fas fa-users" style={{
                      fontSize: '32px',
                      color: '#d1d5db',
                      marginBottom: '12px'
                    }}></i>
                    <div style={{ color: '#64748b', fontSize: '14px' }}>No members yet</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Share Modal */}
        {sharePostId && createPortal(
          (
            <div
              className="modal-backdrop"
              role="dialog"
              aria-modal="true"
              onClick={() => setSharePostId(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2147483647,
                padding: '16px',
                visibility: 'visible',
                opacity: 1,
                pointerEvents: 'auto'
              }}
            >
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'relative',
                  background: 'white',
                  borderRadius: '12px',
                  width: '100%',
                  maxWidth: '520px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                  overflow: 'hidden',
                  zIndex: 2147483647,
                  visibility: 'visible',
                  opacity: 1,
                  transform: 'none'
                }}
              >
                <div className="modal-header" style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'linear-gradient(135deg, #8B3A3A, #B8860B)',
                  color: '#FFFEF7'
                }}>
                  <h3 style={{ margin: 0 }}><i className="fas fa-share"></i> Share Post</h3>
                  <button className="modal-close-btn" onClick={() => setSharePostId(null)} style={{
                    background: 'transparent', border: 'none', color: '#FFFEF7', cursor: 'pointer'
                  }}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="modal-body" style={{ padding: '16px 20px' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <button
                      className="btn btn-copy-link"
                      onClick={() => {
                        const url = `${window.location.origin}/groups/${id}?post=${sharePostId}`;
                        navigator.clipboard.writeText(url);
                        setSharePostId(null);
                        setForumInfo('Post link copied to clipboard');
                        setTimeout(() => setForumInfo(''), 2000);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #B8860B, #DAA520)',
                        color: '#FFFEF7',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Copy Link
                    </button>
                  </div>
                  <h4 style={{ margin: '10px 0' }}>Send to a conversation</h4>
                  <div className="user-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {conversations.map(c => {
                      const uid = user?._id || user?.id;
                      const other = (c.members || []).find(m => (m?._id || m) !== uid);
                      const fullName = other?.profile?.fullName || other?.username || 'User';
                      return (
                        <div key={c._id} className="user-result-item" style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 0', borderBottom: '1px solid #f1f5f9'
                        }}>
                          <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="user-avatar">
                              <div className="avatar-circle" style={{ background: '#2e3192', width: 36, height: 36, borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {c.type === 'group' ? <i className="fas fa-users"></i> : (fullName[0] || 'U').toUpperCase()}
                              </div>
                            </div>
                            <div className="user-details">
                              <span className="user-name">{c.type === 'group' ? (c.name || 'Group') : fullName}</span>
                            </div>
                          </div>
                          <button
                            className="btn btn-primary"
                            disabled={shareLoading}
                            onClick={async () => {
                              try {
                                setShareLoading(true);
                                const url = `${window.location.origin}/groups/${id}?post=${sharePostId}`;
                                const senderId = user?._id || user?.id;
                                const post = (feed || []).find(p => p._id === sharePostId);
                                const authorName = post?.author?.profile?.fullName || post?.author?.username || 'the author';
                                const label = `Check out this group post by ${authorName}`;
                                const content = `LINKMSG::${label}::${url}`;
                                const resp = await fetch(`${API_BASE}/api/chat/messages/${c._id}`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ senderId, content })
                                });
                                if (resp.ok) {
                                  setSharePostId(null);
                                }
                              } finally {
                                setShareLoading(false);
                              }
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #6B8E5A, #87A96B)',
                              color: '#FFFEF7',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            {shareLoading ? 'Sharing…' : 'Send Link'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ), document.body)}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeleteTarget(null);
          }}
          onConfirm={confirmDelete}
          title={'Delete Post'}
          message={'Are you sure you want to delete this post? This action cannot be undone.'}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

      </div>
      {/* Share Modal */}
      {sharePostId && createPortal(
        (
          <div
            className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={() => setSharePostId(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2147483647, padding: '16px' }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'relative', background: 'white', borderRadius: '12px', width: '100%', maxWidth: '520px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', overflow: 'hidden' }}
            >
              <div className="modal-header">
                <h3><i className="fas fa-share"></i> Share Post</h3>
                <button className="modal-close-btn" onClick={() => setSharePostId(null)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: '10px' }}>
                  <button
                    className="btn btn-copy-link"
                    onClick={() => {
                      const url = `${window.location.origin}/posts/${sharePostId}`;
                      navigator.clipboard.writeText(url);
                      setSharePostId(null);
                    }}
                  >
                    Copy Link
                  </button>
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
                        <button
                          className="btn btn-primary"
                          disabled={shareLoading}
                          onClick={async () => {
                            try {
                              setShareLoading(true);
                              const url = `${window.location.origin}/posts/${sharePostId}`;
                              const senderId = user?._id || user?.id;
                              const post = (feed || []).find(p => p._id === sharePostId);
                              const authorName = post?.author?.profile?.fullName || post?.author?.username || 'the author';
                              const label = `Check out this post by ${authorName}`;
                              const content = `LINKMSG::${label}::${url}`;
                              const resp = await fetch(`${API_BASE}/api/chat/messages/${c._id}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ senderId, content })
                              });
                              if (resp.ok) {
                                setSharePostId(null);
                              }
                            } finally {
                              setShareLoading(false);
                            }
                          }}
                        >
                          {shareLoading ? 'Sharing…' : 'Send Link'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ), document.body)}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
        onConfirm={confirmDelete}
        title={deleteTarget?.type === 'post' ? 'Delete Post' : 'Delete'}
        message={deleteTarget?.type === 'post' ? 'Are you sure you want to delete this post? This action cannot be undone.' : 'Are you sure you want to delete?'}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}

// Append modals within default export component return (portal and confirmation)

function InviteSearch({ group, groupId, actorId, onDone }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState('');

  const search = async (q) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/users');
      const all = await res.json();
      const filtered = all.filter(u => (u.username || '').toLowerCase().includes(q.toLowerCase()))
        .slice(0, 10);
      setResults(filtered);
    } finally {
      setLoading(false);
    }
  };

  const invite = async (userId) => {
    setInfo('');
    setSending(userId);
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${groupId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: userId, actorId })
      });
      const data = await res.json();
      if (!res.ok) {
        setInfo(data.message || 'Failed to send invite');
        return;
      }
      setInfo(data.message || 'Invite sent');
      if (onDone) onDone();
    } catch (e) {
      setInfo('Network error while sending invite');
    } finally {
      setSending('');
    }
  };

  const isMember = (id) => (group?.members || []).some(m => (m._id || m) === id);
  const alreadyInvited = (id) => (group?.invites || []).some(inv => (inv.to?._id || inv.to) === id);

  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <input
        value={query}
        onChange={e => search(e.target.value)}
        placeholder="Search users by username..."
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          fontSize: '14px',
          marginBottom: '12px'
        }}
      />
      
      {loading && (
        <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
          Searching...
        </div>
      )}
      
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        maxHeight: '220px',
        overflowY: 'auto',
        background: 'white'
      }}>
        {results.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: '13px', padding: '16px', textAlign: 'center' }}>
            {query.length < 2 ? 'Type to search users...' : 'No users found'}
          </div>
        ) : results.map(u => (
          <div key={u._id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 20%, #CD853F 60%, #DEB887 90%, #F5DEB3 100%)',
              color: '#FFFEF7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {(u.username || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, fontWeight: '500', fontSize: '14px' }}>{u.username}</div>
            <button
              onClick={() => invite(u._id)}
              disabled={sending === u._id || u._id === actorId || isMember(u._id) || alreadyInvited(u._id)}
              title={u._id === actorId ? 'You cannot invite yourself' : alreadyInvited(u._id) ? 'Invite pending' : ''}
              style={{
                background: sending === u._id || u._id === actorId || isMember(u._id) || alreadyInvited(u._id)
                  ? '#e5e7eb'
                  : 'linear-gradient(135deg, #B8860B, #DAA520)',
                color: sending === u._id || u._id === actorId || isMember(u._id) || alreadyInvited(u._id)
                  ? '#9ca3af'
                  : '#FFFEF7',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: sending === u._id || u._id === actorId || isMember(u._id) || alreadyInvited(u._id)
                  ? 'not-allowed'
                  : 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              {alreadyInvited(u._id) ? 'Invited' : sending === u._id ? 'Inviting...' : 'Invite'}
            </button>
          </div>
        ))}
      </div>
      
      {info && (
        <div style={{
          color: '#B8860B',
          fontSize: '13px',
          marginTop: '8px',
          padding: '8px',
          background: 'rgba(184, 134, 11, 0.08)',
          borderRadius: '6px'
        }}>
          <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
          {info}
        </div>
      )}
    </div>
  );
}

function CommentsSection({ postId, comments, onAddComment, onLikeComment, onDeleteComment, onEditComment, canModerate, currentUserId }) {
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [newReplyText, setNewReplyText] = useState('');
  const [showReplies, setShowReplies] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(postId, newComment.trim());
    setNewComment('');
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment._id);
    setEditText(comment.text);
  };

  const handleSaveEditComment = (commentId) => {
    if (!editText.trim()) return;
    onEditComment(commentId, editText.trim());
    setEditingComment(null);
    setEditText('');
  };

  const handleCancelEditComment = () => {
    setEditingComment(null);
    setEditText('');
  };

  const handleReply = (comment) => {
    setReplyingTo(comment._id);
    setReplyText('');
  };

  const handleSubmitReply = (postId, parentCommentId) => {
    if (!replyText.trim()) return;
    onAddComment(postId, replyText.trim(), parentCommentId);
    setReplyText('');
    setReplyingTo(null);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  const toggleReplies = (commentId) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const canEdit = (comment) => true; // Anyone can edit in group chat
  const canDelete = (comment) => true; // Anyone can delete in group chat

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    onEditComment(editingComment, editText.trim());
    setEditingComment(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditText('');
  };

  // Recursive comment component - matches PostsPage exactly
  const CommentItem = ({ 
    comment, 
    level = 0,
    currentUserId,
    onLikeComment,
    onDeleteComment,
    onEditComment,
    onAddComment,
    postId,
    canEdit,
    canDelete,
    replyingTo,
    handleReply,
    handleSubmitReply,
    newReplyText,
    setNewReplyText,
    showReplies,
    toggleReplies,
    editingComment,
    handleEditComment,
    editText,
    setEditText,
    handleSaveEdit,
    handleCancelEdit
  }) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isShowingReplies = showReplies[comment._id];
    const isReplying = replyingTo === comment._id;
    const isEditing = editingComment === comment._id;

    return (
      <div style={{ 
        marginLeft: level * 20,
        marginBottom: 12,
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '2px solid #e2e8f0'
       }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 20%, #CD853F 60%, #DEB887 90%, #F5DEB3 100%)',
            color: '#FFFEF7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {(comment.author?.username?.[0] || '?').toUpperCase()}
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>
              {comment.author?.username || 'User'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {new Date(comment.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </div>
          </div>

          {canEdit(comment) && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => handleEditComment(comment)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#B8860B',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}
              >
                <i className="fas fa-edit"></i>
              </button>
              <button
                onClick={() => onDeleteComment(comment._id, postId)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          )}
        </div>
        
        {isEditing ? (
          <div style={{ marginBottom: '12px' }}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '14px',
                resize: 'vertical',
                minHeight: '80px'
              }}
              placeholder="Edit your comment..."
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => handleSaveEditComment(comment._id)}
                style={{
                  background: '#6B8E5A',
                  color: '#FFFEF7',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Save
              </button>
              <button
                onClick={handleCancelEditComment}
                style={{
                  background: '#e5e7eb',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: '#111827', fontSize: '14px', lineHeight: '1.6', marginBottom: '12px' }}>
            {comment.text}
          </p>
        )}
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {(() => {
            const uid = currentUserId;
            const isLiked = (comment.likes || []).some(l => {
              const id = (typeof l === 'string' || typeof l === 'number') ? l : (l?._id || l?.id);
              return id === uid;
            });
            return (
              <button
                onClick={() => onLikeComment(comment._id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isLiked ? '#ef4444' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}
              >
                <i className={`${isLiked ? 'fas fa-heart' : 'far fa-heart'}`}></i>
                {comment.likes?.length > 0 && <span>{comment.likes.length}</span>}
              </button>
            );
          })()}

          <button
            onClick={() => handleReply(comment)}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px'
            }}
          >
            <i className="far fa-reply"></i>
            Reply
          </button>

          {hasReplies && (
            <button
              onClick={() => toggleReplies(comment._id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px'
              }}
            >
              <i className={`fas fa-chevron-${isShowingReplies ? 'up' : 'down'}`}></i>
              {isShowingReplies ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>

        {/* Reply Form */}
        {isReplying && (
          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(184, 134, 11, 0.05)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8B4513 0%, #DEB887 100%)',
                color: '#FFFEF7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                {currentUserId ? 'U' : '?'}
              </div>
              <div style={{ flex: 1 }}>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${comment.author?.username}...`}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    resize: 'vertical',
                    minHeight: '60px'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleCancelReply}
                    style={{
                      background: '#e5e7eb',
                      color: '#111827',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmitReply(postId, comment._id)}
                    style={{
                      background: 'linear-gradient(135deg, #722F37, #B8860B)',
                      color: '#FFFEF7',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Replies - Recursive rendering */}
        {hasReplies && isShowingReplies && (
          <div style={{ marginTop: '12px' }}>
            {comment.replies.map(reply => (
              <CommentItem 
                key={reply._id} 
                comment={reply} 
                level={level + 1}
                currentUserId={currentUserId}
                onLikeComment={onLikeComment}
                onDeleteComment={onDeleteComment}
                onEditComment={onEditComment}
                onAddComment={onAddComment}
                postId={postId}
                canEdit={canEdit}
                canDelete={canDelete}
                replyingTo={replyingTo}
                handleReply={handleReply}
                handleSubmitReply={handleSubmitReply}
                newReplyText={newReplyText}
                setNewReplyText={setNewReplyText}
                showReplies={showReplies}
                toggleReplies={toggleReplies}
                editingComment={editingComment}
                handleEditComment={handleEditComment}
                editText={editText}
                setEditText={setEditText}
                handleSaveEdit={handleSaveEdit}
                handleCancelEdit={handleCancelEdit}
              />
            ))}
          </div>
        )}
      </div>
    );
  };



  return (
    <div style={{
      marginTop: '20px',
      padding: '20px',
      background: 'rgba(248, 250, 252, 0.7)',
      borderRadius: '12px',
  border: '2px solid rgba(184, 134, 11, 0.25)'
    }}>
      <div style={{
        height: 4,
        borderRadius: 6,
  background: 'linear-gradient(90deg,#8B3A3A,#B8860B)',
        marginBottom: 12
      }} />
      <form onSubmit={handleSubmit} style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder={'Write a comment…'}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#B8860B';
              e.target.style.boxShadow = '0 0 0 3px rgba(184, 134, 11, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            style={{
              background: !newComment.trim() ? '#e5e7eb' : 'linear-gradient(135deg, #722F37, #B8860B)',
              color: !newComment.trim() ? '#9ca3af' : '#FFFEF7',
              border: 'none',
              borderRadius: '10px',
              padding: '0 16px',
              cursor: !newComment.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Post
          </button>
        </div>
      </form>

      {comments?.length ? (
        <div>
          {comments.map(c => (
            <CommentItem 
              key={c._id} 
              comment={c} 
              level={0}
              currentUserId={currentUserId}
              onLikeComment={onLikeComment}
              onDeleteComment={onDeleteComment}
              onEditComment={onEditComment}
              onAddComment={onAddComment}
              postId={postId}
              canEdit={canEdit}
              canDelete={canDelete}
              replyingTo={replyingTo}
              handleReply={handleReply}
              handleSubmitReply={handleSubmitReply}
              newReplyText={newReplyText}
              setNewReplyText={setNewReplyText}
              showReplies={showReplies}
              toggleReplies={toggleReplies}
              editingComment={editingComment}
              handleEditComment={handleEditComment}
              editText={editText}
              setEditText={setEditText}
              handleSaveEdit={handleSaveEdit}
              handleCancelEdit={handleCancelEdit}
            />
          ))}
        </div>
      ) : (
        <div style={{
          color: '#64748b',
          fontSize: '14px',
          padding: '16px',
          textAlign: 'center',
          border: '1px dashed #e5e7eb',
          borderRadius: '8px',
          background: 'white'
        }}>
          Be the first to comment
        </div>
      )}
    </div>
  );
}
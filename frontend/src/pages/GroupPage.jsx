import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmationModal from '../components/ConfirmationModal';
import GuestGate from '../components/GuestGate';
import { getChatSocket } from '../lib/socket';
import { sendPushNotification } from '../lib/pushNotifications';
import './GroupPage.css';
import './PostsPage.css';
import './Chat.css';
import './ChatThemeOverrides.css';
// Helper function to check if two dates are the same day
const isSameDay = (first, second) => {
  if (!(first instanceof Date) || !(second instanceof Date)) return false;
  return first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();
};

// Format date label (Today, Yesterday, or date)
const formatDateLabel = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const messageDate = new Date(date);
  messageDate.setHours(0, 0, 0, 0);

  if (messageDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: messageDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }
};

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

const getEntityId = (value) => {
  if (!value) return '';
  return (value._id || value.id || value).toString();
};

const getMessageConversationId = (msg) => getEntityId(msg?.conversation);

export default function GroupPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGuest = !user;
  const userId = user?._id || user?.id;

  const renderTextWithLinks = (text) => {
    if (!text) return '';

    // Book Quote feature
    if (typeof text === 'string' && text.trim().startsWith('/quote ')) {
      const content = text.replace('/quote ', '').trim();
      const parts = content.split(' - ');
      const quoteText = parts[0];
      const authorText = parts.length > 1 ? parts.slice(1).join(' - ') : 'Unknown Author';
      return (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div className="book-quote-card">
            <div className="book-quote-icon">📖</div>
            <div className="book-quote-text">"{quoteText.trim()}"</div>
            <div className="book-quote-author">{authorText.trim()}</div>
          </div>
        </div>
      );
    }

    if (typeof text === 'string' && text.startsWith('LINKMSG::')) {
      const parts = text.split('::');
      const label = parts[1] || 'View link';
      const url = parts[2] || '#';
      const snippet = parts[3] || '';
      const formattedLabel = label.startsWith('Check out this post by ') ? label.replace('Check out this post by ', 'Post by ') : label;
      return (
        <div onClick={() => {
          try {
            const urlObj = new URL(url);
            // Allow seamless local testing of links generated on the deployed Vercel app
            if (urlObj.hostname === window.location.hostname || urlObj.hostname === 'shelftalk-community.vercel.app' || urlObj.hostname.includes('vercel.app')) {
              navigate(urlObj.pathname + urlObj.search + urlObj.hash);
              return;
            }
          } catch(e) {}
          window.open(url, '_blank');
        }} className="mini-post-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div className="mini-post-header">📄 {formattedLabel}</div>
          <hr style={{ border: 'none', borderTop: '1px solid #d4c4a8', margin: '8px 0' }} />
          {snippet && <div className="mini-post-snippet">"{snippet}"</div>}
          <div className="mini-post-action">[View Post →]</div>
        </div>
      );
    }
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = String(text).split(urlRegex);
    return parts.map((part, idx) => {
      if (urlRegex.test(part)) {
        return <a key={idx} href={part} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{part}</a>;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feed, setFeed] = useState([]);
  const [composer, setComposer] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [showComments, setShowComments] = useState({});
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'forum'; // forum, chat, library, members
  const setActiveTab = (tab) => setSearchParams({ tab });

  // Library states
  const [libraryBooks, setLibraryBooks] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [uploadingBook, setUploadingBook] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [startingSession, setStartingSession] = useState(null); // bookId being started

  // Group chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatError, setChatError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const chatMessagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const groupConversationIdRef = useRef(null);
  const [editingChatMessage, setEditingChatMessage] = useState(null);
  const [editChatContent, setEditChatContent] = useState('');
  const [openChatMsgMenuId, setOpenChatMsgMenuId] = useState(null);
  const [showDeleteChatMsgModal, setShowDeleteChatMsgModal] = useState(false);
  const [deleteChatMsgTarget, setDeleteChatMsgTarget] = useState(null);

  // Enhanced forum states
  const [postFilter, setPostFilter] = useState('all'); // 'all', 'my', 'liked'
  const [editingPost, setEditingPost] = useState(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [forumInfo, setForumInfo] = useState('');
  // Leave group modal + ownership transfer feedback
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState('');
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [sharePostId, setSharePostId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  // Removed unused comment/reply UI states to satisfy ESLint "no-unused-vars"
  // These are handled inside the local CommentsSection component below.
  const [, setCommentsLoading] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

  const isMember = userId && group && group.members?.some(m => getEntityId(m) === userId);
  const isOwner = userId && group && getEntityId(group.createdBy) === userId;
  const isModerator = userId && group && group.moderators?.some(m => getEntityId(m) === userId);
  const canModerate = isOwner || isModerator;
  const isPrivate = group && (group.visibility === 'private');
  const ownerPresence = buildPresence(group?.createdBy);
  const ownerPresenceLabel = formatPresenceLabel(ownerPresence);
  const ownerDisplayName = group?.createdBy?.username || 'Unknown';

  const fetchGroup = useCallback(async () => {
    try {
      setLoading(true);
      const [gRes, pRes] = await Promise.all([
        fetch(`${API_BASE}/api/groups/${id}`),
        fetch(`${API_BASE}/api/posts`)
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
          const cRes = await fetch(`${API_BASE}/api/comments/post/${p._id}`);
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

  useEffect(() => {
    if (isGuest) return;
    fetchGroup();
  }, [fetchGroup, isGuest]);

  // Library functions
  const fetchLibrary = useCallback(async () => {
    if (!id || !userId) return;
    setLibraryLoading(true);
    try {
      const [booksRes, sessionRes] = await Promise.all([
        fetch(`${API_BASE}/api/groups/${id}/library?userId=${userId}`),
        fetch(`${API_BASE}/api/sessions/group/${id}`),
      ]);
      if (booksRes.ok) {
        const data = await booksRes.json();
        setLibraryBooks(data.books || []);
      }
      if (sessionRes.ok) {
        const data = await sessionRes.json();
        setActiveSession(data.session || null);
      }
    } catch (e) {
      console.error('Library fetch error:', e);
    } finally {
      setLibraryLoading(false);
    }
  }, [id, userId, API_BASE]);

  useEffect(() => {
    if (!userId || !id) return;
    const socket = getChatSocket(userId);
    if (!socket) return;

    const handleGroupUpdate = (payload) => {
      if (payload?.group?._id === id || payload?.group === id) {
        fetchGroup();
        if (payload.activityMessage) {
          sendPushNotification(`Group Activity: ${payload.group.name}`, { body: payload.activityMessage }, true);
        }
      }
    };

    const handlePostCreated = (payload) => {
      if (payload?.post?.group?._id === id || payload?.post?.group === id) {
        fetchGroup();
        const authorId = payload.post.author?._id || payload.post.author;
        if (authorId && authorId !== userId) {
          let authorName = 'Someone';
          if (payload.post.author?.profile?.fullName) {
             authorName = payload.post.author.profile.fullName.split(' ')[0];
          } else if (payload.post.author?.username) {
             authorName = payload.post.author.username;
          }
          const groupNameStr = payload.post.group?.name || 'group';
          sendPushNotification(`New post in ${groupNameStr}`, { body: `Post by ${authorName}` }, true);
        }
      }
    };

    const handleLibraryUpdated = (payload) => {
      if (payload?.groupId === id) {
        fetchLibrary();
        if (payload.action === 'upload' && payload.uploaderId !== userId) {
           const bookTitle = payload.book?.title || 'a new book';
           sendPushNotification(`New book added to library`, { body: `"${bookTitle}" was uploaded.` }, true);
        }
      }
    };

    socket.on('group:updated', handleGroupUpdate);
    socket.on('group:postCreated', handlePostCreated);
    socket.on('group:libraryUpdated', handleLibraryUpdated);

    return () => {
      socket.off('group:updated', handleGroupUpdate);
      socket.off('group:postCreated', handlePostCreated);
      socket.off('group:libraryUpdated', handleLibraryUpdated);
    };
  }, [userId, id, fetchGroup, fetchLibrary]);

  const handleUploadPdf = async (e) => {
    e.preventDefault();
    const fileInput = e.target.querySelector('input[type="file"]');
    const file = fileInput?.files?.[0];
    if (!file || !userId) return;

    setUploadingBook(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('userId', userId);
      formData.append('title', uploadTitle.trim() || file.name.replace(/\.pdf$/i, ''));

      const res = await fetch(`${API_BASE}/api/groups/${id}/library`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      setUploadTitle('');
      fileInput.value = '';
      await fetchLibrary();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploadingBook(false);
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/api/groups/${id}/library/${bookId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Delete failed');
      }
      await fetchLibrary();
    } catch (err) {
      setError(err.message || 'Delete failed');
    }
  };

  const handleStartSession = async (bookId) => {
    if (!userId) return;
    setStartingSession(bookId);
    try {
      const res = await fetch(`${API_BASE}/api/sessions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: id, userId, bookId, username: user?.username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start session');

      setActiveSession(data.session);
      navigate(`/groups/${id}/reading-room/${data.session._id}`);
    } catch (err) {
      setError(err.message || 'Failed to start session');
    } finally {
      setStartingSession(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'library' && group && isMember) {
      fetchLibrary();
    }
  }, [activeTab, group?._id, isMember, fetchLibrary]);

  // Load user conversations for Share modal (parity with PostsPage)
  useEffect(() => {
    const loadConversations = async () => {
      if (!user?._id || isGuest) return;
      try {
        const resp = await fetch(`${API_BASE}/api/chat/conversations/${user._id}`);
        if (resp.ok) {
          const data = await resp.json();
          setConversations(data);
        }
      } catch { }
    };
    loadConversations();
  }, [user, API_BASE, isGuest]);

  const joinGroup = async () => {
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/groups/${id}/add-member`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user._id })
      });
      if (!res.ok) throw new Error('Failed to join');
      await fetchGroup();
    } catch (e) { setError(e.message); }
  };

  const leaveGroup = async () => {
    if (!user || !user._id) {
      setError('Login required');
      return;
    }
    if (leaveLoading) return;

    setLeaveLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/groups/${id}/remove-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          newOwnerId: isOwner ? selectedNewOwner || undefined : undefined
        })
      });

      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        console.error('Failed to parse response:', e);
      }

      if (!res.ok) {
        setError(data.message || 'Unable to leave group.');
        return;
      }

      if (data.newOwner) {
        setForumInfo(`Ownership transferred to ${data.group?.createdBy?.username || 'new owner'}. You have left the group.`);
      } else {
        setForumInfo('You have left the group.');
      }

      setTimeout(() => {
        navigate('/groups');
      }, 1400);
    } catch (e) {
      setError('Error leaving group: ' + e.message);
    } finally {
      setShowLeaveModal(false);
      setLeaveLoading(false);
    }
  };

  const openLeaveModal = () => {
    if (!user || !user._id) {
      setError('Login required');
      return;
    }
    // Reset state when opening modal
    setSelectedNewOwner('');
    setError('');
    setForumInfo('');
    setShowLeaveModal(true);
  };

  const openDeleteGroupModal = () => {
    if (!isOwner) {
      setError('Only the group owner can delete the group');
      return;
    }
    // Reset state when opening modal
    setError('');
    setForumInfo('');
    setShowDeleteGroupModal(true);
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!composer.trim() || !user || !user._id) return;
    try {
      setPosting(true);
      const res = await fetch(`${API_BASE}/api/posts`, {
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
      const res = await fetch(`${API_BASE}/api/posts/${postId}/like`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user._id })
      });
      if (!res.ok) throw new Error('Failed to like');
      await fetchGroup();
    } catch (e) { setError(e.message); }
  };

  const updatePost = async (postId, newContent) => {
    if (!user || !user._id) { setError('Login required'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}`, {
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
        const res = await fetch(`${API_BASE}/api/posts/${deleteTarget.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authorId: user._id })
        });
        if (!res.ok) throw new Error('Failed to delete post');
        await fetchGroup();
      } else if (deleteTarget.type === 'comment') {
        const res = await fetch(`${API_BASE}/api/comments/${deleteTarget.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authorId: user?._id })
        });
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

  // Group deletion (owner only) -------------------------------------------------
  const handleDeleteGroup = async () => {
    if (!isOwner) {
      setError('Only the group owner can delete the group');
      return;
    }
    if (deletingGroup) return;

    setDeletingGroup(true);
    setError(''); // Clear any previous errors

    try {
      const resp = await fetch(`${API_BASE}/api/groups/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      let data = {};
      try {
        data = await resp.json();
      } catch (e) {
        console.error('Failed to parse response:', e);
      }

      if (!resp.ok) {
        throw new Error(data.message || 'Failed to delete group');
      }

      // Show success message briefly before navigating
      setForumInfo('Group deleted successfully');
      setTimeout(() => {
        navigate('/groups');
      }, 1000);
    } catch (e) {
      setError(e.message || 'Failed to delete group');
    } finally {
      setDeletingGroup(false);
      setShowDeleteGroupModal(false);
    }
  };

  // Comments functions
  const fetchComments = async (postId) => {
    try {
      setCommentsLoading(prev => ({ ...prev, [postId]: true }));
      const viewerQuery = user?._id ? `?viewerId=${user._id}` : '';
      const res = await fetch(`${API_BASE}/api/comments/post/${postId}${viewerQuery}`);
      if (res.status === 403) {
        const payload = await res.json().catch(() => ({}));
        setCommentsByPost(prev => ({ ...prev, [postId]: [] }));
        setError(payload?.message || 'Comments are restricted to group members.');
        return;
      }
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
      const res = await fetch(`${API_BASE}/api/comments`, {
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
      const res = await fetch(`${API_BASE}/api/comments/${commentId}/like`, {
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
      const res = await fetch(`${API_BASE}/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText, authorId: user?._id })
      });
      if (!res.ok) throw new Error('Failed to update comment');
      const postId = Object.keys(commentsByPost).find(id =>
        commentsByPost[id].some(c => c._id === commentId || c.replies?.some(r => r._id === commentId))
      );
      if (postId) await fetchComments(postId);
    } catch (e) { setError(e.message); }
  };

  // Group Chat Functions
  const mergeChatMessage = useCallback((incoming) => {
    if (!incoming || !groupConversationIdRef.current) return;
    if (getMessageConversationId(incoming) !== groupConversationIdRef.current) return;

    setChatMessages(prev => {
      const incomingId = getEntityId(incoming);
      const exists = prev.some(msg => getEntityId(msg) === incomingId);
      const next = exists
        ? prev.map(msg => (getEntityId(msg) === incomingId ? incoming : msg))
        : [...prev, incoming];

      return next.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return aTime - bTime;
      });
    });
    setLastRefresh(new Date());
  }, []);

  const removeChatMessage = useCallback(({ messageId, conversationId }) => {
    if (conversationId !== groupConversationIdRef.current) return;
    setChatMessages(prev => prev.filter(msg => getEntityId(msg) !== messageId));
    setLastRefresh(new Date());
  }, []);

  const fetchChatMessages = useCallback(() => {
    if (!group?._id || !isMember || !userId) return;

    const socket = socketRef.current || getChatSocket(userId);
    socketRef.current = socket;
    setLoadingChat(true);
    setChatError('');

    socket.timeout(8000).emit('group:join', {
      groupId: group._id,
      userId,
    }, (error, response) => {
      setLoadingChat(false);

      if (error) {
        setChatError('Connection error. Please check your internet connection.');
        return;
      }

      if (response?.ok) {
        groupConversationIdRef.current = getEntityId(response.conversation);
        setChatMessages(response.messages || []);
        setLastRefresh(new Date());
        return;
      }

      setChatError(response?.message || 'Failed to load chat messages');
    });
  }, [group?._id, isMember, userId]);

  useEffect(() => {
    if (!userId) return;

    const socket = getChatSocket(userId);
    socketRef.current = socket;

    const handleMessageCreated = (incoming) => {
      mergeChatMessage(incoming);

      const senderId = incoming.sender?._id || incoming.sender;
      if (senderId && senderId !== userId) {
        let senderName = 'Someone';
        if (incoming.sender?.profile?.fullName) {
          senderName = incoming.sender.profile.fullName.split(' ')[0];
        } else if (incoming.sender?.username) {
          senderName = incoming.sender.username;
        }

        const bodyText = incoming.type === 'text' 
          ? (incoming.content?.length > 40 ? incoming.content.substring(0, 40) + '...' : incoming.content)
          : 'Sent an attachment';

        sendPushNotification(`New group message from ${senderName}`, { body: bodyText }, true);
      }
    };

    const handleMessageEdited = (incoming) => {
      mergeChatMessage(incoming);
    };

    const handleMessageDeleted = (payload) => {
      removeChatMessage(payload);
    };

    socket.on('chat:messageCreated', handleMessageCreated);
    socket.on('chat:messageEdited', handleMessageEdited);
    socket.on('chat:messageDeleted', handleMessageDeleted);

    return () => {
      socket.off('chat:messageCreated', handleMessageCreated);
      socket.off('chat:messageEdited', handleMessageEdited);
      socket.off('chat:messageDeleted', handleMessageDeleted);
    };
  }, [mergeChatMessage, removeChatMessage, userId]);

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !group?._id || !userId || sendingMessage) return;

    const messageContent = chatMessage.trim();
    setChatMessage(''); // Clear input immediately for better UX
    setSendingMessage(true);
    setChatError(''); // Clear any previous errors

    const socket = socketRef.current || getChatSocket(userId);
    socketRef.current = socket;

    socket.timeout(8000).emit('group:send', {
      groupId: group._id,
      senderId: userId,
      content: messageContent,
      type: 'text',
    }, (error, response) => {
      setSendingMessage(false);

      if (error || !response?.ok) {
        setChatError(response?.message || 'Connection error. Message not sent.');
        setChatMessage(messageContent); // Restore message on error
        return;
      }

      if (response.message) {
        if (response.conversation) {
          groupConversationIdRef.current = getEntityId(response.conversation);
        }
        mergeChatMessage(response.message);
      }
    });
  };

  const handleEditChatMessage = (message) => {
    // Only allow editing text messages
    if (message.type === 'text') {
      setEditingChatMessage(message._id || message.id);
      setEditChatContent(message.content || message.message);
    }
  };

  const handleSaveChatEdit = async (messageId) => {
    if (!editChatContent.trim()) {
      alert('Message content cannot be empty');
      return;
    }
    if (!userId) return;

    const socket = socketRef.current || getChatSocket(userId);
    socketRef.current = socket;

    socket.timeout(8000).emit('chat:edit', {
      messageId,
      senderId: userId,
      content: editChatContent.trim(),
    }, (error, response) => {
      if (!error && response?.ok) {
        setEditingChatMessage(null);
        setEditChatContent('');
        if (response.message) {
          mergeChatMessage(response.message);
        }
        return;
      }

      alert(response?.message || 'Failed to update message');
    });
  };

  const handleCancelChatEdit = () => {
    setEditingChatMessage(null);
    setEditChatContent('');
  };

  const handleDeleteChatMessage = (messageId) => {
    setDeleteChatMsgTarget(messageId);
    setShowDeleteChatMsgModal(true);
  };

  const confirmDeleteChatMessage = async () => {
    if (!deleteChatMsgTarget) return;
    if (!userId) return;

    const socket = socketRef.current || getChatSocket(userId);
    socketRef.current = socket;

    socket.timeout(8000).emit('chat:delete', {
      messageId: deleteChatMsgTarget,
      senderId: userId,
    }, (error, response) => {
      if (error || !response?.ok) {
        alert(response?.message || 'Failed to delete message');
      } else {
        removeChatMessage({
          messageId: deleteChatMsgTarget,
          conversationId: groupConversationIdRef.current,
        });
      }

      setShowDeleteChatMsgModal(false);
      setDeleteChatMsgTarget(null);
    });
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
      fetchChatMessages();
    }
    return () => {
      const conversationId = groupConversationIdRef.current;
      if (conversationId && socketRef.current) {
        socketRef.current.emit('chat:leave', { conversationId });
      }
    };
  }, [activeTab, group?._id, isMember, fetchChatMessages]);

  if (isGuest) {
    return (
      <GuestGate
        title="Members Only"
        message="Sign in to view this club’s discussions, events, and private chat."
        icon="fas fa-users"
        loginText="Log In to View"
        signupText="Create Free Account"
      />
    );
  }

  return (
    <>
      <div className="gp-page">
        {/* Breadcrumb Bar */}
        <div className="gp-breadcrumb-bar">
          <button
            className="gp-back-btn"
            onClick={() => navigate('/groups')}
          >
            <i className="fas fa-arrow-left" />
            Back to Groups
          </button>
          <span className="gp-breadcrumb-label">
            <i className="fas fa-users" style={{ marginRight: 6 }} />
            Community Hub
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="gp-content" style={{ paddingBottom: 0 }}>
            <div className="gp-alert gp-alert--error">
              <i className="fas fa-exclamation-circle" />
              {error}
            </div>
          </div>
        )}

        <div className="gp-content">
          {/* Group Header Card */}
          {loading || !group ? (
            <div className="gp-card gp-hero">
              <div className="gp-loading">
                <i className="fas fa-spinner fa-spin" style={{ marginRight: 10 }} />
                Loading group...
              </div>
            </div>
          ) : (
            <div className="gp-card gp-hero" style={{ marginBottom: 24 }}>
              <div className="gp-rule" />

              <div className="gp-hero-inner">
                {/* Left: Group info */}
                <div className="gp-hero-left">
                  <div className="gp-hero-title-row">
                    <div className="gp-crest">
                      {group?.photo ? (
                        <img src={group.photo} alt={group?.name || 'Group'} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        group?.name?.[0] ? group.name[0].toUpperCase() : <i className="fas fa-users" />
                      )}
                    </div>
                    <h1 className="gp-hero-title">{group.name}</h1>
                    <span className={`gp-visibility-badge ${group.visibility === 'private' ? 'gp-visibility-badge--private' : 'gp-visibility-badge--public'}`}>
                      <i className={`fas fa-${group.visibility === 'private' ? 'lock' : 'globe'}`} style={{ marginRight: 5 }} />
                      {group.visibility === 'private' ? 'Private' : 'Public'}
                    </span>
                  </div>

                  <p className="gp-hero-desc">
                    {group.description || 'A vibrant literary community for meaningful discussions and shared reading journeys.'}
                  </p>

                  <div className="gp-hero-meta">
                    <div className="gp-meta-chip">
                      <div className="gp-meta-icon"><i className="fas fa-users" /></div>
                      <span><strong>{group.members?.length || 0}</strong> members</span>
                    </div>
                    <div className="gp-meta-chip">
                      <div className="gp-meta-icon"><i className="fas fa-crown" /></div>
                      <span>Owned by <strong>{ownerDisplayName}</strong></span>
                      <span
                        className={`presence-pill ${ownerPresence.isOnline ? 'online' : 'offline'}`}
                        title={ownerPresence.isOnline ? 'User is online' : (ownerPresence.lastSeen ? `Last seen ${ownerPresence.lastSeen.toLocaleString()}` : 'User is offline')}
                      >
                        <span className={`status-dot ${ownerPresence.isOnline ? 'online' : 'offline'}`} />
                        {ownerPresenceLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="gp-hero-actions">
                  {!isMember ? (
                    <button className="gp-btn gp-btn--primary" onClick={joinGroup}>
                      <i className="fas fa-user-plus" />
                      {isPrivate ? 'Request to Join' : 'Join Group'}
                    </button>
                  ) : (
                    <>
                      <button className="gp-btn gp-btn--ghost" onClick={openLeaveModal}>
                        <i className="fas fa-sign-out-alt" />
                        Leave Group
                      </button>
                      {isOwner && (
                        <button className="gp-btn gp-btn--danger" onClick={openDeleteGroupModal}>
                          <i className="fas fa-trash" />
                          Delete Group
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Requests Section */}
              <div style={{ marginTop: 28 }}>
                <div className="gp-rule" />
                <h3 className="gp-section-title">
                  <i className="fas fa-envelope" />
                  Requests &amp; Invitations
                </h3>

                <div className="gp-requests-grid">
                  {/* Join Requests */}
                  <div className="gp-request-panel">
                    <div className="gp-request-panel-title">
                      <i className="fas fa-user-clock" />
                      Join Requests
                    </div>
                    <div className="gp-request-scroll">
                      {(group.joinRequests || []).length === 0 ? (
                        <div className="gp-empty-msg">No pending requests</div>
                      ) : (
                        (group.joinRequests || []).map(r => (
                          <div key={r._id || r} className="gp-request-row">
                            <div className="gp-member-avatar gp-member-avatar--member" style={{ width: 34, height: 34, fontSize: '0.85rem' }}>
                              {((r.username || '?')[0] || '?').toUpperCase()}
                            </div>
                            <div style={{ flex: 1, fontWeight: 600 }}>{r.username || 'User'}</div>
                            {isOwner && (
                              <div className="gp-request-actions">
                                <button
                                  className="gp-btn gp-btn--sage"
                                  style={{ padding: '5px 10px', fontSize: '0.7rem' }}
                                  onClick={async () => {
                                    await fetch(`${API_BASE}/api/groups/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId: r._id || r, actorId: user._id }) });
                                    await fetchGroup();
                                  }}
                                >
                                  <i className="fas fa-check" /> Approve
                                </button>
                                <button
                                  className="gp-btn gp-btn--danger"
                                  style={{ padding: '5px 10px', fontSize: '0.7rem' }}
                                  onClick={async () => {
                                    await fetch(`${API_BASE}/api/groups/${id}/decline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requesterId: r._id || r, actorId: user._id }) });
                                    await fetchGroup();
                                  }}
                                >
                                  <i className="fas fa-times" /> Decline
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Sent Invitations */}
                  <div className="gp-request-panel">
                    <div className="gp-request-panel-title">
                      <i className="fas fa-paper-plane" />
                      Sent Invitations
                    </div>
                    <div className="gp-request-scroll">
                      {(group.invites || []).length === 0 ? (
                        <div className="gp-empty-msg">No pending invites</div>
                      ) : (
                        (group.invites || []).map(inv => (
                          <div key={(inv.to?._id || inv.to) + '-' + (inv.from?._id || inv.from)} className="gp-request-row">
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>To: {inv.to?.username || inv.to}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--gp-text-muted)' }}>From: {inv.from?.username || inv.from}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invite Users Section */}
              {(isOwner || isModerator) && (
                <div className="gp-invite-section">
                  <h4 className="gp-section-title">
                    <i className="fas fa-user-plus" />
                    Invite New Members
                  </h4>
                  <InviteSearch group={group} groupId={id} actorId={user?._id} onDone={fetchGroup} />
                </div>
              )}
            </div>
          )}


          {/* Tabbed Navigation */}
          <div className="gp-tabs-wrap" style={{ position: 'sticky', top: '76px', zIndex: 100, backgroundColor: '#fdfcf7', paddingTop: '10px' }}>
            <div className="gp-rule" style={{ marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }} />
            <div className="gp-tabs">
              {[
                { id: 'forum', label: 'Online Forum', icon: 'fas fa-comments' },
                { id: 'chat', label: 'Group Chat', icon: 'fas fa-comment-dots' },
                { id: 'library', label: 'Library', icon: 'fas fa-book' },
                { id: 'members', label: 'Members', icon: 'fas fa-users' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`gp-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <i className={tab.icon}></i>
                  {tab.label}

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
                  <div className="gp-access-gate">
                    <i className="fas fa-lock" style={{ color: 'var(--gp-crimson)', fontSize: '1.5rem' }} />
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4, fontFamily: 'var(--gp-font-display)' }}>This group is private</div>
                      <div style={{ color: 'var(--gp-text-muted)', fontSize: '0.9rem' }}>You need to join to view posts and members. Click "{isOwner ? 'Approve' : isMember ? 'Leave Group' : isPrivate ? 'Request to Join' : 'Join Group'}" to continue.</div>
                    </div>
                  </div>
                )}

                {/* Post Composer */}
                {isMember && (
                  <div className="gp-card gp-composer">
                    <form onSubmit={createPost}>
                      <h3 className="gp-composer-title">
                        <i className="fas fa-pen" />
                        Share with {group?.name}
                      </h3>

                      <textarea
                        value={composer}
                        onChange={e => setComposer(e.target.value)}
                        placeholder={`What's on your mind? Share with ${group?.name}...`}
                        rows={4}
                        className="gp-textarea"
                      />

                      <div className="gp-composer-footer">
                        <button type="submit" disabled={posting || !composer.trim()} className="gp-btn gp-btn--primary">
                          <i className={`fas fa-${posting ? 'spinner fa-spin' : 'paper-plane'}`} />
                          {posting ? 'Posting...' : 'Share Post'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Post Filters */}
                <div className="gp-filter-bar">
                  <span className="gp-filter-label">Filter:</span>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'my', label: 'My Posts' },
                    { id: 'liked', label: 'Liked' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setPostFilter(f.id)}
                      className={`gp-filter-btn ${postFilter === f.id ? 'active' : ''}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {forumInfo && (
                  <div className="gp-alert gp-alert--info" style={{ marginBottom: 12 }}>
                    <i className="fas fa-info-circle"></i>
                    {forumInfo}
                  </div>
                )}

                {/* Posts Feed */}
                {isPrivate && !isMember ? (
                  <div className="gp-empty-state" style={{ borderColor: 'var(--gp-crimson)' }}>
                    <i className="fas fa-user-lock gp-empty-state-icon" style={{ color: 'var(--gp-crimson)' }} />
                    <h3 style={{ color: 'var(--gp-crimson)' }}>Posts are visible to members only</h3>
                    <p>{user ? 'Request to join to see the content.' : 'Please log in and request to join to see the content.'}</p>
                  </div>
                ) : loading ? (
                  <div className="gp-loading">
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '12px' }} />
                    Loading posts...
                  </div>
                ) : feed.length === 0 ? (
                  <div className="gp-empty-state">
                    <i className="fas fa-comments gp-empty-state-icon" style={{ color: 'var(--gp-gold)' }} />
                    <h3>No posts yet</h3>
                    <p>Be the first to start a conversation in this group!</p>
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
                    .map(p => {
                      return (
                        <React.Fragment key={p._id}>
                          <article className="post-card">
                            <div className="post-card-dog-ear"></div>
                            <div className="post-header">
                              <div className="post-time">
                                {((user?._id && p.author?._id === user._id) || (user?._id && p.author === user._id) || canModerate) && (
                                  <div className="post-actions-menu">
                                    <span className="your-post-badge">Manage Post</span>
                                    <div className="post-menu-dropdown">
                                      <button className="post-menu-trigger"><i className="fas fa-ellipsis-h"></i></button>
                                      <div className="post-menu-options">
                                        {editingPost !== p._id && ((p.author?._id === user?._id) || (p.author === user?._id)) && (
                                          <button onClick={() => { setEditingPost(p._id); setEditPostContent(p.content || ''); }} className="post-menu-option edit">
                                            <i className="fas fa-edit"></i><span>Edit Post</span>
                                          </button>
                                        )}
                                        <button onClick={() => { setDeleteTarget({ type: 'post', id: p._id }); setShowDeleteModal(true); }} className="post-menu-option delete">
                                          <i className="fas fa-trash"></i><span>Delete Post</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="post-content">
                              {editingPost === p._id ? (
                                <div className="edit-form-container">
                                  <textarea
                                    value={editPostContent}
                                    onChange={e => setEditPostContent(e.target.value)}
                                    className="themed-textarea"
                                    placeholder="Edit your post..."
                                    style={{ minHeight: '100px' }}
                                  />
                                  <div className="form-actions">
                                    <button onClick={() => updatePost(p._id, editPostContent.trim())} disabled={!editPostContent.trim()} className="btn-form-primary">Save</button>
                                    <button onClick={() => { setEditingPost(null); setEditPostContent(''); }} className="btn-form-secondary">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <p>{p.content}</p>
                              )}
                            </div>

                            <div className="post-actions">
                              {(() => {
                                const viewerId = user?._id || user?.id;
                                const isOwnPost = viewerId && ((p.author?._id || p.author) === viewerId);
                                const isPostLiked = viewerId ? (p.likes || []).some(likeId => {
                                  const l = (typeof likeId === 'string' || typeof likeId === 'number') ? likeId : (likeId._id || likeId.id);
                                  return l === viewerId;
                                }) : false;

                                return (
                                  <>
                                    <button
                                      type="button"
                                      className={`ink-stamp-btn ${isPostLiked ? 'stamped' : ''}`}
                                      onClick={() => likePost(p._id)}
                                      disabled={isOwnPost || !user}
                                      style={{ opacity: isOwnPost ? 0.5 : 1, cursor: isOwnPost ? 'not-allowed' : 'pointer' }}
                                    >
                                      {isPostLiked ? 'STAMPED' : 'STAMP'} {p.likes?.length > 0 ? `(${p.likes.length})` : '(0)'}
                                    </button>
                                    <button type="button" className="action-btn comment-btn" onClick={() => toggleComments(p._id)}>
                                      <i className="far fa-comment"></i><span>{commentsByPost[p._id]?.length || p.commentCount || 0}</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="action-btn share-btn"
                                      onClick={() => setSharePostId(p._id)}
                                    >
                                      <i className="fas fa-share"></i><span>Share</span>
                                    </button>
                                  </>
                                );
                              })()}
                            </div>

                            <div className="post-book-byline">
                              <span>— written by <span className="post-author-link" style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${p.author?._id}`)}>{p.author?.username || 'Unknown Author'}</span></span>
                              <span> · </span>
                              <span>{new Date(p.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>

                            {/* Comments Section */}
                            {showComments[p._id] && (
                              <div className="comments-section" style={{ padding: '0 20px 20px' }}>
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
                              </div>
                            )}
                          </article>
                          <div className="torn-paper-divider"></div>
                        </React.Fragment>
                      );
                    })
                )}
              </div>
            )}

            {/* Group Chat Tab */}
            {activeTab === 'chat' && (
              <div className="gp-card gp-chat-container">
                <div className="gp-rule" />

                {/* Chat Header */}
                <div className="gp-chat-header">
                  <h3 className="gp-chat-title">
                    <i className="fas fa-comment-dots" />
                    Group Chat
                    <span className="gp-chat-member-count">
                      {group?.members?.length || 0} members
                    </span>
                  </h3>
                  {isMember && (
                    <button
                      onClick={fetchChatMessages}
                      disabled={loadingChat}
                      className="gp-chat-refresh"
                    >
                      <i className={`fas ${loadingChat ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} />
                      {loadingChat ? 'Refreshing...' : 'Refresh'}
                    </button>
                  )}
                </div>

                {/* Status bar */}
                {isMember && lastRefresh && (
                  <div className="gp-chat-status">
                    <span>
                      <i className="fas fa-circle" style={{ color: '#22c55e', fontSize: 8, marginRight: 6 }} />
                      {group?.members?.filter(m => buildPresence(m).isOnline).length || 0} Online Now
                    </span>
                    <button 
                      onClick={() => fetchGroup()}
                      className="gp-chat-refresh"
                      title="Refresh online status"
                    >
                      <i className="fas fa-sync-alt"></i>
                    </button>
                  </div>
                )}

                {!isMember ? (
                  <div className="gp-empty-state gp-empty-state--fill">
                    <i className="fas fa-lock gp-empty-state-icon" style={{ color: 'var(--gp-crimson)' }} />
                    <h3>Join the group to participate in chat</h3>
                    <p>Group chat is available to members only</p>
                  </div>
                ) : (
                  <>
                    {/* Messages Area */}
                    <div className="chat-main" style={{ background: 'transparent' }}>
                      {chatError && (
                        <div className="gp-alert gp-alert--error" style={{ marginBottom: 16 }}>
                          <i className="fas fa-exclamation-triangle" />
                          {chatError}
                          <button
                            onClick={() => setChatError('')}
                            style={{
                              background: 'none', border: 'none', color: 'var(--gp-crimson)',
                              cursor: 'pointer', marginLeft: 'auto', fontSize: '1rem'
                            }}
                          >
                            <i className="fas fa-times" />
                          </button>
                        </div>
                      )}

                      <div className="messages-container">
                        {loadingChat ? (
                          <div className="gp-loading" style={{ height: '100%' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: 12 }} />
                            <div>Loading messages...</div>
                          </div>
                        ) : chatMessages.length === 0 ? (
                          <div className="gp-empty-state gp-empty-state--fill">
                            <i className="fas fa-comments gp-empty-state-icon" style={{ color: 'var(--gp-gold)' }} />
                            <h3>No messages yet</h3>
                            <p>Be the first to start a conversation in this group chat!</p>
                          </div>
                        ) : (
                          <div className="messages-list">
                            {chatMessages.map((msg, index) => {
                              const currentMsgDate = msg.createdAt ? new Date(msg.createdAt) : null;
                              const prevMsgDate = index > 0 && chatMessages[index - 1].createdAt
                                ? new Date(chatMessages[index - 1].createdAt)
                                : null;

                              const showDateDivider = currentMsgDate && (!prevMsgDate || !isSameDay(currentMsgDate, prevMsgDate));
                              const isOwn = (msg.sender?._id || msg.senderId) === user?._id;

                              return (
                                <React.Fragment key={msg._id}>
                                  {showDateDivider && (
                                    <div className="date-divider">
                                      <span className="date-label">{formatDateLabel(currentMsgDate)}</span>
                                    </div>
                                  )}
                                  <div className={`message ${isOwn ? 'own-message' : 'other-message'}`}>
                                    <div className="message-content">
                                      {editingChatMessage === (msg._id || msg.id) ? (
                                        <div style={{
                                          background: 'rgba(255, 255, 255, 0.9)',
                                          padding: '12px',
                                          borderRadius: '12px',
                                          border: '2px solid #6b3a2a',
                                          marginBottom: '8px'
                                        }}>
                                          <textarea
                                            value={editChatContent}
                                            onChange={(e) => setEditChatContent(e.target.value)}
                                            style={{
                                              width: '100%',
                                              minHeight: '60px',
                                              padding: '8px',
                                              border: '1px solid #d4c4a8',
                                              borderRadius: '6px',
                                              fontSize: '14px',
                                              fontFamily: "'Crimson Text', serif",
                                              resize: 'vertical',
                                              outline: 'none'
                                            }}
                                          />
                                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleSaveChatEdit(msg._id || msg.id)} style={{ background: '#6b3a2a', color: '#fdfaf6', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Save</button>
                                            <button onClick={handleCancelChatEdit} style={{ background: '#b0a090', color: '#fdfaf6', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Cancel</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="message-bubble">
                                          {!isOwn && <strong style={{ display: 'block', fontSize: '0.8rem', opacity: 0.8, marginBottom: '2px' }}>{msg.sender?.username || 'User'}</strong>}
                                          {renderTextWithLinks(msg.content)}
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        <div className="message-timestamp">
                                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </div>
                                        {isOwn && (
                                          <div className="msg-menu-wrap">
                                            <button
                                              type="button"
                                              className="msg-menu-btn"
                                              onClick={() => setOpenChatMsgMenuId(prev => prev === (msg._id || msg.id) ? null : (msg._id || msg.id))}
                                            >
                                              <i className="fas fa-ellipsis-vertical" />
                                            </button>
                                            {openChatMsgMenuId === (msg._id || msg.id) && (
                                              <div className="msg-menu">
                                                {msg.type === 'text' && (
                                                  <button onClick={() => { handleEditChatMessage(msg); setOpenChatMsgMenuId(null); }} className="msg-menu-option edit">
                                                    <i className="fas fa-pen" /> Edit
                                                  </button>
                                                )}
                                                <button onClick={() => { handleDeleteChatMessage(msg._id || msg.id); setOpenChatMsgMenuId(null); }} className="msg-menu-option delete">
                                                  <i className="fas fa-trash" /> Delete
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </React.Fragment>
                              );
                            })}
                            <div ref={chatMessagesEndRef} />
                          </div>
                        )}
                      </div>

                      {/* Message Input */}
                      <div className="message-input-container">
                        <form onSubmit={sendChatMessage} className="message-form" style={{ display: 'flex', width: '100%', gap: '10px' }}>
                          <input
                            type="text"
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            placeholder="Type your message..."
                            disabled={sendingMessage}
                            className="chat-input"
                            style={{ flex: 1 }}
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
                            className="send-btn"
                          >
                            {sendingMessage ? (
                              <i className="fas fa-spinner fa-spin" />
                            ) : (
                              <i className="fas fa-paper-plane" />
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Library Tab */}
            {activeTab === 'library' && (
              <div>
                {!isMember ? (
                  <div className="gp-card" style={{ padding: '48px', textAlign: 'center' }}>
                    <i className="fas fa-lock" style={{ fontSize: '48px', color: '#9ca3af', marginBottom: '24px' }} />
                    <h3>Private Library</h3>
                    <p style={{ color: '#6b7280', marginTop: '12px' }}>You must be a member of this group to access its library.</p>
                  </div>
                ) : (
                  <>
                    {/* Active Session Banner */}
                    {activeSession && activeSession.status === 'active' && (
                      <div className="gp-active-session-banner">
                        <div>
                          <div className="gp-active-session-label">
                            <span className="gp-active-session-indicator" />
                            Live Reading Session
                          </div>
                          <div className="gp-active-session-title">
                            📖 {activeSession.title || 'Untitled'}
                          </div>
                          <div className="gp-active-session-meta">
                            {activeSession.participants?.length || 0} reader{(activeSession.participants?.length || 0) !== 1 ? 's' : ''} • Page {activeSession.participants?.find(p => getEntityId(p.userId) === userId)?.currentPage || 1} / {activeSession.pageCount || '—'}
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/groups/${id}/reading-room/${activeSession._id}`)}
                          className="gp-active-session-btn"
                        >
                          <i className="fas fa-book-open-reader" style={{ marginRight: 8 }} />
                          Join Reading Room →
                        </button>
                      </div>
                    )}

                    {/* Upload Section (Owner/Mod only) */}
                    {canModerate && (
                      <div className="gp-card gp-library-upload">
                        <div className="gp-library-upload-stripe" />
                        <h3 className="gp-library-upload-title">
                          <i className="fas fa-cloud-arrow-up gp-library-upload-icon" />
                          Upload Book PDF
                        </h3>
                        <form onSubmit={handleUploadPdf} className="gp-library-upload-form">
                          <div className="gp-library-upload-field">
                            <label>Book Title (optional)</label>
                            <input
                              type="text"
                              value={uploadTitle}
                              onChange={(e) => setUploadTitle(e.target.value)}
                              placeholder="Auto-detected from filename"
                              className="gp-input"
                            />
                          </div>
                          <div className="gp-library-upload-field">
                            <label>PDF File</label>
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              required
                              className="gp-input gp-input--file"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={uploadingBook}
                            className={`gp-btn gp-btn--primary gp-library-upload-btn ${uploadingBook ? 'gp-btn--disabled' : ''}`}
                          >
                            <i className={`fas fa-${uploadingBook ? 'spinner fa-spin' : 'upload'}`} style={{ marginRight: 8 }} />
                            {uploadingBook ? 'Uploading...' : 'Upload PDF'}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Books Grid */}
                    <div className="gp-card gp-library-grid">
                      <div className="gp-rule" />
                      <div className="gp-library-header">
                        <h3 className="gp-library-title">
                          <i className="fas fa-book gp-library-icon" />
                          Group Library
                        </h3>
                        <span className="gp-library-count">
                          {libraryBooks.length} book{libraryBooks.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="gp-library-body">
                        {libraryLoading ? (
                          <div className="gp-loading">
                            <i className="fas fa-spinner fa-spin gp-loading-icon" />
                            Loading library...
                          </div>
                        ) : libraryBooks.length === 0 ? (
                          <div className="gp-empty-state gp-empty-state--fill">
                            <i className="fas fa-book-open gp-empty-state-icon" />
                            <div>No books in the library yet</div>
                            {canModerate && (
                              <div className="gp-empty-state-sub">Upload a PDF above to get started</div>
                            )}
                          </div>
                        ) : (
                          <div className="gp-books-grid">
                            {libraryBooks.map((book) => {
                              const isActiveBook = activeSession?.bookId?._id === book._id || getEntityId(activeSession?.bookId) === book._id;
                              const fileSizeKb = book.fileSize ? (book.fileSize / 1024).toFixed(0) : '—';
                              const fileSizeLabel = book.fileSize > 1048576
                                ? `${(book.fileSize / 1048576).toFixed(1)} MB`
                                : `${fileSizeKb} KB`;

                              return (
                                <div key={book._id} className={`gp-book-card ${isActiveBook ? 'gp-book-card--active' : ''}`}>
                                  {isActiveBook && (
                                    <div className="gp-book-active-badge">
                                      📖 Active Session
                                    </div>
                                  )}

                                  {/* Book cover placeholder */}
                                  <div className="gp-book-cover">
                                    <i className="fas fa-file-pdf" />
                                  </div>

                                  <div className="gp-book-info">
                                    <div className="gp-book-title">
                                      {book.title || book.originalName || 'Untitled'}
                                    </div>
                                    <div className="gp-book-meta">
                                      <span className="gp-book-tag">
                                        {fileSizeLabel}
                                      </span>
                                      {book.pageCount > 0 && (
                                        <span className="gp-book-tag">
                                          {book.pageCount} pages
                                        </span>
                                      )}
                                      <span className="gp-book-tag">
                                        {new Date(book.uploadedAt || book.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>

                                    <div className="gp-book-actions">
                                      {canModerate && !activeSession && (
                                        <button
                                          onClick={() => handleStartSession(book._id)}
                                          disabled={startingSession === book._id}
                                          className={`gp-book-btn gp-book-btn-start ${startingSession === book._id ? 'gp-btn--disabled' : ''}`}
                                        >
                                          <i className={`fas fa-${startingSession === book._id ? 'spinner fa-spin' : 'play'}`} style={{ marginRight: 6 }} />
                                          {startingSession === book._id ? 'Starting...' : 'Start Session'}
                                        </button>
                                      )}
                                      {isActiveBook && (
                                        <button
                                          onClick={() => navigate(`/groups/${id}/reading-room/${activeSession._id}`)}
                                          className="gp-book-btn gp-book-btn-join"
                                        >
                                          <i className="fas fa-users" style={{ marginRight: 6 }} />
                                          Join Session
                                        </button>
                                      )}
                                      <button
                                        onClick={() => navigate(`/groups/${id}/library/${book._id}/read`)}
                                        className="gp-book-btn gp-book-btn-solo"
                                      >
                                        <i className="fas fa-book-open" style={{ marginRight: 6 }} />
                                        Read Solo
                                      </button>
                                      {canModerate && (
                                        <button
                                          onClick={() => handleDeleteBook(book._id)}
                                          className="gp-book-btn gp-book-btn--icon"
                                          title="Delete book"
                                        >
                                          <i className="fas fa-trash" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="gp-card gp-members-tab">
                <div className="gp-rule" />

                {/* Members Header */}
                <div className="gp-members-header">
                  <h3 className="gp-members-title">
                    <i className="fas fa-users" />
                    {isPrivate && !isMember ? 'Members (Restricted)' : `Members (${group?.members?.length || 0})`}
                  </h3>
                </div>

                {/* Members Content */}
                <div className="gp-members-body">
                  {isPrivate && !isMember ? (
                    <div className="gp-empty-state gp-empty-state--fill">
                      Members list is visible to group members only.
                    </div>
                  ) : group?.members?.length ? (
                    <div className="gp-members-list">
                      {group.members.map(m => {
                        const isOwner = (group.createdBy?._id || group.createdBy) === (m._id || m);
                        const isMod = group.moderators?.some(mod => (mod._id || mod) === (m._id || m));
                        const role = isOwner ? 'Owner' : isMod ? 'Moderator' : 'Member';
                        const presence = buildPresence(m);
                        const presenceLabel = formatPresenceLabel(presence);

                        return (
                          <div key={m._id || m} className="gp-member-item">
                            <div className={`gp-member-avatar ${isOwner ? 'gp-member-avatar--owner' : isMod ? 'gp-member-avatar--mod' : 'gp-member-avatar--member'}`}>
                              {((m.username || '?')[0] || '?').toUpperCase()}
                            </div>

                            <div className="gp-member-info">
                              <div className="gp-member-name">
                                {m.username || 'Member'}
                              </div>
                              <div className={`gp-member-role ${isOwner ? 'gp-member-role--owner' : isMod ? 'gp-member-role--mod' : 'gp-member-role--member'}`}>
                                <i className={`fas fa-${isOwner ? 'crown' : isMod ? 'shield-alt' : 'user'}`} />
                                {role}
                              </div>
                              <div className="gp-member-presence">
                                <span
                                  className={`presence-pill ${presence.isOnline ? 'online' : 'offline'}`}
                                  title={presence.isOnline ? 'User is online' : (presence.lastSeen ? `Last seen ${presence.lastSeen.toLocaleString()}` : 'User is offline')}
                                >
                                  <span className={`status-dot ${presence.isOnline ? 'online' : 'offline'}`} />
                                  {presenceLabel}
                                </span>
                              </div>
                            </div>

                            {/* Role Management Dropdown */}
                            {user && (user._id === (group.createdBy?._id || group.createdBy)) && !isOwner && (
                              <select
                                value={isMod ? 'Moderator' : 'Member'}
                                onChange={async (e) => {
                                  if (e.target.value === 'Moderator' && !isMod) {
                                    await fetch(`${API_BASE}/api/groups/${id}/add-moderator`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ userId: m._id || m, actorId: user._id })
                                    });
                                    await fetchGroup();
                                  } else if (e.target.value === 'Member' && isMod) {
                                    await fetch(`${API_BASE}/api/groups/${id}/remove-moderator`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ userId: m._id || m, actorId: user._id })
                                    });
                                    await fetchGroup();
                                  }
                                }}
                                className="gp-input gp-input--small gp-member-role-select"
                              >
                                <option value="Member">Member</option>
                                <option value="Moderator">Moderator</option>
                              </select>
                            )}

                            {/* Owner Badge */}
                            {isOwner && m._id === user._id && (
                              <span className="gp-member-owner-badge">
                                <i className="fas fa-crown" />
                                Owner
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="gp-empty-state gp-empty-state--fill">
                      <i className="fas fa-users gp-empty-state-icon" />
                      <div>No members yet</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Share Modal */}
          {sharePostId && createPortal(
            (
              <div className="gp-modal-backdrop" onClick={() => setSharePostId(null)}>
                <div className="gp-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="gp-modal-header">
                    <h3><i className="fas fa-share" /> Share Post</h3>
                    <button className="gp-modal-close" onClick={() => setSharePostId(null)}>
                      <i className="fas fa-times" />
                    </button>
                  </div>
                  <div className="gp-modal-body">
                    <div style={{ marginBottom: 16 }}>
                      <button
                        className="gp-btn gp-btn--primary"
                        onClick={() => {
                          const url = `${window.location.origin}/groups/${id}?post=${sharePostId}`;
                          navigator.clipboard.writeText(url);
                          setSharePostId(null);
                          setForumInfo('Post link copied to clipboard');
                          setTimeout(() => setForumInfo(''), 2000);
                        }}
                        style={{ width: '100%' }}
                      >
                        Copy Link
                      </button>
                    </div>
                    <h4 style={{ margin: '16px 0 12px', color: 'var(--gp-text)' }}>Send to a conversation</h4>
                    <div className="gp-share-user-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                      {conversations.map(c => {
                        const uid = user?._id || user?.id;
                        const other = (c.members || []).find(m => (m?._id || m) !== uid);
                        const fullName = other?.profile?.fullName || other?.username || 'User';
                        return (
                          <div key={c._id} className="gp-share-user-item" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px', background: 'var(--gp-cream)', borderRadius: 8,
                            border: '1px solid var(--gp-border)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ background: 'var(--gp-crimson)', width: 36, height: 36, borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {c.type === 'group' ? <i className="fas fa-users" /> : (fullName[0] || 'U').toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600, color: 'var(--gp-text)' }}>{c.type === 'group' ? (c.group?.name || c.name || 'Group') : fullName}</span>
                            </div>
                            <button
                              className={`gp-btn ${shareLoading ? 'gp-btn--disabled' : 'gp-btn--sage'}`}
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
            title={deleteTarget?.type === 'post' ? 'Delete Post' : 'Delete Comment'}
            message={deleteTarget?.type === 'post' ? 'Are you sure you want to delete this post? This action cannot be undone.' : 'Are you sure you want to delete this comment? This action cannot be undone.'}
            confirmText="Delete"
            cancelText="Cancel"
            type="danger"
          />

          {/* Leave Group Modal */}
          {showLeaveModal && createPortal(
            <div
              role="dialog"
              aria-modal="true"
              onClick={() => !leaveLoading && setShowLeaveModal(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2147483647, padding: '16px'
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'white', borderRadius: '14px', width: '100%', maxWidth: 480,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden', position: 'relative'
                }}
              >
                <div style={{
                  background: 'linear-gradient(135deg,#8B3A3A,#B8860B)',
                  color: '#FFFEF7', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                    <i className="fas fa-sign-out-alt" style={{ marginRight: 8 }}></i>
                    Leave Group
                  </h3>
                  <button
                    onClick={() => !leaveLoading && setShowLeaveModal(false)}
                    style={{ background: 'none', border: 'none', color: '#FFFEF7', cursor: 'pointer', fontSize: 18 }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div style={{ padding: 20 }}>
                  {error && (
                    <div style={{
                      background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
                      padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12
                    }}>
                      {error}
                    </div>
                  )}
                  {isOwner ? (
                    <>
                      <p style={{ marginTop: 0, color: '#111827', lineHeight: 1.5 }}>
                        You are the current <strong>owner</strong> of <strong>{group?.name}</strong>. Choose a moderator to become the new owner before leaving.
                      </p>
                      {(!group?.moderators || group.moderators.length === 0) && (
                        <div style={{
                          background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
                          padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12
                        }}>
                          No moderators available. Add a moderator in the Members tab before leaving.
                        </div>
                      )}
                      {group?.moderators?.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                            Select new owner
                          </label>
                          <select
                            value={selectedNewOwner}
                            onChange={e => setSelectedNewOwner(e.target.value)}
                            style={{
                              width: '100%', padding: '10px 12px', borderRadius: 8,
                              border: '1px solid #e2e8f0', fontSize: 14
                            }}
                          >
                            <option value="">-- Choose moderator --</option>
                            {group.moderators.map(m => (
                              <option key={m._id || m} value={m._id || m}>
                                {m.username || m._id || m}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ marginTop: 0, color: '#111827', lineHeight: 1.5 }}>
                      Are you sure you want to leave <strong>{group?.name}</strong>? You will lose access to its posts and chat.
                    </p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                    <button
                      disabled={leaveLoading}
                      onClick={() => setShowLeaveModal(false)}
                      style={{
                        background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569',
                        padding: '10px 18px', borderRadius: 9999, cursor: leaveLoading ? 'not-allowed' : 'pointer',
                        fontSize: 14, fontWeight: 600
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      disabled={leaveLoading || (isOwner && ((!group?.moderators || group.moderators.length === 0) || !selectedNewOwner))}
                      onClick={leaveGroup}
                      style={{
                        background: (leaveLoading || (isOwner && ((!group?.moderators || group.moderators.length === 0) || !selectedNewOwner))) ? '#e5e7eb' : 'linear-gradient(135deg,#8B3A3A,#B8860B)',
                        border: 'none', color: '#FFFEF7', padding: '10px 20px', borderRadius: 9999,
                        cursor: (leaveLoading || (isOwner && ((!group?.moderators || group.moderators.length === 0) || !selectedNewOwner))) ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 8
                      }}
                    >
                      {leaveLoading && <i className="fas fa-spinner fa-spin"></i>}
                      {leaveLoading ? 'Leaving...' : isOwner ? 'Transfer & Leave' : 'Leave Group'}
                    </button>
                  </div>
                </div>
              </div>
            </div>, document.body)}

        </div>


        {/* Chat Message Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteChatMsgModal}
          onClose={() => { setShowDeleteChatMsgModal(false); setDeleteChatMsgTarget(null); }}
          onConfirm={confirmDeleteChatMessage}
          title="Delete Message"
          message="Are you sure you want to delete this message? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      </div>
      {/* Delete Group Modal Portal */}
      {showDeleteGroupModal && isOwner && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => !deletingGroup && setShowDeleteGroupModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 40px -8px rgba(0,0,0,0.35)', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <header style={{ background: 'linear-gradient(135deg,#8B3A3A,#B8860B)', color: '#FFFEF7', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}><i className="fas fa-trash" style={{ marginRight: 8 }}></i>Delete Group</h3>
              <button type="button" disabled={deletingGroup} onClick={() => setShowDeleteGroupModal(false)} style={{ background: 'none', border: 'none', color: '#FFFEF7', cursor: deletingGroup ? 'not-allowed' : 'pointer', fontSize: 18 }} aria-label="Close delete dialog"><i className="fas fa-times" /></button>
            </header>
            <div style={{ padding: 24 }}>
              <p style={{ marginTop: 0, lineHeight: 1.55, color: '#111827', fontSize: 14 }}>This will permanently delete the group <strong>{group?.name}</strong> and its associated discussions. This action cannot be undone.</p>
              {error && (
                <div style={{ background: '#FDECEC', color: '#8B3A3A', border: '1px solid rgba(139,58,58,0.30)', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" disabled={deletingGroup} onClick={() => setShowDeleteGroupModal(false)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', padding: '10px 18px', borderRadius: 9999, cursor: deletingGroup ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>Cancel</button>
                <button type="button" disabled={deletingGroup} onClick={handleDeleteGroup} style={{ background: deletingGroup ? '#e5e7eb' : 'linear-gradient(135deg,#8B3A3A,#B8860B)', border: 'none', color: '#FFFEF7', padding: '10px 22px', borderRadius: 9999, cursor: deletingGroup ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {deletingGroup && <i className="fas fa-spinner fa-spin" />}
                  {deletingGroup ? 'Deleting…' : 'Delete Group'}
                </button>
              </div>
            </div>
          </div>
        </div>, document.body)
      }
    </>
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
      const res = await fetch(`${API_BASE}/api/users`);
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
      const res = await fetch(`${API_BASE}/api/groups/${groupId}/invite`, {
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

    editingComment,
    editText,
    setEditText,
    handleSaveEditComment,
    handleCancelEditComment,
    handleEditComment,
    handleReply,
    replyingTo,
    replyText,
    setReplyText,
    handleSubmitReply,
    handleCancelReply,
    showReplies,
    toggleReplies,
    canEdit,
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
            const isOwnComment = uid && ((comment.author?._id || comment.author) === uid);
            return (
              <button
                type="button"
                className={`ink-stamp-btn comment-stamp-btn ${isLiked ? 'stamped' : ''}`}
                onClick={() => onLikeComment(comment._id)}
                disabled={isOwnComment}
                style={{ opacity: isOwnComment ? 0.5 : 1, cursor: isOwnComment ? 'not-allowed' : 'pointer' }}
              >
                {isLiked ? 'STAMPED' : 'STAMP'} {comment.likes?.length > 0 ? `(${comment.likes.length})` : '(0)'}
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

                editingComment={editingComment}
                editText={editText}
                setEditText={setEditText}
                handleSaveEditComment={handleSaveEditComment}
                handleCancelEditComment={handleCancelEditComment}
                handleEditComment={handleEditComment}
                handleReply={handleReply}
                replyingTo={replyingTo}
                replyText={replyText}
                setReplyText={setReplyText}
                handleSubmitReply={handleSubmitReply}
                handleCancelReply={handleCancelReply}
                showReplies={showReplies}
                toggleReplies={toggleReplies}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

function CommentsSection({ postId, comments, onAddComment, onLikeComment, onDeleteComment, onEditComment, canModerate, currentUserId }) {
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState({});
  // Submit handled inline via button click in UI; remove unused handleSubmit

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

  const canEdit = (comment) => {
    if (!currentUserId) return false;
    const authorId = comment.author?._id || comment.author;
    return authorId === currentUserId || canModerate;
  };

  // Save/Cancel handled by specific handlers above (handleSaveEditComment / handleCancelEditComment)

  const [topLevelText, setTopLevelText] = useState('');

  return (
    <div className="comments-container" style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #8B4513 0%, #DEB887 100%)',
          color: '#FFFEF7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          flexShrink: 0
        }}>
          {currentUserId ? 'U' : '?'}
        </div>
        <div style={{ flex: 1 }}>
          <textarea
            value={topLevelText}
            onChange={(e) => setTopLevelText(e.target.value)}
            placeholder="Write a comment..."
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              onClick={() => {
                if (!topLevelText.trim()) return;
                onAddComment(postId, topLevelText.trim(), null);
                setTopLevelText('');
              }}
              style={{
                background: 'linear-gradient(135deg, #722F37, #B8860B)',
                color: '#FFFEF7',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Post Comment
            </button>
          </div>
        </div>
      </div>

      <div className="comments-list">
        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
            No comments yet. Be the first to share your thoughts!
          </div>
        ) : (
          comments.map(comment => (
            <CommentItem 
              key={comment._id} 
              comment={comment}
              level={0}
              currentUserId={currentUserId}
              onLikeComment={onLikeComment}
              onDeleteComment={onDeleteComment}
              onEditComment={onEditComment}
              onAddComment={onAddComment}
              postId={postId}

                editingComment={editingComment}
                editText={editText}
                setEditText={setEditText}
                handleSaveEditComment={handleSaveEditComment}
                handleCancelEditComment={handleCancelEditComment}
                handleEditComment={handleEditComment}
                handleReply={handleReply}
                replyingTo={replyingTo}
                replyText={replyText}
                setReplyText={setReplyText}
                handleSubmitReply={handleSubmitReply}
                handleCancelReply={handleCancelReply}
                showReplies={showReplies}
                toggleReplies={toggleReplies}
                canEdit={canEdit}
            />
          ))
        )}
      </div>
    </div>
  );
}

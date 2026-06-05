import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './Chat.css';
import './ChatThemeOverrides.css';
import ConfirmationModal from '../components/ConfirmationModal';
import GuestGate from '../components/GuestGate';
import { getChatSocket } from '../lib/socket';

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

// Format chat list time (for last message timestamp)
const formatChatTime = (date) => {
  if (!date) return '';
  const messageDate = new Date(date);
  if (isNaN(messageDate.getTime())) return '';
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const msgDate = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  
  // Today - show time
  if (msgDate.getTime() === today.getTime()) {
    return messageDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  
  // Yesterday
  if (msgDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  
  // This week - show day name
  const daysDiff = Math.floor((today - msgDate) / (1000 * 60 * 60 * 24));
  if (daysDiff < 7) {
    return messageDate.toLocaleDateString('en-US', { weekday: 'short' });
  }
  
  // This year - show month and day
  if (messageDate.getFullYear() === now.getFullYear()) {
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  // Older - show full date
  return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getEntityId = (value) => {
  if (!value) return '';
  return (value._id || value.id || value).toString();
};

const getMessageConversationId = (msg) => getEntityId(msg?.conversation);

const sortChatsByActivity = (items) => {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
    const bTime = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
    return bTime - aTime;
  });
};

const applyPresenceToChat = (chat, presence) => {
  if (!chat?.members || !presence?.userId) return chat;

  let changed = false;
  const members = chat.members.map((member) => {
    if (getEntityId(member) !== presence.userId || typeof member !== 'object') {
      return member;
    }

    changed = true;
    return {
      ...member,
      profile: {
        ...(member.profile || {}),
        isOnline: presence.isOnline,
        lastSeen: presence.lastSeen,
      },
    };
  });

  return changed ? { ...chat, members } : chat;
};

const formatLastMessage = (chat, currentUserId) => {
  if (!chat.lastMessage) return { text: '', prefix: null, icon: null };

  let msg = chat.lastMessage;
  const lastSenderId = chat.lastSender?._id || chat.lastSender;
  const isOwnMessage = lastSenderId === currentUserId;
  
  let prefix = null;
  let text = msg;
  let icon = null;

  // Get sender name for prefix
  const getSenderName = () => {
    if (isOwnMessage) return 'You';
    if (chat.lastSender) {
      const profile = chat.lastSender.profile;
      if (profile && profile.fullName) return profile.fullName.split(' ')[0]; // First name only
      return chat.lastSender.username;
    }
    return null;
  };

  // Detect message type
  const isImageMsg = chat.lastMessageType === 'image';
  const isFileMsg = chat.lastMessageType === 'file';
  
  // Check if message contains a link
  const urlRegex = /(https?:\/\/[^\s]+)/;
  const isLinkMsg = msg.startsWith('LINKMSG::') || urlRegex.test(msg);

  // Handle different message types
  if (isImageMsg) {
    prefix = getSenderName();
    icon = 'fa-image';
    text = 'Photo';
  } else if (isFileMsg) {
    prefix = getSenderName();
    icon = 'fa-paperclip';
    text = msg.length > 30 ? msg.substring(0, 30) + '...' : msg;
  } else if (isLinkMsg) {
    prefix = getSenderName();
    icon = 'fa-link';
    if (msg.startsWith('LINKMSG::')) {
      const parts = msg.split('::');
      text = parts[1] || 'Link';
    } else {
      text = 'Link';
    }
  } else {
    // Text message - always show prefix for consistency
    prefix = getSenderName();
    
    // Truncate long messages
    if (text.length > 35) {
      text = text.substring(0, 35) + '...';
    }
  }

  return { text, prefix, icon };
};

export default function Chat() {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  const { user } = useAuth();
  const isGuest = !user;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeChat, setActiveChat] = useState(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchUsers, setSearchUsers] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openMsgMenuId, setOpenMsgMenuId] = useState(null);
  const messagesEndRef = useRef(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const userId = user?._id || user?.id;
  const socketRef = useRef(null);
  const activeChatIdRef = useRef(null);

  const updateBlockState = useCallback((chat) => {
    if (!chat || !userId) {
      setIsBlockedByMe(false);
      setIsBlockedByOther(false);
      return;
    }

    const blockedBy = chat.blockedBy || [];
    const blockedByIds = blockedBy.map(b => getEntityId(b));
    setIsBlockedByMe(blockedByIds.includes(userId));
    const other = (chat.members || []).find(m => getEntityId(m) !== userId);
    setIsBlockedByOther(blockedByIds.includes(getEntityId(other)));
  }, [userId]);

  const upsertConversation = useCallback((conversation) => {
    if (!conversation?._id) return;

    setChats(prev => {
      const exists = prev.some(chat => chat._id === conversation._id);
      const next = exists
        ? prev.map(chat => (chat._id === conversation._id ? conversation : chat))
        : [conversation, ...prev];
      return sortChatsByActivity(next);
    });

    setActiveChat(prev => (prev?._id === conversation._id ? conversation : prev));
  }, []);

  const applyConversationSnapshot = useCallback((data = []) => {
    const sorted = sortChatsByActivity(data || []);
    const conversationId = searchParams.get('conversation');

    setChats(sorted);
    setActiveChat(prev => {
      if (conversationId) {
        const target = sorted.find(chat => chat._id === conversationId && chat.type !== 'group');
        if (target) return target;
      }

      if (prev?._id) {
        const updated = sorted.find(chat => chat._id === prev._id && chat.type !== 'group');
        if (updated) return updated;
      }

      return sorted.find(chat => chat.type !== 'group') || null;
    });
  }, [searchParams]);

  const mergeMessage = useCallback((incoming) => {
    if (!incoming || getMessageConversationId(incoming) !== activeChatIdRef.current) return;

    setMessages(prev => {
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
  }, []);

  const removeMessage = useCallback(({ messageId, conversationId }) => {
    if (conversationId !== activeChatIdRef.current) return;
    setMessages(prev => prev.filter(msg => getEntityId(msg) !== messageId));
  }, []);

  useEffect(() => {
    activeChatIdRef.current = activeChat?._id || null;
    updateBlockState(activeChat);
  }, [activeChat, updateBlockState]);

  useEffect(() => {
    if (isGuest || !userId) return;

    const socket = getChatSocket(userId);
    socketRef.current = socket;

    const requestConversations = () => {
      socket.timeout(8000).emit('chat:list', { userId }, (error, response) => {
        if (error) {
          console.error('Failed to load conversations over socket', error);
          return;
        }
        if (response?.ok) {
          applyConversationSnapshot(response.conversations || []);
        } else if (response) {
          console.error(response.message || 'Failed to load conversations');
        }
      });
    };

    const handleConversationUpdated = (conversation) => {
      upsertConversation(conversation);
    };

    const handleMessageCreated = (incoming) => {
      mergeMessage(incoming);
    };

    const handleMessageEdited = (incoming) => {
      mergeMessage(incoming);
    };

    const handleMessageDeleted = (payload) => {
      removeMessage(payload);
    };

    const handlePresenceUpdate = (presence) => {
      setChats(prev => prev.map(chat => applyPresenceToChat(chat, presence)));
      setActiveChat(prev => applyPresenceToChat(prev, presence));
    };

    socket.on('connect', requestConversations);
    socket.on('chat:conversationUpdated', handleConversationUpdated);
    socket.on('chat:messageCreated', handleMessageCreated);
    socket.on('chat:messageEdited', handleMessageEdited);
    socket.on('chat:messageDeleted', handleMessageDeleted);
    socket.on('presence:update', handlePresenceUpdate);

    if (socket.connected) {
      requestConversations();
    }

    return () => {
      socket.off('connect', requestConversations);
      socket.off('chat:conversationUpdated', handleConversationUpdated);
      socket.off('chat:messageCreated', handleMessageCreated);
      socket.off('chat:messageEdited', handleMessageEdited);
      socket.off('chat:messageDeleted', handleMessageDeleted);
      socket.off('presence:update', handlePresenceUpdate);
    };
  }, [applyConversationSnapshot, isGuest, mergeMessage, removeMessage, upsertConversation, userId]);

  const loadMessages = useCallback((opts = { silent: false }) => {
    if (isGuest || !activeChat?._id || !userId) return;

    const socket = socketRef.current || getChatSocket(userId);
    socketRef.current = socket;
    if (!opts.silent) setLoadingMessages(true);

    socket.timeout(8000).emit('chat:join', {
      conversationId: activeChat._id,
      userId,
    }, (error, response) => {
      if (!opts.silent) setLoadingMessages(false);

      if (error) {
        if (!opts.silent) console.error('Failed to join chat room', error);
        return;
      }

      if (response?.ok) {
        setMessages(response.messages || []);
        if (response.conversation) {
          upsertConversation(response.conversation);
        }
      } else if (!opts.silent) {
        alert(response?.message || 'Failed to load messages');
      }
    });
  }, [activeChat?._id, isGuest, upsertConversation, userId]);

  useEffect(() => {
    if (!activeChat?._id) {
      setMessages([]);
      return undefined;
    }

    loadMessages();
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('chat:leave', { conversationId: activeChat._id });
      }
    };
  }, [activeChat?._id, loadMessages]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !activeChat?._id || !userId) return;
    const content = message.trim();
    const socket = socketRef.current || getChatSocket(userId);
    socketRef.current = socket;
    setMessage('');

    socket.timeout(8000).emit('chat:send', {
      conversationId: activeChat._id,
      senderId: userId,
      content,
    }, (error, response) => {
      if (error || !response?.ok) {
        setMessage(content);
        alert(response?.message || 'Failed to send message');
        return;
      }

      if (response.message) {
        mergeMessage(response.message);
      }
      if (response.conversation) {
        upsertConversation(response.conversation);
      }
    });
  };

  const handleEditMessage = (message) => {
    // Only allow editing text messages
    if (message.type === 'text') {
      setEditingMessage(message._id || message.id);
      setEditContent(message.content || message.message);
    }
  };

  const handleSaveEdit = async (messageId) => {
    if (!editContent.trim()) {
      alert('Message content cannot be empty');
      return;
    }
    if (!userId) return;

    const socket = socketRef.current || getChatSocket(userId);
    socketRef.current = socket;

    socket.timeout(8000).emit('chat:edit', {
      messageId,
      senderId: userId,
      content: editContent.trim(),
    }, (error, response) => {
      if (!error && response?.ok) {
        setEditingMessage(null);
        setEditContent('');
        if (response.message) {
          mergeMessage(response.message);
        }
        if (response.conversation) {
          upsertConversation(response.conversation);
        }
        return;
      }

      alert(response?.message || 'Failed to update message');
    });
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditContent('');
  };

  const handleDeleteMessage = (messageId) => {
    setDeleteTarget({ type: 'message', id: messageId });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (!userId) return;

    if (deleteTarget.type === 'message') {
      const socket = socketRef.current || getChatSocket(userId);
      socketRef.current = socket;

      socket.timeout(8000).emit('chat:delete', {
        messageId: deleteTarget.id,
        senderId: userId,
      }, (error, response) => {
        if (error || !response?.ok) {
          alert(response?.message || 'Failed to delete message');
        } else {
          removeMessage({
            messageId: deleteTarget.id,
            conversationId: activeChatIdRef.current,
          });
          if (response.conversation) {
            upsertConversation(response.conversation);
          }
        }

        setShowDeleteModal(false);
        setDeleteTarget(null);
      });
      return;
    }

    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const getOtherParticipant = (chat) => {
    const uid = user?._id || user?.id;
    const members = chat?.members || [];
    const other = members.find(m => (m?._id || m) !== uid);
    return other;
  };

  const getDisplayName = (chat) => {
    if (!chat) return '';
    if (chat.type === 'group') return chat.name || 'Group';
    const other = getOtherParticipant(chat);
    if (!other) return 'DM';
    const profile = other.profile;
    const fullName = (profile && profile.fullName) ? profile.fullName : undefined;
    return fullName || other.username || 'User';
  };

  const getPresenceStatus = (chat) => {
    if (!chat || chat.type === 'group') return null;
    const other = getOtherParticipant(chat);
    const profile = other && typeof other.profile === 'object' ? other.profile : null;
    if (!profile) return null;
    const lastSeen = profile.lastSeen ? new Date(profile.lastSeen) : null;
    const validLastSeen = lastSeen && !Number.isNaN(lastSeen.getTime()) ? lastSeen : null;
    return {
      isOnline: Boolean(profile.isOnline),
      lastSeen: validLastSeen,
    };
  };

  const humanizeLastSeen = (date) => {
    if (!date) return null;
    const target = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(target.getTime())) return null;
    const diffMs = Date.now() - target.getTime();
    if (diffMs < 0) return null;
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return target.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getPresenceText = (presence, { compact = false } = {}) => {
    if (!presence) return compact ? 'Offline' : 'Offline';
    if (presence.isOnline) return compact ? 'Online' : 'Online now';
    const humanized = humanizeLastSeen(presence.lastSeen);
    if (!humanized) return compact ? 'Offline' : 'Offline';
    return compact ? humanized : `Last seen ${humanized}`;
  };

  const handleViewProfile = () => {
    const other = getOtherParticipant(activeChat);
    const otherId = other?._id || other;
    if (otherId) navigate(`/profile/${otherId}`);
  };

  const handleBlockToggle = async () => {
    if (!activeChat?._id || !userId) return;
    const socket = socketRef.current || getChatSocket(userId);
    socketRef.current = socket;

    socket.timeout(8000).emit('chat:block', {
      conversationId: activeChat._id,
      userId,
      blocked: !isBlockedByMe,
    }, (error, response) => {
      if (!error && response?.ok) {
        upsertConversation(response.conversation);
        updateBlockState(response.conversation);
        return;
      }

      alert(response?.message || 'Failed to update block state');
    });
  };

  const searchForUsers = useCallback(async (query) => {
    if (isGuest) {
      setFoundUsers([]);
      return;
    }

    if (query.trim().length < 2) {
      setFoundUsers([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/discover/users?search=${encodeURIComponent(query)}&limit=5`);
      if (response.ok) {
        const users = await response.json();
        const uid = user?._id || user?.id;
        setFoundUsers(users.filter(u => u._id !== uid)); // Exclude current user
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setFoundUsers([]);
    }
  }, [user, isGuest]);

  const createDirectMessage = async (targetUserId) => {
    if (!userId) return;
    setIsCreatingChat(true);
    const socket = socketRef.current || getChatSocket(userId);
    socketRef.current = socket;

    socket.timeout(8000).emit('chat:createDm', {
      userId,
      participants: [userId, targetUserId],
    }, (error, response) => {
      if (!error && response?.ok) {
        const newChat = response.conversation;
        upsertConversation(newChat);
        setActiveChat(newChat);
        setShowNewChatModal(false);
        setSearchUsers('');
        setFoundUsers([]);
      } else {
        alert(response?.message || 'Unable to start chat right now.');
      }

      setIsCreatingChat(false);
    });
  };

  useEffect(() => {
    searchForUsers(searchUsers);
  }, [searchUsers, searchForUsers]);

  // Close emoji picker and kebab menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      if (showEmojiPicker && !target.closest('.emoji-picker') && !target.closest('.emoji-btn')) {
        setShowEmojiPicker(false);
      }
      if (openMsgMenuId && !target.closest('.msg-menu-wrap')) {
        setOpenMsgMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, openMsgMenuId]);

  const directChats = chats.filter(chat => chat.type !== 'group');
  const filteredChats = directChats.filter(chat =>
    getDisplayName(chat).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Common emojis for the picker
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
    '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
    '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
    '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
    '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
    '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
    '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
    '😾', '👶', '🧒', '👦', '👧', '🧑', '👨', '👩', '🧓', '👴',
    '👵', '👤', '👥', '🫂', '👪', '👨‍👩‍👧‍👦', '👨‍👨‍👧', '👩‍👩‍👧‍👦', '👨‍👧', '👩‍👧',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
    '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏',
    '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾',
    '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀',
    '👁️', '👅', '👄', '💋', '🩸', '❤️', '🧡', '💛', '💚', '💙',
    '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗',
    '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️',
    '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋',
    '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️',
    '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️',
    '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲',
    '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔',
    '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞',
    '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆',
    '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹',
    '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾',
    '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹',
    '🚺', '🚼', '⚧', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', '🔤',
    '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣',
    '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'
  ];

  const handleEmojiClick = (emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

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
        <a href={url} target="_blank" rel="noreferrer" className="mini-post-card" style={{ textDecoration: 'none' }}>
          <div className="mini-post-header">📄 {formattedLabel}</div>
          <hr style={{ border: 'none', borderTop: '1px solid #d4c4a8', margin: '8px 0' }} />
          {snippet && <div className="mini-post-snippet">"{snippet}"</div>}
          <div className="mini-post-action">[View Post →]</div>
        </a>
      );
    }
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = String(text).split(urlRegex);
    return parts.map((part, idx) => {
      if (urlRegex.test(part)) {
        return <a key={idx} href={part} target="_blank" rel="noreferrer">{part}</a>;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat?._id || !userId) return;
    if (isBlockedByMe || isBlockedByOther) return;
    const form = new FormData();
    form.append('file', file);
    form.append('senderId', userId);
    setUploading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/chat/messages/${activeChat._id}/attachment`, {
        method: 'POST',
        body: form,
      });
      if (resp.ok) {
        const saved = await resp.json();
        mergeMessage(saved);
      } else {
        const err = await resp.json();
        alert(err?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const activePresence = getPresenceStatus(activeChat);
  const activeDisplayName = getDisplayName(activeChat);

  if (isGuest) {
    return (
      <GuestGate
        title="Messages are Private"
        message="Log in to browse your conversations and chat with other readers."
        icon="fas fa-comments"
        loginText="Log In to Chat"
        signupText="Create Free Account"
      />
    );
  }

  return (
    <div className="chat-container">
      {/* Chat Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-header">
          <div className="chat-header-top">
            <h2><i className="fas fa-comments"></i> Messages</h2>
            <button className="new-chat-btn" onClick={() => setShowNewChatModal(true)}>
              <i className="fas fa-plus"></i>
            </button>
          </div>
          <div className="chat-search">
            <div className="search-input-container">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="chat-list">
          {filteredChats.map(chat => {
            const displayName = getDisplayName(chat);
            const presence = getPresenceStatus(chat);
            const statusText = presence ? getPresenceText(presence, { compact: true }) : null;
            const uid = user?._id || user?.id;
            const lastMsg = formatLastMessage(chat, uid);
            return (
              <div
                key={chat._id}
                className={`chat-item ${activeChat?._id === chat._id ? 'active' : ''}`}
                onClick={() => setActiveChat(chat)}
              >
                <div className="chat-avatar">
                  <div className="avatar-circle">
                    {chat.type === 'group' ? (
                      <i className="fas fa-users"></i>
                    ) : (
                      displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  {chat.type !== 'group' && presence && (
                    <span className={`online-indicator ${presence.isOnline ? 'online' : 'offline'}`}></span>
                  )}
                </div>

                <div className="chat-info">
                  <div className="chat-name-row">
                    <h4>{displayName}</h4>
                    <span className="chat-time">{formatChatTime(chat.updatedAt || chat.lastMessageAt)}</span>
                  </div>
                  {chat.type !== 'group' && presence && (
                    <div className={`chat-status-row ${presence.isOnline ? 'online' : 'offline'}`}>
                      <span className={`chat-status-dot ${presence.isOnline ? 'online' : 'offline'}`}></span>
                      <span className="chat-status-text">{statusText}</span>
                    </div>
                  )}
                  <div className="chat-last-message-row">
                    <p className="chat-last-message">
                      {lastMsg.prefix && (
                        <span className={`preview-prefix ${lastMsg.prefix === 'You' ? 'you' : ''}`}>
                          {lastMsg.prefix}:{' '}
                        </span>
                      )}
                      {lastMsg.icon && (
                        <i className={`fas ${lastMsg.icon}`}></i>
                      )}
                      <span className="preview-text">
                        {lastMsg.text}
                      </span>
                    </p>
                    {/* Debug: {JSON.stringify(lastMsg)} */}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Main Area */}
      <div className="chat-main">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="chat-main-header">
              <div className="chat-main-avatar">
                <div className="avatar-circle" style={{ background: '#2e3192' }}>
                  {activeChat.type === 'group' ? (
                    <i className="fas fa-users"></i>
                  ) : (
                    activeDisplayName.charAt(0).toUpperCase()
                  )}
                </div>
                {activeChat.type !== 'group' && activePresence && (
                  <span className={`online-indicator ${activePresence.isOnline ? 'online' : 'offline'}`}></span>
                )}
              </div>
              <div className="chat-main-info">
                <h3>{activeDisplayName}</h3>
                {activeChat.type !== 'group' && activePresence && (
                  <div className={`chat-presence ${activePresence.isOnline ? 'online' : 'offline'}`}>
                    <span className={`chat-status-dot ${activePresence.isOnline ? 'online' : 'offline'}`}></span>
                    <span className="chat-status-text">{getPresenceText(activePresence)}</span>
                  </div>
                )}
              </div>
              <div className="chat-actions">
                <button className="action-btn" title={loadingMessages ? 'Refreshing…' : 'Refresh'} onClick={() => loadMessages()} disabled={loadingMessages}>
                  <i className={`fas ${loadingMessages ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                </button>
                <button className="action-btn" title="View Profile" onClick={handleViewProfile}>
                  <i className="fas fa-user"></i>
                </button>
                {activeChat.type !== 'group' && (
                  <button className="action-btn" title={isBlockedByMe ? 'Unblock conversation' : 'Block conversation'} onClick={handleBlockToggle}>
                    <i className={`fas ${isBlockedByMe ? 'fa-unlock' : 'fa-ban'}`}></i>
                  </button>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="messages-container">
              {(isBlockedByOther || isBlockedByMe) && (
                <div className="block-banner" style={{ padding: '10px', background: 'rgba(255,0,0,0.1)', color: '#c00', textAlign: 'center', margin: '8px', borderRadius: '8px' }}>
                  {isBlockedByOther ? 'You cannot send messages in this conversation.' : 'You blocked this conversation. Unblock to send messages.'}
                </div>
              )}
              <div className="messages-list">
                {messages.map((msg, index) => {
                  const currentMsgDate = msg.createdAt ? new Date(msg.createdAt) : null;
                  const prevMsgDate = index > 0 && messages[index - 1].createdAt 
                    ? new Date(messages[index - 1].createdAt) 
                    : null;
                  
                  const showDateDivider = currentMsgDate && (!prevMsgDate || !isSameDay(currentMsgDate, prevMsgDate));

                  return (
                    <React.Fragment key={msg._id || msg.id}>
                      {showDateDivider && (
                        <div className="date-divider">
                          <span className="date-label">{formatDateLabel(currentMsgDate)}</span>
                        </div>
                      )}
                      <div
                        className={`message ${(msg.sender?._id || msg.senderId) === (user?._id || user?.id) ? 'own-message' : 'other-message'}`}
                      >
                    <div className="message-content">
                      {editingMessage === (msg._id || msg.id) ? (
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.9)',
                          padding: '12px',
                          borderRadius: '12px',
                          border: '2px solid #2e3192',
                          marginBottom: '8px'
                        }}>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            style={{
                              width: '100%',
                              minHeight: '60px',
                              padding: '8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontFamily: 'inherit',
                              resize: 'vertical',
                              outline: 'none'
                            }}
                            placeholder="Edit your message..."
                          />
                          <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: '8px',
                            justifyContent: 'flex-end'
                          }}>
                            <button
                              onClick={() => handleSaveEdit(msg._id || msg.id)}
                              style={{
                                background: 'linear-gradient(135deg, #2e3192, #00b1b0)',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              style={{
                                background: '#6b7280',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="message-bubble">
                          {msg.type === 'image' ? (
                            <img src={`${API_BASE}${msg.content}`} alt="attachment" style={{ maxWidth: '320px', borderRadius: '12px' }} />
                          ) : msg.type === 'file' ? (
                            <a href={`${API_BASE}${msg.content}`} target="_blank" rel="noreferrer">
                              <i className="fas fa-paperclip"></i> {msg.fileName || 'Download file'}
                            </a>
                          ) : (
                            renderTextWithLinks(msg.content || msg.message)
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <div className="message-timestamp">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (msg.timestamp || '')}</div>
                        {(msg.sender?._id || msg.senderId) === (user?._id || user?.id) && (
                          <div className="msg-menu-wrap">
                            <button
                              type="button"
                              className="msg-menu-btn"
                              aria-haspopup="menu"
                              aria-expanded={openMsgMenuId === (msg._id || msg.id)}
                              onClick={() => setOpenMsgMenuId(prev => prev === (msg._id || msg.id) ? null : (msg._id || msg.id))}
                              title="Message actions"
                            >
                              <i className="fas fa-ellipsis-vertical"></i>
                            </button>
                            {openMsgMenuId === (msg._id || msg.id) && (
                              <div className="msg-menu" role="menu">
                                {msg.type === 'text' && (
                                  <button
                                    className="msg-menu-item"
                                    role="menuitem"
                                    onClick={() => {
                                      handleEditMessage(msg);
                                      setOpenMsgMenuId(null);
                                    }}
                                  >
                                    <i className="fas fa-pen"></i>
                                    Edit
                                  </button>
                                )}
                                <button
                                  className="msg-menu-item danger"
                                  role="menuitem"
                                  onClick={() => {
                                    handleDeleteMessage(msg._id || msg.id);
                                    setOpenMsgMenuId(null);
                                  }}
                                >
                                  <i className="fas fa-trash"></i>
                                  Delete
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
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="message-input-container">
              <form onSubmit={handleSendMessage} className="message-form">
                <div className="input-actions">
                  <label className="attach-btn" title={uploading ? 'Uploading...' : 'Attach file'}>
                    <i className="fas fa-paperclip"></i>
                    <input type="file" style={{ display: 'none' }} onChange={handleFileSelect} disabled={isBlockedByMe || isBlockedByOther || uploading} />
                  </label>
                  <button 
                    type="button" 
                    className="emoji-btn"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={isBlockedByMe || isBlockedByOther}
                  >
                    <i className="fas fa-smile"></i>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={isBlockedByOther ? 'Conversation is blocked' : isBlockedByMe ? 'You blocked this conversation' : `Message ${getDisplayName(activeChat)}...`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="message-input"
                  disabled={isBlockedByMe || isBlockedByOther}
                />
                <button type="submit" className="send-btn" disabled={!message.trim() || isBlockedByMe || isBlockedByOther}>
                  <i className="fas fa-paper-plane"></i>
                </button>
              </form>
              
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="emoji-picker">
                  <div className="emoji-picker-header">
                    <span>Choose an emoji</span>
                    <button 
                      className="emoji-picker-close"
                      onClick={() => setShowEmojiPicker(false)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  <div className="emoji-grid">
                    {commonEmojis.map((emoji, index) => (
                      <button
                        key={index}
                        className="emoji-item"
                        onClick={() => handleEmojiClick(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="no-chat-content">
              <div className="no-chat-icon">
                <i className="fas fa-comments"></i>
              </div>
              <h3>Select a conversation</h3>
              <p>Choose from your existing conversations or start a new one</p>
              <button className="start-chat-btn" onClick={() => setShowNewChatModal(true)}>
                <i className="fas fa-plus"></i>
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="modal-backdrop" onClick={() => setShowNewChatModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-plus"></i> Start New Chat</h3>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowNewChatModal(false)}
                aria-label="Close modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="userSearch">Search for users</label>
                <div className="search-input-container">
                  <i className="fas fa-search"></i>
                  <input
                    id="userSearch"
                    type="text"
                    placeholder="Type a username to search..."
                    value={searchUsers}
                    onChange={(e) => setSearchUsers(e.target.value)}
                    className="modal-search-input"
                  />
                </div>
              </div>

              {foundUsers.length > 0 && (
                <div className="user-search-results">
                  <h4>Users found:</h4>
                  <div className="user-list">
                    {foundUsers.map(foundUser => (
                      <div key={foundUser._id} className="user-result-item">
                        <div className="user-info">
                          <div className="user-avatar modal-user-avatar">
                            <div className="avatar-circle">
                              {foundUser.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          </div>
                          <div className="user-details">
                            <span className="user-name">{foundUser.username}</span>
                            {foundUser.profile?.bio && (
                              <span className="user-bio">{foundUser.profile.bio}</span>
                            )}
                          </div>
                        </div>
                        <button
                          className="modal-action-btn"
                          onClick={() => createDirectMessage(foundUser._id)}
                          disabled={isCreatingChat}
                        >
                          {isCreatingChat ? 'Creating...' : 'Start Chat'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchUsers.length >= 2 && foundUsers.length === 0 && (
                <div className="no-results">
                  <i className="fas fa-user-slash"></i>
                  <p>No users found matching "{searchUsers}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}

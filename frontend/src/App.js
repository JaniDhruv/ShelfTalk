import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import PostsPage from './pages/PostsPage';
import PostDetail from './pages/PostDetail';
import Login from './pages/Login';
import Signup from './pages/SignUp';
// import Dashboard from './pages/Dashboard'; // Dashboard temporarily disabled
import Groups from './pages/Groups';
import GroupPage from './pages/GroupPage';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Discover from './pages/Discover';
import ReadingRoom from './pages/ReadingRoom';
import PdfReadingRoom from './pages/PdfReadingRoom';
import SoloPdfReader from './pages/SoloPdfReader';

import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './components/ToastSystem';
import { getChatSocket } from './lib/socket';
import { initPushNotifications, sendPushNotification } from './lib/pushNotifications';

// Main App component with routing
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/signup';
  const { user } = useAuth();
  const { toast } = useToast();

  const locationRef = React.useRef(location);
  const navigateRef = React.useRef(navigate);

  useEffect(() => {
    locationRef.current = location;
    navigateRef.current = navigate;
  }, [location, navigate]);

  // Global Socket Listeners
  useEffect(() => {
    if (!user || !user._id) return;

    // Initialize push notifications
    if ('Notification' in window && Notification.permission === 'default') {
      toast.info('Click here to enable desktop notifications for new messages & group activity.', {
        title: 'Enable Notifications',
        duration: 10000,
        onClick: () => {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              toast.success('Notifications enabled!');
            }
          });
        }
      });
    } else {
      initPushNotifications();
    }

    const socket = getChatSocket(user._id);
    if (!socket) return;

    const handleGroupInvite = (payload) => {
      const groupName = payload?.group?.name || 'a group';
      toast.info(`You have been invited to join ${groupName}!`);
      sendPushNotification('New Group Invite', { body: `You have been invited to join ${groupName}!` });
    };

    const handleChatMessage = (incoming) => {
      const senderId = incoming.sender?._id || incoming.sender;
      if (!senderId || senderId === user._id) return;
      
      const convId = incoming.conversation?._id || incoming.conversation;

      let senderName = 'Someone';
      if (incoming.sender?.profile?.fullName) {
        senderName = incoming.sender.profile.fullName.split(' ')[0];
      } else if (incoming.sender?.username) {
        senderName = incoming.sender.username;
      }
      
      const bodyText = incoming.type === 'text' 
        ? (incoming.content?.length > 40 ? incoming.content.substring(0, 40) + '...' : incoming.content)
        : 'Sent an attachment';

      sendPushNotification(`New message from ${senderName}`, { body: bodyText });
      window.dispatchEvent(new CustomEvent('global-toast', { detail: {
        title: `New message from ${senderName}`, message: bodyText, type: 'info', duration: 5000,
        onClick: () => navigateRef.current(`/chat?conversation=${convId}`)
      }}));
    };

    const handleGroupUpdate = (payload) => {
      if (!payload?.group || !payload?.activityMessage) return;
      const groupId = payload.group._id || payload.group;

      sendPushNotification(`Group Activity: ${payload.group.name}`, { body: payload.activityMessage });
      window.dispatchEvent(new CustomEvent('global-toast', { detail: {
        title: `Group: ${payload.group.name}`, message: payload.activityMessage, type: 'info', duration: 5000,
        onClick: () => navigateRef.current(`/groups/${groupId}`)
      }}));
    };

    const handlePostCreated = (payload) => {
      if (!payload?.post?.group) return;
      const groupId = payload.post.group._id || payload.post.group;

      const authorId = payload.post.author?._id || payload.post.author;
      if (authorId === user._id) return;

      let authorName = 'Someone';
      if (payload.post.author?.profile?.fullName) {
         authorName = payload.post.author.profile.fullName.split(' ')[0];
      } else if (payload.post.author?.username) {
         authorName = payload.post.author.username;
      }
      
      const groupName = payload.post.group.name || 'a group';
      sendPushNotification(`New post in ${groupName}`, { body: `Post by ${authorName}` });
      window.dispatchEvent(new CustomEvent('global-toast', { detail: {
        title: `New post in ${groupName}`, message: `Post by ${authorName}`, type: 'info', duration: 5000,
        onClick: () => navigateRef.current(`/groups/${groupId}`)
      }}));
    };

    const handleLibraryUpdated = (payload) => {
      if (!payload?.groupId || payload.action !== 'upload' || payload.uploaderId === user._id) return;

      const bookTitle = payload.book?.title || 'a new book';
      sendPushNotification(`New book added to library`, { body: `"${bookTitle}" was uploaded.` });
      window.dispatchEvent(new CustomEvent('global-toast', { detail: {
        title: `Library updated`, message: `"${bookTitle}" was uploaded.`, type: 'info', duration: 5000,
        onClick: () => navigateRef.current(`/groups/${payload.groupId}?tab=library`)
      }}));
    };

    socket.on('group:invite', handleGroupInvite);
    socket.on('chat:messageCreated', handleChatMessage);
    socket.on('group:updated', handleGroupUpdate);
    socket.on('group:postCreated', handlePostCreated);
    socket.on('group:libraryUpdated', handleLibraryUpdated);

    return () => {
      socket.off('group:invite', handleGroupInvite);
      socket.off('chat:messageCreated', handleChatMessage);
      socket.off('group:updated', handleGroupUpdate);
      socket.off('group:postCreated', handlePostCreated);
      socket.off('group:libraryUpdated', handleLibraryUpdated);
    };
  }, [user, toast]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      {!hideNavbar && <NavBar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/posts/:id" element={<PostDetail />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupPage />} />
        <Route path="/groups/:groupId/reading-room/:sessionId" element={<ProtectedRoute><PdfReadingRoom /></ProtectedRoute>} />
        <Route path="/groups/:groupId/library/:bookId/read" element={<ProtectedRoute><SoloPdfReader /></ProtectedRoute>} />
        <Route path="/groups/:groupId/reading-room" element={<ProtectedRoute><ReadingRoom /></ProtectedRoute>} />

        {/* Social Features */}
        <Route path="/profile/:userId?" element={<Profile />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/discover" element={<Discover />} />
      </Routes>
    </>
  );
}

function App() {
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/health`)
      .catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AppContent />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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

// Main App component with routing
function AppContent() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/signup';
  const { user } = useAuth();
  const { toast } = useToast();

  // Global Socket Listeners
  useEffect(() => {
    if (!user || !user._id) return;
    const socket = getChatSocket(user._id);
    if (!socket) return;

    const handleGroupInvite = (payload) => {
      const groupName = payload?.group?.name || 'a group';
      toast.info(`You have been invited to join ${groupName}!`);
    };

    socket.on('group:invite', handleGroupInvite);

    return () => {
      socket.off('group:invite', handleGroupInvite);
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
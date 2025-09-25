import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Journal from './pages/Journal';
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
import NavBar from './components/NavBar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ToastSystem';

// Protected route wrapper
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

// Main App component with routing
function AppContent() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <>
      {!hideNavbar && <NavBar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        {/* Protected page */}
        <Route 
          path="/journal" 
          element={
            <PrivateRoute>
              <Journal />
            </PrivateRoute>
          } 
        />
  {/* Static Dashboard route (temporarily disabled) */}
  {/** <Route path="/dashboard" element={<Dashboard />} /> **/}
        {/* Auth pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
  <Route path="/posts" element={<PostsPage />} />
  <Route path="/posts/:id" element={<PostDetail />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupPage />} />
        {/* Social Features */}
        <Route 
          path="/profile/:userId?" 
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/chat" 
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/discover" 
          element={
            <PrivateRoute>
              <Discover />
            </PrivateRoute>
          } 
        />
      </Routes>
    </>
  );
}

function App() {
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
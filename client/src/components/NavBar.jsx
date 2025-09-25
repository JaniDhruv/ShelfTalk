import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide navbar on home page
  if (pathname === '/') return null;

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { path: '/posts', label: 'Posts', icon: '📝' },
    { path: '/discover', label: 'Discover', icon: '🧭' },
    { path: '/chat', label: 'Chat', icon: '💬' },
    { path: '/groups', label: 'Groups', icon: '👥' },
    // { path: '/dashboard', label: 'Dashboard', icon: '📊' } // Temporarily hidden
  ];

  const isActiveLink = (path) => pathname.startsWith(path);

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="container">
        <div className="navbar-content">
          {/* Logo */}
          <div className="navbar-brand" onClick={() => navigate('/posts')}>
            <div className="brand-icon">📚</div>
            <span className="brand-text">ShelfTalk</span>
          </div>

          {/* Desktop Navigation */}
          <div className="navbar-nav hidden-mobile">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActiveLink(item.path) ? 'nav-link-active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="navbar-actions">
            {user ? (
              <div className="user-menu">
                <Link to="/profile" className="user-info hidden-mobile">
                  <div className="avatar avatar-sm">
                    {user.username ? user.username[0].toUpperCase() : 'U'}
                  </div>
                  <span className="user-name">{user.username || 'User'}</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="btn btn-danger btn-sm"
                >
                  <span className="hidden-mobile">Logout</span>
                  <span className="hidden-desktop">🚪</span>
                </button>
              </div>
            ) : (
              <div className="auth-links">
                <Link to="/login" className="btn btn-secondary btn-sm">
                  Login
                </Link>
                <Link to="/signup" className="btn btn-primary btn-sm">
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button 
              className="mobile-menu-btn hidden-desktop"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <div className={`hamburger ${isMobileMenuOpen ? 'hamburger-open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`mobile-menu ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
          <div className="mobile-menu-content">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-nav-link ${isActiveLink(item.path) ? 'mobile-nav-link-active' : ''}`}
                onClick={closeMobileMenu}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            
            {user && (
              <div className="mobile-user-info">
                <Link to="/profile" className="mobile-user-profile" onClick={closeMobileMenu}>
                  <div className="avatar avatar-md">
                    {user.username ? user.username[0].toUpperCase() : 'U'}
                  </div>
                  <span className="user-name">{user.username || 'User'}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: var(--z-sticky);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--secondary-200);
          transition: var(--transition-all);
        }

        .navbar-scrolled {
          background: rgba(255, 255, 255, 0.98);
          box-shadow: var(--shadow);
        }

        .navbar-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) 0;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          cursor: pointer;
          text-decoration: none;
          transition: var(--transition-transform);
        }

        .navbar-brand:hover {
          transform: scale(1.05);
        }

        .brand-icon {
          font-size: var(--text-2xl);
        }

        .brand-text {
          font-size: var(--text-xl);
          font-weight: 800;
          color: var(--primary-700);
          background: linear-gradient(135deg, var(--primary-600), var(--accent-600));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .navbar-nav {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          text-decoration: none;
          color: var(--secondary-600);
          font-weight: 500;
          border-radius: var(--radius-lg);
          transition: var(--transition-all);
          position: relative;
        }

        .nav-link:hover {
          color: var(--primary-700);
          background-color: var(--primary-50);
          transform: translateY(-1px);
        }

        .nav-link-active {
          color: var(--primary-700);
          background-color: var(--primary-100);
          font-weight: 600;
        }

        .nav-icon {
          font-size: var(--text-sm);
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .user-menu {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .user-name {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--secondary-700);
        }

        .auth-links {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .mobile-menu-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: var(--space-2);
        }

        .hamburger {
          width: 24px;
          height: 18px;
          position: relative;
        }

        .hamburger span {
          display: block;
          position: absolute;
          height: 2px;
          width: 100%;
          background: var(--secondary-700);
          border-radius: 1px;
          transition: var(--transition-all);
        }

        .hamburger span:nth-child(1) {
          top: 0;
        }

        .hamburger span:nth-child(2) {
          top: 8px;
        }

        .hamburger span:nth-child(3) {
          top: 16px;
        }

        .hamburger-open span:nth-child(1) {
          transform: rotate(45deg);
          top: 8px;
        }

        .hamburger-open span:nth-child(2) {
          opacity: 0;
        }

        .hamburger-open span:nth-child(3) {
          transform: rotate(-45deg);
          top: 8px;
        }

        .mobile-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border-bottom: 1px solid var(--secondary-200);
          transform: translateY(-100%);
          opacity: 0;
          visibility: hidden;
          transition: var(--transition-all);
          box-shadow: var(--shadow-lg);
        }

        .mobile-menu-open {
          transform: translateY(0);
          opacity: 1;
          visibility: visible;
        }

        .mobile-menu-content {
          padding: var(--space-6) var(--space-4);
        }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          text-decoration: none;
          color: var(--secondary-700);
          font-weight: 500;
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-2);
          transition: var(--transition-colors);
        }

        .mobile-nav-link:hover,
        .mobile-nav-link-active {
          background-color: var(--primary-50);
          color: var(--primary-700);
        }

        .mobile-user-info {
          margin-top: var(--space-6);
          padding-top: var(--space-6);
          border-top: 1px solid var(--secondary-200);
        }

        .mobile-user-profile {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          background-color: var(--secondary-50);
          border-radius: var(--radius-lg);
        }

        @media (max-width: 640px) {
          .navbar-content {
            padding: var(--space-3) 0;
          }
          
          .brand-text {
            font-size: var(--text-lg);
          }
        }
  `}</style>
    </nav>
  );
}




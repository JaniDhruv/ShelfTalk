import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ShelfTalkLogo from './ShelfTalkLogo';

export default function NavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // ============================================
  // SCROLL EFFECT HANDLER
  // ============================================
  useEffect(() => {
    const SCROLL_ACTIVATE = 48;
    const SCROLL_DEACTIVATE = 16;

    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsScrolled((prev) => {
        if (scrollY > SCROLL_ACTIVATE) return true;
        if (scrollY < SCROLL_DEACTIVATE) return false;
        return prev;
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide navbar on home page
  if (pathname === '/') return null;

  // ============================================
  // EVENT HANDLERS
  // ============================================
  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // ============================================
  // NAVIGATION ITEMS CONFIGURATION
  // ============================================
  const navItems = [
    { path: '/posts', label: 'Posts', icon: 'fa-solid fa-file-lines' },
    { path: '/discover', label: 'Discover', icon: 'fa-solid fa-compass' },
    { path: '/chat', label: 'Chat', icon: 'fa-solid fa-comments' },
    { path: '/groups', label: 'Groups', icon: 'fa-solid fa-users' },
  ];

  const isActiveLink = (path) => pathname.startsWith(path);

  // ============================================
  // RENDER NAVBAR
  // ============================================
  return (
    <nav className={`st-navbar ${isScrolled ? 'st-navbar-scrolled' : ''}`}>
      <div className="st-navbar-container">
        <div className="st-navbar-inner">
          
          {/* ========== BRAND LOGO ========== */}
          <div className="st-brand" onClick={() => navigate('/posts')} style={{ cursor: 'pointer' }}>
            <ShelfTalkLogo size="small" type="navbar" />
          </div>

          {/* ========== DESKTOP NAVIGATION LINKS ========== */}
          <div className="st-nav-links">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`st-nav-link ${isActiveLink(item.path) ? 'st-nav-link-active' : ''}`}
              >
                <i className={item.icon}></i>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* ========== USER ACTIONS SECTION ========== */}
          <div className="st-navbar-actions">
            {user ? (
              <>
                {/* User Profile Link */}
                <Link to="/profile" className="st-user-profile">
                  <div className="st-avatar">
                    {user.username ? user.username[0].toUpperCase() : 'U'}
                  </div>
                  <span className="st-username">{user.username || 'User'}</span>
                </Link>
                
                {/* Logout Button */}
                <button onClick={handleLogout} className="st-btn st-btn-logout">
                  <i className="fa-solid fa-sign-out-alt"></i>
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                {/* Login Button */}
                <Link to="/login" className="st-btn st-btn-secondary">
                  Login
                </Link>
                
                {/* Sign Up Button */}
                <Link to="/signup" className="st-btn st-btn-primary">
                  Sign Up
                </Link>
              </>
            )}

            {/* ========== MOBILE MENU TOGGLE BUTTON ========== */}
            <button 
              className="st-mobile-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <span className={`st-hamburger ${isMobileMenuOpen ? 'st-hamburger-open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
          </div>
        </div>

        {/* ========== MOBILE MENU DROPDOWN ========== */}
        <div className={`st-mobile-menu ${isMobileMenuOpen ? 'st-mobile-menu-open' : ''}`}>
          <div className="st-mobile-menu-content">
            
            {/* Mobile Navigation Links */}
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`st-mobile-link ${isActiveLink(item.path) ? 'st-mobile-link-active' : ''}`}
                onClick={closeMobileMenu}
              >
                <i className={item.icon}></i>
                <span>{item.label}</span>
              </Link>
            ))}
            
            {/* Mobile User Profile */}
            {user && (
              <div className="st-mobile-user">
                <Link to="/profile" className="st-mobile-profile" onClick={closeMobileMenu}>
                  <div className="st-avatar st-avatar-lg">
                    {user.username ? user.username[0].toUpperCase() : 'U'}
                  </div>
                  <div className="st-mobile-user-info">
                    <span className="st-mobile-username">{user.username || 'User'}</span>
                    <span className="st-mobile-email">View Profile</span>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        /* ============================================
           LITERARY THEME - COLOR VARIABLES
           ============================================ */
        :root {
          /* Primary Colors */
          --st-burgundy-deep: #722F37;
          --st-burgundy-rich: #8B3A3A;
          --st-cream-warm: #FDF6E3;
          --st-gold-antique: #B8860B;
          --st-gold-bright: #DAA520;
          --st-sage: #87A96B;
          --st-ivory: #FFFEF7;
          --st-leather: #8B4513;
          
          /* Gradients */
          --st-gradient-leather: linear-gradient(135deg, #8B4513 0%, #A0522D 15%, #CD853F 50%, #DEB887 85%, #F5DEB3 100%);
          --st-gradient-vintage: linear-gradient(135deg, #722F37 0%, #8B3A3A 15%, #8B4513 35%, #B8860B 60%, #87A96B 85%, #A8BCA1 100%);
          --st-gradient-gold: linear-gradient(135deg, rgba(184, 134, 11, 0.95), rgba(218, 165, 32, 0.85));
          --st-gradient-burgundy: linear-gradient(135deg, #722F37, #8B3A3A);
          
          /* Shadows */
          --st-shadow-sm: 0 2px 8px rgba(114, 47, 55, 0.08);
          --st-shadow-md: 0 8px 24px rgba(114, 47, 55, 0.12);
          --st-shadow-lg: 0 16px 40px rgba(114, 47, 55, 0.16);
          --st-shadow-xl: 0 24px 60px rgba(114, 47, 55, 0.20);
          
          /* Transitions */
          --st-transition-smooth: cubic-bezier(0.4, 0, 0.2, 1);
          --st-transition-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        /* ============================================
           NAVBAR BASE STYLES
           ============================================ */
        .st-navbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          width: 100%;
          padding: 14px 0;
          background: var(--st-gradient-leather);
          border-bottom: 1px solid rgba(139, 69, 19, 0.25);
          box-shadow: var(--st-shadow-md), 0 4px 16px rgba(0, 0, 0, 0.06);
          backdrop-filter: blur(16px) saturate(180%);
          transition: all 0.4s var(--st-transition-smooth);
        }

        .st-navbar::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 40%, transparent 100%);
          pointer-events: none;
        }

        .st-navbar-scrolled {
          padding: 10px 0;
          background: var(--st-gradient-vintage);
          box-shadow: var(--st-shadow-lg), 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .st-navbar-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 32px;
          position: relative;
        }

        .st-navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          position: relative;
          z-index: 2;
        }

        /* ============================================
           BRAND LOGO STYLES
           ============================================ */
        .st-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 10px 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.08) 100%);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 24px rgba(114, 47, 55, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4);
          transition: all 0.3s var(--st-transition-smooth);
          position: relative;
          overflow: hidden;
        }

        .st-brand::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.4s ease;
        }

        .st-brand:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(114, 47, 55, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }

        .st-brand:hover::before {
          opacity: 1;
        }

        .st-brand-icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .st-brand-icon {
          font-size: 24px;
          color: var(--st-ivory);
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          transition: transform 0.3s var(--st-transition-bounce);
        }

        .st-brand:hover .st-brand-icon {
          transform: scale(1.1) rotate(-5deg);
        }

        .st-brand-text {
          font-size: 22px;
          font-weight: 700;
          color: var(--st-ivory);
          font-family: 'Playfair Display', 'Georgia', serif;
          letter-spacing: -0.5px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          white-space: nowrap;
        }

        /* ============================================
           NAVIGATION LINKS STYLES
           ============================================ */
        .st-nav-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex: 0 1 auto;
          background: rgba(0, 0, 0, 0.18);
          padding: 6px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.05);
          backdrop-filter: blur(12px);
        }

        .st-nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 18px;
          text-decoration: none;
          color: rgba(255, 254, 247, 0.92);
          font-weight: 500;
          font-size: 14px;
          letter-spacing: 0.2px;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s var(--st-transition-smooth);
          position: relative;
          white-space: nowrap;
          overflow: hidden;
        }

        .st-nav-link::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.8) 50%, transparent 100%);
          transform: scaleX(0);
          transition: transform 0.3s var(--st-transition-smooth);
        }

        .st-nav-link::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .st-nav-link:hover {
          color: var(--st-ivory);
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(184, 134, 11, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(184, 134, 11, 0.25);
        }

        .st-nav-link:hover::before {
          transform: scaleX(1);
        }

        .st-nav-link:hover::after {
          opacity: 1;
        }

        .st-nav-link-active {
          color: var(--st-ivory);
          font-weight: 600;
          background: linear-gradient(135deg, rgba(184, 134, 11, 0.32) 0%, rgba(184, 134, 11, 0.22) 100%);
          border-color: rgba(184, 134, 11, 0.55);
          box-shadow: 0 8px 24px rgba(184, 134, 11, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .st-nav-link-active::before {
          transform: scaleX(1);
        }

        .st-nav-link i {
          font-size: 15px;
          transition: transform 0.3s var(--st-transition-bounce);
        }

        .st-nav-link:hover i {
          transform: scale(1.15);
        }

        /* ============================================
           USER ACTIONS & PROFILE STYLES
           ============================================ */
        .st-navbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(0, 0, 0, 0.18);
          padding: 6px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.05);
          backdrop-filter: blur(12px);
        }

        .st-user-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px;
          border-radius: 15px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.08) 100%);
          border: 1px solid rgba(255, 255, 255, 0.28);
          text-decoration: none;
          transition: all 0.3s var(--st-transition-smooth);
          box-shadow: 0 4px 12px rgba(114, 47, 55, 0.1);
          max-width: 180px;
        }

        .st-user-profile:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.14) 100%);
          box-shadow: 0 8px 20px rgba(114, 47, 55, 0.15);
          transform: translateY(-2px);
        }

        .st-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--st-gradient-gold);
          color: var(--st-ivory);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 15px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          box-shadow: 0 6px 16px rgba(184, 134, 11, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3);
          flex-shrink: 0;
          transition: all 0.3s var(--st-transition-smooth);
        }

        .st-user-profile:hover .st-avatar {
          transform: scale(1.05);
          box-shadow: 0 8px 20px rgba(184, 134, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }

        .st-avatar-lg {
          width: 48px;
          height: 48px;
          font-size: 18px;
        }

        .st-username {
          font-size: 14px;
          font-weight: 600;
          color: var(--st-ivory);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ============================================
           BUTTON STYLES
           ============================================ */
        .st-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 14px;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.3px;
          text-decoration: none;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.3s var(--st-transition-smooth);
          position: relative;
          overflow: hidden;
          white-space: nowrap;
        }

        .st-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
          transform: translate(-50%, -50%);
          transition: width 0.6s ease, height 0.6s ease;
        }

        .st-btn:hover::before {
          width: 300px;
          height: 300px;
        }

        .st-btn > * {
          position: relative;
          z-index: 1;
        }

        .st-btn-primary {
          background: var(--st-gradient-burgundy);
          color: var(--st-ivory);
          border-color: rgba(114, 47, 55, 0.5);
          box-shadow: 0 8px 20px rgba(114, 47, 55, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .st-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(114, 47, 55, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .st-btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: var(--st-ivory);
          border-color: rgba(255, 255, 255, 0.35);
          box-shadow: 0 4px 16px rgba(255, 255, 255, 0.08);
        }

        .st-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255, 255, 255, 0.12);
        }

        .st-btn-logout {
          background: var(--st-gradient-gold);
          color: var(--st-ivory);
          border-color: rgba(184, 134, 11, 0.5);
          box-shadow: 0 8px 20px rgba(184, 134, 11, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .st-btn-logout:hover {
          background: linear-gradient(135deg, rgba(218, 165, 32, 1) 0%, rgba(184, 134, 11, 1) 100%);
          border-color: rgba(184, 134, 11, 0.7);
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(184, 134, 11, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        /* ============================================
           MOBILE MENU TOGGLE BUTTON
           ============================================ */
        .st-mobile-toggle {
          display: none;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.25);
          padding: 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .st-mobile-toggle:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.35);
        }

        .st-hamburger {
          display: block;
          width: 24px;
          height: 18px;
          position: relative;
        }

        .st-hamburger span {
          display: block;
          position: absolute;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.3) 0%, var(--st-ivory) 50%, rgba(255, 255, 255, 0.3) 100%);
          border-radius: 2px;
          transition: all 0.3s var(--st-transition-smooth);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .st-hamburger span:nth-child(1) {
          top: 0;
        }

        .st-hamburger span:nth-child(2) {
          top: 8px;
        }

        .st-hamburger span:nth-child(3) {
          top: 16px;
        }

        .st-hamburger-open span:nth-child(1) {
          transform: rotate(45deg);
          top: 8px;
        }

        .st-hamburger-open span:nth-child(2) {
          opacity: 0;
        }

        .st-hamburger-open span:nth-child(3) {
          transform: rotate(-45deg);
          top: 8px;
        }

        /* ============================================
           MOBILE MENU DROPDOWN
           ============================================ */
        .st-mobile-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 8px;
          background: var(--st-gradient-leather);
          border-radius: 20px;
          border: 1px solid rgba(139, 69, 19, 0.3);
          box-shadow: var(--st-shadow-xl);
          backdrop-filter: blur(20px) saturate(180%);
          opacity: 0;
          visibility: hidden;
          transform: translateY(-20px);
          transition: all 0.4s var(--st-transition-smooth);
          overflow: hidden;
        }

        .st-mobile-menu::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, transparent 50%);
          pointer-events: none;
        }

        .st-mobile-menu-open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .st-mobile-menu-content {
          padding: 24px;
          position: relative;
          z-index: 1;
        }

        .st-mobile-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          text-decoration: none;
          color: rgba(255, 254, 247, 0.92);
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 0.3px;
          border-radius: 16px;
          margin-bottom: 8px;
          background: rgba(253, 246, 227, 0.12);
          border: 1px solid rgba(253, 246, 227, 0.2);
          backdrop-filter: blur(15px);
          transition: all 0.3s var(--st-transition-smooth);
        }

        .st-mobile-link:hover,
        .st-mobile-link-active {
          color: var(--st-ivory);
          background: rgba(184, 134, 11, 0.25);
          border-color: rgba(184, 134, 11, 0.4);
          transform: translateX(8px);
          box-shadow: 0 6px 20px rgba(184, 134, 11, 0.25);
        }

        .st-mobile-link i {
          font-size: 18px;
          width: 24px;
          text-align: center;
        }

        .st-mobile-user {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid rgba(253, 246, 227, 0.2);
        }

        .st-mobile-profile {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px;
          background: rgba(253, 246, 227, 0.14);
          border-radius: 18px;
          border: 1px solid rgba(253, 246, 227, 0.25);
          backdrop-filter: blur(15px);
          text-decoration: none;
          transition: all 0.3s var(--st-transition-smooth);
        }

        .st-mobile-profile:hover {
          background: rgba(253, 246, 227, 0.2);
          box-shadow: 0 8px 24px rgba(114, 47, 55, 0.15);
          transform: translateY(-2px);
        }

        .st-mobile-user-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .st-mobile-username {
          font-size: 16px;
          font-weight: 700;
          color: var(--st-ivory);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .st-mobile-email {
          font-size: 13px;
          color: rgba(255, 254, 247, 0.75);
        }

        /* ============================================
           RESPONSIVE DESIGN
           ============================================ */
        @media (max-width: 1024px) {
          .st-navbar-container {
            padding: 0 24px;
          }

          .st-navbar-inner {
            gap: 20px;
          }

          .st-nav-links {
            max-width: 500px;
          }
        }

        @media (max-width: 768px) {
          .st-navbar {
            padding: 12px 0;
          }

          .st-navbar-scrolled {
            padding: 8px 0;
          }

          .st-navbar-container {
            padding: 0 16px;
          }

          .st-navbar-inner {
            gap: 12px;
          }

          .st-brand {
            padding: 6px 12px;
          }

          .st-brand-icon {
            font-size: 20px;
          }

          .st-brand-text {
            font-size: 18px;
          }

          /* Hide desktop navigation on mobile */
          .st-nav-links {
            display: none;
          }

          .st-navbar-actions {
            padding: 4px;
            gap: 8px;
          }

          /* Hide desktop user profile on mobile */
          .st-user-profile {
            display: none;
          }

          /* Show only icon for buttons on mobile */
          .st-btn span {
            display: none;
          }

          .st-btn {
            padding: 10px 12px;
          }

          /* Show mobile toggle */
          .st-mobile-toggle {
            display: block;
          }
        }

        @media (max-width: 480px) {
          .st-navbar-container {
            padding: 0 12px;
          }

          .st-brand {
            gap: 8px;
            padding: 6px 10px;
          }

          .st-brand-icon {
            font-size: 18px;
          }

          .st-brand-text {
            font-size: 16px;
          }

          .st-mobile-menu-content {
            padding: 16px;
          }
        }
  `}</style>
    </nav>
  );
}




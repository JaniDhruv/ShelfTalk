import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user: authUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalPosts: 0,
    totalGroups: 0,
    readingStreak: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (authUser && authUser._id) {
        try {
          // Fetch user data
          const userResponse = await fetch(`http://localhost:5000/api/users/${authUser._id}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserData(userData);
          }

          // Fetch user stats (you can implement these endpoints)
          // For now using mock data
          setStats({
            totalBooks: 42,
            totalPosts: 18,
            totalGroups: 3,
            readingStreak: 12
          });
        } catch (err) {
          console.error('Failed to load user data:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [authUser]);

  if (!authUser) {
    return (
      <div className="dashboard-container">
        <div className="auth-required">
          <h2>Please log in to view your dashboard</h2>
          <Link to="/login" className="btn btn-primary">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const user = userData || authUser;

  return (
    <div className="dashboard-container fade-in">
      {/* Hero Section */}
      <section className="dashboard-hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                Welcome back, <span className="highlight">{user.username}</span>! 📚
              </h1>
              <p className="hero-subtitle">
                Continue your reading journey and discover new stories
              </p>
            </div>
            <div className="hero-avatar">
              <div className="avatar avatar-lg">
                {user.username ? user.username[0].toUpperCase() : 'U'}
              </div>
              <div className="hero-badge">
                <span>📖</span>
                <span>Book Lover</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="dashboard-stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📚</div>
              <div className="stat-content">
                <h3>{stats.totalBooks}</h3>
                <p>Books Read</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-content">
                <h3>{stats.totalPosts}</h3>
                <p>Posts Created</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>{stats.totalGroups}</h3>
                <p>Groups Joined</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-content">
                <h3>{stats.readingStreak}</h3>
                <p>Day Streak</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="dashboard-actions">
        <div className="container">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/posts" className="action-card">
              <div className="action-icon">✍️</div>
              <h3>Create Post</h3>
              <p>Share your thoughts about a book</p>
            </Link>
            <Link to="/groups" className="action-card">
              <div className="action-icon">🎭</div>
              <h3>Join Groups</h3>
              <p>Connect with fellow readers</p>
            </Link>
            <Link to="/books" className="action-card">
              <div className="action-icon">🔍</div>
              <h3>Discover Books</h3>
              <p>Find your next great read</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="dashboard-activity">
        <div className="container">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">📖</div>
              <div className="activity-content">
                <p><strong>You joined a new group</strong></p>
                <span className="activity-time">2 hours ago</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">✍️</div>
              <div className="activity-content">
                <p><strong>You created a new post</strong></p>
                <span className="activity-time">1 day ago</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">📚</div>
              <div className="activity-content">
                <p><strong>You finished reading "The Great Gatsby"</strong></p>
                <span className="activity-time">3 days ago</span>
              </div>
            </div>
          </div>
        </div>
      </section>

  <style>{`
        .dashboard-container {
          min-height: 100vh;
          background: var(--secondary-50);
        }

        .dashboard-hero {
          background: linear-gradient(135deg, var(--primary-600), var(--accent-600));
          color: white;
          padding: var(--space-16) 0 var(--space-12);
          position: relative;
          overflow: hidden;
        }

        .dashboard-hero::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="books" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><text x="10" y="15" text-anchor="middle" font-size="12" fill="rgba(255,255,255,0.1)">📚</text></pattern></defs><rect width="100" height="100" fill="url(%23books)"/></svg>');
          opacity: 0.3;
        }

        .hero-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-8);
          position: relative;
          z-index: 1;
        }

        .hero-text {
          flex: 1;
        }

        .hero-title {
          font-size: var(--text-4xl);
          font-weight: 800;
          margin-bottom: var(--space-4);
          line-height: 1.2;
        }

        .highlight {
          background: linear-gradient(45deg, var(--warning-300), var(--success-300));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: var(--text-lg);
          opacity: 0.9;
          margin: 0;
        }

        .hero-avatar {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-4);
        }

        .hero-badge {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          background: rgba(255, 255, 255, 0.2);
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          font-weight: 600;
        }

        .dashboard-stats {
          padding: var(--space-12) 0;
          margin-top: -var(--space-6);
          position: relative;
          z-index: 2;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-6);
        }

        .stat-card {
          background: white;
          padding: var(--space-6);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--secondary-200);
          display: flex;
          align-items: center;
          gap: var(--space-4);
          transition: var(--transition-all);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-2xl);
        }

        .stat-icon {
          font-size: var(--text-3xl);
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--primary-100);
          border-radius: var(--radius-xl);
        }

        .stat-content h3 {
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--secondary-900);
          margin: 0 0 var(--space-1) 0;
        }

        .stat-content p {
          font-size: var(--text-sm);
          color: var(--secondary-600);
          margin: 0;
        }

        .dashboard-actions {
          padding: var(--space-12) 0;
        }

        .section-title {
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--secondary-900);
          margin-bottom: var(--space-8);
          text-align: center;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-6);
        }

        .action-card {
          background: white;
          padding: var(--space-8);
          border-radius: var(--radius-2xl);
          border: 1px solid var(--secondary-200);
          text-decoration: none;
          color: inherit;
          transition: var(--transition-all);
          text-align: center;
        }

        .action-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-xl);
          border-color: var(--primary-300);
        }

        .action-icon {
          font-size: var(--text-4xl);
          margin-bottom: var(--space-4);
        }

        .action-card h3 {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--secondary-900);
          margin-bottom: var(--space-2);
        }

        .action-card p {
          color: var(--secondary-600);
          margin: 0;
        }

        .dashboard-activity {
          padding: var(--space-12) 0;
          background: white;
        }

        .activity-list {
          max-width: 600px;
          margin: 0 auto;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-4);
          border-radius: var(--radius-lg);
          transition: var(--transition-colors);
        }

        .activity-item:hover {
          background: var(--secondary-50);
        }

        .activity-icon {
          font-size: var(--text-xl);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--primary-100);
          border-radius: var(--radius-lg);
        }

        .activity-content {
          flex: 1;
        }

        .activity-content p {
          margin: 0 0 var(--space-1) 0;
          color: var(--secondary-900);
        }

        .activity-time {
          font-size: var(--text-sm);
          color: var(--secondary-500);
        }

        .auth-required {
          text-align: center;
          padding: var(--space-20) var(--space-4);
        }

        .auth-required h2 {
          color: var(--secondary-700);
          margin-bottom: var(--space-6);
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: var(--space-4);
        }

        .loading-state p {
          color: var(--secondary-600);
        }

        @media (max-width: 768px) {
          .hero-content {
            flex-direction: column;
            text-align: center;
            gap: var(--space-6);
          }

          .hero-title {
            font-size: var(--text-3xl);
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: var(--space-4);
          }

          .stat-card {
            padding: var(--space-4);
          }

          .actions-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .dashboard-hero {
            padding: var(--space-12) 0 var(--space-8);
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
  `}</style>
    </div>
  );
}

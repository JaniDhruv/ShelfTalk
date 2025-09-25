import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import './Journal.css';

export default function Journal() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="journal-container fade-in">
      <div className="container">
        <header className="journal-header">
          <h1>📖 My Reading Journal</h1>
          <p>Welcome back, <strong>{user.username}</strong>! Track your reading journey here.</p>
        </header>

        <section className="journal-content">
          <div className="journal-grid">
            <div className="journal-card">
              <div className="card-icon">✏️</div>
              <h3>Reading Notes</h3>
              <p>Capture your thoughts, favorite quotes, and insights as you read.</p>
              <div className="card-footer">
                <span className="coming-soon">Coming Soon</span>
              </div>
            </div>

            <div className="journal-card">
              <div className="card-icon">⭐</div>
              <h3>Book Ratings</h3>
              <p>Rate and review books you've finished reading.</p>
              <div className="card-footer">
                <span className="coming-soon">Coming Soon</span>
              </div>
            </div>

            <div className="journal-card">
              <div className="card-icon">🗂️</div>
              <h3>Reading History</h3>
              <p>Browse through all the books you've read and your notes.</p>
              <div className="card-footer">
                <span className="coming-soon">Coming Soon</span>
              </div>
            </div>

            <div className="journal-card">
              <div className="card-icon">📊</div>
              <h3>Reading Stats</h3>
              <p>View your reading progress, goals, and achievements.</p>
              <div className="card-footer">
                <span className="coming-soon">Coming Soon</span>
              </div>
            </div>

            <div className="journal-card">
              <div className="card-icon">🎯</div>
              <h3>Reading Goals</h3>
              <p>Set and track your annual reading goals and milestones.</p>
              <div className="card-footer">
                <span className="coming-soon">Coming Soon</span>
              </div>
            </div>

            <div className="journal-card">
              <div className="card-icon">💭</div>
              <h3>Book Discussions</h3>
              <p>Engage in meaningful conversations about your favorite books.</p>
              <div className="card-footer">
                <Link to="/posts" className="btn btn-sm btn-primary">
                  Join Discussions
                </Link>
              </div>
            </div>
          </div>

          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="action-buttons">
              <Link to="/books" className="btn btn-primary">
                📚 Manage My Books
              </Link>
              <Link to="/groups" className="btn btn-secondary">
                👥 Join Reading Groups
              </Link>
              <Link to="/posts" className="btn btn-accent">
                💬 Latest Discussions
              </Link>
            </div>
          </div>
        </section>
      </div>

  <style>{`
        .journal-container {
          min-height: 100vh;
          background: var(--secondary-50);
          padding: var(--space-6) 0;
        }

        .journal-header {
          text-align: center;
          margin-bottom: var(--space-12);
        }

        .journal-header h1 {
          font-size: var(--text-3xl);
          font-weight: 800;
          color: var(--secondary-900);
          margin-bottom: var(--space-4);
        }

        .journal-header p {
          font-size: var(--text-lg);
          color: var(--secondary-600);
        }

        .journal-header strong {
          color: var(--primary-600);
        }

        .journal-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .journal-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--space-6);
          margin-bottom: var(--space-12);
        }

        .journal-card {
          background: white;
          border-radius: var(--radius-2xl);
          padding: var(--space-8);
          box-shadow: var(--shadow);
          border: 1px solid var(--secondary-200);
          transition: var(--transition-all);
          text-align: center;
          display: flex;
          flex-direction: column;
        }

        .journal-card:hover {
          box-shadow: var(--shadow-lg);
          transform: translateY(-4px);
        }

        .card-icon {
          font-size: var(--text-3xl);
          margin-bottom: var(--space-4);
        }

        .journal-card h3 {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--secondary-900);
          margin-bottom: var(--space-3);
        }

        .journal-card p {
          color: var(--secondary-600);
          line-height: 1.6;
          margin-bottom: var(--space-6);
          flex: 1;
        }

        .card-footer {
          margin-top: auto;
        }

        .coming-soon {
          display: inline-flex;
          align-items: center;
          padding: var(--space-2) var(--space-4);
          background: var(--secondary-100);
          color: var(--secondary-600);
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .quick-actions {
          background: white;
          border-radius: var(--radius-2xl);
          padding: var(--space-8);
          box-shadow: var(--shadow);
          border: 1px solid var(--secondary-200);
          text-align: center;
        }

        .quick-actions h3 {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--secondary-900);
          margin-bottom: var(--space-6);
        }

        .action-buttons {
          display: flex;
          gap: var(--space-4);
          justify-content: center;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .journal-container {
            padding: var(--space-4) 0;
          }

          .journal-grid {
            grid-template-columns: 1fr;
            gap: var(--space-4);
          }

          .journal-card {
            padding: var(--space-6);
          }

          .action-buttons {
            flex-direction: column;
            align-items: center;
          }

          .action-buttons .btn {
            width: 100%;
            max-width: 300px;
          }
        }

        @media (max-width: 640px) {
          .journal-header h1 {
            font-size: var(--text-2xl);
          }

          .journal-header p {
            font-size: var(--text-base);
          }
        }
  `}</style>
    </div>
  );
}
import React from 'react';

export default function About() {
  return (
    <div className="about-container fade-in">
      <div className="container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1>📚 Welcome to ShelfTalk</h1>
            <p className="hero-subtitle">
              Where readers connect, discover, and share their love for books
            </p>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">10K+</span>
                <span className="stat-label">Happy Readers</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">50K+</span>
                <span className="stat-label">Books Tracked</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">200+</span>
                <span className="stat-label">Reading Groups</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-books">
              <div className="book book-1">📖</div>
              <div className="book book-2">📚</div>
              <div className="book book-3">📗</div>
              <div className="book book-4">📘</div>
              <div className="book book-5">📙</div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="mission-section">
          <div className="section-header">
            <h2>🎯 Our Mission</h2>
            <p>Building the world's most connected reading community</p>
          </div>
          <div className="mission-content">
            <div className="mission-card">
              <div className="mission-icon">🤝</div>
              <h3>Connect</h3>
              <p>
                Join reading groups, discuss your favorite books, and build 
                meaningful connections with fellow book lovers worldwide.
              </p>
            </div>
            <div className="mission-card">
              <div className="mission-icon">🔍</div>
              <h3>Discover</h3>
              <p>
                Find your next great read through personalized recommendations, 
                group suggestions, and community reviews.
              </p>
            </div>
            <div className="mission-card">
              <div className="mission-icon">📊</div>
              <h3>Track</h3>
              <p>
                Monitor your reading progress, set goals, and celebrate your 
                achievements with our comprehensive tracking tools.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="section-header">
            <h2>✨ Why Choose ShelfTalk?</h2>
            <p>Everything you need for your reading journey</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h4>Mobile-First Design</h4>
              <p>Read and track anywhere with our responsive, mobile-optimized interface.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <h4>Beautiful Interface</h4>
              <p>Enjoy a clean, intuitive design that makes reading social and fun.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h4>Privacy Focused</h4>
              <p>Your reading data is private and secure. You control what you share.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h4>Social Reading</h4>
              <p>Share thoughts, write reviews, and engage in meaningful book discussions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h4>Reading Analytics</h4>
              <p>Track your reading habits and discover patterns in your literary journey.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌟</div>
              <h4>Personalized</h4>
              <p>Get recommendations tailored to your reading preferences and history.</p>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="team-section">
          <div className="section-header">
            <h2>👥 Meet Our Team</h2>
            <p>Passionate readers building tools for readers</p>
          </div>
          <div className="team-grid">
            <div className="team-member">
              <div className="member-avatar">
                <span>👨‍💻</span>
              </div>
              <h4>Alex Chen</h4>
              <p className="member-role">Founder & CEO</p>
              <p className="member-bio">
                Avid reader of sci-fi and philosophy. Built ShelfTalk to solve 
                his own problem of keeping track of books and finding reading buddies.
              </p>
              <div className="member-stats">
                <span>📚 1,247 books read</span>
              </div>
            </div>
            <div className="team-member">
              <div className="member-avatar">
                <span>👩‍🎨</span>
              </div>
              <h4>Sarah Kim</h4>
              <p className="member-role">Head of Design</p>
              <p className="member-bio">
                UX designer and mystery novel enthusiast. Ensures ShelfTalk 
                is as beautiful as it is functional.
              </p>
              <div className="member-stats">
                <span>📚 892 books read</span>
              </div>
            </div>
            <div className="team-member">
              <div className="member-avatar">
                <span>👨‍🔧</span>
              </div>
              <h4>Mike Rodriguez</h4>
              <p className="member-role">Lead Developer</p>
              <p className="member-bio">
                Full-stack developer and fantasy genre expert. Keeps our 
                platform running smoothly and securely.
              </p>
              <div className="member-stats">
                <span>📚 1,543 books read</span>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="values-section">
          <div className="section-header">
            <h2>💎 Our Values</h2>
            <p>What drives us every day</p>
          </div>
          <div className="values-content">
            <div className="value-item">
              <div className="value-icon">📖</div>
              <div className="value-text">
                <h4>Reading First</h4>
                <p>Every feature we build serves the core purpose of enhancing your reading experience.</p>
              </div>
            </div>
            <div className="value-item">
              <div className="value-icon">🌍</div>
              <div className="value-text">
                <h4>Inclusive Community</h4>
                <p>We welcome readers of all backgrounds, interests, and reading levels.</p>
              </div>
            </div>
            <div className="value-item">
              <div className="value-icon">🚀</div>
              <div className="value-text">
                <h4>Continuous Innovation</h4>
                <p>We're always improving, always listening, and always evolving.</p>
              </div>
            </div>
            <div className="value-item">
              <div className="value-icon">💝</div>
              <div className="value-text">
                <h4>User-Centric</h4>
                <p>Your feedback shapes our roadmap. You're not just users; you're partners.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to Join Our Reading Community?</h2>
            <p>
              Start tracking your books, join discussions, and connect with 
              readers who share your passion for literature.
            </p>
            <div className="cta-buttons">
              <a href="/signup" className="btn btn-primary btn-lg">
                Get Started Free
              </a>
              <a href="/books" className="btn btn-secondary btn-lg">
                Explore Books
              </a>
            </div>
          </div>
        </section>
      </div>

  <style>{`
        .about-container {
          min-height: 100vh;
          background: var(--secondary-50);
        }

        .hero-section {
          background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%);
          color: white;
          padding: var(--space-20) 0 var(--space-16);
          margin-bottom: var(--space-16);
          position: relative;
          overflow: hidden;
        }

        .hero-content {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
          position: relative;
          z-index: 2;
        }

        .hero-section h1 {
          font-size: var(--text-5xl);
          font-weight: 800;
          margin-bottom: var(--space-4);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .hero-subtitle {
          font-size: var(--text-xl);
          margin-bottom: var(--space-8);
          opacity: 0.9;
          line-height: 1.6;
        }

        .hero-stats {
          display: flex;
          justify-content: center;
          gap: var(--space-8);
          margin-top: var(--space-8);
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          display: block;
          font-size: var(--text-2xl);
          font-weight: 700;
          margin-bottom: var(--space-1);
        }

        .stat-label {
          font-size: var(--text-sm);
          opacity: 0.8;
        }

        .hero-visual {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .floating-books {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .book {
          position: absolute;
          font-size: var(--text-4xl);
          opacity: 0.1;
          animation: float 6s ease-in-out infinite;
        }

        .book-1 { top: 20%; left: 10%; animation-delay: 0s; }
        .book-2 { top: 60%; left: 15%; animation-delay: 1s; }
        .book-3 { top: 30%; right: 20%; animation-delay: 2s; }
        .book-4 { top: 70%; right: 10%; animation-delay: 3s; }
        .book-5 { top: 40%; left: 50%; animation-delay: 4s; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(5deg); }
          66% { transform: translateY(10px) rotate(-3deg); }
        }

        .section-header {
          text-align: center;
          margin-bottom: var(--space-12);
        }

        .section-header h2 {
          font-size: var(--text-3xl);
          font-weight: 700;
          color: var(--secondary-900);
          margin-bottom: var(--space-4);
        }

        .section-header p {
          font-size: var(--text-lg);
          color: var(--secondary-600);
        }

        .mission-section {
          padding: var(--space-16) 0;
        }

        .mission-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--space-8);
        }

        .mission-card {
          background: white;
          padding: var(--space-8);
          border-radius: var(--radius-2xl);
          text-align: center;
          box-shadow: var(--shadow);
          border: 1px solid var(--secondary-200);
          transition: var(--transition-all);
        }

        .mission-card:hover {
          box-shadow: var(--shadow-lg);
          transform: translateY(-4px);
        }

        .mission-icon {
          font-size: var(--text-4xl);
          margin-bottom: var(--space-4);
        }

        .mission-card h3 {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--secondary-900);
          margin-bottom: var(--space-4);
        }

        .mission-card p {
          color: var(--secondary-700);
          line-height: 1.6;
        }

        .features-section {
          padding: var(--space-16) 0;
          background: white;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: var(--space-6);
        }

        .feature-card {
          padding: var(--space-6);
          border-radius: var(--radius-xl);
          border: 1px solid var(--secondary-200);
          transition: var(--transition-all);
          background: var(--secondary-50);
        }

        .feature-card:hover {
          background: white;
          box-shadow: var(--shadow);
        }

        .feature-icon {
          font-size: var(--text-2xl);
          margin-bottom: var(--space-3);
        }

        .feature-card h4 {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--secondary-900);
          margin-bottom: var(--space-2);
        }

        .feature-card p {
          color: var(--secondary-600);
          font-size: var(--text-sm);
          line-height: 1.5;
        }

        .team-section {
          padding: var(--space-16) 0;
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--space-8);
        }

        .team-member {
          background: white;
          padding: var(--space-8);
          border-radius: var(--radius-2xl);
          text-align: center;
          box-shadow: var(--shadow);
          border: 1px solid var(--secondary-200);
          transition: var(--transition-all);
        }

        .team-member:hover {
          box-shadow: var(--shadow-lg);
          transform: translateY(-2px);
        }

        .member-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--primary-100);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--text-2xl);
          margin: 0 auto var(--space-4);
        }

        .team-member h4 {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--secondary-900);
          margin-bottom: var(--space-1);
        }

        .member-role {
          color: var(--primary-600);
          font-weight: 600;
          margin-bottom: var(--space-4);
          font-size: var(--text-sm);
        }

        .member-bio {
          color: var(--secondary-700);
          line-height: 1.6;
          margin-bottom: var(--space-4);
          font-size: var(--text-sm);
        }

        .member-stats {
          font-size: var(--text-xs);
          color: var(--secondary-500);
          padding: var(--space-2) var(--space-3);
          background: var(--secondary-50);
          border-radius: var(--radius);
          display: inline-block;
        }

        .values-section {
          padding: var(--space-16) 0;
          background: white;
        }

        .values-content {
          display: grid;
          gap: var(--space-6);
        }

        .value-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-4);
          padding: var(--space-6);
          border-radius: var(--radius-xl);
          background: var(--secondary-50);
          transition: var(--transition-all);
        }

        .value-item:hover {
          background: white;
          box-shadow: var(--shadow);
        }

        .value-icon {
          font-size: var(--text-2xl);
          flex-shrink: 0;
        }

        .value-text h4 {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--secondary-900);
          margin-bottom: var(--space-2);
        }

        .value-text p {
          color: var(--secondary-600);
          line-height: 1.6;
        }

        .cta-section {
          background: linear-gradient(135deg, var(--secondary-900) 0%, var(--secondary-800) 100%);
          color: white;
          padding: var(--space-16) 0;
          text-align: center;
        }

        .cta-content h2 {
          font-size: var(--text-3xl);
          font-weight: 700;
          margin-bottom: var(--space-4);
        }

        .cta-content p {
          font-size: var(--text-lg);
          margin-bottom: var(--space-8);
          opacity: 0.9;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }

        .cta-buttons {
          display: flex;
          gap: var(--space-4);
          justify-content: center;
        }

        @media (max-width: 768px) {
          .hero-section {
            padding: var(--space-16) 0 var(--space-12);
          }

          .hero-section h1 {
            font-size: var(--text-3xl);
          }

          .hero-subtitle {
            font-size: var(--text-lg);
          }

          .hero-stats {
            flex-direction: column;
            gap: var(--space-4);
          }

          .mission-content {
            grid-template-columns: 1fr;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .team-grid {
            grid-template-columns: 1fr;
          }

          .value-item {
            flex-direction: column;
            text-align: center;
          }

          .cta-buttons {
            flex-direction: column;
            align-items: center;
          }
        }

        @media (max-width: 640px) {
          .hero-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: var(--space-4);
          }

          .stat-item {
            padding: var(--space-2);
          }

          .stat-number {
            font-size: var(--text-lg);
          }

          .stat-label {
            font-size: var(--text-xs);
          }
        }
  `}</style>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ShelfTalkLogo from '../components/ShelfTalkLogo';
import './Home.css';

export default function Home() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  const testimonials = [
    {
      text: "The groups feature brought me closer to readers who love the same genres. The discussions are always insightful!",
      author: "Sarah Chen",
      role: "Book Club Leader",
      avatar: "👩‍🏫"
    },
    {
      text: "I love how easy it is to share my thoughts through posts and discover what others are reading. The chat keeps me connected!",
      author: "Marcus Rodriguez",
      role: "Avid Reader",
      avatar: "👨‍💼"
    },
    {
      text: "The discover page has introduced me to books I never would have found. My TBR list has never been better!",
      author: "Emma Thompson",
      role: "Literature Student",
      avatar: "👩‍🎓"
    },
    {
      text: "As an author, connecting with my readers through ShelfTalk has been incredible. The community truly appreciates literature.",
      author: "James Park",
      role: "Published Author",
      avatar: "✍️"
    }
  ];

  const features = [
    {
      icon: "fas fa-file-lines",
      title: "Post to the Community",
      description: "Publish updates about what you're reading, start conversations, and react to posts from readers you follow.",
      path: "/posts",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: "fas fa-compass",
      title: "Discover New Books",
      description: "Explore trending discussions, community highlights, and new readers to connect with from across ShelfTalk.",
      path: "/discover",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: "fas fa-comments",
      title: "Connect & Chat",
      description: "Jump into real-time conversations with other readers, continue the dialogue beyond posts, and keep the discussion flowing.",
      path: "/chat",
      color: "from-green-500 to-teal-500"
    },
    {
      icon: "fas fa-users",
      title: "Join Reading Groups",
      description: "Follow groups built around genres, authors, or local clubs to stay in the loop with the communities that matter to you.",
      path: "/groups",
      color: "from-orange-500 to-red-500"
    }
  ];

  const stats = [
    { number: "50K+", label: "Active Readers", icon: "fas fa-users" },
    { number: "1.2M+", label: "Posts Shared", icon: "fas fa-file-lines" },
    { number: "350+", label: "Reading Groups", icon: "fas fa-user-friends" },
    { number: "15K+", label: "Daily Chats", icon: "fas fa-comments" }
  ];

  const communityFeatures = [
    {
      icon: "fas fa-user-circle",
      title: "Personal Profile",
      description: "Craft your ShelfTalk identity with a dedicated profile that highlights your interests and recent activity."
    },
    {
      icon: "fas fa-bell",
      title: "Stay Updated",
      description: "Get notifications about new posts, group activities, and messages from fellow readers."
    },
    {
      icon: "fas fa-heart",
      title: "Engage & React",
      description: "Like, comment, and interact with posts from readers who share your passion for books."
    },
    {
      icon: "fas fa-shield-alt",
      title: "Safe Community",
      description: "Our moderated platform ensures respectful discussions and a welcoming environment for all."
    }
  ];

  useEffect(() => {
    setIsVisible(true);
    const testimonialInterval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(testimonialInterval);
  }, [testimonials.length]);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <div className={`hero-section ${isVisible ? 'visible' : ''}`}>
        <div className="hero-shapes">
          <div className="hero-shape shape-1"></div>
          <div className="hero-shape shape-2"></div>
          <div className="hero-shape shape-3"></div>
          <div className="hero-shape shape-4"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-logo">
            <ShelfTalkLogo size="large" type="full" showTagline={true} />
          </div>
          
          <h1 className="hero-title">
            Where Stories Come to <span className="gradient-text">Life</span>
          </h1>
          
          <h2 className="hero-subtitle">
            Books don't talk, <span className="highlight">We do.</span>
          </h2>
          
          <p className="hero-description">
            Join a vibrant community of book lovers. Share your thoughts, discover new reads, 
            chat with fellow readers, and join groups that match your literary interests.
          </p>
          
          {/* Hero Stats */}
          <div className="hero-stats">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-icon">
                  <i className={stat.icon}></i>
                </div>
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
          
          <div className="cta-buttons">
            <button onClick={() => navigate('/signup')} className="cta-button primary">
              <i className="fas fa-rocket"></i>
              Join ShelfTalk
            </button>
            <button onClick={() => navigate('/discover')} className="cta-button secondary">
              <i className="fas fa-compass"></i>
              Explore Now
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="section-content">
          <div className="section-header">
            <h2 className="section-title">Everything You Need to Connect with Readers</h2>
            <p className="section-description">
              Four powerful features to enhance your reading journey and build meaningful connections
            </p>
          </div>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="feature-card"
                style={{ '--delay': `${index * 0.1}s` }}
                onClick={() => navigate(feature.path)}
              >
                <div className={`feature-icon gradient-${index}`}>
                  <i className={feature.icon}></i>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <div className="feature-link">
                  <span>Explore Feature</span>
                  <i className="fas fa-arrow-right"></i>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Community Features Section */}
      <div className="community-section">
        <div className="section-content">
          <div className="section-header">
            <h2 className="section-title">Built for Readers, By Readers</h2>
            <p className="section-description">
              More features that make ShelfTalk the perfect home for book lovers
            </p>
          </div>
          
          <div className="community-grid">
            {communityFeatures.map((feature, index) => (
              <div 
                key={index} 
                className="community-card"
                style={{ '--delay': `${index * 0.1}s` }}
              >
                <div className="community-icon">
                  <i className={feature.icon}></i>
                </div>
                <h3 className="community-title">{feature.title}</h3>
                <p className="community-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="testimonials-section">
        <div className="section-content">
          <div className="section-header">
            <h2 className="section-title">What Our Community Says</h2>
            <p className="section-description">Real stories from real readers who found their tribe</p>
          </div>
          
          <div className="slider-container">
            <div className="testimonial-slider">
              <div className="testimonial-slide">
                <div className="testimonial-card">
                  <div className="quote-mark">
                    <i className="fas fa-quote-left"></i>
                  </div>
                  <p className="testimonial-text">
                    {testimonials[currentTestimonial].text}
                  </p>
                  <div className="testimonial-author">
                    <div className="author-avatar">
                      <span>{testimonials[currentTestimonial].avatar}</span>
                    </div>
                    <div className="author-info">
                      <h4 className="author-name">
                        {testimonials[currentTestimonial].author}
                      </h4>
                      <p className="author-role">{testimonials[currentTestimonial].role}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="slider-navigation">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`nav-dot ${index === currentTestimonial ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <div className="cta-background">
          <div className="cta-shape cta-shape-1"></div>
          <div className="cta-shape cta-shape-2"></div>
        </div>
        <div className="section-content">
          <div className="cta-content">
            <h2 className="cta-title">
              Ready to Find Your <span className="gradient-text">Reading Tribe</span>?
            </h2>
            <p className="cta-description">
              Join thousands of readers sharing their love for books. Create posts, discover new reads, 
              chat with friends, and join groups - all in one place.
            </p>
            <div className="cta-features">
              <div className="cta-feature">
                <i className="fas fa-check"></i>
                <span>Free forever</span>
              </div>
              <div className="cta-feature">
                <i className="fas fa-check"></i>
                <span>No credit card needed</span>
              </div>
              <div className="cta-feature">
                <i className="fas fa-check"></i>
                <span>Join 50K+ readers</span>
              </div>
            </div>
            <div className="cta-buttons">
              <button onClick={() => navigate('/signup')} className="cta-button primary">
                <i className="fas fa-user-plus"></i>
                Create Free Account
              </button>
              <button onClick={() => navigate('/login')} className="cta-button secondary">
                <i className="fas fa-sign-in-alt"></i>
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
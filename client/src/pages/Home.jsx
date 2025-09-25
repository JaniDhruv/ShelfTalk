import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ShelfTalkLogo from '../components/ShelfTalkLogo';
import './Home.css';

export default function Home() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const navigate = useNavigate();

  const testimonials = [
    {
      text: "ShelfTalk transformed how I discover books. The community recommendations are spot-on and I've discovered so many hidden gems!",
      author: "Sarah Chen",
      role: "Literature Professor",
      avatar: "👩‍🏫"
    },
    {
      text: "Finally found my book tribe! The discussions here are incredibly thoughtful and engaging. It's like having a 24/7 book club.",
      author: "Marcus Rodriguez",
      role: "Book Club Founder",
      avatar: "👨‍💼"
    },
    {
      text: "My reading list has tripled since joining. The personalized recommendations are incredibly accurate and diverse.",
      author: "Emma Thompson",
      role: "Graduate Student",
      avatar: "👩‍🎓"
    },
    {
      text: "As an author, I love seeing genuine reader discussions about books. The community here truly understands literature.",
      author: "James Park",
      role: "Published Author",
      avatar: "✍️"
    }
  ];

  const trendingBooks = [
    { 
      title: "The Seven Moons of Maali Almeida", 
      author: "Shehan Karunatilaka", 
      rating: 4.8,
      genre: "Magical Realism",
      color: "from-purple-500 to-pink-500"
    },
    { 
      title: "Tomorrow, and Tomorrow, and Tomorrow", 
      author: "Gabrielle Zevin", 
      rating: 4.7,
      genre: "Contemporary Fiction",
      color: "from-blue-500 to-cyan-500"
    },
    { 
      title: "Book Lovers", 
      author: "Emily Henry", 
      rating: 4.6,
      genre: "Romance",
      color: "from-pink-500 to-rose-500"
    },
    { 
      title: "The Atlas Six", 
      author: "Olivie Blake", 
      rating: 4.5,
      genre: "Dark Academia",
      color: "from-indigo-500 to-purple-500"
    }
  ];

  const features = [
    {
      icon: "fas fa-search",
      title: "Smart Discovery",
      description: "AI-powered recommendations based on your reading history, mood, and preferences.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: "fas fa-users",
      title: "Vibrant Community",
      description: "Connect with fellow book lovers, join reading groups, and participate in literary discussions.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: "fas fa-star",
      title: "Detailed Reviews",
      description: "Read and write comprehensive reviews with spoiler-free ratings and detailed analysis.",
      color: "from-green-500 to-teal-500"
    },
    {
      icon: "fas fa-chart-line",
      title: "Reading Analytics",
      description: "Track your reading progress, set goals, and discover your reading patterns.",
      color: "from-orange-500 to-red-500"
    }
  ];

  const stats = [
    { number: "150K+", label: "Active Readers", icon: "fas fa-users" },
    { number: "3.2M+", label: "Book Reviews", icon: "fas fa-star" },
    { number: "25K+", label: "Books Cataloged", icon: "fas fa-book" },
    { number: "1.5K+", label: "Daily Discussions", icon: "fas fa-comments" }
  ];

  useEffect(() => {
    setIsVisible(true);
    const testimonialInterval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    
    const featureInterval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);

    return () => {
      clearInterval(testimonialInterval);
      clearInterval(featureInterval);
    };
  }, [testimonials.length, features.length]);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <div className={`hero-section ${isVisible ? 'visible' : ''}`}>
        {/* Animated background elements */}
        <div className="hero-shapes">
          <div className="hero-shape shape-1"></div>
          <div className="hero-shape shape-2"></div>
          <div className="hero-shape shape-3"></div>
          <div className="hero-shape shape-4"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-logo">
            <ShelfTalkLogo size="large" variant="white" />
          </div>
          
          <h1 className="hero-title">
            Where Stories Come to <span className="gradient-text">Life</span>
          </h1>
          
          <h2 className="hero-subtitle">
            Books don't talk, <span className="highlight">We do.</span>
          </h2>
          
          <p className="hero-description">
            Join the world's most vibrant community of book lovers. Discover your next favorite read, 
            share meaningful reviews, and connect with fellow bibliophiles who share your passion for stories.
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
              Start Your Journey
            </button>
            <button onClick={() => navigate('/books')} className="cta-button secondary">
              <i className="fas fa-compass"></i>
              Explore Books
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="section-content">
          <div className="section-header">
            <h2 className="section-title">Why Readers Choose ShelfTalk</h2>
            <p className="section-description">
              Discover powerful features designed to enhance your reading journey and connect you with a global community of book enthusiasts
            </p>
          </div>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className={`feature-card ${index === currentFeature ? 'active' : ''}`}
                style={{ '--delay': `${index * 0.1}s` }}
              >
                <div className={`feature-icon gradient-${index}`}>
                  <i className={feature.icon}></i>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <div className="feature-link">
                  <span>Learn More</span>
                  <i className="fas fa-arrow-right"></i>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trending Books Section */}
      <div className="trending-section">
        <div className="section-content">
          <div className="section-header">
            <h2 className="section-title">Currently Trending</h2>
            <p className="section-description">Discover the books that our community can't stop talking about</p>
          </div>
          
          <div className="books-grid">
            {trendingBooks.map((book, index) => (
              <div 
                key={index} 
                className="book-card"
                style={{ '--delay': `${index * 0.1}s` }}
              >
                <div className={`book-cover bg-gradient-to-br ${book.color}`}>
                  <div className="book-shine"></div>
                  <i className="fas fa-book-open book-icon"></i>
                </div>
                <div className="book-info">
                  <span className="book-genre">{book.genre}</span>
                  <h4 className="book-title">{book.title}</h4>
                  <p className="book-author">by {book.author}</p>
                  <div className="book-footer">
                    <div className="book-rating">
                      <div className="stars">
                        {[...Array(5)].map((_, i) => (
                          <i key={i} className={`fas fa-star ${i < Math.floor(book.rating) ? 'filled' : ''}`}></i>
                        ))}
                      </div>
                      <span className="rating-value">{book.rating}</span>
                    </div>
                    <button className="book-details-btn">
                      <span>View Details</span>
                      <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="testimonials-section">
        <div className="section-content">
          <div className="section-header">
            <h2 className="section-title">What Our Readers Say</h2>
            <p className="section-description">Join thousands of satisfied readers who've found their literary home</p>
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
              Ready to Start Your Next <span className="gradient-text">Chapter</span>?
            </h2>
            <p className="cta-description">
              Join thousands of readers who've already discovered their new favorite books through ShelfTalk. 
              Your literary adventure awaits!
            </p>
            <div className="cta-features">
              <div className="cta-feature">
                <i className="fas fa-check"></i>
                <span>Free forever</span>
              </div>
              <div className="cta-feature">
                <i className="fas fa-check"></i>
                <span>No credit card required</span>
              </div>
              <div className="cta-feature">
                <i className="fas fa-check"></i>
                <span>Join 150K+ readers</span>
              </div>
            </div>
            <div className="cta-buttons">
              <button onClick={() => navigate('/signup')} className="cta-button primary">
                <i className="fas fa-user-plus"></i>
                Sign Up Free
              </button>
              <button onClick={() => navigate('/about')} className="cta-button secondary">
                <i className="fas fa-info-circle"></i>
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
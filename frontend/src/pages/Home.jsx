import React from 'react';
import { useNavigate } from 'react-router-dom';
import ShelfTalkLogo from '../components/ShelfTalkLogo';
import './Home.css';

const coreFeatures = [
  {
    icon: 'fa-solid fa-feather-pointed',
    title: 'Community Posts',
    description: 'Publish reading updates, annotate favourite passages, and keep every conversation threaded with comments.',
    path: '/posts',
    cta: 'Visit posts'
  },
  {
    icon: 'fa-solid fa-compass',
    title: 'Powerful Discovery',
    description: 'Filter readers by genre, location, and interests or browse vibrant clubs to grow your circle.',
    path: '/discover',
    cta: 'Explore discover'
  },
  {
    icon: 'fa-solid fa-comments',
    title: 'Real-Time Chat',
    description: 'Start or rejoin private conversations, keep tabs on presence, and bring book club chatter online.',
    path: '/chat',
    cta: 'Open chat'
  },
  {
    icon: 'fa-solid fa-people-group',
    title: 'Reader Groups',
    description: 'Create or join genre clubs, coordinate meetups, and manage invites from one collaborative hub.',
    path: '/groups',
    cta: 'Browse groups'
  }
];

const experienceHighlights = [
  {
    title: 'Posts & Reactions',
    description: 'ShelfTalk posts keep the conversation flowing with rich comments, replies, and at-a-glance engagement metrics.',
    points: ['Share reading updates in seconds', 'Follow comment threads without losing context', 'Revisit saved discussions from your dashboard']
  },
  {
    title: 'Discovery & Profiles',
    description: 'Deep search tools reveal readers, authors, and clubs that match your taste while personal profiles showcase your voice.',
    points: ['Filter by genres, authors, and languages', 'Understand reader presence with live activity badges', 'Spotlight your shelf updates on your profile']
  },
  {
    title: 'Chat & Group Sync',
    description: 'Bring the club online with private chat, structured group spaces, and shared updates that surface every new post or invite.',
    points: ['Jump into ongoing conversations instantly', 'Coordinate events inside dedicated group threads', 'Keep everyone aligned with group announcements']
  }
];

const journeySteps = [
  {
    label: 'Create your space',
    description: 'Sign up, personalise your profile, and let readers know what you are paging through right now.'
  },
  {
    label: 'Share the conversation',
    description: 'Draft posts, reply with thoughtful comments, and capture the energy of in-person book chats.'
  },
  {
    label: 'Connect intentionally',
    description: 'Follow readers, join clubs that match your vibe, and move seamlessly between the feed and DMs.'
  },
  {
    label: 'Stay in the loop',
    description: 'Group activity feeds keep invites, reactions, and new posts organised so you never miss a moment.'
  }
];

const testimonials = [
  {
    quote: 'ShelfTalk keeps our campus book club connected between meetings. Posts, chat, and invites all sit in one place.',
    name: 'Ishita Rao',
    role: 'University Club Coordinator'
  },
  {
    quote: 'I find new readers every week through the discovery filters. Conversations here feel thoughtful and welcoming.',
    name: 'Michael Nguyen',
    role: 'Community Moderator'
  },
  {
    quote: 'Managing my author group is effortless now. Direct messages and group announcements reach readers instantly.',
    name: 'Ana Gutierrez',
    role: 'Indie Author'
  }
];

const communityStats = [
  { value: '50K+', label: 'Active readers' },
  { value: '1.2M+', label: 'Posts shared' },
  { value: '350+', label: 'Active clubs' },
  { value: '15K+', label: 'Daily messages' }
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="st-home">
      <section className="st-hero">
        <div className="st-hero-texture" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="st-hero-inner">
          <div className="st-hero-copy">
            <div className="st-hero-logo">
              <div className="st-hero-logo-mark">
                <ShelfTalkLogo size="medium" type="navbar" />
              </div>
              <span className="st-hero-logo-tagline">Books don't talk, we do.</span>
            </div>
            <p className="st-hero-eyebrow">Community built around books</p>
            <h1 className="st-hero-title">Turn every reading list into a living conversation.</h1>
            <p className="st-hero-subtitle">
              ShelfTalk unites posts, discovery, real-time chat, and reader groups so book lovers never read in isolation.
            </p>
            <div className="st-hero-actions">
              <button
                type="button"
                className="st-btn st-btn-primary"
                onClick={() => navigate('/signup')}
              >
                <i className="fa-solid fa-user-plus"></i>
                Create free account
              </button>
              <button
                type="button"
                className="st-btn st-btn-outline"
                onClick={() => navigate('/discover')}
              >
                <i className="fa-solid fa-compass"></i>
                Start exploring
              </button>
            </div>
            <div className="st-hero-footnote">
              <i className="fa-solid fa-circle-check"></i>
              <span>No paywalls, just thoughtful discussion and curated connections.</span>
            </div>
          </div>
          <div className="st-hero-preview" aria-hidden="true">
            <div className="st-preview-card st-preview-feed">
              <header>
                <span className="st-badge">Community feed</span>
                <i className="fa-solid fa-book-open"></i>
              </header>
              <ul>
                <li>
                  <span className="st-preview-title">Annotate your current read</span>
                  <span className="st-preview-meta">Share highlights &amp; invite comments</span>
                </li>
                <li>
                  <span className="st-preview-title">React and reply in threads</span>
                  <span className="st-preview-meta">Keep every chapter discussion tidy</span>
                </li>
                <li>
                  <span className="st-preview-title">Send a quick DM</span>
                  <span className="st-preview-meta">Pick up the conversation in chat</span>
                </li>
              </ul>
            </div>
            <div className="st-preview-card st-preview-chat">
              <header>
                <span className="st-badge st-badge-gold">Live chat</span>
                <i className="fa-solid fa-bolt"></i>
              </header>
              <div className="st-chat-bubbles">
                <p className="st-chat st-chat-in">Ready for Friday's club meetup?</p>
                <p className="st-chat st-chat-out">Absolutely! Posting the reading guide now.</p>
                <p className="st-chat st-chat-in">Perfect, I will invite the new members.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="st-section st-feature-strip">
        <div className="st-section-heading">
          <span className="st-kicker">Core functionality</span>
          <h2>Everything the ShelfTalk platform offers in one glance</h2>
          <p>We reviewed the full feature set across posts, discovery, chat, and groups to build a landing page that reflects the live product.</p>
        </div>
        <div className="st-feature-grid">
          {coreFeatures.map((feature) => (
            <article key={feature.title} className="st-feature-card">
              <span className="st-feature-icon">
                <i className={feature.icon}></i>
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <button
                type="button"
                className="st-link-button"
                onClick={() => navigate(feature.path)}
              >
                <span>{feature.cta}</span>
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="st-section st-experience">
        <div className="st-section-heading">
          <span className="st-kicker">Immersive experience</span>
          <h2>Built to celebrate every part of the reading journey</h2>
          <p>From thoughtful threads to curated groups, ShelfTalk keeps readers aligned before, during, and after every book.</p>
        </div>
        <div className="st-experience-grid">
          {experienceHighlights.map((item, index) => (
            <article key={item.title} className="st-experience-card">
              <span className="st-step-indicator">0{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <ul>
                {item.points.map((point) => (
                  <li key={point}>
                    <i className="fa-solid fa-star"></i>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="st-section st-journey">
        <div className="st-section-heading">
          <span className="st-kicker">How it flows</span>
          <h2>ShelfTalk keeps your literary circles in sync</h2>
          <p>Every controller, route, and page in the app feeds this simple journey from signing up to leading vibrant groups.</p>
        </div>
        <div className="st-journey-grid">
          {journeySteps.map((step, index) => (
            <article key={step.label} className="st-journey-card">
              <span className="st-journey-index">{index + 1}</span>
              <h3>{step.label}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="st-section st-testimonials">
        <div className="st-section-heading">
          <span className="st-kicker">Community voices</span>
          <h2>Readers trust ShelfTalk to extend every chapter</h2>
          <p>Clubs, moderators, and authors rely on the platform to keep conversations respectful, lively, and organised.</p>
        </div>
        <div className="st-testimonial-grid">
          {testimonials.map((item) => (
            <figure key={item.name} className="st-testimonial-card">
              <blockquote>
                <i className="fa-solid fa-quote-left"></i>
                <p>{item.quote}</p>
              </blockquote>
              <figcaption>
                <span className="st-testimonial-name">{item.name}</span>
                <span className="st-testimonial-role">{item.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="st-section st-metrics">
        <div className="st-section-heading">
          <span className="st-kicker">By the numbers</span>
          <h2>A thriving literary network</h2>
          <p>Activity across posts, chats, and groups keeps the ShelfTalk ecosystem moving nonstop.</p>
        </div>
        <div className="st-metric-grid">
          {communityStats.map((stat) => (
            <article key={stat.label} className="st-metric-card">
              <span className="st-metric-value">{stat.value}</span>
              <span className="st-metric-label">{stat.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="st-section st-final-cta">
        <div className="st-final-card">
          <div className="st-final-info">
            <span className="st-kicker">Join today</span>
            <h2>Bring your shelf online and discover who is reading with you.</h2>
            <p>Sign up in moments, craft your profile, and invite friends to keep every conversation going long after the last page.</p>
          </div>
          <div className="st-final-actions">
            <button
              type="button"
              className="st-btn st-btn-primary"
              onClick={() => navigate('/signup')}
            >
              <i className="fa-solid fa-rocket"></i>
              Get started free
            </button>
            <button
              type="button"
              className="st-btn st-btn-outline"
              onClick={() => navigate('/login')}
            >
              <i className="fa-solid fa-right-to-bracket"></i>
              Sign in
            </button>
          </div>
        </div>
      </section>

      <footer className="st-footer">
        <div className="st-footer-inner">
          <div className="st-footer-brand">
            <div className="st-footer-logo">
              <ShelfTalkLogo size="small" type="navbar" />
            </div>
            <p className="st-footer-tagline">Books don't talk, we do.</p>
            <p className="st-footer-description">
              Connecting book lovers through posts, discovery, real-time chat, and reader groups—all in one thoughtful platform.
            </p>
            <div className="st-footer-social">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <i className="fa-brands fa-twitter"></i>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <i className="fa-brands fa-facebook"></i>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <i className="fa-brands fa-instagram"></i>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <i className="fa-brands fa-linkedin"></i>
              </a>
            </div>
          </div>

          <div className="st-footer-links">
            <div className="st-footer-column">
              <h4>Platform</h4>
              <ul>
                <li><button onClick={() => navigate('/posts')}>Community Posts</button></li>
                <li><button onClick={() => navigate('/discover')}>Discover Readers</button></li>
                <li><button onClick={() => navigate('/chat')}>Real-Time Chat</button></li>
                <li><button onClick={() => navigate('/groups')}>Reader Groups</button></li>
              </ul>
            </div>

            <div className="st-footer-column">
              <h4>Resources</h4>
              <ul>
                <li><a href="#help">Help Center</a></li>
                <li><a href="#guidelines">Community Guidelines</a></li>
                <li><a href="#blog">Blog</a></li>
              </ul>
            </div>

            <div className="st-footer-column">
              <h4>Legal</h4>
              <ul>
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#terms">Terms of Service</a></li>
                <li><a href="#cookies">Cookie Policy</a></li>
                <li><a href="#dmca">DMCA</a></li>
              </ul>
            </div>

            <div className="st-footer-column">
              <h4>Connect</h4>
              <ul>
                <li><a href="mailto:hello@shelftalk.com">hello@shelftalk.com</a></li>
                <li><a href="#contact">Contact Form</a></li>
                <li><a href="#careers">Careers</a></li>
                <li><a href="#press">Press Kit</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="st-footer-bottom">
          <p className="st-footer-copyright">
            © {new Date().getFullYear()} ShelfTalk. All rights reserved. Built with care for the literary community.
          </p>
          <div className="st-footer-meta">
            <span>Made with <i className="fa-solid fa-heart"></i> for readers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
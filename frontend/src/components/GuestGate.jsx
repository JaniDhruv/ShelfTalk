import React from 'react';
import { Link } from 'react-router-dom';

const styles = {
  wrapper: {
    minHeight: 'calc(100vh - 140px)',
    width: '100%',
    padding: '48px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--warm-cream, #fdf6e3)',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    borderRadius: '20px',
    background: 'var(--ivory-white, #fffef7)',
    border: '1px solid rgba(114, 47, 55, 0.12)',
    boxShadow: '0 16px 40px rgba(114, 47, 55, 0.12)',
    padding: '36px 32px',
    textAlign: 'center',
    color: 'var(--charcoal-gray, #36454f)',
    fontFamily: "'Inter', 'Montserrat', sans-serif",
  },
  iconWrap: {
    width: '64px',
    height: '64px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(114, 47, 55, 0.12), rgba(184, 134, 11, 0.12))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px auto',
    color: 'var(--rich-burgundy, #8b3a3a)',
  },
  icon: {
    fontSize: '1.75rem',
  },
  heading: {
    margin: '0 0 12px 0',
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.5rem',
    color: 'var(--deep-burgundy, #722f37)',
  },
  message: {
    margin: '0 0 24px 0',
    fontSize: '1rem',
    lineHeight: 1.6,
    opacity: 0.85,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, #722f37, #b8860b)',
    color: '#fffef7',
    fontWeight: 600,
    textDecoration: 'none',
    boxShadow: '0 8px 20px rgba(114, 47, 55, 0.25)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  secondaryLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '999px',
    border: '1px solid rgba(114, 47, 55, 0.35)',
    background: '#fffef7',
    color: '#722f37',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
};

function hoverStyle(base) {
  return {
    ...base,
    transform: 'translateY(-1px)',
    boxShadow: '0 12px 28px rgba(114, 47, 55, 0.25)',
  };
}

export default function GuestGate({
  title = 'Account Required',
  message = 'Please sign in or create an account to continue.',
  icon = 'fas fa-lock',
  loginText = 'Log In',
  signupText = 'Create Account',
}) {
  const [primaryHover, setPrimaryHover] = React.useState(false);
  const [secondaryHover, setSecondaryHover] = React.useState(false);

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <i className={icon} style={styles.icon} aria-hidden="true"></i>
        </div>
        <h2 style={styles.heading}>{title}</h2>
        <p style={styles.message}>{message}</p>
        <div style={styles.actions}>
          <Link
            to="/login"
            style={primaryHover ? hoverStyle(styles.primaryLink) : styles.primaryLink}
            onMouseEnter={() => setPrimaryHover(true)}
            onMouseLeave={() => setPrimaryHover(false)}
          >
            <i className="fas fa-sign-in-alt" aria-hidden="true"></i>
            {loginText}
          </Link>
          <Link
            to="/signup"
            style={secondaryHover ? hoverStyle(styles.secondaryLink) : styles.secondaryLink}
            onMouseEnter={() => setSecondaryHover(true)}
            onMouseLeave={() => setSecondaryHover(false)}
          >
            <i className="fas fa-user-plus" aria-hidden="true"></i>
            {signupText}
          </Link>
        </div>
      </div>
    </div>
  );
}

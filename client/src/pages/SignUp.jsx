import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ShelfTalkLogo from '../components/ShelfTalkLogo';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const navigate = useNavigate();

  const validateForm = () => {
    const errors = {};
    
    if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Signup failed');
        return;
      }

      // Show success and redirect to login
      navigate('/login', { 
        state: { 
          message: 'Account created successfully! Please log in.',
          type: 'success'
        }
      });
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Animated background elements */}
      <div className="hero-shapes">
        <div className="hero-shape shape-1"></div>
        <div className="hero-shape shape-2"></div>
        <div className="hero-shape shape-3"></div>
      </div>
      
      <div className="auth-card fade-in">
        <div className="auth-header">
          <div className="auth-icon">
            <ShelfTalkLogo size="medium" variant="white" />
          </div>
          <h1 className="auth-title">Join ShelfTalk</h1>
          <p className="auth-subtitle">Create your account to start your reading journey</p>
        </div>

        <form className="auth-form" onSubmit={handleSignup}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              type="text"
              className={`form-input ${validationErrors.username ? 'form-input-error' : ''}`}
              placeholder="Choose a unique username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
            {validationErrors.username && (
              <div className="form-error">{validationErrors.username}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className={`form-input ${validationErrors.email ? 'form-input-error' : ''}`}
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
            {validationErrors.email && (
              <div className="form-error">{validationErrors.email}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={`form-input ${validationErrors.password ? 'form-input-error' : ''}`}
              placeholder="Create a secure password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            {validationErrors.password && (
              <div className="form-error">{validationErrors.password}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={`form-input ${validationErrors.confirmPassword ? 'form-input-error' : ''}`}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            {validationErrors.confirmPassword && (
              <div className="form-error">{validationErrors.confirmPassword}</div>
            )}
          </div>

          {error && (
            <div className="auth-error slide-up">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>
      </div>

  <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

        :root {
          --primary-color: #2e3192;
          --secondary-color: #00b1b0;
          --accent-color: #ff6b6b;
          --text-primary: #333;
          --text-light: #f4f4f4;
          --background-color: #f9fbff;
          --white: #ffffff;
          --shadow-light: 0 2px 15px rgba(0, 0, 0, 0.1);
          --shadow-medium: 0 8px 30px rgba(46, 49, 146, 0.15);
          --shadow-heavy: 0 15px 50px rgba(46, 49, 146, 0.2);
        }

        * {
          font-family: 'Montserrat', sans-serif;
        }

        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: linear-gradient(135deg, var(--accent-color) 0%, var(--primary-color) 100%);
          position: relative;
          overflow: hidden;
        }

        .hero-shapes {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .hero-shape {
          position: absolute;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          animation: float 6s ease-in-out infinite alternate;
        }

        .shape-1 {
          width: 200px;
          height: 200px;
          top: 10%;
          left: 5%;
          animation-delay: -1s;
        }

        .shape-2 {
          width: 150px;
          height: 150px;
          top: 70%;
          right: 10%;
          animation-delay: -2s;
        }

        .shape-3 {
          width: 100px;
          height: 100px;
          top: 40%;
          right: 20%;
          animation-delay: -3s;
        }

        @keyframes float {
          0% {
            transform: translateY(0) scale(1);
          }
          100% {
            transform: translateY(30px) scale(1.05);
          }
        }

        .auth-card {
          width: 100%;
          max-width: 450px;
          background: var(--white);
          border-radius: 20px;
          box-shadow: var(--shadow-heavy);
          overflow: hidden;
          position: relative;
          z-index: 2;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .fade-in {
          animation: fadeInUp 0.8s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .auth-header {
          text-align: center;
          padding: 50px 40px 40px;
          background: linear-gradient(135deg, var(--accent-color), var(--primary-color));
          color: var(--text-light);
          position: relative;
          overflow: hidden;
        }

        .auth-header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          animation: shimmer 3s infinite;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%) translateY(-100%) rotate(45deg);
          }
          100% {
            transform: translateX(100%) translateY(100%) rotate(45deg);
          }
        }

        .auth-icon {
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: center;
        }

        .auth-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 10px;
          position: relative;
          z-index: 2;
        }

        .auth-subtitle {
          font-size: 1rem;
          opacity: 0.9;
          margin: 0;
          font-weight: 400;
          position: relative;
          z-index: 2;
        }

        .auth-form {
          padding: 40px;
        }

        .form-group {
          margin-bottom: 25px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.95rem;
        }

        .form-input {
          width: 100%;
          padding: 15px 20px;
          border: 2px solid #e1e5e9;
          border-radius: 12px;
          font-size: 1rem;
          font-family: 'Montserrat', sans-serif;
          transition: all 0.3s ease;
          background: #fafbfc;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--secondary-color);
          background: var(--white);
          box-shadow: 0 0 0 3px rgba(0, 177, 176, 0.1);
          transform: translateY(-1px);
        }

        .form-input-error {
          border-color: var(--accent-color);
          background: #fff8f8;
        }

        .form-input-error:focus {
          border-color: var(--accent-color);
          box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
        }

        .form-error {
          color: var(--accent-color);
          font-size: 0.85rem;
          margin-top: 5px;
          font-weight: 500;
        }

        .form-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-submit {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, var(--accent-color) 0%, var(--primary-color) 100%);
          color: var(--text-light);
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          font-family: 'Montserrat', sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
          margin-top: 10px;
        }

        .auth-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
        }

        .auth-submit:active {
          transform: translateY(0);
        }

        .auth-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid var(--text-light);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          display: inline-block;
          margin-right: 10px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .auth-error {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 20px;
          background: linear-gradient(135deg, #fee, #fdd);
          color: #d63384;
          border: 1px solid #f5c6cb;
          border-radius: 12px;
          font-size: 0.9rem;
          margin-bottom: 20px;
          font-weight: 500;
        }

        .slide-up {
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .auth-footer {
          padding: 0 40px 40px;
          text-align: center;
        }

        .auth-footer p {
          color: #6c757d;
          font-size: 0.95rem;
          margin: 0;
          font-weight: 400;
        }

        .auth-link {
          color: var(--primary-color);
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .auth-link:hover {
          color: var(--secondary-color);
          text-decoration: underline;
        }

        @media (max-width: 640px) {
          .auth-container {
            padding: 15px;
          }
          
          .auth-card {
            max-width: 100%;
          }
          
          .auth-header {
            padding: 40px 30px 30px;
          }
          
          .auth-form {
            padding: 30px;
          }
          
          .auth-footer {
            padding: 0 30px 30px;
          }

          .auth-icon {
            font-size: 3rem;
          }

          .auth-title {
            font-size: 1.75rem;
          }
        }
  `}</style>
    </div>
  );
}
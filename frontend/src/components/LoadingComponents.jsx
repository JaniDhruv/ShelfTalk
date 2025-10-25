import React from 'react';

export function LoadingSpinner({ size = 'md', color = 'primary' }) {
  return (
    <div className={`loading-spinner loading-spinner-${size} loading-spinner-${color}`}>
      <div className="spinner"></div>
  <style>{`
        .loading-spinner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .spinner {
          border-radius: 50%;
          border: 2px solid var(--secondary-200);
          border-top-color: transparent;
          animation: spin 1s linear infinite;
        }
        
        /* Size variants */
        .loading-spinner-xs .spinner {
          width: 12px;
          height: 12px;
        }
        
        .loading-spinner-sm .spinner {
          width: 16px;
          height: 16px;
        }
        
        .loading-spinner-md .spinner {
          width: 20px;
          height: 20px;
        }
        
        .loading-spinner-lg .spinner {
          width: 24px;
          height: 24px;
        }
        
        .loading-spinner-xl .spinner {
          width: 32px;
          height: 32px;
          border-width: 3px;
        }
        
        /* Color variants */
        .loading-spinner-primary .spinner {
          border-top-color: var(--primary-500);
        }
        
        .loading-spinner-secondary .spinner {
          border-top-color: var(--secondary-500);
        }
        
        .loading-spinner-white .spinner {
          border-color: rgba(255, 255, 255, 0.3);
          border-top-color: white;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
  `}</style>
    </div>
  );
}

export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="page-loader">
      <div className="loader-content">
        <LoadingSpinner size="xl" color="primary" />
        <p className="loader-message">{message}</p>
      </div>
  <style>{`
        .page-loader {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          padding: var(--space-8);
        }
        
        .loader-content {
          text-align: center;
        }
        
        .loader-message {
          margin-top: var(--space-4);
          color: var(--secondary-600);
          font-size: var(--text-sm);
        }
  `}</style>
    </div>
  );
}

export function SkeletonLoader({ type = 'text', width = '100%', height = '20px', className = '' }) {
  return (
    <div 
      className={`skeleton-loader ${className}`}
      style={{ width, height }}
    >
  <style>{`
        .skeleton-loader {
          background: linear-gradient(
            90deg,
            var(--secondary-200) 25%,
            var(--secondary-100) 50%,
            var(--secondary-200) 75%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s infinite;
          border-radius: var(--radius);
        }
        
        @keyframes skeleton-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
  `}</style>
    </div>
  );
}

export function ButtonLoader({ children, isLoading, ...props }) {
  return (
    <button {...props} disabled={isLoading || props.disabled}>
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" color="white" />
          <span style={{ marginLeft: 'var(--space-2)' }}>
            {typeof children === 'string' ? 'Loading...' : children}
          </span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
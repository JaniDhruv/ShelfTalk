import React, { createContext, useContext, useState, useEffect } from 'react';

const ToastContext = createContext();

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: 'info',
      duration: 5000,
      ...toast,
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const toast = {
    success: (message, options = {}) => addToast({ ...options, type: 'success', message }),
    error: (message, options = {}) => addToast({ ...options, type: 'error', message }),
    warning: (message, options = {}) => addToast({ ...options, type: 'warning', message }),
    info: (message, options = {}) => addToast({ ...options, type: 'info', message }),
  };

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
  <style>{`
        .toast-container {
          position: fixed;
          top: var(--space-4);
          right: var(--space-4);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          max-width: 400px;
          width: 100%;
        }
        
        @media (max-width: 640px) {
          .toast-container {
            left: var(--space-4);
            right: var(--space-4);
            max-width: none;
          }
        }
  `}</style>
    </div>
  );
}

function Toast({ toast, onRemove }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Add entrance animation
    const timer = setTimeout(() => {
      const element = document.getElementById(`toast-${toast.id}`);
      if (element) {
        element.classList.add('toast-enter');
      }
    }, 10);

    return () => clearTimeout(timer);
  }, [toast.id]);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(onRemove, 300);
  };

  const getToastIcon = () => {
    switch (toast.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  const getToastColors = () => {
    switch (toast.type) {
      case 'success':
        return {
          background: 'var(--success-50)',
          border: 'var(--success-200)',
          text: 'var(--success-800)',
          closeHover: 'var(--success-100)'
        };
      case 'error':
        return {
          background: 'var(--error-50)',
          border: 'var(--error-200)',
          text: 'var(--error-800)',
          closeHover: 'var(--error-100)'
        };
      case 'warning':
        return {
          background: 'var(--warning-50)',
          border: 'var(--warning-200)',
          text: 'var(--warning-800)',
          closeHover: 'var(--warning-100)'
        };
      case 'info':
      default:
        return {
          background: 'var(--primary-50)',
          border: 'var(--primary-200)',
          text: 'var(--primary-800)',
          closeHover: 'var(--primary-100)'
        };
    }
  };

  const colors = getToastColors();

  return (
    <div
      id={`toast-${toast.id}`}
      className={`toast toast-${toast.type} ${isExiting ? 'toast-exit' : ''}`}
      onClick={toast.onClick}
    >
      <div className="toast-content">
        <span className="toast-icon">{getToastIcon()}</span>
        <div className="toast-message">
          {toast.title && <div className="toast-title">{toast.title}</div>}
          <div className="toast-text">{toast.message}</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          className="toast-close"
        >
          ✕
        </button>
      </div>
      
      {toast.duration > 0 && (
        <div 
          className="toast-progress"
          style={{ animationDuration: `${toast.duration}ms` }}
        />
      )}

  <style>{`
        .toast {
          background: ${colors.background};
          border: 1px solid ${colors.border};
          color: ${colors.text};
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          transform: translateX(100%);
          transition: all 0.3s ease-in-out;
          cursor: ${toast.onClick ? 'pointer' : 'default'};
          position: relative;
        }
        
        .toast:global(.toast-enter) {
          transform: translateX(0);
        }
        
        .toast:global(.toast-exit) {
          transform: translateX(100%);
          opacity: 0;
        }
        
        .toast:hover {
          box-shadow: var(--shadow-xl);
        }
        
        .toast-content {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          padding: var(--space-4);
        }
        
        .toast-icon {
          font-size: var(--text-lg);
          flex-shrink: 0;
          margin-top: var(--space-1);
        }
        
        .toast-message {
          flex: 1;
          min-width: 0;
        }
        
        .toast-title {
          font-weight: 600;
          font-size: var(--text-sm);
          margin-bottom: var(--space-1);
          line-height: 1.4;
        }
        
        .toast-text {
          font-size: var(--text-sm);
          line-height: 1.4;
          word-break: break-word;
        }
        
        .toast-close {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: var(--space-1);
          border-radius: var(--radius);
          transition: var(--transition-colors);
          flex-shrink: 0;
          font-size: var(--text-sm);
          line-height: 1;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .toast-close:hover {
          background: ${colors.closeHover};
        }
        
        .toast-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: currentColor;
          opacity: 0.3;
          width: 100%;
          transform-origin: left;
          animation: toast-progress linear;
        }
        
        @keyframes toast-progress {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
        
        @media (max-width: 640px) {
          .toast-content {
            padding: var(--space-3);
          }
          
          .toast-text,
          .toast-title {
            font-size: var(--text-xs);
          }
        }
  `}</style>
    </div>
  );
}
import React from 'react';
import { createPortal } from 'react-dom';
import './ConfirmationModal.css';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?", 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "warning" // "warning", "danger", "info"
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: '⚠️',
          iconColor: '#dc2626',
          confirmBg: 'linear-gradient(135deg, #dc2626, #b91c1c)',
          confirmHover: 'linear-gradient(135deg, #b91c1c, #991b1b)'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          iconColor: '#2563eb',
          confirmBg: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          confirmHover: 'linear-gradient(135deg, #1d4ed8, #1e40af)'
        };
      default: // warning
        return {
          icon: '⚠️',
          iconColor: '#d97706',
          confirmBg: 'linear-gradient(135deg, #d97706, #b45309)',
          confirmHover: 'linear-gradient(135deg, #b45309, #92400e)'
        };
    }
  };

  const typeStyles = getTypeStyles();

  return createPortal(
    <div className="confirm-modal-backdrop" role="dialog" aria-modal="true" onClick={handleBackdropClick}>
      <div className="confirm-modal-container">
        <div className="confirm-modal-header">
          <div className="confirm-modal-icon" style={{ color: typeStyles.iconColor }}>
            {typeStyles.icon}
          </div>
          <h3 className="confirm-modal-title">{title}</h3>
        </div>

        <div className="confirm-modal-body">
          <p className="confirm-modal-message">{message}</p>
        </div>

        <div className="confirm-modal-footer">
          <button
            className="confirm-modal-btn confirm-modal-btn-cancel"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            className="confirm-modal-btn confirm-modal-btn-confirm"
            onClick={onConfirm}
            style={{
              background: typeStyles.confirmBg
            }}
            onMouseEnter={(e) => {
              e.target.style.background = typeStyles.confirmHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = typeStyles.confirmBg;
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationModal;

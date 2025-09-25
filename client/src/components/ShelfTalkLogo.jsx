import React from 'react';

const ShelfTalkLogo = ({ size = 'medium', variant = 'default' }) => {
  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-4xl',
    large: 'text-6xl'
  };

  const variantStyles = {
    default: {
      background: 'linear-gradient(135deg, #2e3192 0%, #00b1b0 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    white: {
      color: '#ffffff'
    },
    accent: {
      background: 'linear-gradient(135deg, #ff6b6b 0%, #2e3192 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Book Icon */}
      <div className="relative">
        <i 
          className={`fas fa-book-open ${sizeClasses[size]} ${variant === 'white' ? 'text-white' : ''}`}
          style={variant !== 'white' ? {
            background: 'linear-gradient(135deg, #2e3192 0%, #00b1b0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          } : {}}
        />
        {/* Floating book pages animation */}
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full opacity-70 animate-pulse"></div>
      </div>
      
      {/* Text Logo */}
      <span 
        className={`font-bold ${sizeClasses[size]} font-['Montserrat']`}
        style={variantStyles[variant]}
      >
        ShelfTalk
      </span>
    </div>
  );
};

export default ShelfTalkLogo;
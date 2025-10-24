import React from 'react';

const ShelfTalkLogo = ({ size = 'medium', variant = 'default', showTagline = false, type = 'full' }) => {
  // Type determines which logo to use:
  // 'full' - circular logo for landing/login/signup pages
  // 'navbar' - horizontal logo with text for navbar
  
  // Size configurations for the logo image
  const sizeConfig = {
    full: {
      small: { width: '80px', height: '80px' },
      medium: { width: '120px', height: '120px' },
      large: { width: '160px', height: '160px' }
    },
    navbar: {
      // Note: 90px and 110px are quite large for a typical navbar.
      // 'small' (55px) will likely look best based on your screenshot.
      small: { height: '55px', width: 'auto' },
      medium: { height: '90px', width: 'auto' },
      large: { height: '110px', width: 'auto' }
    }
  };

  const logoSrc = type === 'navbar' 
    ? `${process.env.PUBLIC_URL}/shelftalk-logo-navbar.png`
    : `${process.env.PUBLIC_URL}/shelftalk-logo.png`;

  const currentSize = sizeConfig[type][size] || sizeConfig[type].medium;

  // Full logo (circular) - This logic remains unchanged
  if (type === 'full') {
    return (
      <div className="flex flex-col items-center">
        <div 
          style={{
            width: currentSize.width,
            height: currentSize.height,
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'white',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '3px solid rgba(255, 255, 255, 0.9)'
          }}
        >
          <img 
            src={logoSrc}
            alt="ShelfTalk - Connecting Readers"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scale(1.1)'
            }}
            className="transition-transform hover:scale-125"
            onError={(e) => {
              console.error('Logo image failed to load');
              e.target.style.display = 'none';
            }}
          />
        </div>
        {showTagline && (
          <p className="text-sm text-gray-300 mt-2 italic">connecting readers</p>
        )}
      </div>
    );
  }

  // Navbar logo (horizontal) - UPDATED STYLING
  // 🌟 CLEANED + RESIZED NAVBAR VERSION
return (
  <div className="flex items-center justify-center">
    <img 
      src={logoSrc}
      alt="ShelfTalk"
      style={{
        height: currentSize.height,
        width: 'auto',
        objectFit: 'contain',
        objectPosition: 'center',
        display: 'block',
        borderRadius: '16px',     // Rounded corners only
        transform: 'scale(1.25)', // Slightly wider and bigger
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)', // Soft depth shadow only
      }}
      className="transition-transform hover:scale-130"
      onError={(e) => {
        console.error('Logo image failed to load');
        e.target.style.display = 'none';
      }}
    />
  </div>
);

};

export default ShelfTalkLogo;
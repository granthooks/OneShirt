
import React from 'react';
import logoImage from '../images/logo/552-5522098_plain-blue-t-shirt-png-image-background-bella.png';

export const OneShirtLogo = ({ className }: { className?: string }) => (
  <img 
    src={logoImage} 
    alt="OneShirt Logo" 
    className={`bg-transparent ${className || ''}`}
    style={{ 
      backgroundColor: 'transparent',
      background: 'transparent',
      display: 'block'
    }}
  />
);

export const CreditIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        {/* Outer coin circle with depth */}
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.9" />
        <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.7" />

        {/* Dollar sign in center */}
        <path d="M13 7h-2v1.5h-.5c-1.1 0-2 .9-2 2s.9 2 2 2h1c.55 0 1 .45 1 1s-.45 1-1 1H10c-.55 0-1-.45-1-1H7c0 1.66 1.34 3 3 3v1.5h2V17c1.1 0 2-.9 2-2s-.9-2-2-2h-1c-.55 0-1-.45-1-1s.45-1 1-1h1.5c.55 0 1 .45 1 1H15c0-1.66-1.34-3-3-3V7z" fill="white" opacity="0.95" />

        {/* Sparkle 1 - top right */}
        <path d="M19 6l-.5 1.5L17 8l1.5.5L19 10l.5-1.5L21 8l-1.5-.5z" fill="white" opacity="0.8" />

        {/* Sparkle 2 - bottom left */}
        <path d="M5 16l-.3 1L4 17.3l1 .3.3 1 .3-1 1-.3-1-.3z" fill="white" opacity="0.7" />
    </svg>
);

export const AdminIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.49 3.17a.75.75 0 01.47.882l-1 4.5a.75.75 0 01-1.44-.324l1-4.5a.75.75 0 01.97-.558zM6.25 7.5a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5zM3.25 9a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75zM4 12a.75.75 0 000 1.5h4.25a.75.75 0 000-1.5H4z" clipRule="evenodd" />
        <path d="M3 3.5A1.5 1.5 0 014.5 2h11A1.5 1.5 0 0117 3.5v1.886a.75.75 0 01-1.5 0V3.5a.5.5 0 00-.5-.5h-11a.5.5 0 00-.5.5v13a.5.5 0 00.5.5h5.5a.75.75 0 010 1.5H4.5A1.5 1.5 0 013 16.5v-13z" />
        <path d="M12.75 13.5a.75.75 0 000 1.5h2.5a.75.75 0 000-1.5h-2.5z" />
    </svg>
);

export const SwipeIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 15l3-3m0 0l-3-3m3 3h-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const ProfileIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {/* Circular background for avatar */}
        <circle cx="12" cy="12" r="10" strokeWidth="2" fill="none" />

        {/* Cute smiling face */}
        <circle cx="12" cy="9" r="3.5" fill="currentColor" opacity="0.9" />

        {/* Friendly smile eyes - cute dots */}
        <circle cx="10.5" cy="8.5" r="0.8" fill="white" />
        <circle cx="13.5" cy="8.5" r="0.8" fill="white" />

        {/* Small smile */}
        <path d="M10 10c.5.8 1.2 1.2 2 1.2s1.5-.4 2-1.2" strokeLinecap="round" fill="none" strokeWidth="1.5" />

        {/* Shoulders/body with friendly rounded shape */}
        <path d="M5.5 18.5c0-3.5 2.5-6 6.5-6s6.5 2.5 6.5 6" strokeLinecap="round" strokeWidth="2.5" fill="none" />

        {/* Small heart detail near shoulder */}
        <path d="M7 16.5c-.3-.3-.3-.7 0-1 .3-.3.7-.3 1 0 .3.3.3.7 0 1-.3.3-.7.3-1 0z" fill="currentColor" opacity="0.6" />
    </svg>
);

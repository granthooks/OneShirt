
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
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-1 4a1 1 0 100 2h4a1 1 0 100-2H8z" clipRule="evenodd" />
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

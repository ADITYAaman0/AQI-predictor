/**
 * Accessibility Component - Skip Link
 * 
 * Allows keyboard users to skip navigation and jump to main content
 * Implements Task 20.3 - ARIA Labels and Landmarks
 * 
 * Requirements: 13.2 (Keyboard Navigation Support)
 * Property 25: Keyboard Navigation Support
 */

'use client';

import React from 'react';

export interface SkipLinkProps {
  /** Target element ID to skip to */
  targetId?: string;
  /** Link text */
  text?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId = 'main-content',
  text = 'Skip to main content',
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      className="skip-link"
      onClick={handleClick}
      aria-label={text}
    >
      {text}
    </a>
  );
};

export default SkipLink;

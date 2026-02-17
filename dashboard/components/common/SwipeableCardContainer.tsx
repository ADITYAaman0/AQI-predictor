/**
 * SwipeableCardContainer Component
 * 
 * A container that makes its children swipeable on mobile devices.
 * Useful for mobile-optimized card grids and carousels.
 * 
 * Features:
 * - Touch swipe detection
 * - Smooth animations with Framer Motion
 * - Configurable swipe distance
 * - Callback support for navigation
 * 
 * Requirements: 7.4 - Mobile-specific layouts with swipeable cards
 */

'use client';

import React, { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';

export interface SwipeableCardContainerProps {
  /** Children components to display */
  children: React.ReactNode;
  /** Callback when swiping left */
  onSwipeLeft?: () => void;
  /** Callback when swiping right */
  onSwipeRight?: () => void;
  /** Enable/disable swipe (default: true on mobile) */
  enabled?: boolean;
  /** CSS class name */
  className?: string;
  /** Minimum drag distance to trigger swipe (default: 50) */
  swipeThreshold?: number;
}

export const SwipeableCardContainer: React.FC<SwipeableCardContainerProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
  className = '',
  swipeThreshold = 50,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);

    if (!enabled) return;

    const { offset, velocity } = info;

    // Calculate swipe distance and velocity
    const swipeDistance = Math.abs(offset.x);
    const swipeVelocity = Math.abs(velocity.x);

    // Determine if it's a valid swipe
    if (swipeDistance > swipeThreshold || swipeVelocity > 500) {
      if (offset.x > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (offset.x < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
  };

  return (
    <motion.div
      className={`swipeable-card-container ${className}`}
      drag={enabled ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      whileTap={{ scale: isDragging ? 0.98 : 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
    >
      {children}
    </motion.div>
  );
};

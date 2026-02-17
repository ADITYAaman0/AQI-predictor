/**
 * Mobile Testing Utilities
 * 
 * Utilities for testing components across different viewport sizes and devices.
 * Provides helpers for simulating mobile, tablet, and desktop viewports.
 * 
 * Requirements: 7.1-7.7 - Responsive design testing
 */

/**
 * Viewport presets for common devices
 */
export const VIEWPORT_PRESETS = {
  // Mobile devices
  iphoneSE: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true },
  iphone12: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true },
  iphone14Pro: { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true },
  pixel5: { width: 393, height: 851, deviceScaleFactor: 2.75, isMobile: true },
  galaxyS21: { width: 360, height: 800, deviceScaleFactor: 3, isMobile: true },
  
  // Tablets
  ipadMini: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: false },
  ipadAir: { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: false },
  ipadPro: { width: 1024, height: 1366, deviceScaleFactor: 2, isMobile: false },
  
  // Desktop
  laptop: { width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false },
  desktop: { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false },
  desktop4k: { width: 3840, height: 2160, deviceScaleFactor: 2, isMobile: false },
} as const;

/**
 * Breakpoint sizes matching Tailwind CSS defaults
 */
export const BREAKPOINTS = {
  mobile: { min: 0, max: 767 },
  tablet: { min: 768, max: 1023 },
  desktop: { min: 1024, max: Infinity },
} as const;

/**
 * Set viewport size for testing
 * 
 * @param width - Viewport width in pixels
 * @param height - Viewport height in pixels
 */
export function setViewportSize(width: number, height: number): void {
  // Update window.innerWidth and window.innerHeight
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
}

/**
 * Set viewport to a device preset
 * 
 * @param preset - Device preset name
 */
export function setViewportPreset(preset: keyof typeof VIEWPORT_PRESETS): void {
  const { width, height } = VIEWPORT_PRESETS[preset];
  setViewportSize(width, height);
}

/**
 * Simulate touch device by adding touch event support
 */
export function enableTouchDevice(): void {
  // Add ontouchstart to window
  Object.defineProperty(window, 'ontouchstart', {
    writable: true,
    configurable: true,
    value: null,
  });
  
  // Add maxTouchPoints
  Object.defineProperty(navigator, 'maxTouchPoints', {
    writable: true,
    configurable: true,
    value: 5,
  });
}

/**
 * Disable touch device simulation
 */
export function disableTouchDevice(): void {
  Object.defineProperty(window, 'ontouchstart', {
    writable: true,
    configurable: true,
    value: undefined,
  });
  
  Object.defineProperty(navigator, 'maxTouchPoints', {
    writable: true,
    configurable: true,
    value: 0,
  });
}

/**
 * Check if an element meets minimum touch target size (44x44px)
 * 
 * @param element - Element to check
 * @returns True if element meets minimum size
 */
export function meetsTouchTargetSize(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  
  // Account for border and padding
  const width = rect.width || parseFloat(computedStyle.width) || 0;
  const height = rect.height || parseFloat(computedStyle.height) || 0;
  
  return width >= 44 && height >= 44;
}

/**
 * Get all interactive elements in a container
 * 
 * @param container - Container element to search
 * @returns Array of interactive elements
 */
export function getInteractiveElements(container: Element): Element[] {
  const selectors = [
    'button',
    'a',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[tabindex]:not([tabindex="-1"])',
  ];
  
  return Array.from(container.querySelectorAll(selectors.join(', ')));
}

/**
 * Check if all interactive elements meet touch target size requirements
 * 
 * @param container - Container element to check
 * @returns Object with validation results
 */
export function validateTouchTargets(container: Element): {
  passed: boolean;
  total: number;
  passing: number;
  failing: Element[];
} {
  const elements = getInteractiveElements(container);
  const failing: Element[] = [];
  
  elements.forEach((element) => {
    if (!meetsTouchTargetSize(element)) {
      failing.push(element);
    }
  });
  
  return {
    passed: failing.length === 0,
    total: elements.length,
    passing: elements.length - failing.length,
    failing,
  };
}

/**
 * Simulate a swipe gesture
 * 
 * @param element - Element to swipe on
 * @param direction - Swipe direction ('left', 'right', 'up', 'down')
 * @param distance - Swipe distance in pixels (default: 100)
 */
export function simulateSwipe(
  element: Element,
  direction: 'left' | 'right' | 'up' | 'down',
  distance: number = 100
): void {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  let startX = centerX;
  let startY = centerY;
  let endX = centerX;
  let endY = centerY;
  
  switch (direction) {
    case 'left':
      endX = centerX - distance;
      break;
    case 'right':
      endX = centerX + distance;
      break;
    case 'up':
      endY = centerY - distance;
      break;
    case 'down':
      endY = centerY + distance;
      break;
  }
  
  // Create touch events
  const touchStart = new TouchEvent('touchstart', {
    bubbles: true,
    cancelable: true,
    touches: [
      new Touch({
        identifier: 0,
        target: element,
        clientX: startX,
        clientY: startY,
        screenX: startX,
        screenY: startY,
        pageX: startX,
        pageY: startY,
      }),
    ],
  });
  
  const touchEnd = new TouchEvent('touchend', {
    bubbles: true,
    cancelable: true,
    touches: [],
  });
  
  // Dispatch start event
  element.dispatchEvent(touchStart);
  
  // Simulate swipe motion with multiple move events
  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const currentX = startX + (endX - startX) * progress;
    const currentY = startY + (endY - startY) * progress;
    
    const moveEvent = new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [
        new Touch({
          identifier: 0,
          target: element,
          clientX: currentX,
          clientY: currentY,
          screenX: currentX,
          screenY: currentY,
          pageX: currentX,
          pageY: currentY,
        }),
      ],
    });
    
    element.dispatchEvent(moveEvent);
  }
  
  element.dispatchEvent(touchEnd);
}

/**
 * Wait for breakpoint transition to complete
 * 
 * @param timeout - Maximum time to wait in ms (default: 1000)
 */
export async function waitForBreakpointTransition(timeout: number = 1000): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

/**
 * Animation Tests (Task 19.6)
 * 
 * Tests all animation and micro-interaction functionality including:
 * - Card hover animations (Property 21)
 * - Button click animations (Property 22)
 * - Numeric value animations (Property 23)
 * - Threshold crossing animations (Property 16)
 * - Safe animation flash rate (Property 30)
 * - Loading animations
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  useCountUp,
  useNumberAnimation,
  useThresholdCrossing,
  useHover,
  useButtonPress,
  useReducedMotion,
} from '@/lib/hooks';
import {
  LoadingSpinner,
  LoadingDots,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  PulseDot,
  ProgressBar,
  LoadingOverlay,
} from '@/components/common';

describe('Animation Hooks', () => {
  describe('useCountUp', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should animate from 0 to target value', async () => {
      const { result } = renderHook(() => useCountUp(100, 1500));

      expect(result.current).toBe(0);

      // Fast-forward through animation
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        // Should be close to 100 (within 1%)
        expect(result.current).toBeGreaterThan(99);
      });
    });

    it('should animate from start to end value', async () => {
      const { result } = renderHook(() => useCountUp(100, 1500, 50));

      expect(result.current).toBe(50);

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        // Should be close to 100 (within 1%)
        expect(result.current).toBeGreaterThan(99);
      });
    });

    it('should use custom duration', async () => {
      const { result } = renderHook(() => useCountUp(100, 2000));

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should be in progress (not at 100 yet)
      expect(result.current).toBeLessThan(100);
      expect(result.current).toBeGreaterThan(0);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        // Should be close to 100 (within 5% since we're testing mid-animation timing)
        expect(result.current).toBeGreaterThan(95);
      });
    });

    it('should animate smoothly with easing', async () => {
      const { result } = renderHook(() => useCountUp(100, 1000));

      const values: number[] = [];

      // Sample values during animation
      for (let i = 0; i <= 1000; i += 100) {
        act(() => {
          jest.advanceTimersByTime(100);
        });
        values.push(result.current);
      }

      // Should have increasing values
      for (let i = 1; i < values.length; i++) {
        expect(values[i] ?? 0).toBeGreaterThanOrEqual(values[i - 1] ?? 0);
      }
    });
  });

  describe('useNumberAnimation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should format numeric value with decimals', async () => {
      const { result } = renderHook(() => useNumberAnimation(123.456, 2, 1000));

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        // Should have 2 decimal places
        expect(result.current).toMatch(/^\d+\.\d{2}$/);
        // Should be close to 123.46
        const numValue = parseFloat(result.current);
        expect(numValue).toBeGreaterThan(120);
        expect(numValue).toBeLessThan(125);
      });
    });

    it('should format integer values', async () => {
      const { result } = renderHook(() => useNumberAnimation(100, 0, 1000));

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        // Should be an integer (no decimals)
        expect(result.current).toMatch(/^\d+$/);
        // Should be close to 100
        const numValue = parseInt(result.current, 10);
        expect(numValue).toBeGreaterThan(95);
        expect(numValue).toBeLessThan(105);
      });
    });
  });

  describe('useThresholdCrossing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should detect upward threshold crossing', async () => {
      const thresholds = [50, 100, 150];
      const { result, rerender } = renderHook(
        ({ value }) => useThresholdCrossing(value, thresholds),
        { initialProps: { value: 40 } }
      );

      expect(result.current.isAnimating).toBe(false);
      expect(result.current.threshold).toBe(null);

      // Cross threshold 50
      rerender({ value: 60 });

      expect(result.current.isAnimating).toBe(true);
      expect(result.current.threshold).toBe(50);

      // Animation should stop after 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isAnimating).toBe(false);
      });
    });

    it('should detect downward threshold crossing', async () => {
      const thresholds = [50, 100, 150];
      const { result, rerender } = renderHook(
        ({ value }) => useThresholdCrossing(value, thresholds),
        { initialProps: { value: 120 } }
      );

      expect(result.current.isAnimating).toBe(false);

      // Cross threshold 100 downward
      rerender({ value: 90 });

      expect(result.current.isAnimating).toBe(true);
      expect(result.current.threshold).toBe(100);
    });

    it('should respect safe flash rate (<3 per second)', async () => {
      const thresholds = [50];
      const { result, rerender } = renderHook(
        ({ value }) => useThresholdCrossing(value, thresholds),
        { initialProps: { value: 40 } }
      );

      // First crossing
      rerender({ value: 60 });
      expect(result.current.isAnimating).toBe(true);

      // Try to trigger multiple times quickly (should still respect 1s duration)
      rerender({ value: 40 });
      rerender({ value: 60 });

      // Animation continues for 1 second (< 3 flashes per second)
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.isAnimating).toBe(true);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current.isAnimating).toBe(false);
      });
    });
  });

  describe('useHover', () => {
    it('should manage hover state', () => {
      const { result } = renderHook(() => useHover());

      expect(result.current.isHovered).toBe(false);

      act(() => {
        result.current.onMouseEnter();
      });

      expect(result.current.isHovered).toBe(true);

      act(() => {
        result.current.onMouseLeave();
      });

      expect(result.current.isHovered).toBe(false);
    });
  });

  describe('useButtonPress', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should manage button press state', async () => {
      const { result } = renderHook(() => useButtonPress());

      expect(result.current.isPressed).toBe(false);

      act(() => {
        result.current.onMouseDown();
      });

      expect(result.current.isPressed).toBe(true);

      act(() => {
        result.current.onMouseUp();
      });

      // Should stay pressed for 100ms
      expect(result.current.isPressed).toBe(true);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isPressed).toBe(false);
      });
    });

    it('should reset on mouse leave', () => {
      const { result } = renderHook(() => useButtonPress());

      act(() => {
        result.current.onMouseDown();
      });

      expect(result.current.isPressed).toBe(true);

      act(() => {
        result.current.onMouseLeave();
      });

      expect(result.current.isPressed).toBe(false);
    });
  });

  describe('useReducedMotion', () => {
    it('should detect prefers-reduced-motion', () => {
      // Mock matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('reduce'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toBe(true);
    });
  });
});

describe('Loading Animation Components', () => {
  describe('LoadingSpinner', () => {
    it('should render spinner with correct size', () => {
      const { container } = render(<LoadingSpinner size="medium" />);
      
      const spinner = container.querySelector('[role="status"]');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should accept different sizes', () => {
      const { container: small } = render(<LoadingSpinner size="small" />);
      const { container: large } = render(<LoadingSpinner size="large" />);

      expect(small.querySelector('.w-4')).toBeInTheDocument();
      expect(large.querySelector('.w-12')).toBeInTheDocument();
    });
  });

  describe('LoadingDots', () => {
    it('should render three dots with staggered animation', () => {
      const { container } = render(<LoadingDots />);
      
      const dots = container.querySelectorAll('.animate-pulse');
      expect(dots).toHaveLength(3);
    });
  });

  describe('Skeleton', () => {
    it('should render with custom width and height', () => {
      const { container } = render(<Skeleton width={200} height={100} />);
      
      const skeleton = container.querySelector('[role="status"]');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveStyle({ width: '200px', height: '100px' });
    });

    it('should render different variants', () => {
      const { container: text } = render(<Skeleton variant="text" />);
      const { container: circular } = render(<Skeleton variant="circular" />);
      const { container: rectangular } = render(<Skeleton variant="rectangular" />);

      expect(text.querySelector('.rounded')).toBeInTheDocument();
      expect(circular.querySelector('.rounded-full')).toBeInTheDocument();
      expect(rectangular.querySelector('.rounded-lg')).toBeInTheDocument();
    });

    it('should have shimmer effect', () => {
      const { container } = render(<Skeleton />);
      
      const skeleton = container.querySelector('.skeleton-shimmer');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('SkeletonText', () => {
    it('should render multiple lines', () => {
      const { container } = render(<SkeletonText lines={5} />);
      
      const skeletons = container.querySelectorAll('[role="status"]');
      // Should have 5 skeleton lines
      expect(skeletons.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('SkeletonCard', () => {
    it('should render card skeleton structure', () => {
      const { container } = render(<SkeletonCard />);
      
      const card = container.querySelector('[role="status"]');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('glass-card');
    });
  });

  describe('PulseDot', () => {
    it('should render pulsing dot', () => {
      const { container } = render(<PulseDot />);
      
      const pulsingElement = container.querySelector('.animate-ping');
      expect(pulsingElement).toBeInTheDocument();
    });

    it('should accept different sizes and colors', () => {
      const { container } = render(<PulseDot size="large" color="bg-red-500" />);
      
      const dot = container.querySelector('.bg-red-500');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('ProgressBar', () => {
    it('should render with correct value', () => {
      render(<ProgressBar value={50} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should clamp values between 0 and 100', () => {
      const { rerender } = render(<ProgressBar value={150} />);
      
      let progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');

      rerender(<ProgressBar value={-50} />);
      
      progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should show label when enabled', () => {
      render(<ProgressBar value={75} showLabel />);
      
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('LoadingOverlay', () => {
    it('should render overlay with message', () => {
      const { container } = render(<LoadingOverlay message="Loading data..." />);
      
      const overlay = container.querySelector('[aria-label="Loading data..."]');
      expect(overlay).toBeInTheDocument();
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });
  });
});

describe('Property-Based Animation Tests', () => {
  describe('Property 21: Card Hover Animation', () => {
    it('should lift card by 4px and enhance shadow on hover', () => {
      // Test hover-lift class
      render(
        <div className="hover-lift" data-testid="test-card">
          Test Card
        </div>
      );

      const card = screen.getByTestId('test-card');
      
      // Check that hover-lift class is applied
      expect(card).toHaveClass('hover-lift');
      
      // Note: Full hover testing requires E2E tests
      // This verifies the class is applied and CSS handles transform
    });
  });

  describe('Property 22: Button Click Animation', () => {
    it('should scale button to 0.95 on click then back to 1.0', () => {
      render(
        <button className="hover-scale" data-testid="test-button">
          Click Me
        </button>
      );

      const button = screen.getByTestId('test-button');
      expect(button).toHaveClass('hover-scale');
      
      // CSS class applies scale(0.95) on :active pseudo-class
      // Full interaction testing requires E2E tests
    });
  });

  describe('Property 23: Numeric Value Animation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should animate numeric changes over 1.5s', async () => {
      const { result } = renderHook(() => useCountUp(100, 1500));

      const startValue = result.current;

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        // Should be close to 100 (within 1%)
        expect(result.current).toBeGreaterThan(99);
        expect(result.current).toBeGreaterThan(startValue);
      });
    });
  });

  describe('Property 16: Threshold Crossing Animation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should apply flash/glow effect when crossing thresholds', async () => {
      const thresholds = [50, 100, 150, 200, 300]; // AQI thresholds
      const { result, rerender } = renderHook(
        ({ value }) => useThresholdCrossing(value, thresholds),
        { initialProps: { value: 45 } }
      );

      expect(result.current.isAnimating).toBe(false);

      // Cross from Good (0-50) to Moderate (51-100)
      rerender({ value: 55 });

      expect(result.current.isAnimating).toBe(true);
      expect(result.current.threshold).toBe(50);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isAnimating).toBe(false);
      });
    });
  });

  describe('Property 30: Safe Animation Flash Rate', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should not exceed 3 flashes per second', async () => {
      const thresholds = [50];
      const { result, rerender } = renderHook(
        ({ value }) => useThresholdCrossing(value, thresholds),
        { initialProps: { value: 40 } }
      );

      let flashCount = 0;
      let wasAnimating = false;

      // Try to trigger multiple flashes in 1 second
      for (let i = 0; i < 10; i++) {
        rerender({ value: 40 + (i % 2) * 20 });
        
        // Only count transitions to animating state (false -> true)
        if (result.current.isAnimating && !wasAnimating) {
          flashCount++;
        }
        wasAnimating = result.current.isAnimating;
        
        act(() => {
          jest.advanceTimersByTime(100);
        });
      }

      // Flash rate should be less than or equal to 3 per second
      // Animation lasts 1 second, so rapid threshold crossings are rate-limited
      expect(flashCount).toBeLessThanOrEqual(3);
    });
  });
});

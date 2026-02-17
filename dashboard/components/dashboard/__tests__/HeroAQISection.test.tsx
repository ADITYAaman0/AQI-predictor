/**
 * Unit tests for HeroAQISection component
 * 
 * Tests:
 * - Rendering with different AQI values
 * - Loading state display
 * - Error state display
 * - Location and timestamp formatting
 * - Accessibility attributes
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HeroAQISection, HeroAQISectionProps } from '../HeroAQISection';

// ============================================================================
// Mock Data
// ============================================================================

const mockPropsGood: HeroAQISectionProps = {
  aqi: 45,
  category: 'good',
  categoryLabel: 'Good',
  dominantPollutant: 'pm25',
  color: '#4ADE80',
  healthMessage: 'Great day for outdoor activities',
  location: {
    name: 'Delhi',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
  },
  lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
  isLoading: false,
  error: null,
};

const mockPropsUnhealthy: HeroAQISectionProps = {
  aqi: 175,
  category: 'unhealthy',
  categoryLabel: 'Unhealthy',
  dominantPollutant: 'pm10',
  color: '#EF4444',
  healthMessage: 'Everyone should limit prolonged outdoor exertion',
  location: {
    name: 'Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
  },
  lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  isLoading: false,
  error: null,
};

const mockPropsHazardous: HeroAQISectionProps = {
  aqi: 425,
  category: 'hazardous',
  categoryLabel: 'Hazardous',
  dominantPollutant: 'pm25',
  color: '#7C2D12',
  healthMessage: 'Everyone should avoid outdoor activities',
  location: {
    country: 'India',
  },
  lastUpdated: new Date(Date.now() - 30 * 1000).toISOString(), // 30 seconds ago
  isLoading: false,
  error: null,
};

// ============================================================================
// Tests
// ============================================================================

describe('HeroAQISection', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      expect(screen.getByTestId('hero-aqi-section')).toBeInTheDocument();
    });

    it('displays AQI value correctly', async () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const aqiValue = screen.getByTestId('aqi-meter-value');
      // Wait for animation to complete
      await waitFor(() => {
        expect(aqiValue).toHaveTextContent('45');
      }, { timeout: 2000 });
    });

    it('displays category label correctly', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const categoryLabel = screen.getByTestId('aqi-category');
      expect(categoryLabel).toHaveTextContent('Good');
    });

    it('displays dominant pollutant correctly', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const pollutant = screen.getByTestId('dominant-pollutant');
      expect(pollutant).toHaveTextContent('Primary: PM25');
    });

    it('displays health message correctly', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const healthMessage = screen.getByTestId('health-message');
      expect(healthMessage).toHaveTextContent('Great day for outdoor activities');
    });

    it('displays location name correctly', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const location = screen.getByTestId('current-location');
      expect(location).toHaveTextContent('Delhi');
    });

    it('displays country when no city name is provided', () => {
      render(<HeroAQISection {...mockPropsHazardous} />);
      const location = screen.getByTestId('current-location');
      expect(location).toHaveTextContent('India');
    });
  });

  describe('AQI Categories', () => {
    it('renders good AQI with correct color', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const aqiValue = screen.getByTestId('aqi-meter-value');
      expect(aqiValue).toHaveStyle({ color: '#4ADE80' });
    });

    it('renders unhealthy AQI with correct color', () => {
      render(<HeroAQISection {...mockPropsUnhealthy} />);
      const aqiValue = screen.getByTestId('aqi-meter-value');
      expect(aqiValue).toHaveStyle({ color: '#EF4444' });
    });

    it('renders hazardous AQI with correct color', () => {
      render(<HeroAQISection {...mockPropsHazardous} />);
      const aqiValue = screen.getByTestId('aqi-meter-value');
      expect(aqiValue).toHaveStyle({ color: '#7C2D12' });
    });

    it('rounds AQI value to nearest integer', async () => {
      const props = { ...mockPropsGood, aqi: 45.7 };
      render(<HeroAQISection {...props} />);
      const aqiValue = screen.getByTestId('aqi-meter-value');
      // Wait for animation to complete
      await waitFor(() => {
        expect(aqiValue).toHaveTextContent('46');
      }, { timeout: 2000 });
    });
  });

  describe('Circular Progress Ring', () => {
    it('renders progress ring', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const ring = screen.getByTestId('aqi-meter-progress');
      expect(ring).toBeInTheDocument();
    });

    it('applies gradient stroke to progress ring', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const ring = screen.getByTestId('aqi-meter-progress');
      // Check that it uses a gradient URL
      const stroke = ring.getAttribute('stroke');
      expect(stroke).toMatch(/url\(#aqi-gradient-/);
    });

    it('renders circular meter component', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const meter = screen.getByTestId('circular-aqi-meter');
      expect(meter).toBeInTheDocument();
    });
  });

  describe('Last Updated Timestamp', () => {
    it('displays "Just now" for very recent updates', () => {
      const props = {
        ...mockPropsGood,
        lastUpdated: new Date(Date.now() - 30 * 1000).toISOString(), // 30 seconds ago
      };
      render(<HeroAQISection {...props} />);
      const timestamp = screen.getByTestId('last-updated');
      expect(timestamp).toHaveTextContent('Just now');
    });

    it('displays minutes for recent updates', () => {
      const props = {
        ...mockPropsGood,
        lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      };
      render(<HeroAQISection {...props} />);
      const timestamp = screen.getByTestId('last-updated');
      expect(timestamp).toHaveTextContent('5 min ago');
    });

    it('displays hours for older updates', () => {
      render(<HeroAQISection {...mockPropsUnhealthy} />);
      const timestamp = screen.getByTestId('last-updated');
      expect(timestamp).toHaveTextContent('2 hours ago');
    });

    it('displays days for very old updates', () => {
      const props = {
        ...mockPropsGood,
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      };
      render(<HeroAQISection {...props} />);
      const timestamp = screen.getByTestId('last-updated');
      expect(timestamp).toHaveTextContent('3 days ago');
    });

    it('handles invalid timestamp gracefully', () => {
      const props = {
        ...mockPropsGood,
        lastUpdated: 'invalid-date',
      };
      render(<HeroAQISection {...props} />);
      const timestamp = screen.getByTestId('last-updated');
      expect(timestamp).toHaveTextContent('Unknown');
    });
  });

  describe('Loading State', () => {
    it('displays loading skeleton when isLoading is true', () => {
      const props = { ...mockPropsGood, isLoading: true };
      render(<HeroAQISection {...props} />);
      
      // Should show skeleton loaders
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not display AQI value when loading', () => {
      const props = { ...mockPropsGood, isLoading: true };
      render(<HeroAQISection {...props} />);
      
      expect(screen.queryByTestId('aqi-meter-value')).not.toBeInTheDocument();
    });

    it('does not display category label when loading', () => {
      const props = { ...mockPropsGood, isLoading: true };
      render(<HeroAQISection {...props} />);
      
      expect(screen.queryByTestId('aqi-category')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when error prop is provided', () => {
      const props = {
        ...mockPropsGood,
        error: 'Failed to fetch AQI data. Please try again.',
      };
      render(<HeroAQISection {...props} />);
      
      expect(screen.getByText('Unable to Load AQI Data')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch AQI data. Please try again.')).toBeInTheDocument();
    });

    it('displays error icon when error occurs', () => {
      const props = {
        ...mockPropsGood,
        error: 'Network error',
      };
      render(<HeroAQISection {...props} />);
      
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('does not display AQI value when error occurs', () => {
      const props = {
        ...mockPropsGood,
        error: 'Network error',
      };
      render(<HeroAQISection {...props} />);
      
      expect(screen.queryByTestId('aqi-meter-value')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('includes aria-label for location icon', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const locationIcon = screen.getByLabelText('Location');
      expect(locationIcon).toBeInTheDocument();
    });

    it('includes aria-label for last updated icon', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const timeIcon = screen.getByLabelText('Last updated');
      expect(timeIcon).toBeInTheDocument();
    });

    it('has proper test ids for all key elements', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      
      expect(screen.getByTestId('hero-aqi-section')).toBeInTheDocument();
      expect(screen.getByTestId('aqi-meter-value')).toBeInTheDocument();
      expect(screen.getByTestId('aqi-category')).toBeInTheDocument();
      expect(screen.getByTestId('dominant-pollutant')).toBeInTheDocument();
      expect(screen.getByTestId('health-message')).toBeInTheDocument();
      expect(screen.getByTestId('current-location')).toBeInTheDocument();
      expect(screen.getByTestId('last-updated')).toBeInTheDocument();
      expect(screen.getByTestId('aqi-meter-progress')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies glassmorphic card styling', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const section = screen.getByTestId('hero-aqi-section');
      expect(section).toHaveClass('glass-card');
    });

    it('applies rounded corners', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const section = screen.getByTestId('hero-aqi-section');
      expect(section).toHaveClass('rounded-3xl');
    });

    it('applies padding', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const section = screen.getByTestId('hero-aqi-section');
      expect(section).toHaveClass('p-8');
    });
  });

  describe('Edge Cases', () => {
    it('handles AQI value of 0', () => {
      const props = { ...mockPropsGood, aqi: 0 };
      render(<HeroAQISection {...props} />);
      const aqiValue = screen.getByTestId('aqi-meter-value');
      expect(aqiValue).toHaveTextContent('0');
    });

    it('handles AQI value of 500', async () => {
      const props = { ...mockPropsGood, aqi: 500 };
      render(<HeroAQISection {...props} />);
      const aqiValue = screen.getByTestId('aqi-meter-value');
      // Wait for animation to complete
      await waitFor(() => {
        expect(aqiValue).toHaveTextContent('500');
      }, { timeout: 2000 });
    });

    it('handles missing location name gracefully', () => {
      const props = {
        ...mockPropsGood,
        location: { country: 'India' },
      };
      render(<HeroAQISection {...props} />);
      const location = screen.getByTestId('current-location');
      expect(location).toHaveTextContent('India');
    });

    it('handles empty health message', () => {
      const props = { ...mockPropsGood, healthMessage: '' };
      render(<HeroAQISection {...props} />);
      const healthMessage = screen.getByTestId('health-message');
      expect(healthMessage).toBeInTheDocument();
      expect(healthMessage).toHaveTextContent('');
    });
  });

  describe('Animation Triggers', () => {
    it('triggers animation on CircularAQIMeter when component mounts', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const meter = screen.getByTestId('circular-aqi-meter');
      expect(meter).toBeInTheDocument();
      
      // CircularAQIMeter should be present and will animate
      const aqiValue = screen.getByTestId('aqi-meter-value');
      expect(aqiValue).toBeInTheDocument();
    });

    it('passes animate prop to CircularAQIMeter by default', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const meter = screen.getByTestId('circular-aqi-meter');
      expect(meter).toBeInTheDocument();
      
      // The meter should start with a low value and animate up
      const aqiValue = screen.getByTestId('aqi-meter-value');
      const initialValue = parseInt(aqiValue.textContent || '0');
      
      // Initially should be 0 or very low due to animation
      expect(initialValue).toBeLessThanOrEqual(45);
    });

    it('animates AQI value from 0 to target over 1.5 seconds', async () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const aqiValue = screen.getByTestId('aqi-meter-value');
      
      // Initially should be 0 or close to 0
      const initialValue = parseInt(aqiValue.textContent || '0');
      expect(initialValue).toBeLessThan(10);
      
      // After animation completes, should show target value
      await waitFor(
        () => {
          expect(aqiValue).toHaveTextContent('45');
        },
        { timeout: 2000 }
      );
    });

    it('re-triggers animation when AQI value changes', async () => {
      const { rerender } = render(<HeroAQISection {...mockPropsGood} />);
      
      // Wait for initial animation to complete
      await waitFor(
        () => {
          const aqiValue = screen.getByTestId('aqi-meter-value');
          expect(aqiValue).toHaveTextContent('45');
        },
        { timeout: 2000 }
      );
      
      // Change AQI value
      const newProps = { ...mockPropsGood, aqi: 150 };
      rerender(<HeroAQISection {...newProps} />);
      
      // Should animate to new value
      await waitFor(
        () => {
          const aqiValue = screen.getByTestId('aqi-meter-value');
          expect(aqiValue).toHaveTextContent('150');
        },
        { timeout: 2000 }
      );
    });

    it('applies smooth transition to background gradient changes', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const section = screen.getByTestId('hero-aqi-section');
      
      // Should have transition classes
      expect(section).toHaveClass('transition-all');
      expect(section).toHaveClass('duration-1000');
      expect(section).toHaveClass('ease-in-out');
    });

    it('does not animate when in loading state', () => {
      const props = { ...mockPropsGood, isLoading: true };
      render(<HeroAQISection {...props} />);
      
      // Should not render the meter at all
      expect(screen.queryByTestId('circular-aqi-meter')).not.toBeInTheDocument();
      expect(screen.queryByTestId('aqi-meter-value')).not.toBeInTheDocument();
    });

    it('does not animate when in error state', () => {
      const props = { ...mockPropsGood, error: 'Network error' };
      render(<HeroAQISection {...props} />);
      
      // Should not render the meter at all
      expect(screen.queryByTestId('circular-aqi-meter')).not.toBeInTheDocument();
      expect(screen.queryByTestId('aqi-meter-value')).not.toBeInTheDocument();
    });
  });

  describe('Dynamic Background (Task 5.3)', () => {
    it('applies good gradient background for good AQI', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const section = screen.getByTestId('hero-aqi-section');
      expect(section).toHaveClass('bg-gradient-good');
      expect(section).toHaveAttribute('data-aqi-category', 'good');
    });

    it('applies moderate gradient background for moderate AQI', () => {
      const props = { ...mockPropsGood, category: 'moderate' as const };
      render(<HeroAQISection {...props} />);
      const section = screen.getByTestId('hero-aqi-section');
      expect(section).toHaveClass('bg-gradient-moderate');
      expect(section).toHaveAttribute('data-aqi-category', 'moderate');
    });

    it('applies unhealthy gradient background for unhealthy AQI', () => {
      render(<HeroAQISection {...mockPropsUnhealthy} />);
      const section = screen.getByTestId('hero-aqi-section');
      expect(section).toHaveClass('bg-gradient-unhealthy');
      expect(section).toHaveAttribute('data-aqi-category', 'unhealthy');
    });

    it('applies unhealthy gradient background for unhealthy_sensitive AQI', () => {
      const props = { ...mockPropsGood, category: 'unhealthy_sensitive' as const };
      render(<HeroAQISection {...props} />);
      const section = screen.getByTestId('hero-aqi-section');
      expect(section).toHaveClass('bg-gradient-unhealthy');
      expect(section).toHaveAttribute('data-aqi-category', 'unhealthy_sensitive');
    });

    it('applies very unhealthy gradient background for very unhealthy AQI', () => {
      const props = { ...mockPropsGood, category: 'very_unhealthy' as const };
      render(<HeroAQISection {...props} />);
      const section = screen.getByTestId('hero-aqi-section');
      expect(section).toHaveClass('bg-gradient-very-unhealthy');
      expect(section).toHaveAttribute('data-aqi-category', 'very_unhealthy');
    });

    it('applies hazardous gradient background for hazardous AQI', () => {
      render(<HeroAQISection {...mockPropsHazardous} />);
      const section = screen.getByTestId('hero-aqi-section');
      expect(section).toHaveClass('bg-gradient-hazardous');
      expect(section).toHaveAttribute('data-aqi-category', 'hazardous');
    });

    it('includes smooth transition classes for background changes', () => {
      render(<HeroAQISection {...mockPropsGood} />);
      const section = screen.getByTestId('hero-aqi-section');
      expect(section).toHaveClass('transition-all');
      expect(section).toHaveClass('duration-1000');
      expect(section).toHaveClass('ease-in-out');
    });

    it('includes overlay for better text readability', () => {
      const { container } = render(<HeroAQISection {...mockPropsGood} />);
      const overlay = container.querySelector('.bg-black\\/20');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveAttribute('aria-hidden', 'true');
    });

    it('changes background when AQI category changes', () => {
      const { rerender } = render(<HeroAQISection {...mockPropsGood} />);
      let section = screen.getByTestId('hero-aqi-section');
      expect(section).toHaveClass('bg-gradient-good');

      // Change to unhealthy
      rerender(<HeroAQISection {...mockPropsUnhealthy} />);
      section = screen.getByTestId('hero-aqi-section');
      expect(section).toHaveClass('bg-gradient-unhealthy');
      expect(section).not.toHaveClass('bg-gradient-good');
    });

    it('defaults to good gradient for unknown category', () => {
      const props = { ...mockPropsGood, category: 'unknown' as any };
      render(<HeroAQISection {...props} />);
      const section = screen.getByTestId('hero-aqi-section');
      expect(section).toHaveClass('bg-gradient-good');
    });
  });
});


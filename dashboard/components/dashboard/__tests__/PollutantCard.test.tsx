/**
 * Unit tests for PollutantCard component
 * 
 * Tests:
 * - Rendering with all required elements
 * - Color coding based on AQI sub-index
 * - Progress bar display
 * - Hover interactions
 * - Different pollutant types
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PollutantCard } from '../PollutantCard';
import { PollutantType } from '@/lib/api/types';

describe('PollutantCard', () => {
  const defaultProps = {
    pollutant: 'pm25' as PollutantType,
    value: 85.5,
    unit: 'μg/m³',
    aqi: 120,
    status: 'unhealthy',
  };

  describe('Rendering', () => {
    it('renders with all required elements', () => {
      render(<PollutantCard {...defaultProps} />);

      // Check pollutant name
      expect(screen.getByTestId('pollutant-name')).toHaveTextContent('PM2.5');

      // Check value
      expect(screen.getByTestId('pollutant-value')).toHaveTextContent('85.5');

      // Check unit
      expect(screen.getByTestId('pollutant-unit')).toHaveTextContent('μg/m³');

      // Check status
      expect(screen.getByTestId('pollutant-status')).toHaveTextContent('Unhealthy');

      // Check progress bar
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays correct pollutant names for different types', () => {
      const pollutants: Array<{ type: PollutantType; name: string }> = [
        { type: 'pm25', name: 'PM2.5' },
        { type: 'pm10', name: 'PM10' },
        { type: 'o3', name: 'O₃' },
        { type: 'no2', name: 'NO₂' },
        { type: 'so2', name: 'SO₂' },
        { type: 'co', name: 'CO' },
      ];

      pollutants.forEach(({ type, name }) => {
        const { rerender } = render(
          <PollutantCard {...defaultProps} pollutant={type} />
        );
        expect(screen.getByTestId('pollutant-name')).toHaveTextContent(name);
        rerender(<div />); // Clean up
      });
    });

    it('formats value to one decimal place', () => {
      render(<PollutantCard {...defaultProps} value={123.456} />);
      expect(screen.getByTestId('pollutant-value')).toHaveTextContent('123.5');
    });
  });

  describe('Color Coding', () => {
    it('applies good color for AQI 0-50', () => {
      const { container } = render(
        <PollutantCard {...defaultProps} aqi={30} status="good" />
      );
      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#4ADE80' });
    });

    it('applies moderate color for AQI 51-100', () => {
      const { container } = render(
        <PollutantCard {...defaultProps} aqi={75} status="moderate" />
      );
      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#FCD34D' });
    });

    it('applies unhealthy color for AQI 101-150', () => {
      const { container } = render(
        <PollutantCard {...defaultProps} aqi={120} status="unhealthy" />
      );
      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#FB923C' });
    });

    it('applies very unhealthy color for AQI 151-200', () => {
      const { container } = render(
        <PollutantCard {...defaultProps} aqi={175} status="very_unhealthy" />
      );
      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#EF4444' });
    });

    it('applies hazardous color for AQI 201+', () => {
      const { container } = render(
        <PollutantCard {...defaultProps} aqi={350} status="hazardous" />
      );
      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderColor: '#7C2D12' });
    });
  });

  describe('Progress Bar', () => {
    it('displays progress bar with correct percentage', async () => {
      render(<PollutantCard {...defaultProps} percentage={65} />);
      const progressBar = screen.getByTestId('progress-bar-fill');
      
      // Wait for animation to complete
      await waitFor(() => {
        expect(progressBar).toHaveStyle({ width: '65%' });
      }, { timeout: 200 });
    });

    it('animates progress bar on mount', async () => {
      const { container } = render(<PollutantCard {...defaultProps} percentage={75} />);
      const progressBar = screen.getByTestId('progress-bar-fill');
      
      // Initially should be at 0%
      expect(progressBar).toHaveStyle({ width: '0%' });
      
      // Check that progress bar has transition class
      expect(progressBar).toHaveClass('transition-all');
      expect(progressBar).toHaveClass('duration-1000');
      expect(progressBar).toHaveClass('ease-out');
      
      // Wait for animation to complete
      await waitFor(() => {
        expect(progressBar).toHaveStyle({ width: '75%' });
      }, { timeout: 200 });
    });

    it('has 8px height as per requirements', () => {
      render(<PollutantCard {...defaultProps} />);
      const progressBarContainer = screen.getByRole('progressbar');
      expect(progressBarContainer).toHaveStyle({ height: '8px' });
    });

    it('has gradient fill matching pollutant severity', () => {
      render(<PollutantCard {...defaultProps} aqi={120} />);
      const progressBar = screen.getByTestId('progress-bar-fill');
      
      // Check that background is a gradient (contains 'linear-gradient')
      expect(progressBar.style.background).toContain('linear-gradient');
    });

    it('calculates percentage from AQI when not provided', async () => {
      render(<PollutantCard {...defaultProps} aqi={250} />);
      const progressBar = screen.getByTestId('progress-bar-fill');
      
      // Wait for animation to complete
      // 250/500 * 100 = 50%
      await waitFor(() => {
        expect(progressBar).toHaveStyle({ width: '50%' });
      }, { timeout: 200 });
    });

    it('caps percentage at 100%', async () => {
      render(<PollutantCard {...defaultProps} aqi={600} />);
      const progressBar = screen.getByTestId('progress-bar-fill');
      
      // Wait for animation to complete
      await waitFor(() => {
        expect(progressBar).toHaveStyle({ width: '100%' });
      }, { timeout: 200 });
    });

    it('has proper ARIA attributes', async () => {
      render(<PollutantCard {...defaultProps} percentage={75} />);
      const progressBar = screen.getByRole('progressbar');
      
      // Wait for animation to complete
      await waitFor(() => {
        expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      }, { timeout: 200 });
      
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Status Display', () => {
    it('formats status labels correctly', () => {
      const statuses = [
        { input: 'good', expected: 'Good' },
        { input: 'moderate', expected: 'Moderate' },
        { input: 'unhealthy_sensitive', expected: 'Unhealthy for Sensitive' },
        { input: 'unhealthy', expected: 'Unhealthy' },
        { input: 'very_unhealthy', expected: 'Very Unhealthy' },
        { input: 'hazardous', expected: 'Hazardous' },
      ];

      statuses.forEach(({ input, expected }) => {
        const { rerender } = render(
          <PollutantCard {...defaultProps} status={input} />
        );
        expect(screen.getByTestId('pollutant-status')).toHaveTextContent(expected);
        rerender(<div />);
      });
    });
  });

  describe('Hover Interactions', () => {
    it('shows tooltip on hover', () => {
      render(<PollutantCard {...defaultProps} />);
      
      const card = screen.getByTestId('pollutant-card-pm25');
      
      // Tooltip should not be visible initially
      expect(screen.queryByTestId('pollutant-tooltip')).not.toBeInTheDocument();
      
      // Hover over card
      fireEvent.mouseEnter(card);
      
      // Tooltip should now be visible
      expect(screen.getByTestId('pollutant-tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('pollutant-tooltip')).toHaveTextContent('PM2.5');
      expect(screen.getByTestId('pollutant-tooltip')).toHaveTextContent('Value: 85.50 μg/m³');
      expect(screen.getByTestId('pollutant-tooltip')).toHaveTextContent('AQI: 120');
    });

    it('hides tooltip on mouse leave', () => {
      render(<PollutantCard {...defaultProps} />);
      
      const card = screen.getByTestId('pollutant-card-pm25');
      
      // Hover over card
      fireEvent.mouseEnter(card);
      expect(screen.getByTestId('pollutant-tooltip')).toBeInTheDocument();
      
      // Mouse leave
      fireEvent.mouseLeave(card);
      expect(screen.queryByTestId('pollutant-tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has glassmorphic card styling', () => {
      const { container } = render(<PollutantCard {...defaultProps} />);
      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveClass('glass-card');
    });

    it('has hover lift effect class', () => {
      const { container } = render(<PollutantCard {...defaultProps} />);
      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveClass('hover-lift');
    });

    it('has correct dimensions', () => {
      const { container } = render(<PollutantCard {...defaultProps} />);
      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ width: '200px', height: '180px' });
    });

    it('has correct border width', () => {
      const { container } = render(<PollutantCard {...defaultProps} />);
      const card = container.querySelector('.pollutant-card');
      expect(card).toHaveStyle({ borderWidth: '2px' });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA role', () => {
      render(<PollutantCard {...defaultProps} />);
      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
    });

    it('has proper ARIA label', () => {
      render(<PollutantCard {...defaultProps} />);
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', 'PM2.5 pollutant card');
    });

    it('has proper data attributes for testing', () => {
      render(<PollutantCard {...defaultProps} />);
      const card = screen.getByTestId('pollutant-card-pm25');
      expect(card).toHaveAttribute('data-pollutant', 'pm25');
      expect(card).toHaveAttribute('data-aqi', '120');
    });
  });

  describe('Custom Icon', () => {
    it('renders custom icon when provided', () => {
      const customIcon = <div data-testid="custom-icon">Custom</div>;
      render(<PollutantCard {...defaultProps} icon={customIcon} />);
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('renders default icon when not provided', () => {
      const { container } = render(<PollutantCard {...defaultProps} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });
});

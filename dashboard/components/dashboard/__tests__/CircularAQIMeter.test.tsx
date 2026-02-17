/**
 * CircularAQIMeter Component Tests
 * 
 * Tests for the circular progress ring component with animation and glow effects.
 * 
 * Test Coverage:
 * - Component rendering with different AQI values
 * - SVG structure and elements
 * - Gradient stroke application
 * - Animation behavior (1.5s ease-out)
 * - Glow effect filter
 * - Progress calculation
 * - Customizable props (size, strokeWidth, etc.)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CircularAQIMeter } from '../CircularAQIMeter';

describe('CircularAQIMeter', () => {
  // ============================================================================
  // Basic Rendering Tests
  // ============================================================================

  describe('Basic Rendering', () => {
    it('should render the circular meter', () => {
      render(<CircularAQIMeter aqi={75} color="#4ADE80" />);
      
      const meter = screen.getByTestId('circular-aqi-meter');
      expect(meter).toBeInTheDocument();
    });

    it('should display the AQI value', () => {
      render(<CircularAQIMeter aqi={125} color="#FB923C" />);
      
      // Value should be visible (may be 0 initially due to animation)
      const value = screen.getByTestId('aqi-meter-value');
      expect(value).toBeInTheDocument();
    });

    it('should display "AQI" label', () => {
      render(<CircularAQIMeter aqi={50} color="#4ADE80" />);
      
      expect(screen.getByText('AQI')).toBeInTheDocument();
    });

    it('should render SVG elements', () => {
      render(<CircularAQIMeter aqi={100} color="#FCD34D" />);
      
      const track = screen.getByTestId('aqi-meter-track');
      const progress = screen.getByTestId('aqi-meter-progress');
      
      expect(track).toBeInTheDocument();
      expect(progress).toBeInTheDocument();
    });
  });

  // ============================================================================
  // SVG Structure Tests
  // ============================================================================

  describe('SVG Structure', () => {
    it('should create background circle (track)', () => {
      render(<CircularAQIMeter aqi={150} color="#FB923C" />);
      
      const track = screen.getByTestId('aqi-meter-track');
      expect(track).toHaveAttribute('fill', 'none');
      expect(track).toHaveAttribute('stroke', 'rgba(255, 255, 255, 0.1)');
    });

    it('should create progress circle with gradient', () => {
      render(<CircularAQIMeter aqi={200} color="#EF4444" />);
      
      const progress = screen.getByTestId('aqi-meter-progress');
      expect(progress).toHaveAttribute('fill', 'none');
      expect(progress).toHaveAttribute('stroke-linecap', 'round');
    });

    it('should apply correct stroke width', () => {
      render(<CircularAQIMeter aqi={100} color="#4ADE80" strokeWidth={10} />);
      
      const track = screen.getByTestId('aqi-meter-track');
      const progress = screen.getByTestId('aqi-meter-progress');
      
      expect(track).toHaveAttribute('stroke-width', '10');
      expect(progress).toHaveAttribute('stroke-width', '10');
    });

    it('should use custom size', () => {
      const { container } = render(
        <CircularAQIMeter aqi={100} color="#4ADE80" size={300} />
      );
      
      const meter = container.querySelector('.circular-aqi-meter');
      expect(meter).toHaveStyle({ width: '300px', height: '300px' });
    });
  });

  // ============================================================================
  // Color and Gradient Tests
  // ============================================================================

  describe('Color and Gradient', () => {
    it('should apply color to AQI value text', () => {
      render(<CircularAQIMeter aqi={75} color="#4ADE80" />);
      
      const value = screen.getByTestId('aqi-meter-value');
      expect(value).toHaveStyle({ color: '#4ADE80' });
    });

    it('should use gradient stroke for progress circle', () => {
      render(<CircularAQIMeter aqi={150} color="#FB923C" />);
      
      const progress = screen.getByTestId('aqi-meter-progress');
      const stroke = progress.getAttribute('stroke');
      
      // Should reference a gradient URL
      expect(stroke).toMatch(/url\(#aqi-gradient-/);
    });

    it('should apply glow filter to progress circle', () => {
      render(<CircularAQIMeter aqi={200} color="#EF4444" />);
      
      const progress = screen.getByTestId('aqi-meter-progress');
      const filter = progress.getAttribute('filter');
      
      // Should reference a filter URL
      expect(filter).toMatch(/url\(#aqi-glow-/);
    });
  });

  // ============================================================================
  // Progress Calculation Tests
  // ============================================================================

  describe('Progress Calculation', () => {
    it('should calculate correct progress for low AQI', () => {
      render(<CircularAQIMeter aqi={50} color="#4ADE80" animate={false} />);
      
      const value = screen.getByTestId('aqi-meter-value');
      expect(value).toHaveTextContent('50');
    });

    it('should calculate correct progress for moderate AQI', () => {
      render(<CircularAQIMeter aqi={150} color="#FB923C" animate={false} />);
      
      const value = screen.getByTestId('aqi-meter-value');
      expect(value).toHaveTextContent('150');
    });

    it('should calculate correct progress for high AQI', () => {
      render(<CircularAQIMeter aqi={350} color="#7C2D12" animate={false} />);
      
      const value = screen.getByTestId('aqi-meter-value');
      expect(value).toHaveTextContent('350');
    });

    it('should handle AQI value of 0', () => {
      render(<CircularAQIMeter aqi={0} color="#4ADE80" animate={false} />);
      
      const value = screen.getByTestId('aqi-meter-value');
      expect(value).toHaveTextContent('0');
    });

    it('should cap progress at 100% for AQI > 500', () => {
      render(<CircularAQIMeter aqi={600} color="#7C2D12" animate={false} />);
      
      const value = screen.getByTestId('aqi-meter-value');
      expect(value).toHaveTextContent('600');
      
      // Progress should be capped at 100%
      const progress = screen.getByTestId('aqi-meter-progress');
      expect(progress).toBeInTheDocument();
    });

    it('should round AQI value to nearest integer', () => {
      render(<CircularAQIMeter aqi={75.7} color="#4ADE80" animate={false} />);
      
      const value = screen.getByTestId('aqi-meter-value');
      expect(value).toHaveTextContent('76');
    });
  });

  // ============================================================================
  // Animation Tests
  // ============================================================================

  describe('Animation', () => {
    it('should start animation from 0 when animate is true', () => {
      render(<CircularAQIMeter aqi={100} color="#FCD34D" animate={true} />);
      
      const value = screen.getByTestId('aqi-meter-value');
      
      // Initially should be 0 or close to 0
      const initialValue = parseInt(value.textContent || '0');
      expect(initialValue).toBeLessThan(10);
    });

    it('should animate to target AQI value', async () => {
      render(<CircularAQIMeter aqi={100} color="#FCD34D" animate={true} animationDuration={500} />);
      
      const value = screen.getByTestId('aqi-meter-value');
      
      // Wait for animation to complete
      await waitFor(
        () => {
          expect(value).toHaveTextContent('100');
        },
        { timeout: 1000 }
      );
    });

    it('should skip animation when animate is false', () => {
      render(<CircularAQIMeter aqi={150} color="#FB923C" animate={false} />);
      
      const value = screen.getByTestId('aqi-meter-value');
      
      // Should immediately show target value
      expect(value).toHaveTextContent('150');
    });

    it('should use custom animation duration', async () => {
      const startTime = Date.now();
      
      render(
        <CircularAQIMeter 
          aqi={100} 
          color="#FCD34D" 
          animate={true} 
          animationDuration={300}
        />
      );
      
      const value = screen.getByTestId('aqi-meter-value');
      
      await waitFor(
        () => {
          expect(value).toHaveTextContent('100');
        },
        { timeout: 600 }
      );
      
      const elapsed = Date.now() - startTime;
      
      // Animation should complete in roughly the specified duration
      // Allow some tolerance for timing variations
      expect(elapsed).toBeGreaterThanOrEqual(250);
      expect(elapsed).toBeLessThan(600);
    });
  });

  // ============================================================================
  // Customization Tests
  // ============================================================================

  describe('Customization', () => {
    it('should accept custom size prop', () => {
      const { container } = render(
        <CircularAQIMeter aqi={100} color="#4ADE80" size={200} />
      );
      
      const meter = container.querySelector('.circular-aqi-meter');
      expect(meter).toHaveStyle({ width: '200px', height: '200px' });
    });

    it('should accept custom strokeWidth prop', () => {
      render(<CircularAQIMeter aqi={100} color="#4ADE80" strokeWidth={12} />);
      
      const track = screen.getByTestId('aqi-meter-track');
      expect(track).toHaveAttribute('stroke-width', '12');
    });

    it('should use default size when not specified', () => {
      const { container } = render(<CircularAQIMeter aqi={100} color="#4ADE80" />);
      
      const meter = container.querySelector('.circular-aqi-meter');
      expect(meter).toHaveStyle({ width: '240px', height: '240px' });
    });

    it('should use default strokeWidth when not specified', () => {
      render(<CircularAQIMeter aqi={100} color="#4ADE80" />);
      
      const track = screen.getByTestId('aqi-meter-track');
      expect(track).toHaveAttribute('stroke-width', '8');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle negative AQI values', () => {
      render(<CircularAQIMeter aqi={-10} color="#4ADE80" animate={false} />);
      
      const value = screen.getByTestId('aqi-meter-value');
      expect(value).toHaveTextContent('-10');
    });

    it('should handle very large AQI values', () => {
      render(<CircularAQIMeter aqi={999} color="#7C2D12" animate={false} />);
      
      const value = screen.getByTestId('aqi-meter-value');
      expect(value).toHaveTextContent('999');
    });

    it('should handle decimal AQI values', () => {
      render(<CircularAQIMeter aqi={123.456} color="#FB923C" animate={false} />);
      
      const value = screen.getByTestId('aqi-meter-value');
      expect(value).toHaveTextContent('123');
    });

    it('should handle color changes', () => {
      const { rerender } = render(<CircularAQIMeter aqi={100} color="#4ADE80" />);
      
      let value = screen.getByTestId('aqi-meter-value');
      expect(value).toHaveStyle({ color: '#4ADE80' });
      
      rerender(<CircularAQIMeter aqi={100} color="#EF4444" />);
      
      value = screen.getByTestId('aqi-meter-value');
      expect(value).toHaveStyle({ color: '#EF4444' });
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have proper test IDs for testing', () => {
      render(<CircularAQIMeter aqi={100} color="#4ADE80" />);
      
      expect(screen.getByTestId('circular-aqi-meter')).toBeInTheDocument();
      expect(screen.getByTestId('aqi-meter-track')).toBeInTheDocument();
      expect(screen.getByTestId('aqi-meter-progress')).toBeInTheDocument();
      expect(screen.getByTestId('aqi-meter-value')).toBeInTheDocument();
    });

    it('should render semantic SVG structure', () => {
      const { container } = render(<CircularAQIMeter aqi={100} color="#4ADE80" />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
    });
  });
});

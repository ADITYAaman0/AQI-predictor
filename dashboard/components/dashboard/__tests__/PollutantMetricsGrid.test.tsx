/**
 * Unit Tests for PollutantMetricsGrid Component
 * 
 * Tests:
 * - Renders all pollutant cards
 * - Applies responsive grid layout
 * - Handles different viewport sizes
 * - Proper accessibility attributes
 * 
 * Requirements: 3.7, 7.2
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PollutantMetricsGrid } from '../PollutantMetricsGrid';
import { PollutantCardProps } from '../PollutantCard';

// ============================================================================
// Mock Data
// ============================================================================

const mockPollutants: PollutantCardProps[] = [
  {
    pollutant: 'pm25',
    value: 45.2,
    unit: 'μg/m³',
    aqi: 120,
    status: 'unhealthy',
    percentage: 75,
  },
  {
    pollutant: 'pm10',
    value: 85.5,
    unit: 'μg/m³',
    aqi: 95,
    status: 'moderate',
    percentage: 60,
  },
  {
    pollutant: 'o3',
    value: 65.0,
    unit: 'μg/m³',
    aqi: 80,
    status: 'moderate',
    percentage: 50,
  },
  {
    pollutant: 'no2',
    value: 35.0,
    unit: 'μg/m³',
    aqi: 45,
    status: 'good',
    percentage: 30,
  },
  {
    pollutant: 'so2',
    value: 15.0,
    unit: 'μg/m³',
    aqi: 25,
    status: 'good',
    percentage: 20,
  },
  {
    pollutant: 'co',
    value: 1.2,
    unit: 'mg/m³',
    aqi: 30,
    status: 'good',
    percentage: 25,
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('PollutantMetricsGrid', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      expect(screen.getByTestId('pollutant-metrics-grid')).toBeInTheDocument();
    });

    it('renders all pollutant cards', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      
      // Check that all 6 pollutant cards are rendered
      expect(screen.getByTestId('pollutant-card-pm25')).toBeInTheDocument();
      expect(screen.getByTestId('pollutant-card-pm10')).toBeInTheDocument();
      expect(screen.getByTestId('pollutant-card-o3')).toBeInTheDocument();
      expect(screen.getByTestId('pollutant-card-no2')).toBeInTheDocument();
      expect(screen.getByTestId('pollutant-card-so2')).toBeInTheDocument();
      expect(screen.getByTestId('pollutant-card-co')).toBeInTheDocument();
    });

    it('renders correct number of cards', () => {
      const { container } = render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      const cards = container.querySelectorAll('[data-testid^="pollutant-card-"]');
      expect(cards).toHaveLength(6);
    });

    it('handles empty pollutants array', () => {
      render(<PollutantMetricsGrid pollutants={[]} />);
      const grid = screen.getByTestId('pollutant-metrics-grid');
      expect(grid).toBeInTheDocument();
      
      const { container } = render(<PollutantMetricsGrid pollutants={[]} />);
      const cards = container.querySelectorAll('[data-testid^="pollutant-card-"]');
      expect(cards).toHaveLength(0);
    });

    it('handles single pollutant', () => {
      const singlePollutant = [mockPollutants[0]];
      render(<PollutantMetricsGrid pollutants={singlePollutant} />);
      
      const { container } = render(<PollutantMetricsGrid pollutants={singlePollutant} />);
      const cards = container.querySelectorAll('[data-testid^="pollutant-card-"]');
      expect(cards).toHaveLength(1);
    });
  });

  describe('Grid Layout', () => {
    it('applies grid layout class', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      const gridContainer = screen.getByTestId('pollutant-grid-container');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass('grid');
    });

    it('applies gap spacing', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      const gridContainer = screen.getByTestId('pollutant-grid-container');
      expect(gridContainer).toHaveClass('gap-4');
    });

    it('applies full width', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      const gridContainer = screen.getByTestId('pollutant-grid-container');
      expect(gridContainer).toHaveClass('w-full');
    });

    it('has responsive grid classes', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      const gridContainer = screen.getByTestId('pollutant-grid-container');
      
      // Mobile: 1 column
      expect(gridContainer).toHaveClass('grid-cols-1');
      
      // Tablet: 2 columns (md breakpoint)
      expect(gridContainer).toHaveClass('md:grid-cols-2');
      
      // Desktop: 3 columns (lg breakpoint)
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });

    it('centers items in grid', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      const gridContainer = screen.getByTestId('pollutant-grid-container');
      expect(gridContainer).toHaveClass('justify-items-center');
    });
  });

  describe('Accessibility', () => {
    it('has region role', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      const grid = screen.getByRole('region');
      expect(grid).toBeInTheDocument();
    });

    it('has aria-label', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      const grid = screen.getByRole('region');
      expect(grid).toHaveAttribute('aria-label', 'Pollutant metrics');
    });

    it('all cards have proper accessibility attributes', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      
      // Each card should have article role
      const cards = screen.getAllByRole('article');
      expect(cards).toHaveLength(6);
      
      // Each card should have aria-label
      cards.forEach(card => {
        expect(card).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} className="custom-class" />);
      const grid = screen.getByTestId('pollutant-metrics-grid');
      expect(grid).toHaveClass('custom-class');
    });

    it('maintains default className with custom className', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} className="custom-class" />);
      const grid = screen.getByTestId('pollutant-metrics-grid');
      expect(grid).toHaveClass('pollutant-metrics-grid');
      expect(grid).toHaveClass('custom-class');
    });
  });

  describe('Card Data Passing', () => {
    it('passes correct props to each card', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      
      // Check PM2.5 card
      const pm25Card = screen.getByTestId('pollutant-card-pm25');
      expect(pm25Card).toHaveAttribute('data-pollutant', 'pm25');
      expect(pm25Card).toHaveAttribute('data-aqi', '120');
      
      // Check CO card
      const coCard = screen.getByTestId('pollutant-card-co');
      expect(coCard).toHaveAttribute('data-pollutant', 'co');
      expect(coCard).toHaveAttribute('data-aqi', '30');
    });

    it('renders cards with correct values', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      
      // Check that values are displayed
      expect(screen.getByText('45.2')).toBeInTheDocument(); // PM2.5
      expect(screen.getByText('85.5')).toBeInTheDocument(); // PM10
      expect(screen.getByText('65.0')).toBeInTheDocument(); // O3
      expect(screen.getByText('35.0')).toBeInTheDocument(); // NO2
      expect(screen.getByText('15.0')).toBeInTheDocument(); // SO2
      expect(screen.getByText('1.2')).toBeInTheDocument();  // CO
    });
  });

  describe('Responsive Behavior', () => {
    // Note: These tests verify that responsive classes are present
    // Actual responsive behavior would be tested in E2E tests with viewport changes
    
    it('includes mobile responsive classes', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      const gridContainer = screen.getByTestId('pollutant-grid-container');
      
      // Mobile: 1 column, centered, max-width
      expect(gridContainer).toHaveClass('grid-cols-1');
      expect(gridContainer).toHaveClass('max-w-[200px]');
      expect(gridContainer).toHaveClass('mx-auto');
    });

    it('includes tablet responsive classes', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      const gridContainer = screen.getByTestId('pollutant-grid-container');
      
      // Tablet: 2 columns (md breakpoint)
      expect(gridContainer).toHaveClass('md:grid-cols-2');
      expect(gridContainer).toHaveClass('md:max-w-none');
      expect(gridContainer).toHaveClass('md:justify-center');
    });

    it('includes desktop responsive classes', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      const gridContainer = screen.getByTestId('pollutant-grid-container');
      
      // Desktop: 3 columns (lg breakpoint)
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });

    it('has all responsive breakpoint classes', () => {
      render(<PollutantMetricsGrid pollutants={mockPollutants} />);
      const gridContainer = screen.getByTestId('pollutant-grid-container');
      
      const classes = gridContainer.className;
      
      // Verify all breakpoints are present
      expect(classes).toContain('grid-cols-1'); // Mobile
      expect(classes).toContain('md:grid-cols-2'); // Tablet
      expect(classes).toContain('lg:grid-cols-3'); // Desktop
    });
  });

  describe('Edge Cases', () => {
    it('handles duplicate pollutant types', () => {
      const duplicatePollutants = [
        mockPollutants[0],
        mockPollutants[0], // Duplicate PM2.5
      ];
      
      const { container } = render(<PollutantMetricsGrid pollutants={duplicatePollutants} />);
      const cards = container.querySelectorAll('[data-testid^="pollutant-card-"]');
      expect(cards).toHaveLength(2);
    });

    it('handles pollutants with missing optional props', () => {
      const minimalPollutants: PollutantCardProps[] = [
        {
          pollutant: 'pm25',
          value: 45.2,
          unit: 'μg/m³',
          aqi: 120,
          status: 'unhealthy',
          // No icon or percentage
        },
      ];
      
      render(<PollutantMetricsGrid pollutants={minimalPollutants} />);
      expect(screen.getByTestId('pollutant-card-pm25')).toBeInTheDocument();
    });

    it('handles very large number of pollutants', () => {
      const manyPollutants = Array(20).fill(null).map((_, i) => ({
        ...mockPollutants[i % 6],
        pollutant: `pm25` as const,
      }));
      
      const { container } = render(<PollutantMetricsGrid pollutants={manyPollutants} />);
      const cards = container.querySelectorAll('[data-testid^="pollutant-card-"]');
      expect(cards).toHaveLength(20);
    });
  });
});

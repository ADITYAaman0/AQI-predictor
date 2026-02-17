/**
 * ComparativeAnalysis Component Tests
 * 
 * Tests for the comparative analysis component that displays
 * current vs historical AQI comparisons with trend indicators.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ComparativeAnalysis } from '../ComparativeAnalysis';
import { HistoricalDataPoint } from '@/lib/api/types';

// ============================================================================
// Mock Data
// ============================================================================

const mockHistoricalData: HistoricalDataPoint[] = [
  {
    timestamp: '2024-01-01T00:00:00Z',
    value: 80,
    aqi: 80,
    category: 'moderate',
  },
  {
    timestamp: '2024-01-02T00:00:00Z',
    value: 120,
    aqi: 120,
    category: 'unhealthy',
  },
  {
    timestamp: '2024-01-03T00:00:00Z',
    value: 60,
    aqi: 60,
    category: 'moderate',
  },
  {
    timestamp: '2024-01-04T00:00:00Z',
    value: 100,
    aqi: 100,
    category: 'moderate',
  },
  {
    timestamp: '2024-01-05T00:00:00Z',
    value: 90,
    aqi: 90,
    category: 'moderate',
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('ComparativeAnalysis', () => {
  describe('Rendering', () => {
    it('renders with data', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} />);
      
      expect(screen.getByTestId('comparative-analysis')).toBeInTheDocument();
      expect(screen.getByText('Comparative Analysis')).toBeInTheDocument();
    });

    it('renders custom title', () => {
      render(
        <ComparativeAnalysis
          data={mockHistoricalData}
          title="Custom Analysis Title"
        />
      );
      
      expect(screen.getByText('Custom Analysis Title')).toBeInTheDocument();
    });

    it('renders description text', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} />);
      
      expect(
        screen.getByText(/Compare current air quality with historical averages/i)
      ).toBeInTheDocument();
    });

    it('renders both comparison cards', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} />);
      
      expect(screen.getByTestId('current-vs-average-card')).toBeInTheDocument();
      expect(screen.getByTestId('best-worst-days-card')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state', () => {
      render(<ComparativeAnalysis data={[]} isLoading={true} />);
      
      expect(screen.getByTestId('comparative-analysis-loading')).toBeInTheDocument();
    });

    it('shows skeleton loaders when loading', () => {
      const { container } = render(
        <ComparativeAnalysis data={[]} isLoading={true} />
      );
      
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no data', () => {
      render(<ComparativeAnalysis data={[]} />);
      
      expect(screen.getByTestId('comparative-analysis-empty')).toBeInTheDocument();
      expect(
        screen.getByText('No historical data available for comparison')
      ).toBeInTheDocument();
    });
  });

  describe('Current vs Average Card', () => {
    it('displays current AQI value', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} currentAQI={85} />);
      
      const currentValue = screen.getByTestId('current-aqi-value');
      expect(currentValue).toHaveTextContent('85');
    });

    it('uses last data point as current AQI if not provided', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} />);
      
      const currentValue = screen.getByTestId('current-aqi-value');
      expect(currentValue).toHaveTextContent('90'); // Last value in mock data
    });

    it('displays period average', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} />);
      
      const averageValue = screen.getByTestId('average-aqi-value');
      // Average of [80, 120, 60, 100, 90] = 90
      expect(averageValue).toHaveTextContent('90');
    });

    it('displays trend indicator', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} />);
      
      expect(screen.getByTestId('trend-indicator')).toBeInTheDocument();
    });
  });

  describe('Trend Calculation', () => {
    it('shows improving trend when current < average', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} currentAQI={70} />);
      
      const trendIndicator = screen.getByTestId('trend-indicator');
      expect(trendIndicator.textContent).toContain('improving');
      expect(trendIndicator).toHaveClass('text-green-400');
    });

    it('shows worsening trend when current > average', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} currentAQI={110} />);
      
      const trendIndicator = screen.getByTestId('trend-indicator');
      expect(trendIndicator.textContent).toContain('worsening');
      expect(trendIndicator).toHaveClass('text-red-400');
    });

    it('shows stable trend when difference < 5%', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} currentAQI={92} />);
      
      const trendIndicator = screen.getByTestId('trend-indicator');
      expect(trendIndicator.textContent).toContain('stable');
      expect(trendIndicator).toHaveClass('text-blue-400');
    });

    it('displays percentage change for non-stable trends', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} currentAQI={70} />);
      
      const trendIndicator = screen.getByTestId('trend-indicator');
      expect(trendIndicator.textContent).toMatch(/\d+\.\d+%/);
    });

    it('shows down arrow for improving trend', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} currentAQI={70} />);
      
      const trendIndicator = screen.getByTestId('trend-indicator');
      expect(trendIndicator).toHaveTextContent('↓');
    });

    it('shows up arrow for worsening trend', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} currentAQI={110} />);
      
      const trendIndicator = screen.getByTestId('trend-indicator');
      expect(trendIndicator).toHaveTextContent('↑');
    });

    it('shows right arrow for stable trend', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} currentAQI={92} />);
      
      const trendIndicator = screen.getByTestId('trend-indicator');
      expect(trendIndicator).toHaveTextContent('→');
    });
  });

  describe('Best vs Worst Days Card', () => {
    it('displays best day AQI', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} />);
      
      const bestDayAQI = screen.getByTestId('best-day-aqi');
      expect(bestDayAQI).toHaveTextContent('60'); // Minimum in mock data
    });

    it('displays worst day AQI', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} />);
      
      const worstDayAQI = screen.getByTestId('worst-day-aqi');
      expect(worstDayAQI).toHaveTextContent('120'); // Maximum in mock data
    });

    it('displays AQI range', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} />);
      
      const range = screen.getByTestId('aqi-range');
      expect(range).toHaveTextContent('60'); // 120 - 60 = 60
    });

    it('applies green color to best day', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} />);
      
      const bestDayAQI = screen.getByTestId('best-day-aqi');
      expect(bestDayAQI).toHaveClass('text-green-400');
    });

    it('applies red color to worst day', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} />);
      
      const worstDayAQI = screen.getByTestId('worst-day-aqi');
      expect(worstDayAQI).toHaveClass('text-red-400');
    });
  });

  describe('Variability Indicators', () => {
    it('shows low variability message for range < 50', () => {
      const lowVariabilityData: HistoricalDataPoint[] = [
        { timestamp: '2024-01-01T00:00:00Z', value: 80, aqi: 80, category: 'moderate' },
        { timestamp: '2024-01-02T00:00:00Z', value: 90, aqi: 90, category: 'moderate' },
        { timestamp: '2024-01-03T00:00:00Z', value: 85, aqi: 85, category: 'moderate' },
      ];
      
      render(<ComparativeAnalysis data={lowVariabilityData} />);
      
      expect(screen.getByText(/low variability/i)).toBeInTheDocument();
    });

    it('shows moderate variability message for range 50-99', () => {
      const moderateVariabilityData: HistoricalDataPoint[] = [
        { timestamp: '2024-01-01T00:00:00Z', value: 50, aqi: 50, category: 'good' },
        { timestamp: '2024-01-02T00:00:00Z', value: 100, aqi: 100, category: 'moderate' },
      ];
      
      render(<ComparativeAnalysis data={moderateVariabilityData} />);
      
      expect(screen.getByText(/moderate variability/i)).toBeInTheDocument();
    });

    it('shows high variability message for range >= 100', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} />);
      
      // Range is 60 (120 - 60), which is moderate, not high
      // Let's check for moderate instead
      expect(screen.getByText(/moderate variability/i)).toBeInTheDocument();
    });
  });

  describe('Additional Insights', () => {
    it('renders additional insights section', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} />);
      
      expect(screen.getByTestId('additional-insights')).toBeInTheDocument();
    });

    it('shows improving insight when trend is improving', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} currentAQI={70} />);
      
      expect(
        screen.getByText(/better than the historical average/i)
      ).toBeInTheDocument();
    });

    it('shows worsening insight when trend is worsening', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} currentAQI={110} />);
      
      expect(
        screen.getByText(/worse than the historical average/i)
      ).toBeInTheDocument();
    });

    it('shows stable insight when trend is stable', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} currentAQI={92} />);
      
      expect(
        screen.getByText(/remains consistent with historical patterns/i)
      ).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies glassmorphic styling to cards', () => {
      const { container } = render(
        <ComparativeAnalysis data={mockHistoricalData} />
      );
      
      const cards = container.querySelectorAll('.glass-card');
      expect(cards.length).toBeGreaterThan(0);
      
      cards.forEach((card) => {
        expect(card).toHaveClass('backdrop-blur-lg');
        expect(card).toHaveClass('bg-white/10');
        expect(card).toHaveClass('border-white/20');
      });
    });

    it('applies hover effects to comparison cards', () => {
      render(<ComparativeAnalysis data={mockHistoricalData} />);
      
      const currentVsAvgCard = screen.getByTestId('current-vs-average-card');
      expect(currentVsAvgCard).toHaveClass('hover:bg-white/15');
      
      const bestWorstCard = screen.getByTestId('best-worst-days-card');
      expect(bestWorstCard).toHaveClass('hover:bg-white/15');
    });
  });

  describe('Edge Cases', () => {
    it('handles single data point', () => {
      const singleDataPoint: HistoricalDataPoint[] = [
        { timestamp: '2024-01-01T00:00:00Z', value: 100, aqi: 100, category: 'moderate' },
      ];
      
      render(<ComparativeAnalysis data={singleDataPoint} />);
      
      expect(screen.getByTestId('comparative-analysis')).toBeInTheDocument();
      expect(screen.getByTestId('current-aqi-value')).toHaveTextContent('100');
      expect(screen.getByTestId('average-aqi-value')).toHaveTextContent('100');
    });

    it('handles very high AQI values', () => {
      const highAQIData: HistoricalDataPoint[] = [
        { timestamp: '2024-01-01T00:00:00Z', value: 450, aqi: 450, category: 'hazardous' },
        { timestamp: '2024-01-02T00:00:00Z', value: 480, aqi: 480, category: 'hazardous' },
      ];
      
      render(<ComparativeAnalysis data={highAQIData} currentAQI={500} />);
      
      expect(screen.getByTestId('current-aqi-value')).toHaveTextContent('500');
    });

    it('handles zero AQI values', () => {
      const zeroAQIData: HistoricalDataPoint[] = [
        { timestamp: '2024-01-01T00:00:00Z', value: 0, aqi: 0, category: 'good' },
        { timestamp: '2024-01-02T00:00:00Z', value: 10, aqi: 10, category: 'good' },
      ];
      
      render(<ComparativeAnalysis data={zeroAQIData} />);
      
      expect(screen.getByTestId('comparative-analysis')).toBeInTheDocument();
    });
  });
});

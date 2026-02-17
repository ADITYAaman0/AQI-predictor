/**
 * Unit tests for HistoricalTrendsChart component
 * 
 * Tests:
 * - Rendering with historical data
 * - Loading state
 * - Empty state
 * - Date range selector functionality
 * - Chart rendering
 * - Tooltip interactions
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HistoricalTrendsChart } from '../HistoricalTrendsChart';
import { HistoricalDataPoint } from '@/lib/api/types';

// ============================================================================
// Mock Data
// ============================================================================

const mockHistoricalData: HistoricalDataPoint[] = [
  {
    timestamp: '2024-01-01T00:00:00Z',
    value: 45,
    aqi: 45,
    category: 'good',
  },
  {
    timestamp: '2024-01-02T00:00:00Z',
    value: 75,
    aqi: 75,
    category: 'moderate',
  },
  {
    timestamp: '2024-01-03T00:00:00Z',
    value: 125,
    aqi: 125,
    category: 'unhealthy_sensitive',
  },
  {
    timestamp: '2024-01-04T00:00:00Z',
    value: 175,
    aqi: 175,
    category: 'unhealthy',
  },
  {
    timestamp: '2024-01-05T00:00:00Z',
    value: 225,
    aqi: 225,
    category: 'very_unhealthy',
  },
];

// ============================================================================
// Mock Recharts
// ============================================================================

jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    ComposedChart: ({ children, data }: any) => (
      <div data-testid="composed-chart" data-chart-data={JSON.stringify(data)}>
        {children}
      </div>
    ),
    LineChart: ({ children, data }: any) => (
      <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Line: ({ dataKey, stroke }: any) => (
      <div data-testid={`line-${dataKey}`} data-stroke={stroke}></div>
    ),
    Area: ({ dataKey, fill }: any) => (
      <div data-testid={`area-${dataKey}`} data-fill={fill}></div>
    ),
    XAxis: () => <div data-testid="x-axis"></div>,
    YAxis: () => <div data-testid="y-axis"></div>,
    CartesianGrid: () => <div data-testid="cartesian-grid"></div>,
    Tooltip: () => <div data-testid="tooltip"></div>,
    ReferenceLine: ({ y, label }: any) => (
      <div data-testid={`reference-line-${y}`} data-label={label?.value}></div>
    ),
  };
});

// ============================================================================
// Tests
// ============================================================================

describe('HistoricalTrendsChart', () => {
  describe('Rendering', () => {
    it('renders with historical data', () => {
      render(<HistoricalTrendsChart data={mockHistoricalData} />);

      expect(screen.getByTestId('historical-trends-chart')).toBeInTheDocument();
      expect(screen.getByTestId('historical-trends-title')).toHaveTextContent('Historical Trends');
      expect(screen.getByTestId('date-range-selector')).toBeInTheDocument();
      expect(screen.getByTestId('historical-trends-chart-container')).toBeInTheDocument();
    });

    it('renders with custom title', () => {
      render(
        <HistoricalTrendsChart
          data={mockHistoricalData}
          title="Custom Historical Data"
        />
      );

      expect(screen.getByTestId('historical-trends-title')).toHaveTextContent(
        'Custom Historical Data'
      );
    });

    it('renders all date range buttons', () => {
      render(<HistoricalTrendsChart data={mockHistoricalData} />);

      expect(screen.getByTestId('range-button-7d')).toBeInTheDocument();
      expect(screen.getByTestId('range-button-30d')).toBeInTheDocument();
      expect(screen.getByTestId('range-button-90d')).toBeInTheDocument();
      expect(screen.getByTestId('range-button-1y')).toBeInTheDocument();
    });

    it('highlights selected date range', () => {
      render(<HistoricalTrendsChart data={mockHistoricalData} selectedRange="7d" />);

      const button7d = screen.getByTestId('range-button-7d');
      const button30d = screen.getByTestId('range-button-30d');

      expect(button7d).toHaveClass('bg-white/20');
      expect(button30d).not.toHaveClass('bg-white/20');
    });
  });

  describe('Loading State', () => {
    it('displays loading skeleton when isLoading is true', () => {
      render(<HistoricalTrendsChart data={[]} isLoading={true} />);

      expect(screen.getByTestId('historical-trends-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('historical-trends-chart')).not.toBeInTheDocument();
    });

    it('shows loading skeleton with correct structure', () => {
      const { container } = render(
        <HistoricalTrendsChart data={[]} isLoading={true} />
      );

      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('displays empty state when data is empty', () => {
      render(<HistoricalTrendsChart data={[]} />);

      expect(screen.getByTestId('historical-trends-empty')).toBeInTheDocument();
      expect(screen.getByText('No historical data available')).toBeInTheDocument();
    });

    it('displays empty state when data is undefined', () => {
      render(<HistoricalTrendsChart data={undefined as any} />);

      expect(screen.getByTestId('historical-trends-empty')).toBeInTheDocument();
    });
  });

  describe('Date Range Selector', () => {
    it('calls onDateRangeChange when range button is clicked', () => {
      const handleRangeChange = jest.fn();
      render(
        <HistoricalTrendsChart
          data={mockHistoricalData}
          onDateRangeChange={handleRangeChange}
        />
      );

      const button7d = screen.getByTestId('range-button-7d');
      fireEvent.click(button7d);

      expect(handleRangeChange).toHaveBeenCalledWith('7d');
    });

    it('updates active range when button is clicked', () => {
      render(<HistoricalTrendsChart data={mockHistoricalData} selectedRange="30d" />);

      const button7d = screen.getByTestId('range-button-7d');
      const button30d = screen.getByTestId('range-button-30d');

      // Initially 30d should be active
      expect(button30d).toHaveClass('bg-white/20');

      // Click 7d
      fireEvent.click(button7d);

      // Now 7d should be active
      expect(button7d).toHaveClass('bg-white/20');
    });

    it('applies correct styles to active and inactive buttons', () => {
      render(<HistoricalTrendsChart data={mockHistoricalData} selectedRange="30d" />);

      const activeButton = screen.getByTestId('range-button-30d');
      const inactiveButton = screen.getByTestId('range-button-7d');

      expect(activeButton).toHaveClass('bg-white/20', 'text-white');
      expect(inactiveButton).toHaveClass('bg-white/5', 'text-white/70');
    });
  });

  describe('Chart Rendering', () => {
    it('renders chart components', () => {
      render(<HistoricalTrendsChart data={mockHistoricalData} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('renders line and area for AQI data', () => {
      render(<HistoricalTrendsChart data={mockHistoricalData} />);

      expect(screen.getByTestId('line-aqi')).toBeInTheDocument();
      expect(screen.getByTestId('area-aqi')).toBeInTheDocument();
    });

    it('passes correct data to chart', () => {
      render(<HistoricalTrendsChart data={mockHistoricalData} />);

      const chart = screen.getByTestId('composed-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');

      expect(chartData).toHaveLength(mockHistoricalData.length);
      expect(chartData[0].aqi).toBe(45);
      expect(chartData[4].aqi).toBe(225);
    });

    it('renders AQI threshold reference lines', () => {
      render(<HistoricalTrendsChart data={mockHistoricalData} />);

      expect(screen.getByTestId('reference-line-50')).toBeInTheDocument();
      expect(screen.getByTestId('reference-line-100')).toBeInTheDocument();
      expect(screen.getByTestId('reference-line-150')).toBeInTheDocument();
      expect(screen.getByTestId('reference-line-200')).toBeInTheDocument();
      expect(screen.getByTestId('reference-line-300')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies glassmorphic card styling', () => {
      render(<HistoricalTrendsChart data={mockHistoricalData} />);

      const card = screen.getByTestId('historical-trends-chart');
      expect(card).toHaveClass('glass-card', 'p-6', 'rounded-2xl');
    });

    it('renders legend with AQI categories', () => {
      const { container } = render(<HistoricalTrendsChart data={mockHistoricalData} />);

      const legendItems = container.querySelectorAll('.w-3.h-3.rounded-full');
      expect(legendItems.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has proper test ids for all interactive elements', () => {
      render(<HistoricalTrendsChart data={mockHistoricalData} />);

      expect(screen.getByTestId('historical-trends-chart')).toBeInTheDocument();
      expect(screen.getByTestId('historical-trends-title')).toBeInTheDocument();
      expect(screen.getByTestId('date-range-selector')).toBeInTheDocument();
      expect(screen.getByTestId('range-button-7d')).toBeInTheDocument();
      expect(screen.getByTestId('range-button-30d')).toBeInTheDocument();
      expect(screen.getByTestId('range-button-90d')).toBeInTheDocument();
      expect(screen.getByTestId('range-button-1y')).toBeInTheDocument();
    });

    it('buttons are keyboard accessible', () => {
      render(<HistoricalTrendsChart data={mockHistoricalData} />);

      const button = screen.getByTestId('range-button-7d');
      button.focus();

      expect(document.activeElement).toBe(button);
    });
  });

  describe('Edge Cases', () => {
    it('handles single data point', () => {
      const singlePoint: HistoricalDataPoint[] = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          value: 50,
          aqi: 50,
          category: 'good',
        },
      ];

      render(<HistoricalTrendsChart data={singlePoint} />);

      expect(screen.getByTestId('historical-trends-chart')).toBeInTheDocument();
      const chart = screen.getByTestId('composed-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toHaveLength(1);
    });

    it('handles very high AQI values', () => {
      const highAQIData: HistoricalDataPoint[] = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          value: 450,
          aqi: 450,
          category: 'hazardous',
        },
      ];

      render(<HistoricalTrendsChart data={highAQIData} />);

      expect(screen.getByTestId('historical-trends-chart')).toBeInTheDocument();
    });

    it('handles zero AQI values', () => {
      const zeroAQIData: HistoricalDataPoint[] = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          value: 0,
          aqi: 0,
          category: 'good',
        },
      ];

      render(<HistoricalTrendsChart data={zeroAQIData} />);

      expect(screen.getByTestId('historical-trends-chart')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('renders date range buttons in flex wrap layout', () => {
      render(<HistoricalTrendsChart data={mockHistoricalData} />);

      const selector = screen.getByTestId('date-range-selector');
      expect(selector).toHaveClass('flex-wrap');
    });

    it('chart container has fixed height', () => {
      render(<HistoricalTrendsChart data={mockHistoricalData} />);

      const container = screen.getByTestId('historical-trends-chart-container');
      expect(container).toHaveClass('h-80');
    });
  });
});

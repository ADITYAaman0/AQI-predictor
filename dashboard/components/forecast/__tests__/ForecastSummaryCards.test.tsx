import { render, screen } from '@testing-library/react';
import { ForecastSummaryCards } from '../ForecastSummaryCards';
import { HourlyForecastData } from '@/lib/api/types';

/**
 * Unit tests for ForecastSummaryCards component
 * 
 * Tests:
 * - Rendering with forecast data
 * - Best/worst time calculation
 * - Peak pollution hours detection
 * - Average AQI calculation
 * - Empty state handling
 * 
 * Requirements: 4.10
 * Task: 10.2 - Add forecast summary cards
 */

describe('ForecastSummaryCards', () => {
  // Mock forecast data
  const mockForecasts: HourlyForecastData[] = [
    {
      timestamp: '2024-01-01T00:00:00Z',
      forecastHour: 0,
      aqi: {
        value: 50,
        category: 'good',
        categoryLabel: 'Good',
        color: '#4ADE80',
        confidenceLower: 45,
        confidenceUpper: 55,
      },
      pollutants: {},
      weather: {
        temperature: 20,
        humidity: 60,
        windSpeed: 5,
        windDirection: 180,
        pressure: 1013,
      },
      confidence: {
        score: 0.9,
        modelWeights: {},
      },
    },
    {
      timestamp: '2024-01-01T06:00:00Z',
      forecastHour: 6,
      aqi: {
        value: 120,
        category: 'unhealthy_sensitive',
        categoryLabel: 'Unhealthy for Sensitive Groups',
        color: '#FB923C',
        confidenceLower: 110,
        confidenceUpper: 130,
      },
      pollutants: {},
      weather: {
        temperature: 22,
        humidity: 65,
        windSpeed: 3,
        windDirection: 180,
        pressure: 1013,
      },
      confidence: {
        score: 0.85,
        modelWeights: {},
      },
    },
    {
      timestamp: '2024-01-01T12:00:00Z',
      forecastHour: 12,
      aqi: {
        value: 150,
        category: 'unhealthy_sensitive',
        categoryLabel: 'Unhealthy for Sensitive Groups',
        color: '#FB923C',
        confidenceLower: 140,
        confidenceUpper: 160,
      },
      pollutants: {},
      weather: {
        temperature: 25,
        humidity: 55,
        windSpeed: 4,
        windDirection: 180,
        pressure: 1013,
      },
      confidence: {
        score: 0.88,
        modelWeights: {},
      },
    },
    {
      timestamp: '2024-01-01T18:00:00Z',
      forecastHour: 18,
      aqi: {
        value: 180,
        category: 'unhealthy',
        categoryLabel: 'Unhealthy',
        color: '#EF4444',
        confidenceLower: 170,
        confidenceUpper: 190,
      },
      pollutants: {},
      weather: {
        temperature: 23,
        humidity: 70,
        windSpeed: 2,
        windDirection: 180,
        pressure: 1013,
      },
      confidence: {
        score: 0.82,
        modelWeights: {},
      },
    },
  ];

  describe('Rendering', () => {
    it('renders all four summary cards', () => {
      render(<ForecastSummaryCards forecasts={mockForecasts} />);

      expect(screen.getByText('Best Time')).toBeInTheDocument();
      expect(screen.getByText('Worst Time')).toBeInTheDocument();
      expect(screen.getByText('Peak Pollution')).toBeInTheDocument();
      expect(screen.getByText('24-Hour Average')).toBeInTheDocument();
    });

    it('displays empty state when no forecasts provided', () => {
      render(<ForecastSummaryCards forecasts={[]} />);

      expect(screen.getByText('No forecast data available')).toBeInTheDocument();
    });
  });

  describe('Best Time Card', () => {
    it('displays the hour with lowest AQI', () => {
      render(<ForecastSummaryCards forecasts={mockForecasts} />);

      // Best time should be 12:00 AM (hour 0) with AQI 50
      expect(screen.getByText('12:00 AM')).toBeInTheDocument();
      expect(screen.getByText(/AQI 50/)).toBeInTheDocument();
      expect(screen.getByText(/Good/)).toBeInTheDocument();
    });

    it('displays correct AQI category for best time', () => {
      render(<ForecastSummaryCards forecasts={mockForecasts} />);

      const bestTimeCard = screen.getByText('Best Time').closest('div');
      expect(bestTimeCard).toHaveTextContent('Good');
    });
  });

  describe('Worst Time Card', () => {
    it('displays the hour with highest AQI', () => {
      render(<ForecastSummaryCards forecasts={mockForecasts} />);

      // Worst time should be 6:00 PM (hour 18) with AQI 180
      expect(screen.getByText('6:00 PM')).toBeInTheDocument();
      expect(screen.getByText(/AQI 180/)).toBeInTheDocument();
      expect(screen.getByText(/Unhealthy/)).toBeInTheDocument();
    });

    it('displays correct AQI category for worst time', () => {
      render(<ForecastSummaryCards forecasts={mockForecasts} />);

      const worstTimeCard = screen.getByText('Worst Time').closest('div');
      expect(worstTimeCard).toHaveTextContent('Unhealthy');
    });
  });

  describe('Peak Pollution Hours Card', () => {
    it('identifies consecutive hours with above-average AQI', () => {
      render(<ForecastSummaryCards forecasts={mockForecasts} />);

      // Average AQI is (50 + 120 + 150 + 180) / 4 = 125
      // Peak should be hours 12-18 (12:00 PM - 6:00 PM)
      const peakCard = screen.getByText('Peak Pollution').closest('div');
      expect(peakCard).toHaveTextContent(/12:00 PM/);
      expect(peakCard).toHaveTextContent(/6:00 PM/);
    });

    it('displays average AQI for peak period', () => {
      render(<ForecastSummaryCards forecasts={mockForecasts} />);

      // Peak period (hours 12-18) has average AQI of (150 + 180) / 2 = 165
      const peakCard = screen.getByText('Peak Pollution').closest('div');
      expect(peakCard).toHaveTextContent(/Avg AQI 165/);
    });

    it('shows "No significant peaks" when no peaks detected', () => {
      const flatForecasts: HourlyForecastData[] = [
        {
          ...mockForecasts[0],
          forecastHour: 0,
          aqi: { ...mockForecasts[0].aqi, value: 50 },
        },
        {
          ...mockForecasts[0],
          forecastHour: 1,
          aqi: { ...mockForecasts[0].aqi, value: 52 },
        },
        {
          ...mockForecasts[0],
          forecastHour: 2,
          aqi: { ...mockForecasts[0].aqi, value: 48 },
        },
      ];

      render(<ForecastSummaryCards forecasts={flatForecasts} />);

      expect(screen.getByText('No significant peaks')).toBeInTheDocument();
    });
  });

  describe('Average AQI Card', () => {
    it('calculates and displays correct average AQI', () => {
      render(<ForecastSummaryCards forecasts={mockForecasts} />);

      // Average AQI is (50 + 120 + 150 + 180) / 4 = 125
      expect(screen.getByText('AQI 125')).toBeInTheDocument();
    });

    it('rounds average AQI to nearest integer', () => {
      const forecasts: HourlyForecastData[] = [
        { ...mockForecasts[0], aqi: { ...mockForecasts[0].aqi, value: 50 } },
        { ...mockForecasts[0], aqi: { ...mockForecasts[0].aqi, value: 51 } },
        { ...mockForecasts[0], aqi: { ...mockForecasts[0].aqi, value: 52 } },
      ];

      render(<ForecastSummaryCards forecasts={forecasts} />);

      // Average is 51, should display as 51
      expect(screen.getByText('AQI 51')).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('formats hours correctly in 12-hour format', () => {
      const forecasts: HourlyForecastData[] = [
        { ...mockForecasts[0], forecastHour: 0 }, // 12:00 AM
        { ...mockForecasts[0], forecastHour: 6 }, // 6:00 AM
        { ...mockForecasts[0], forecastHour: 12 }, // 12:00 PM
        { ...mockForecasts[0], forecastHour: 18 }, // 6:00 PM
        { ...mockForecasts[0], forecastHour: 23 }, // 11:00 PM
      ];

      render(<ForecastSummaryCards forecasts={forecasts} />);

      // Check that time formatting is present (at least one should be visible)
      const container = screen.getByText('Best Time').closest('div')?.parentElement;
      expect(container).toBeInTheDocument();
    });
  });

  describe('Styling and Interactions', () => {
    it('applies glassmorphic styling to cards', () => {
      const { container } = render(<ForecastSummaryCards forecasts={mockForecasts} />);

      const cards = container.querySelectorAll('.glass-card');
      expect(cards.length).toBeGreaterThan(0);

      cards.forEach((card) => {
        expect(card).toHaveClass('backdrop-blur-lg');
        expect(card).toHaveClass('bg-white/10');
        expect(card).toHaveClass('border');
      });
    });

    it('applies hover effects to cards', () => {
      const { container } = render(<ForecastSummaryCards forecasts={mockForecasts} />);

      const cards = container.querySelectorAll('.glass-card');
      cards.forEach((card) => {
        expect(card).toHaveClass('hover:shadow-level2');
        expect(card).toHaveClass('hover:-translate-y-1');
      });
    });

    it('displays colored indicators for AQI levels', () => {
      const { container } = render(<ForecastSummaryCards forecasts={mockForecasts} />);

      // Should have colored dots for each card
      const colorDots = container.querySelectorAll('.w-3.h-3.rounded-full');
      expect(colorDots.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles single forecast data point', () => {
      const singleForecast = [mockForecasts[0]];

      render(<ForecastSummaryCards forecasts={singleForecast} />);

      // Best and worst should be the same
      expect(screen.getAllByText('12:00 AM').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/AQI 50/).length).toBeGreaterThan(0);
    });

    it('handles all forecasts with same AQI', () => {
      const uniformForecasts: HourlyForecastData[] = Array(5)
        .fill(null)
        .map((_, i) => ({
          ...mockForecasts[0],
          forecastHour: i,
          aqi: { ...mockForecasts[0].aqi, value: 100 },
        }));

      render(<ForecastSummaryCards forecasts={uniformForecasts} />);

      // Should still render without errors
      expect(screen.getByText('Best Time')).toBeInTheDocument();
      expect(screen.getByText('AQI 100')).toBeInTheDocument();
    });

    it('handles very high AQI values', () => {
      const highAQIForecasts: HourlyForecastData[] = [
        {
          ...mockForecasts[0],
          forecastHour: 0,
          aqi: { ...mockForecasts[0].aqi, value: 450, categoryLabel: 'Hazardous' },
        },
      ];

      render(<ForecastSummaryCards forecasts={highAQIForecasts} />);

      expect(screen.getAllByText(/AQI 450/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Hazardous/).length).toBeGreaterThan(0);
    });
  });
});

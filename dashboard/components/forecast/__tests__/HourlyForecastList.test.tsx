/**
 * Unit tests for HourlyForecastList component
 * 
 * Tests:
 * - Rendering with forecast data
 * - Empty state handling
 * - Desktop table view
 * - Mobile card view
 * - Data formatting (time, pollutants, weather)
 * - Color coding based on AQI
 * - Confidence interval display
 * 
 * Task: 10.3 - Implement hourly forecast list
 */

import { render, screen } from '@testing-library/react';
import { HourlyForecastList } from '../HourlyForecastList';
import { HourlyForecastData } from '@/lib/api/types';

// Mock forecast data
const mockForecastData: HourlyForecastData[] = [
  {
    timestamp: '2024-01-15T10:00:00Z',
    forecastHour: 10,
    aqi: {
      value: 85,
      category: 'moderate',
      categoryLabel: 'Moderate',
      color: '#FCD34D',
      confidenceLower: 75,
      confidenceUpper: 95,
    },
    pollutants: {
      pm25: { parameter: 'pm25', value: 35.5, unit: 'μg/m³', aqi_value: 85 },
      pm10: { parameter: 'pm10', value: 65.2, unit: 'μg/m³', aqi_value: 70 },
      o3: { parameter: 'o3', value: 45.8, unit: 'μg/m³', aqi_value: 60 },
    },
    weather: {
      temperature: 25.5,
      humidity: 65,
      windSpeed: 3.2,
      windDirection: 180,
      pressure: 1013,
    },
    confidence: {
      score: 0.85,
      modelWeights: { lstm: 0.4, xgboost: 0.3, ensemble: 0.3 },
    },
  },
  {
    timestamp: '2024-01-15T11:00:00Z',
    forecastHour: 11,
    aqi: {
      value: 120,
      category: 'unhealthy_sensitive',
      categoryLabel: 'Unhealthy for Sensitive Groups',
      color: '#FB923C',
      confidenceLower: 110,
      confidenceUpper: 130,
    },
    pollutants: {
      pm25: { parameter: 'pm25', value: 55.2, unit: 'μg/m³', aqi_value: 120 },
      pm10: { parameter: 'pm10', value: 85.5, unit: 'μg/m³', aqi_value: 95 },
      o3: { parameter: 'o3', value: 65.3, unit: 'μg/m³', aqi_value: 80 },
    },
    weather: {
      temperature: 26.8,
      humidity: 62,
      windSpeed: 2.8,
      windDirection: 190,
      pressure: 1012,
    },
    confidence: {
      score: 0.82,
      modelWeights: { lstm: 0.4, xgboost: 0.3, ensemble: 0.3 },
    },
  },
  {
    timestamp: '2024-01-15T12:00:00Z',
    forecastHour: 12,
    aqi: {
      value: 45,
      category: 'good',
      categoryLabel: 'Good',
      color: '#4ADE80',
      confidenceLower: 40,
      confidenceUpper: 50,
    },
    pollutants: {
      pm25: { parameter: 'pm25', value: 15.2, unit: 'μg/m³', aqi_value: 45 },
      pm10: { parameter: 'pm10', value: 35.5, unit: 'μg/m³', aqi_value: 40 },
      o3: { parameter: 'o3', value: 25.8, unit: 'μg/m³', aqi_value: 35 },
    },
    weather: {
      temperature: 28.2,
      humidity: 58,
      windSpeed: 4.5,
      windDirection: 200,
      pressure: 1011,
    },
    confidence: {
      score: 0.88,
      modelWeights: { lstm: 0.4, xgboost: 0.3, ensemble: 0.3 },
    },
  },
];

describe('HourlyForecastList', () => {
  describe('Rendering', () => {
    it('renders hourly forecast data', () => {
      render(<HourlyForecastList forecasts={mockForecastData} />);
      
      // Check that forecast hours are displayed (appears in both desktop and mobile views)
      expect(screen.getAllByText('10:00 AM')[0]).toBeInTheDocument();
      expect(screen.getAllByText('11:00 AM')[0]).toBeInTheDocument();
      expect(screen.getAllByText('12:00 PM')[0]).toBeInTheDocument();
    });

    it('displays AQI values correctly', () => {
      render(<HourlyForecastList forecasts={mockForecastData} />);
      
      // Check AQI values
      expect(screen.getAllByText('85')[0]).toBeInTheDocument();
      expect(screen.getAllByText('120')[0]).toBeInTheDocument();
      expect(screen.getAllByText('45')[0]).toBeInTheDocument();
    });

    it('displays AQI categories', () => {
      render(<HourlyForecastList forecasts={mockForecastData} />);
      
      expect(screen.getAllByText('Moderate')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Unhealthy for Sensitive Groups')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Good')[0]).toBeInTheDocument();
    });

    it('displays confidence intervals', () => {
      render(<HourlyForecastList forecasts={mockForecastData} />);
      
      // Check confidence intervals are displayed
      expect(screen.getAllByText(/\(75-95\)/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/\(110-130\)/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/\(40-50\)/)[0]).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays message when no forecasts provided', () => {
      render(<HourlyForecastList forecasts={[]} />);
      
      expect(screen.getByText('No hourly forecast data available')).toBeInTheDocument();
    });

    it('handles null forecasts gracefully', () => {
      render(<HourlyForecastList forecasts={null as any} />);
      
      expect(screen.getByText('No hourly forecast data available')).toBeInTheDocument();
    });
  });

  describe('Pollutant Display', () => {
    it('displays PM2.5 values', () => {
      render(<HourlyForecastList forecasts={mockForecastData} />);
      
      expect(screen.getAllByText('35.5')[0]).toBeInTheDocument();
      expect(screen.getAllByText('55.2')[0]).toBeInTheDocument();
      expect(screen.getAllByText('15.2')[0]).toBeInTheDocument();
    });

    it('displays PM10 values', () => {
      render(<HourlyForecastList forecasts={mockForecastData} />);
      
      expect(screen.getAllByText('65.2')[0]).toBeInTheDocument();
      expect(screen.getAllByText('85.5')[0]).toBeInTheDocument();
      expect(screen.getAllByText('35.5')[1]).toBeInTheDocument(); // Note: 35.5 appears twice
    });

    it('displays O3 values', () => {
      render(<HourlyForecastList forecasts={mockForecastData} />);
      
      expect(screen.getAllByText('45.8')[0]).toBeInTheDocument();
      expect(screen.getAllByText('65.3')[0]).toBeInTheDocument();
      expect(screen.getAllByText('25.8')[0]).toBeInTheDocument();
    });

    it('handles missing pollutant data', () => {
      const forecastWithMissingData: HourlyForecastData[] = [
        {
          ...mockForecastData[0],
          pollutants: {},
        },
      ];

      render(<HourlyForecastList forecasts={forecastWithMissingData} />);
      
      // Should display N/A for missing pollutants
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });
  });

  describe('Weather Display', () => {
    it('displays temperature', () => {
      render(<HourlyForecastList forecasts={mockForecastData} />);
      
      // Temperature is rounded to nearest integer
      expect(screen.getAllByText(/26°C/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/27°C/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/28°C/)[0]).toBeInTheDocument();
    });

    it('displays humidity', () => {
      render(<HourlyForecastList forecasts={mockForecastData} />);
      
      expect(screen.getAllByText(/65%/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/62%/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/58%/)[0]).toBeInTheDocument();
    });

    it('displays wind speed', () => {
      render(<HourlyForecastList forecasts={mockForecastData} />);
      
      expect(screen.getAllByText(/3.2 m\/s/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/2.8 m\/s/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/4.5 m\/s/)[0]).toBeInTheDocument();
    });

    it('handles missing weather data', () => {
      const forecastWithMissingWeather: HourlyForecastData[] = [
        {
          ...mockForecastData[0],
          weather: undefined as any,
        },
      ];

      render(<HourlyForecastList forecasts={forecastWithMissingWeather} />);
      
      // Should display N/A for missing weather data
      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });
  });

  describe('Time Formatting', () => {
    it('formats hours correctly in 12-hour format', () => {
      const forecastsWithVariousTimes: HourlyForecastData[] = [
        { ...mockForecastData[0], forecastHour: 0 },  // Midnight
        { ...mockForecastData[0], forecastHour: 12 }, // Noon
        { ...mockForecastData[0], forecastHour: 13 }, // 1 PM
        { ...mockForecastData[0], forecastHour: 23 }, // 11 PM
      ];

      render(<HourlyForecastList forecasts={forecastsWithVariousTimes} />);
      
      expect(screen.getAllByText('12:00 AM')[0]).toBeInTheDocument(); // Midnight
      expect(screen.getAllByText('12:00 PM')[0]).toBeInTheDocument(); // Noon
      expect(screen.getAllByText('1:00 PM')[0]).toBeInTheDocument();  // 1 PM
      expect(screen.getAllByText('11:00 PM')[0]).toBeInTheDocument(); // 11 PM
    });
  });

  describe('Responsive Design', () => {
    it('renders desktop table view', () => {
      const { container } = render(<HourlyForecastList forecasts={mockForecastData} />);
      
      // Check for table element (desktop view)
      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();
    });

    it('renders mobile card view', () => {
      const { container } = render(<HourlyForecastList forecasts={mockForecastData} />);
      
      // Check for mobile card container
      const mobileView = container.querySelector('.md\\:hidden');
      expect(mobileView).toBeInTheDocument();
    });

    it('has correct responsive classes', () => {
      const { container } = render(<HourlyForecastList forecasts={mockForecastData} />);
      
      // Desktop view should be hidden on mobile
      const desktopView = container.querySelector('.hidden.md\\:block');
      expect(desktopView).toBeInTheDocument();
      
      // Mobile view should be hidden on desktop
      const mobileView = container.querySelector('.md\\:hidden');
      expect(mobileView).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('applies correct background colors based on AQI', () => {
      const { container } = render(<HourlyForecastList forecasts={mockForecastData} />);
      
      // Check that rows have background colors (style attribute)
      const rows = container.querySelectorAll('tr[style]');
      expect(rows.length).toBeGreaterThan(0);
      
      // Each row should have a backgroundColor style
      rows.forEach(row => {
        const style = (row as HTMLElement).style;
        expect(style.backgroundColor).toBeTruthy();
      });
    });

    it('displays colored AQI indicator dots', () => {
      const { container } = render(<HourlyForecastList forecasts={mockForecastData} />);
      
      // Check for colored dots (divs with rounded-full class and inline styles)
      const dots = container.querySelectorAll('.rounded-full[style]');
      expect(dots.length).toBeGreaterThan(0);
    });
  });

  describe('Data Completeness', () => {
    it('displays all required data fields', () => {
      render(<HourlyForecastList forecasts={[mockForecastData[0]]} />);
      
      // Time (appears in both desktop and mobile views)
      expect(screen.getAllByText('10:00 AM')[0]).toBeInTheDocument();
      
      // AQI
      expect(screen.getAllByText('85')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Moderate')[0]).toBeInTheDocument();
      
      // Pollutants
      expect(screen.getAllByText('35.5')[0]).toBeInTheDocument(); // PM2.5
      expect(screen.getAllByText('65.2')[0]).toBeInTheDocument(); // PM10
      expect(screen.getAllByText('45.8')[0]).toBeInTheDocument(); // O3
      
      // Weather
      expect(screen.getAllByText(/26°C/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/65%/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/3.2 m\/s/)[0]).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML table structure', () => {
      const { container } = render(<HourlyForecastList forecasts={mockForecastData} />);
      
      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();
      
      const thead = container.querySelector('thead');
      expect(thead).toBeInTheDocument();
      
      const tbody = container.querySelector('tbody');
      expect(tbody).toBeInTheDocument();
    });

    it('has proper table headers', () => {
      render(<HourlyForecastList forecasts={mockForecastData} />);
      
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('AQI')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getAllByText('PM2.5')[0]).toBeInTheDocument(); // Appears in header and mobile cards
      expect(screen.getAllByText('PM10')[0]).toBeInTheDocument();  // Appears in header and mobile cards
      expect(screen.getByText('Temp')).toBeInTheDocument();
      expect(screen.getByText('Humidity')).toBeInTheDocument();
      expect(screen.getByText('Wind')).toBeInTheDocument();
    });
  });
});

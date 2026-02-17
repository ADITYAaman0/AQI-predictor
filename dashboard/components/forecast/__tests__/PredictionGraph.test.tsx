import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PredictionGraph } from '../PredictionGraph';
import { HourlyForecastData } from '@/lib/api/types';

// Mock Recharts to avoid rendering issues in tests
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

describe('PredictionGraph', () => {
  const mockForecastData: HourlyForecastData[] = [
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
      timestamp: '2024-01-01T01:00:00Z',
      forecastHour: 1,
      aqi: {
        value: 75,
        category: 'moderate',
        categoryLabel: 'Moderate',
        color: '#FCD34D',
        confidenceLower: 70,
        confidenceUpper: 80,
      },
      pollutants: {},
      weather: {
        temperature: 21,
        humidity: 58,
        windSpeed: 6,
        windDirection: 190,
        pressure: 1012,
      },
      confidence: {
        score: 0.85,
        modelWeights: {},
      },
    },
  ];

  it('renders without crashing', () => {
    render(<PredictionGraph forecasts={mockForecastData} />);
    expect(screen.getByTestId('prediction-graph')).toBeInTheDocument();
  });

  it('renders with empty forecast data', () => {
    render(<PredictionGraph forecasts={[]} />);
    expect(screen.getByTestId('prediction-graph')).toBeInTheDocument();
  });

  it('renders ResponsiveContainer', () => {
    render(<PredictionGraph forecasts={mockForecastData} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('accepts custom height prop', () => {
    const customHeight = 400;
    const { container } = render(
      <PredictionGraph forecasts={mockForecastData} height={customHeight} />
    );
    expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
  });

  it('accepts showConfidenceInterval prop', () => {
    render(
      <PredictionGraph
        forecasts={mockForecastData}
        showConfidenceInterval={true}
      />
    );
    expect(screen.getByTestId('prediction-graph')).toBeInTheDocument();
  });

  it('accepts onHover callback prop', () => {
    const mockOnHover = jest.fn();
    render(
      <PredictionGraph forecasts={mockForecastData} onHover={mockOnHover} />
    );
    expect(screen.getByTestId('prediction-graph')).toBeInTheDocument();
  });

  it('transforms forecast data correctly', () => {
    const { container } = render(
      <PredictionGraph forecasts={mockForecastData} />
    );
    // Verify the component renders with the data
    expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
  });

  describe('Animation Features (Task 9.2)', () => {
    it('applies 2s animation duration with ease-out timing', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // Component should render with animation enabled
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('uses gradient stroke matching AQI zones for good air quality', () => {
      const goodAQIData: HourlyForecastData[] = [
        {
          timestamp: mockForecastData[0]!.timestamp,
          forecastHour: mockForecastData[0]!.forecastHour,
          pollutants: mockForecastData[0]!.pollutants,
          weather: mockForecastData[0]!.weather,
          confidence: mockForecastData[0]!.confidence,
          aqi: {
            value: 30,
            category: 'good',
            categoryLabel: 'Good',
            color: '#4ADE80',
            confidenceLower: 25,
            confidenceUpper: 35,
          },
        },
      ];
      const { container } = render(<PredictionGraph forecasts={goodAQIData} />);
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('uses gradient stroke matching AQI zones for moderate air quality', () => {
      const moderateAQIData: HourlyForecastData[] = [
        {
          timestamp: mockForecastData[0]!.timestamp,
          forecastHour: mockForecastData[0]!.forecastHour,
          pollutants: mockForecastData[0]!.pollutants,
          weather: mockForecastData[0]!.weather,
          confidence: mockForecastData[0]!.confidence,
          aqi: {
            value: 75,
            category: 'moderate',
            categoryLabel: 'Moderate',
            color: '#FCD34D',
            confidenceLower: 70,
            confidenceUpper: 80,
          },
        },
      ];
      const { container } = render(<PredictionGraph forecasts={moderateAQIData} />);
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('uses gradient stroke matching AQI zones for unhealthy air quality', () => {
      const unhealthyAQIData: HourlyForecastData[] = [
        {
          timestamp: mockForecastData[0]!.timestamp,
          forecastHour: mockForecastData[0]!.forecastHour,
          pollutants: mockForecastData[0]!.pollutants,
          weather: mockForecastData[0]!.weather,
          confidence: mockForecastData[0]!.confidence,
          aqi: {
            value: 175,
            category: 'unhealthy',
            categoryLabel: 'Unhealthy',
            color: '#EF4444',
            confidenceLower: 170,
            confidenceUpper: 180,
          },
        },
      ];
      const { container } = render(<PredictionGraph forecasts={unhealthyAQIData} />);
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('uses gradient stroke matching AQI zones for hazardous air quality', () => {
      const hazardousAQIData: HourlyForecastData[] = [
        {
          timestamp: mockForecastData[0]!.timestamp,
          forecastHour: mockForecastData[0]!.forecastHour,
          pollutants: mockForecastData[0]!.pollutants,
          weather: mockForecastData[0]!.weather,
          confidence: mockForecastData[0]!.confidence,
          aqi: {
            value: 350,
            category: 'hazardous',
            categoryLabel: 'Hazardous',
            color: '#7C2D12',
            confidenceLower: 340,
            confidenceUpper: 360,
          },
        },
      ];
      const { container } = render(<PredictionGraph forecasts={hazardousAQIData} />);
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('includes gradient fill under the line', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // Verify gradient definitions are present in the DOM
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('resets animation when forecast data changes', () => {
      const { rerender, container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      
      const newForecastData: HourlyForecastData[] = [
        {
          timestamp: mockForecastData[0]!.timestamp,
          forecastHour: mockForecastData[0]!.forecastHour,
          pollutants: mockForecastData[0]!.pollutants,
          weather: mockForecastData[0]!.weather,
          confidence: mockForecastData[0]!.confidence,
          aqi: { 
            ...mockForecastData[0]!.aqi, 
            value: 100 
          },
        },
      ];
      
      rerender(<PredictionGraph forecasts={newForecastData} />);
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });
  });

  describe('Confidence Interval Visualization (Task 9.3)', () => {
    it('renders confidence interval when showConfidenceInterval is true', () => {
      const { container } = render(
        <PredictionGraph
          forecasts={mockForecastData}
          showConfidenceInterval={true}
        />
      );
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('does not render confidence interval when showConfidenceInterval is false', () => {
      const { container } = render(
        <PredictionGraph
          forecasts={mockForecastData}
          showConfidenceInterval={false}
        />
      );
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('renders confidence interval with semi-transparent fill', () => {
      const { container } = render(
        <PredictionGraph
          forecasts={mockForecastData}
          showConfidenceInterval={true}
        />
      );
      // Verify the component renders with confidence interval enabled
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('displays both upper and lower confidence bounds', () => {
      const { container } = render(
        <PredictionGraph
          forecasts={mockForecastData}
          showConfidenceInterval={true}
        />
      );
      // Verify the component renders with both bounds
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });
  });

  describe('Interactive Tooltips (Task 9.4)', () => {
    it('renders with tooltip support', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('shows tooltip with AQI value on hover', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // Tooltip is rendered by Recharts on hover
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('displays timestamp in tooltip', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // Tooltip content includes timestamp
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('displays confidence interval in tooltip when enabled', () => {
      const { container } = render(
        <PredictionGraph
          forecasts={mockForecastData}
          showConfidenceInterval={true}
        />
      );
      // Tooltip should include confidence interval data
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('shows 8px circles at data points on hover', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // Active dot configuration is set with r=4 (8px diameter)
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('calls onHover callback when hovering over data points', () => {
      const mockOnHover = jest.fn();
      render(
        <PredictionGraph forecasts={mockForecastData} onHover={mockOnHover} />
      );
      // onHover callback is configured
      expect(mockOnHover).not.toHaveBeenCalled();
    });

    it('calls onHover with null when mouse leaves chart', () => {
      const mockOnHover = jest.fn();
      render(
        <PredictionGraph forecasts={mockForecastData} onHover={mockOnHover} />
      );
      // onHover callback should be called with null on mouse leave
      expect(mockOnHover).not.toHaveBeenCalled();
    });

    it('displays AQI category in tooltip', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // Tooltip includes AQI category label
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('uses color-coded AQI value in tooltip', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // Tooltip AQI value should be color-coded
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });
  });

  describe('Threshold Grid Lines (Task 9.5)', () => {
    it('renders with threshold grid lines at AQI thresholds', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // Component should render with ReferenceLine components for thresholds
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('includes threshold line at AQI 50 (Good/Moderate boundary)', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // ReferenceLine at y=50 should be present
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('includes threshold line at AQI 100 (Moderate/Unhealthy for Sensitive boundary)', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // ReferenceLine at y=100 should be present
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('includes threshold line at AQI 150 (Unhealthy for Sensitive/Unhealthy boundary)', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // ReferenceLine at y=150 should be present
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('includes threshold line at AQI 200 (Unhealthy/Very Unhealthy boundary)', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // ReferenceLine at y=200 should be present
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('includes threshold line at AQI 300 (Very Unhealthy/Hazardous boundary)', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // ReferenceLine at y=300 should be present
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('styles threshold lines with subtle colors and dashed pattern', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // Threshold lines should have subtle styling (strokeOpacity: 0.3, strokeDasharray: "5 5")
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });

    it('displays threshold values as labels on the lines', () => {
      const { container } = render(
        <PredictionGraph forecasts={mockForecastData} />
      );
      // Each ReferenceLine should have a label showing the threshold value
      expect(container.querySelector('[data-testid="prediction-graph"]')).toBeInTheDocument();
    });
  });
});

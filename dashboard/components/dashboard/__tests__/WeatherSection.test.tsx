/**
 * WeatherSection Component Tests
 * 
 * Tests for the WeatherSection component integration with weather formatter.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WeatherSection, WeatherSectionProps } from '../WeatherSection';
import { WeatherInfo } from '@/lib/api/types';

describe('WeatherSection', () => {
  const mockWeatherData: WeatherInfo = {
    temperature: 25,
    humidity: 65,
    wind_speed: 12,
    wind_direction: 180,
    pressure: 1013.25,
  };

  const defaultProps: WeatherSectionProps = {
    weather: mockWeatherData,
    lastUpdated: '2024-01-15T10:30:00Z',
  };

  describe('Loading State', () => {
    it('displays loading skeleton when isLoading is true', () => {
      render(<WeatherSection {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('weather-section-loading')).toBeInTheDocument();
      expect(screen.getByText('Current Weather')).toBeInTheDocument();
    });

    it('shows animated pulse effect during loading', () => {
      const { container } = render(<WeatherSection {...defaultProps} isLoading={true} />);
      
      const pulseElements = container.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('displays 4 skeleton badges', () => {
      const { container } = render(<WeatherSection {...defaultProps} isLoading={true} />);
      
      const skeletons = container.querySelectorAll('.h-14.w-14.bg-white\\/10.rounded-full');
      expect(skeletons).toHaveLength(4);
    });
  });

  describe('Error State', () => {
    it('displays error message when error prop is provided', () => {
      render(
        <WeatherSection 
          {...defaultProps} 
          error="Unable to fetch weather data" 
        />
      );
      
      expect(screen.getByTestId('weather-section-error')).toBeInTheDocument();
      expect(screen.getByText('Unable to fetch weather data')).toBeInTheDocument();
    });

    it('displays default weather badges on error', () => {
      render(
        <WeatherSection 
          {...defaultProps} 
          error="Network error" 
        />
      );
      
      expect(screen.getByTestId('weather-badges')).toBeInTheDocument();
    });
  });

  describe('Incomplete Data Handling', () => {
    it('handles missing temperature', () => {
      const incompleteWeather: WeatherInfo = {
        humidity: 65,
        wind_speed: 12,
        wind_direction: 180,
        pressure: 1013.25,
      };

      render(<WeatherSection weather={incompleteWeather} />);
      
      expect(screen.getByTestId('weather-section-incomplete')).toBeInTheDocument();
      expect(screen.getByText('Weather data is incomplete')).toBeInTheDocument();
    });

    it('handles missing humidity', () => {
      const incompleteWeather: WeatherInfo = {
        temperature: 25,
        wind_speed: 12,
        wind_direction: 180,
        pressure: 1013.25,
      };

      render(<WeatherSection weather={incompleteWeather} />);
      
      expect(screen.getByTestId('weather-section-incomplete')).toBeInTheDocument();
    });

    it('handles empty weather object', () => {
      const emptyWeather: WeatherInfo = {};

      render(<WeatherSection weather={emptyWeather} />);
      
      expect(screen.getByTestId('weather-section-incomplete')).toBeInTheDocument();
    });

    it('displays default weather badges for incomplete data', () => {
      const incompleteWeather: WeatherInfo = {
        temperature: 25,
      };

      render(<WeatherSection weather={incompleteWeather} />);
      
      expect(screen.getByTestId('weather-badges')).toBeInTheDocument();
    });
  });

  describe('Invalid Data Handling', () => {
    it('handles temperature out of range', () => {
      const invalidWeather: WeatherInfo = {
        temperature: 100, // Too high
        humidity: 65,
        wind_speed: 12,
        wind_direction: 180,
        pressure: 1013.25,
      };

      render(<WeatherSection weather={invalidWeather} />);
      
      expect(screen.getByTestId('weather-section-invalid')).toBeInTheDocument();
      expect(screen.getByText('Weather data is invalid')).toBeInTheDocument();
    });

    it('handles humidity out of range', () => {
      const invalidWeather: WeatherInfo = {
        temperature: 25,
        humidity: 150, // Too high
        wind_speed: 12,
        wind_direction: 180,
        pressure: 1013.25,
      };

      render(<WeatherSection weather={invalidWeather} />);
      
      expect(screen.getByTestId('weather-section-invalid')).toBeInTheDocument();
    });

    it('handles wind speed out of range', () => {
      const invalidWeather: WeatherInfo = {
        temperature: 25,
        humidity: 65,
        wind_speed: 600, // Too high
        wind_direction: 180,
        pressure: 1013.25,
      };

      render(<WeatherSection weather={invalidWeather} />);
      
      expect(screen.getByTestId('weather-section-invalid')).toBeInTheDocument();
    });

    it('handles pressure out of range', () => {
      const invalidWeather: WeatherInfo = {
        temperature: 25,
        humidity: 65,
        wind_speed: 12,
        wind_direction: 180,
        pressure: 2000, // Too high
      };

      render(<WeatherSection weather={invalidWeather} />);
      
      expect(screen.getByTestId('weather-section-invalid')).toBeInTheDocument();
    });
  });

  describe('Valid Data Display', () => {
    it('displays weather badges with valid data', () => {
      render(<WeatherSection {...defaultProps} />);
      
      expect(screen.getByTestId('weather-section')).toBeInTheDocument();
      expect(screen.getByTestId('weather-badges')).toBeInTheDocument();
    });

    it('displays section heading', () => {
      render(<WeatherSection {...defaultProps} />);
      
      expect(screen.getByText('Current Weather')).toBeInTheDocument();
    });

    it('displays last updated timestamp when provided', () => {
      render(<WeatherSection {...defaultProps} />);
      
      const timestampElement = screen.getByText(/Last updated:/);
      expect(timestampElement).toBeInTheDocument();
    });

    it('does not display timestamp when not provided', () => {
      render(<WeatherSection weather={mockWeatherData} />);
      
      const timestampElement = screen.queryByText(/Last updated:/);
      expect(timestampElement).not.toBeInTheDocument();
    });

    it('formats timestamp correctly', () => {
      const timestamp = '2024-01-15T14:30:00Z';
      render(<WeatherSection weather={mockWeatherData} lastUpdated={timestamp} />);
      
      const timestampElement = screen.getByText(/Last updated:/);
      expect(timestampElement).toBeInTheDocument();
      // Timestamp should be formatted as locale time
      expect(timestampElement.textContent).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });
  });

  describe('Unit Conversion', () => {
    it('uses metric units by default', () => {
      render(<WeatherSection {...defaultProps} />);
      
      // Temperature should be in Celsius (25°C)
      expect(screen.getByTestId('temperature-value')).toHaveTextContent('25');
    });

    it('converts to imperial units when requested', () => {
      render(<WeatherSection {...defaultProps} useImperialUnits={true} />);
      
      // Temperature should be in Fahrenheit (25°C = 77°F)
      expect(screen.getByTestId('temperature-value')).toHaveTextContent('77');
    });

    it('passes unit preferences to weather formatter', () => {
      const { rerender } = render(<WeatherSection {...defaultProps} useImperialUnits={false} />);
      
      // Metric units
      expect(screen.getByTestId('temperature-value')).toHaveTextContent('25');
      
      // Switch to imperial
      rerender(<WeatherSection {...defaultProps} useImperialUnits={true} />);
      
      // Imperial units
      expect(screen.getByTestId('temperature-value')).toHaveTextContent('77');
    });
  });

  describe('Component Styling', () => {
    it('applies glassmorphic card styling', () => {
      const { container } = render(<WeatherSection {...defaultProps} />);
      
      const card = container.querySelector('.glass-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('rounded-2xl');
      expect(card).toHaveClass('p-6');
    });

    it('applies consistent styling across all states', () => {
      const { container: loadingContainer } = render(
        <WeatherSection {...defaultProps} isLoading={true} />
      );
      const { container: errorContainer } = render(
        <WeatherSection {...defaultProps} error="Error" />
      );
      const { container: validContainer } = render(
        <WeatherSection {...defaultProps} />
      );

      expect(loadingContainer.querySelector('.glass-card')).toBeInTheDocument();
      expect(errorContainer.querySelector('.glass-card')).toBeInTheDocument();
      expect(validContainer.querySelector('.glass-card')).toBeInTheDocument();
    });
  });

  describe('Requirements Validation', () => {
    it('meets Requirement 5.4: extracts weather data from API response', () => {
      render(<WeatherSection {...defaultProps} />);
      
      // Weather badges should be displayed with extracted data
      expect(screen.getByTestId('weather-badges')).toBeInTheDocument();
      expect(screen.getByTestId('temperature-value')).toHaveTextContent('25');
      expect(screen.getByTestId('humidity-value')).toHaveTextContent('65');
      expect(screen.getByTestId('wind-speed-value')).toHaveTextContent('12'); // 12 rounds to 12
      expect(screen.getByTestId('pressure-value')).toHaveTextContent('1013');
    });

    it('meets Requirement 5.5: formats values with appropriate units', () => {
      // Test metric units
      const { rerender } = render(<WeatherSection {...defaultProps} useImperialUnits={false} />);
      expect(screen.getByTestId('temperature-value')).toHaveTextContent('25'); // Celsius
      
      // Test imperial units
      rerender(<WeatherSection {...defaultProps} useImperialUnits={true} />);
      expect(screen.getByTestId('temperature-value')).toHaveTextContent('77'); // Fahrenheit
    });
  });

  describe('Edge Cases', () => {
    it('handles zero values correctly', () => {
      const zeroWeather: WeatherInfo = {
        temperature: 0,
        humidity: 0,
        wind_speed: 0,
        wind_direction: 0,
        pressure: 1013.25,
      };

      render(<WeatherSection weather={zeroWeather} />);
      
      expect(screen.getByTestId('weather-section')).toBeInTheDocument();
      expect(screen.getByTestId('temperature-value')).toHaveTextContent('0');
    });

    it('handles negative temperature', () => {
      const coldWeather: WeatherInfo = {
        temperature: -10,
        humidity: 65,
        wind_speed: 12,
        wind_direction: 180,
        pressure: 1013.25,
      };

      render(<WeatherSection weather={coldWeather} />);
      
      expect(screen.getByTestId('weather-section')).toBeInTheDocument();
      expect(screen.getByTestId('temperature-value')).toHaveTextContent('-10');
    });

    it('handles extreme but valid values', () => {
      const extremeWeather: WeatherInfo = {
        temperature: 50,
        humidity: 100,
        wind_speed: 200,
        wind_direction: 360,
        pressure: 900,
      };

      render(<WeatherSection weather={extremeWeather} />);
      
      expect(screen.getByTestId('weather-section')).toBeInTheDocument();
    });
  });
});

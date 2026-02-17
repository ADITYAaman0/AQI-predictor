/**
 * WeatherBadges Component Tests
 * 
 * Unit tests for the WeatherBadges component.
 * Tests rendering, data display, and interactions.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WeatherBadges, WeatherBadgesProps } from '../WeatherBadges';

describe('WeatherBadges', () => {
  const mockWeatherData: WeatherBadgesProps = {
    temperature: 25.5,
    humidity: 65.3,
    windSpeed: 12.8,
    windDirection: 180, // South
    pressure: 1013.25,
  };

  describe('Rendering', () => {
    it('renders all four weather badges', () => {
      render(<WeatherBadges {...mockWeatherData} />);
      
      expect(screen.getByTestId('weather-badge-temperature')).toBeInTheDocument();
      expect(screen.getByTestId('weather-badge-humidity')).toBeInTheDocument();
      expect(screen.getByTestId('weather-badge-wind')).toBeInTheDocument();
      expect(screen.getByTestId('weather-badge-pressure')).toBeInTheDocument();
    });

    it('renders with correct ARIA labels', () => {
      render(<WeatherBadges {...mockWeatherData} />);
      
      const container = screen.getByRole('group', { name: 'Weather conditions' });
      expect(container).toBeInTheDocument();
    });

    it('applies glassmorphic styling to all badges', () => {
      const { container } = render(<WeatherBadges {...mockWeatherData} />);
      
      const badges = container.querySelectorAll('.weather-badge');
      expect(badges).toHaveLength(4);
      
      badges.forEach(badge => {
        expect(badge).toHaveClass('glass-card');
        expect(badge).toHaveClass('rounded-full');
        expect(badge).toHaveClass('w-14');
        expect(badge).toHaveClass('h-14');
      });
    });
  });

  describe('Temperature Badge', () => {
    it('displays temperature value rounded to nearest integer', () => {
      render(<WeatherBadges {...mockWeatherData} />);
      
      const tempValue = screen.getByTestId('temperature-value');
      expect(tempValue).toHaveTextContent('26'); // 25.5 rounded
    });

    it('displays temperature unit (°C)', () => {
      const { container } = render(<WeatherBadges {...mockWeatherData} />);
      
      const tempBadge = screen.getByTestId('weather-badge-temperature');
      expect(tempBadge).toHaveTextContent('°C');
    });

    it('shows temperature in title attribute', () => {
      render(<WeatherBadges {...mockWeatherData} />);
      
      const tempBadge = screen.getByTestId('weather-badge-temperature');
      expect(tempBadge).toHaveAttribute('title', 'Temperature: 25.5°C');
    });

    it('handles negative temperatures', () => {
      render(<WeatherBadges {...mockWeatherData} temperature={-5.7} />);
      
      const tempValue = screen.getByTestId('temperature-value');
      expect(tempValue).toHaveTextContent('-6');
    });

    it('handles zero temperature', () => {
      render(<WeatherBadges {...mockWeatherData} temperature={0} />);
      
      const tempValue = screen.getByTestId('temperature-value');
      expect(tempValue).toHaveTextContent('0');
    });
  });

  describe('Humidity Badge', () => {
    it('displays humidity value rounded to nearest integer', () => {
      render(<WeatherBadges {...mockWeatherData} />);
      
      const humidityValue = screen.getByTestId('humidity-value');
      expect(humidityValue).toHaveTextContent('65'); // 65.3 rounded
    });

    it('displays humidity unit (%)', () => {
      const { container } = render(<WeatherBadges {...mockWeatherData} />);
      
      const humidityBadge = screen.getByTestId('weather-badge-humidity');
      expect(humidityBadge).toHaveTextContent('%');
    });

    it('shows humidity in title attribute', () => {
      render(<WeatherBadges {...mockWeatherData} />);
      
      const humidityBadge = screen.getByTestId('weather-badge-humidity');
      expect(humidityBadge).toHaveAttribute('title', 'Humidity: 65.3%');
    });

    it('handles 0% humidity', () => {
      render(<WeatherBadges {...mockWeatherData} humidity={0} />);
      
      const humidityValue = screen.getByTestId('humidity-value');
      expect(humidityValue).toHaveTextContent('0');
    });

    it('handles 100% humidity', () => {
      render(<WeatherBadges {...mockWeatherData} humidity={100} />);
      
      const humidityValue = screen.getByTestId('humidity-value');
      expect(humidityValue).toHaveTextContent('100');
    });
  });

  describe('Wind Badge', () => {
    it('displays wind speed rounded to nearest integer', () => {
      render(<WeatherBadges {...mockWeatherData} />);
      
      const windValue = screen.getByTestId('wind-speed-value');
      expect(windValue).toHaveTextContent('13'); // 12.8 rounded
    });

    it('displays wind direction label', () => {
      render(<WeatherBadges {...mockWeatherData} />);
      
      const windLabel = screen.getByTestId('wind-direction-label');
      expect(windLabel).toHaveTextContent('S'); // 180 degrees = South
    });

    it('shows wind info in title attribute', () => {
      render(<WeatherBadges {...mockWeatherData} />);
      
      const windBadge = screen.getByTestId('weather-badge-wind');
      expect(windBadge).toHaveAttribute('title', 'Wind: 12.8 km/h S');
    });

    it('rotates wind arrow based on direction', () => {
      render(<WeatherBadges {...mockWeatherData} windDirection={180} />);
      
      const windArrow = screen.getByTestId('wind-arrow');
      expect(windArrow).toHaveStyle({ transform: 'rotate(180deg)' });
    });

    describe('Wind Direction Compass', () => {
      const testCases = [
        { degrees: 0, expected: 'N' },
        { degrees: 45, expected: 'NE' },
        { degrees: 90, expected: 'E' },
        { degrees: 135, expected: 'SE' },
        { degrees: 180, expected: 'S' },
        { degrees: 225, expected: 'SW' },
        { degrees: 270, expected: 'W' },
        { degrees: 315, expected: 'NW' },
        { degrees: 360, expected: 'N' }, // Full circle
      ];

      testCases.forEach(({ degrees, expected }) => {
        it(`converts ${degrees}° to ${expected}`, () => {
          render(<WeatherBadges {...mockWeatherData} windDirection={degrees} />);
          
          const windLabel = screen.getByTestId('wind-direction-label');
          expect(windLabel).toHaveTextContent(expected);
        });
      });

      it('handles degrees > 360 (wraps around)', () => {
        render(<WeatherBadges {...mockWeatherData} windDirection={405} />);
        
        const windLabel = screen.getByTestId('wind-direction-label');
        expect(windLabel).toHaveTextContent('NE'); // 405 % 360 = 45 = NE
      });
    });

    it('handles zero wind speed', () => {
      render(<WeatherBadges {...mockWeatherData} windSpeed={0} />);
      
      const windValue = screen.getByTestId('wind-speed-value');
      expect(windValue).toHaveTextContent('0');
    });
  });

  describe('Pressure Badge', () => {
    it('displays pressure value rounded to nearest integer', () => {
      render(<WeatherBadges {...mockWeatherData} />);
      
      const pressureValue = screen.getByTestId('pressure-value');
      expect(pressureValue).toHaveTextContent('1013'); // 1013.25 rounded
    });

    it('displays pressure unit (hPa)', () => {
      const { container } = render(<WeatherBadges {...mockWeatherData} />);
      
      const pressureBadge = screen.getByTestId('weather-badge-pressure');
      expect(pressureBadge).toHaveTextContent('hPa');
    });

    it('shows pressure in title attribute', () => {
      render(<WeatherBadges {...mockWeatherData} />);
      
      const pressureBadge = screen.getByTestId('weather-badge-pressure');
      expect(pressureBadge).toHaveAttribute('title', 'Pressure: 1013.25 hPa');
    });

    it('handles low pressure values', () => {
      render(<WeatherBadges {...mockWeatherData} pressure={950} />);
      
      const pressureValue = screen.getByTestId('pressure-value');
      expect(pressureValue).toHaveTextContent('950');
    });

    it('handles high pressure values', () => {
      render(<WeatherBadges {...mockWeatherData} pressure={1050} />);
      
      const pressureValue = screen.getByTestId('pressure-value');
      expect(pressureValue).toHaveTextContent('1050');
    });
  });

  describe('Layout and Styling', () => {
    it('arranges badges horizontally with gap', () => {
      const { container } = render(<WeatherBadges {...mockWeatherData} />);
      
      const badgesContainer = screen.getByTestId('weather-badges');
      expect(badgesContainer).toHaveClass('flex');
      expect(badgesContainer).toHaveClass('gap-3'); // 12px gap
    });

    it('applies hover scale effect to badges', () => {
      const { container } = render(<WeatherBadges {...mockWeatherData} />);
      
      const badges = container.querySelectorAll('.weather-badge');
      badges.forEach(badge => {
        expect(badge).toHaveClass('hover:scale-105');
        expect(badge).toHaveClass('transition-all');
        expect(badge).toHaveClass('duration-300');
      });
    });

    it('uses correct badge dimensions (56px = 14 * 4px)', () => {
      const { container } = render(<WeatherBadges {...mockWeatherData} />);
      
      const badges = container.querySelectorAll('.weather-badge');
      badges.forEach(badge => {
        expect(badge).toHaveClass('w-14'); // 56px
        expect(badge).toHaveClass('h-14'); // 56px
      });
    });

    it('uses correct icon size (20px = 5 * 4px)', () => {
      const { container } = render(<WeatherBadges {...mockWeatherData} />);
      
      const icons = container.querySelectorAll('svg');
      icons.forEach(icon => {
        expect(icon).toHaveClass('w-5'); // 20px
        expect(icon).toHaveClass('h-5'); // 20px
      });
    });
  });

  describe('Accessibility', () => {
    it('provides descriptive title attributes for all badges', () => {
      render(<WeatherBadges {...mockWeatherData} />);
      
      expect(screen.getByTestId('weather-badge-temperature')).toHaveAttribute('title');
      expect(screen.getByTestId('weather-badge-humidity')).toHaveAttribute('title');
      expect(screen.getByTestId('weather-badge-wind')).toHaveAttribute('title');
      expect(screen.getByTestId('weather-badge-pressure')).toHaveAttribute('title');
    });

    it('marks icons as decorative with aria-hidden', () => {
      const { container } = render(<WeatherBadges {...mockWeatherData} />);
      
      const icons = container.querySelectorAll('svg');
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('groups badges with semantic role', () => {
      render(<WeatherBadges {...mockWeatherData} />);
      
      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-label', 'Weather conditions');
    });
  });

  describe('Edge Cases', () => {
    it('handles all zero values', () => {
      render(
        <WeatherBadges
          temperature={0}
          humidity={0}
          windSpeed={0}
          windDirection={0}
          pressure={0}
        />
      );
      
      expect(screen.getByTestId('temperature-value')).toHaveTextContent('0');
      expect(screen.getByTestId('humidity-value')).toHaveTextContent('0');
      expect(screen.getByTestId('wind-speed-value')).toHaveTextContent('0');
      expect(screen.getByTestId('pressure-value')).toHaveTextContent('0');
    });

    it('handles extreme temperature values', () => {
      render(<WeatherBadges {...mockWeatherData} temperature={-40} />);
      expect(screen.getByTestId('temperature-value')).toHaveTextContent('-40');
      
      const { rerender } = render(<WeatherBadges {...mockWeatherData} temperature={50} />);
      expect(screen.getByTestId('temperature-value')).toHaveTextContent('50');
    });

    it('handles decimal values correctly (rounds)', () => {
      render(
        <WeatherBadges
          temperature={25.4}
          humidity={65.6}
          windSpeed={12.3}
          windDirection={180}
          pressure={1013.7}
        />
      );
      
      expect(screen.getByTestId('temperature-value')).toHaveTextContent('25');
      expect(screen.getByTestId('humidity-value')).toHaveTextContent('66');
      expect(screen.getByTestId('wind-speed-value')).toHaveTextContent('12');
      expect(screen.getByTestId('pressure-value')).toHaveTextContent('1014');
    });
  });

  describe('Requirements Validation', () => {
    it('meets Requirement 5.1: displays circular weather badges', () => {
      const { container } = render(<WeatherBadges {...mockWeatherData} />);
      
      const badges = container.querySelectorAll('.weather-badge');
      expect(badges).toHaveLength(4);
      badges.forEach(badge => {
        expect(badge).toHaveClass('rounded-full');
      });
    });

    it('meets Requirement 5.2: formats badges as 56px diameter circles with glassmorphic background', () => {
      const { container } = render(<WeatherBadges {...mockWeatherData} />);
      
      const badges = container.querySelectorAll('.weather-badge');
      badges.forEach(badge => {
        expect(badge).toHaveClass('w-14'); // 56px
        expect(badge).toHaveClass('h-14'); // 56px
        expect(badge).toHaveClass('glass-card');
      });
    });

    it('meets Requirement 5.3: shows weather icons at 20px size with values in 14px font', () => {
      const { container } = render(<WeatherBadges {...mockWeatherData} />);
      
      // Check icon size
      const icons = container.querySelectorAll('svg');
      icons.forEach(icon => {
        expect(icon).toHaveClass('w-5'); // 20px
        expect(icon).toHaveClass('h-5'); // 20px
      });
      
      // Check value font size
      const values = [
        screen.getByTestId('temperature-value'),
        screen.getByTestId('humidity-value'),
        screen.getByTestId('wind-speed-value'),
        screen.getByTestId('pressure-value'),
      ];
      values.forEach(value => {
        expect(value).toHaveClass('text-sm'); // 14px
      });
    });
  });
});

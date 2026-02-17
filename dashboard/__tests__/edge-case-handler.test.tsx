/**
 * Edge Case Handler Hook Tests
 * 
 * Tests for useEdgeCaseHandler hook functionality
 */

import { renderHook } from '@testing-library/react';
import { useEdgeCaseHandler } from '@/lib/hooks/useEdgeCaseHandler';

describe('useEdgeCaseHandler', () => {
  describe('handleAQIData', () => {
    it('should handle valid AQI data', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const data = {
        aqi: 50,
        category: 'good',
        pollutants: { pm25: 25, pm10: 50 },
        coordinates: { lat: 28.6139, lon: 77.2090 },
        timestamp: new Date().toISOString(),
      };

      const sanitized = result.current.handleAQIData(data);
      
      expect(sanitized.aqi).toBe(50);
      expect(sanitized.category).toBe('good');
      expect(sanitized.hasIssues).toBe(false);
      expect(sanitized.warnings.length).toBe(0);
    });

    it('should sanitize invalid AQI values', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const data = {
        aqi: -50, // Invalid
        pollutants: {},
      };

      const sanitized = result.current.handleAQIData(data);
      
      expect(sanitized.aqi).toBe(0); // Sanitized to minimum
      expect(sanitized.hasIssues).toBe(true);
      expect(sanitized.warnings.length).toBeGreaterThan(0);
    });

    it('should handle missing AQI value', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const data = {
        pollutants: {},
      };

      const sanitized = result.current.handleAQIData(data);
      
      expect(sanitized.aqi).toBe(0);
      expect(sanitized.hasIssues).toBe(true);
    });

    it('should sanitize out-of-range pollutant values', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const data = {
        aqi: 100,
        pollutants: {
          pm25: -10, // Invalid
          pm10: 3000, // Invalid
          o3: 0.5, // Valid
        },
      };

      const sanitized = result.current.handleAQIData(data);
      
      expect(sanitized.pollutants['pm25']).toBe(0); // Sanitized
      expect(sanitized.pollutants['pm10']).toBe(2000); // Sanitized to max
      expect(sanitized.pollutants['o3']).toBe(0.5); // Unchanged
      expect(sanitized.hasIssues).toBe(true);
    });

    it('should handle missing pollutant values', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const data = {
        aqi: 100,
        pollutants: {
          pm25: null,
          pm10: null,
        },
      };

      const sanitized = result.current.handleAQIData(data);
      
      expect(sanitized.pollutants['pm25']).toBe(0);
      expect(sanitized.pollutants['pm10']).toBe(0);
      expect(sanitized.hasIssues).toBe(true);
    });

    it('should validate and reject invalid coordinates', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const data = {
        aqi: 100,
        coordinates: { lat: 95, lon: 200 }, // Invalid
      };

      const sanitized = result.current.handleAQIData(data);
      
      expect(sanitized.coordinates).toBeNull();
      expect(sanitized.hasIssues).toBe(true);
    });

    it('should accept valid coordinates', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const data = {
        aqi: 100,
        coordinates: { lat: 28.6139, lon: 77.2090 },
      };

      const sanitized = result.current.handleAQIData(data);
      
      expect(sanitized.coordinates).not.toBeNull();
      expect(sanitized.coordinates?.lat).toBe(28.6139);
      expect(sanitized.coordinates?.lon).toBe(77.2090);
    });

    it('should use current time for missing timestamp', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const data = {
        aqi: 100,
      };

      const before = Date.now();
      const sanitized = result.current.handleAQIData(data);
      const after = Date.now();
      
      const timestamp = new Date(sanitized.timestamp).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should infer correct category from AQI', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const testCases = [
        { aqi: 25, expectedCategory: 'good' },
        { aqi: 75, expectedCategory: 'moderate' },
        { aqi: 125, expectedCategory: 'unhealthy_sensitive' },
        { aqi: 175, expectedCategory: 'unhealthy' },
        { aqi: 250, expectedCategory: 'very_unhealthy' },
        { aqi: 400, expectedCategory: 'hazardous' },
      ];

      testCases.forEach(({ aqi, expectedCategory }) => {
        const data = { aqi };
        const sanitized = result.current.handleAQIData(data);
        expect(sanitized.category).toBe(expectedCategory);
      });
    });
  });

  describe('validateResponse', () => {
    it('should validate complete responses', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const response = {
        aqi: 50,
        category: 'good',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const validation = result.current.validateResponse(response, [
        'aqi',
        'category',
        'timestamp',
      ]);

      expect(validation.isValid).toBe(true);
    });

    it('should detect missing fields', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const response = {
        aqi: 50,
      };

      const validation = result.current.validateResponse(response, [
        'aqi',
        'category',
        'timestamp',
      ]);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBe(2);
    });
  });

  describe('extractNumber', () => {
    it('should extract valid numbers', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      expect(result.current.extractNumber(123)).toBe(123);
      expect(result.current.extractNumber('456')).toBe(456);
      expect(result.current.extractNumber('78.9')).toBe(78.9);
    });

    it('should use fallback for invalid numbers', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      expect(result.current.extractNumber('invalid', 0)).toBe(0);
      expect(result.current.extractNumber(null, 10)).toBe(10);
      expect(result.current.extractNumber(undefined, 20)).toBe(20);
    });
  });

  describe('handleWeatherData', () => {
    it('should accept valid weather data', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const weather = {
        temperature: 25,
        humidity: 60,
        wind_speed: 10,
        wind_direction: 180,
        pressure: 1013,
      };

      const handled = result.current.handleWeatherData(weather);
      
      expect(handled.hasIssues).toBe(false);
      expect(handled.data).toEqual(weather);
    });

    it('should use defaults for missing weather data', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const handled = result.current.handleWeatherData(null);
      
      expect(handled.hasIssues).toBe(true);
      expect(handled.data.temperature).toBeDefined();
      expect(handled.data.humidity).toBeDefined();
    });

    it('should sanitize invalid weather values', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const weather = {
        temperature: -200, // Invalid
        humidity: 150, // Invalid
        wind_speed: 10, // Valid
      };

      const handled = result.current.handleWeatherData(weather);
      
      expect(handled.hasIssues).toBe(true);
      expect(handled.data.temperature).toBeDefined();
      expect(handled.data.humidity).toBeDefined();
      expect(handled.data.wind_speed).toBe(10);
    });

    it('should use defaults for missing individual fields', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const weather = {
        temperature: 25,
        // Missing other fields
      };

      const handled = result.current.handleWeatherData(weather);
      
      expect(handled.hasIssues).toBe(true);
      expect(handled.data.temperature).toBe(25);
      expect(handled.data.humidity).toBeDefined();
      expect(handled.data.wind_speed).toBeDefined();
    });
  });

  describe('handleArrayResponse', () => {
    it('should handle valid arrays', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const data = [1, 2, 3, 4, 5];
      const handled = result.current.handleArrayResponse(data);
      
      expect(handled.items).toEqual(data);
      expect(handled.hasIssues).toBe(false);
    });

    it('should handle empty arrays', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const handled = result.current.handleArrayResponse([]);
      
      expect(handled.items).toEqual([]);
      expect(handled.hasIssues).toBe(true);
      expect(handled.warnings[0]).toContain('empty');
    });

    it('should handle non-array values', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const handled = result.current.handleArrayResponse('not an array');
      
      expect(handled.items).toEqual([]);
      expect(handled.hasIssues).toBe(true);
    });

    it('should filter items with validator', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const data = [1, 2, 3, 4, 5, 6];
      const validator = (item: number) => item > 3;
      const handled = result.current.handleArrayResponse(data, validator);
      
      expect(handled.items).toEqual([4, 5, 6]);
      expect(handled.hasIssues).toBe(true); // Some items filtered
    });
  });

  describe('Integration: Complex Data Handling', () => {
    it('should handle completely invalid data gracefully', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const data = {
        aqi: 'not a number',
        category: null,
        pollutants: {
          pm25: 'invalid',
          pm10: -1000,
        },
        coordinates: { lat: 200, lon: 300 },
        timestamp: 'invalid date',
      };

      // Type assertion to bypass TypeScript errors for testing
      const sanitized = result.current.handleAQIData(data as any);
      
      expect(sanitized.aqi).toBeGreaterThanOrEqual(0);
      expect(sanitized.aqi).toBeLessThanOrEqual(500);
      expect(sanitized.hasIssues).toBe(true);
      expect(sanitized.warnings.length).toBeGreaterThan(0);
    });

    it('should handle partially valid data', () => {
      const { result } = renderHook(() => useEdgeCaseHandler());
      
      const data = {
        aqi: 75, // Valid
        pollutants: {
          pm25: 35, // Valid
          pm10: -10, // Invalid
        },
      };

      const sanitized = result.current.handleAQIData(data);
      
      expect(sanitized.aqi).toBe(75);
      expect(sanitized.pollutants['pm25']).toBe(35);
      expect(sanitized.pollutants['pm10']).toBe(0); // Sanitized
      expect(sanitized.hasIssues).toBe(true);
    });
  });
});

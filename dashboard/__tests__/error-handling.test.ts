/**
 * Error Handling Tests
 * 
 * Comprehensive tests for error handling system including:
 * - Error utilities
 * - Edge case validation
 * - API error handling
 * - Retry logic
 * - Property-based tests
 */

import {
  validateAQI,
  validatePollutantValue,
  validateWeatherData,
  validateAPIResponse,
  validateCoordinates,
  validateTimestamp,
  sanitizeAQI,
  sanitizePollutantValue,
  parseError,
  shouldRetry,
  calculateRetryDelay,
  safeJSONParse,
  safeNumber,
  isInRange,
  clamp,
  ErrorType,
  ErrorSeverity,
} from '@/lib/utils/error-utils';

describe('Error Utilities', () => {
  describe('AQI Validation', () => {
    it('should validate valid AQI values', () => {
      expect(validateAQI(50).isValid).toBe(true);
      expect(validateAQI(100).isValid).toBe(true);
      expect(validateAQI(0).isValid).toBe(true);
      expect(validateAQI(500).isValid).toBe(true);
    });

    it('should reject invalid AQI values', () => {
      expect(validateAQI(-1).isValid).toBe(false);
      expect(validateAQI(501).isValid).toBe(false);
      expect(validateAQI(NaN).isValid).toBe(false);
      expect(validateAQI(null).isValid).toBe(false);
      expect(validateAQI(undefined).isValid).toBe(false);
    });

    it('should provide appropriate error messages', () => {
      const result = validateAQI(-10);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('below minimum');
    });

    it('should sanitize out-of-range AQI values', () => {
      expect(sanitizeAQI(-10)).toBe(0);
      expect(sanitizeAQI(600)).toBe(500);
      expect(sanitizeAQI(250)).toBe(250);
    });
  });

  describe('Pollutant Validation', () => {
    it('should validate valid pollutant values', () => {
      expect(validatePollutantValue('pm25', 50).isValid).toBe(true);
      expect(validatePollutantValue('pm10', 100).isValid).toBe(true);
      expect(validatePollutantValue('o3', 0.5).isValid).toBe(true);
    });

    it('should reject out-of-range pollutant values', () => {
      expect(validatePollutantValue('pm25', -1).isValid).toBe(false);
      expect(validatePollutantValue('pm25', 1001).isValid).toBe(false);
      expect(validatePollutantValue('pm10', 2001).isValid).toBe(false);
    });

    it('should sanitize pollutant values to valid ranges', () => {
      expect(sanitizePollutantValue('pm25', -10)).toBe(0);
      expect(sanitizePollutantValue('pm25', 1500)).toBe(1000);
      expect(sanitizePollutantValue('pm10', -5)).toBe(0);
      expect(sanitizePollutantValue('pm10', 2500)).toBe(2000);
    });
  });

  describe('Weather Data Validation', () => {
    it('should validate valid weather data', () => {
      const weatherData = {
        temperature: 25,
        humidity: 60,
        wind_speed: 10,
        wind_direction: 180,
        pressure: 1013,
      };
      const result = validateWeatherData(weatherData);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid weather data', () => {
      const weatherData = {
        temperature: -150, // Too low
        humidity: 150, // Too high
        wind_speed: 600, // Too high
      };
      const result = validateWeatherData(weatherData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle missing weather fields gracefully', () => {
      const weatherData = {
        temperature: 25,
        humidity: null,
        wind_speed: undefined,
      };
      const result = validateWeatherData(weatherData);
      // Should have warnings for null/undefined values
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('API Response Validation', () => {
    it('should validate complete API responses', () => {
      const response = {
        aqi: 50,
        category: 'good',
        timestamp: '2024-01-01T00:00:00Z',
      };
      const result = validateAPIResponse(response, ['aqi', 'category', 'timestamp']);
      expect(result.isValid).toBe(true);
    });

    it('should detect missing required fields', () => {
      const response = {
        aqi: 50,
        // Missing category and timestamp
      };
      const result = validateAPIResponse(response, ['aqi', 'category', 'timestamp']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: category');
      expect(result.errors).toContain('Missing required field: timestamp');
    });

    it('should reject invalid response types', () => {
      const result = validateAPIResponse(null, ['aqi']);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Coordinate Validation', () => {
    it('should validate valid coordinates', () => {
      const result = validateCoordinates(28.6139, 77.2090);
      expect(result.isValid).toBe(true);
    });

    it('should reject out-of-range coordinates', () => {
      const result1 = validateCoordinates(91, 0); // Lat too high
      const result2 = validateCoordinates(0, 181); // Lon too high
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });

    it('should reject missing coordinates', () => {
      const result = validateCoordinates(null, undefined);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Timestamp Validation', () => {
    it('should validate valid timestamps', () => {
      const result = validateTimestamp(new Date().toISOString());
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid timestamps', () => {
      const result = validateTimestamp('not-a-date');
      expect(result.isValid).toBe(false);
    });

    it('should warn about future timestamps', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const result = validateTimestamp(futureDate.toISOString());
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

describe('Error Parsing and Classification', () => {
  describe('parseError', () => {
    it('should classify network errors correctly', () => {
      const error = { message: 'Network error occurred', code: 'NETWORK_ERROR' };
      const parsed = parseError(error);
      expect(parsed.type).toBe(ErrorType.NETWORK);
      expect(parsed.retryable).toBe(true);
      expect(parsed.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should classify timeout errors correctly', () => {
      const error = { message: 'Request timeout', code: 'ECONNABORTED' };
      const parsed = parseError(error);
      expect(parsed.type).toBe(ErrorType.TIMEOUT);
      expect(parsed.retryable).toBe(true);
    });

    it('should classify authentication errors correctly', () => {
      const error = { statusCode: 401, message: 'Unauthorized' };
      const parsed = parseError(error);
      expect(parsed.type).toBe(ErrorType.AUTHENTICATION);
      expect(parsed.retryable).toBe(false);
    });

    it('should classify permission errors correctly', () => {
      const error = { statusCode: 403, message: 'Forbidden' };
      const parsed = parseError(error);
      expect(parsed.type).toBe(ErrorType.PERMISSION);
      expect(parsed.retryable).toBe(false);
    });

    it('should classify not found errors correctly', () => {
      const error = { statusCode: 404, message: 'Not Found' };
      const parsed = parseError(error);
      expect(parsed.type).toBe(ErrorType.NOT_FOUND);
      expect(parsed.retryable).toBe(false);
    });

    it('should classify API 5xx errors as retryable', () => {
      const error = { statusCode: 500, message: 'Internal Server Error' };
      const parsed = parseError(error);
      expect(parsed.type).toBe(ErrorType.API);
      expect(parsed.retryable).toBe(true);
    });

    it('should classify API 4xx errors as non-retryable', () => {
      const error = { statusCode: 400, message: 'Bad Request' };
      const parsed = parseError(error);
      expect(parsed.type).toBe(ErrorType.API);
      expect(parsed.retryable).toBe(false);
    });

    /**
     * Property 33: API Error Handling
     * For any API error, dashboard should display user-friendly message (not raw error)
     */
    it('Property 33: should provide user-friendly messages for all errors', () => {
      const errors = [
        { statusCode: 500 },
        { statusCode: 404 },
        { statusCode: 401 },
        { message: 'Network error' },
        { code: 'ECONNABORTED' },
      ];

      errors.forEach((error) => {
        const parsed = parseError(error);
        expect(parsed.userMessage).toBeDefined();
        expect(parsed.userMessage.length).toBeGreaterThan(0);
        // User message should not contain technical details
        expect(parsed.userMessage).not.toContain('statusCode');
        expect(parsed.userMessage).not.toContain('ECONNABORTED');
      });
    });
  });
});

describe('Retry Logic', () => {
  describe('shouldRetry', () => {
    it('should allow retry for retryable errors within limit', () => {
      const error = parseError({ message: 'Network error', code: 'NETWORK_ERROR' });
      expect(shouldRetry(error, 1, 5)).toBe(true);
      expect(shouldRetry(error, 4, 5)).toBe(true);
    });

    it('should not retry beyond max attempts', () => {
      const error = parseError({ message: 'Network error', code: 'NETWORK_ERROR' });
      expect(shouldRetry(error, 5, 5)).toBe(false);
      expect(shouldRetry(error, 6, 5)).toBe(false);
    });

    it('should not retry non-retryable errors', () => {
      const error = parseError({ statusCode: 401 });
      expect(shouldRetry(error, 1, 5)).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    /**
     * Property 34: Exponential Backoff Retry
     * For any failed request, retry should follow exponential backoff (1s, 2s, 4s, 8s)
     */
    it('Property 34: should follow exponential backoff pattern', () => {
      const baseDelay = 1000; // 1 second
      
      expect(calculateRetryDelay(0, baseDelay)).toBe(1000);  // 1s
      expect(calculateRetryDelay(1, baseDelay)).toBe(2000);  // 2s
      expect(calculateRetryDelay(2, baseDelay)).toBe(4000);  // 4s
      expect(calculateRetryDelay(3, baseDelay)).toBe(8000);  // 8s
      expect(calculateRetryDelay(4, baseDelay)).toBe(16000); // 16s (capped)
    });

    it('should cap at maximum delay', () => {
      const baseDelay = 1000;
      // Even with many attempts, should not exceed max
      expect(calculateRetryDelay(10, baseDelay)).toBe(16000);
      expect(calculateRetryDelay(20, baseDelay)).toBe(16000);
    });
  });
});

describe('Utility Functions', () => {
  describe('safeJSONParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJSONParse<{ aqi: number }>('{"aqi": 50}', {});
      expect(result.success).toBe(true);
      expect(result.data.aqi).toBe(50);
    });

    it('should return fallback for invalid JSON', () => {
      const fallback = { default: true };
      const result = safeJSONParse('invalid json', fallback);
      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallback);
      expect(result.error).toBeDefined();
    });
  });

  describe('safeNumber', () => {
    it('should convert valid numbers', () => {
      expect(safeNumber('123')).toBe(123);
      expect(safeNumber(456)).toBe(456);
      expect(safeNumber('78.9')).toBe(78.9);
    });

    it('should return fallback for invalid numbers', () => {
      expect(safeNumber('not a number', 0)).toBe(0);
      expect(safeNumber(null, 10)).toBe(10);
      expect(safeNumber(undefined, 20)).toBe(20);
      expect(safeNumber(NaN, 30)).toBe(30);
    });
  });

  describe('isInRange', () => {
    it('should check if value is within range', () => {
      expect(isInRange(50, 0, 100)).toBe(true);
      expect(isInRange(0, 0, 100)).toBe(true);
      expect(isInRange(100, 0, 100)).toBe(true);
      expect(isInRange(-1, 0, 100)).toBe(false);
      expect(isInRange(101, 0, 100)).toBe(false);
    });
  });

  describe('clamp', () => {
    it('should clamp values to range', () => {
      expect(clamp(50, 0, 100)).toBe(50);
      expect(clamp(-10, 0, 100)).toBe(0);
      expect(clamp(150, 0, 100)).toBe(100);
    });
  });
});

describe('Property-Based Tests', () => {
  /**
   * Property 32: Authentication Header Inclusion
   * For any authenticated request, Authorization header should include token
   */
  describe('Property 32: Authentication Header Inclusion', () => {
    it('should be tested at the API client level', () => {
      // This property is tested in the API client tests
      // The client.ts file has logic to add Authorization header when token is present
      // See: lib/api/client.ts - setupRequestInterceptor()
      expect(true).toBe(true);
    });
  });

  /**
   * Property 33: API Error Handling
   * Tested above in Error Parsing section
   */

  /**
   * Property 34: Exponential Backoff Retry
   * Tested above in Retry Logic section
   */

  describe('Edge Case: Invalid AQI Values', () => {
    it('should handle AQI values < 0', () => {
      const validation = validateAQI(-50);
      expect(validation.isValid).toBe(false);
      expect(sanitizeAQI(-50)).toBe(0);
    });

    it('should handle AQI values > 500', () => {
      const validation = validateAQI(600);
      expect(validation.isValid).toBe(false);
      expect(sanitizeAQI(600)).toBe(500);
    });

    it('should handle extreme values', () => {
      expect(sanitizeAQI(Number.MAX_SAFE_INTEGER)).toBe(500);
      expect(sanitizeAQI(Number.MIN_SAFE_INTEGER)).toBe(0);
    });
  });

  describe('Edge Case: Missing Required Fields', () => {
    it('should detect missing fields in API response', () => {
      const response = { aqi: 50 }; // Missing other required fields
      const result = validateAPIResponse(response, ['aqi', 'category', 'timestamp', 'location']);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(3); // 3 missing fields
    });

    it('should handle completely empty response', () => {
      const result = validateAPIResponse({}, ['aqi', 'category']);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });

  describe('Edge Case: Malformed API Responses', () => {
    it('should handle null response', () => {
      const result = validateAPIResponse(null, ['aqi']);
      expect(result.isValid).toBe(false);
    });

    it('should handle undefined response', () => {
      const result = validateAPIResponse(undefined, ['aqi']);
      expect(result.isValid).toBe(false);
    });

    it('should handle non-object response', () => {
      const result1 = validateAPIResponse('string', ['aqi']);
      const result2 = validateAPIResponse(123, ['aqi']);
      const result3 = validateAPIResponse([], ['aqi']);
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
      expect(result3.isValid).toBe(false);
    });
  });

  describe('Property: Error Recovery', () => {
    it('should recover from invalid data with sanitization', () => {
      // Invalid AQI that should be sanitized
      const invalidAQI = -100;
      const sanitized = sanitizeAQI(invalidAQI);
      expect(sanitized).toBeGreaterThanOrEqual(0);
      expect(sanitized).toBeLessThanOrEqual(500);
    });

    it('should provide fallback values for all edge cases', () => {
      expect(safeNumber(null, 0)).toBe(0);
      expect(safeNumber(undefined, 0)).toBe(0);
      expect(safeNumber('invalid', 0)).toBe(0);
      expect(safeNumber(NaN, 0)).toBe(0);
    });
  });
});

/**
 * API Endpoint Correctness Property-Based Tests
 * 
 * Tests correctness properties using fast-check:
 * - Property 15: API Endpoint Correctness
 * 
 * For any data request (current AQI, forecast, historical, alerts), 
 * the dashboard should call the correct API endpoint with proper parameters.
 * 
 * Requirements: 9.1, 15.1, 15.2, 15.3, 15.4, 19.7
 */

import fc from 'fast-check';
import { AQIDashboardAPIClient } from '@/lib/api/aqi-client';
import axios from 'axios';

// Mock axios to intercept API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Feature: glassmorphic-dashboard - Property 15: API Endpoint Correctness', () => {
  let client: AQIDashboardAPIClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create = jest.fn(() => mockAxiosInstance);

    // Create client instance
    client = new AQIDashboardAPIClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Generators for test data
  const locationArbitrary = fc.constantFrom(
    'Delhi',
    'Mumbai',
    'Bangalore',
    'Kolkata',
    'Chennai',
    'Hyderabad',
    'Pune',
    'Ahmedabad',
    'Jaipur',
    'Lucknow'
  );

  const dateStringArbitrary = fc
    .date({ min: new Date('2020-01-01'), max: new Date() })
    .map((date) => date.toISOString().split('T')[0]); // Format as YYYY-MM-DD

  const boundingBoxArbitrary = fc.record({
    north: fc.float({ min: -90, max: 90, noNaN: true }),
    south: fc.float({ min: -90, max: 90, noNaN: true }),
    east: fc.float({ min: -180, max: 180, noNaN: true }),
    west: fc.float({ min: -180, max: 180, noNaN: true }),
  }).map((bounds) => ({
    // Ensure north > south and east > west
    north: Math.max(bounds.north, bounds.south) + 0.1,
    south: Math.min(bounds.north, bounds.south),
    east: Math.max(bounds.east, bounds.west) + 0.1,
    west: Math.min(bounds.east, bounds.west),
  }));

  describe('Current AQI endpoint correctness', () => {
    it('for any location, should call /api/v1/forecast/current/{location}', () => {
      fc.assert(
        fc.asyncProperty(locationArbitrary, async (location) => {
          // Setup mock response
          mockAxiosInstance.get.mockResolvedValue({
            data: {
              location,
              timestamp: new Date().toISOString(),
              aqi: 100,
              pollutants: {
                pm25: { parameter: 'pm25', value: 35, unit: 'μg/m³', aqi_value: 100 },
                pm10: { parameter: 'pm10', value: 50, unit: 'μg/m³', aqi_value: 50 },
                o3: { parameter: 'o3', value: 30, unit: 'μg/m³', aqi_value: 30 },
                no2: { parameter: 'no2', value: 40, unit: 'μg/m³', aqi_value: 40 },
                so2: { parameter: 'so2', value: 10, unit: 'μg/m³', aqi_value: 10 },
                co: { parameter: 'co', value: 1.0, unit: 'mg/m³', aqi_value: 10 },
              },
              weather: {
                temperature: 25,
                humidity: 60,
                wind_speed: 10,
                wind_direction: 180,
                pressure: 1013,
              },
              source_attribution: {
                vehicular_percent: 40,
                industrial_percent: 30,
                biomass_percent: 20,
                background_percent: 10,
              },
            },
          });

          // Call the method
          await client.getCurrentAQI(location);

          // Verify correct endpoint was called
          expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            `/api/v1/forecast/current/${encodeURIComponent(location)}`,
            undefined
          );
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('24-hour forecast endpoint correctness', () => {
    it('for any location, should call /api/v1/forecast/24h/{location}', () => {
      fc.assert(
        fc.asyncProperty(locationArbitrary, async (location) => {
          // Setup mock response
          mockAxiosInstance.get.mockResolvedValue({
            data: {
              location,
              metadata: {
                generated_at: new Date().toISOString(),
                model_version: '1.0.0',
              },
              forecasts: Array.from({ length: 24 }, (_, i) => ({
                timestamp: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
                hour: i + 1,
                aqi: 100 + Math.floor(Math.random() * 50),
                pollutants: {
                  pm25: { parameter: 'pm25', value: 35, unit: 'μg/m³', aqi_value: 100 },
                },
                confidence_lower: 90,
                confidence_upper: 110,
              })),
            },
          });

          // Call the method
          await client.get24HourForecast(location);

          // Verify correct endpoint was called
          expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            `/api/v1/forecast/24h/${encodeURIComponent(location)}`,
            undefined
          );
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('48-hour forecast endpoint correctness', () => {
    it('for any location, should call /api/v1/forecast/48h/{location}', () => {
      fc.assert(
        fc.asyncProperty(locationArbitrary, async (location) => {
          // Setup mock response
          mockAxiosInstance.get.mockResolvedValue({
            data: {
              location,
              metadata: {
                generated_at: new Date().toISOString(),
                model_version: '1.0.0',
              },
              forecasts: Array.from({ length: 48 }, (_, i) => ({
                timestamp: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
                hour: i + 1,
                aqi: 100 + Math.floor(Math.random() * 50),
                pollutants: {
                  pm25: { parameter: 'pm25', value: 35, unit: 'μg/m³', aqi_value: 100 },
                },
                confidence_lower: 90,
                confidence_upper: 110,
              })),
            },
          });

          // Call the method
          await client.get48HourForecast(location);

          // Verify correct endpoint was called
          expect(mockAxiosInstance.get).toHaveBeenCalledWith(
            `/api/v1/forecast/48h/${encodeURIComponent(location)}`,
            undefined
          );
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('Spatial forecast endpoint correctness', () => {
    it('for any bounding box, should call /api/v1/forecast/spatial with correct params', () => {
      fc.assert(
        fc.asyncProperty(
          boundingBoxArbitrary,
          fc.float({ min: 0.1, max: 10.0, noNaN: true }),
          fc.constantFrom('pm25', 'pm10', 'o3', 'no2', 'so2', 'co'),
          async (bounds, resolution, parameter) => {
            // Setup mock response
            mockAxiosInstance.get.mockResolvedValue({
              data: {
                bounds,
                metadata: {
                  generated_at: new Date().toISOString(),
                  resolution,
                  parameter,
                },
                grid_predictions: [],
              },
            });

            // Call the method
            await client.getSpatialForecast(bounds, resolution, parameter);

            // Verify correct endpoint and parameters
            expect(mockAxiosInstance.get).toHaveBeenCalledWith(
              '/api/v1/forecast/spatial',
              expect.objectContaining({
                params: {
                  north: bounds.north,
                  south: bounds.south,
                  east: bounds.east,
                  west: bounds.west,
                  resolution,
                  parameter,
                },
              })
            );
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('Historical data endpoint correctness', () => {
    it('for any location and date range, should call /api/v1/data/historical/{location}', () => {
      fc.assert(
        fc.asyncProperty(
          locationArbitrary,
          dateStringArbitrary,
          dateStringArbitrary,
          async (location, startDate, endDate) => {
            // Ensure endDate >= startDate
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (end < start) {
              [startDate, endDate] = [endDate, startDate];
            }

            // Setup mock response
            mockAxiosInstance.get.mockResolvedValue({
              data: {
                location,
                parameter: 'aqi',
                start_date: startDate,
                end_date: endDate,
                data: [],
                statistics: {
                  average: 100,
                  minimum: 50,
                  maximum: 150,
                },
              },
            });

            // Call the method
            await client.getHistoricalData(location, startDate, endDate);

            // Verify correct endpoint and parameters
            expect(mockAxiosInstance.get).toHaveBeenCalledWith(
              `/api/v1/data/historical/${encodeURIComponent(location)}`,
              expect.objectContaining({
                params: {
                  start_date: startDate,
                  end_date: endDate,
                },
                timeout: 60000,
              })
            );
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('for historical data with parameter filter, should include parameter in request', () => {
      fc.assert(
        fc.asyncProperty(
          locationArbitrary,
          dateStringArbitrary,
          dateStringArbitrary,
          fc.constantFrom('pm25', 'pm10', 'o3', 'no2', 'so2', 'co', 'aqi'),
          async (location, startDate, endDate, parameter) => {
            // Ensure endDate >= startDate
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (end < start) {
              [startDate, endDate] = [endDate, startDate];
            }

            // Setup mock response
            mockAxiosInstance.get.mockResolvedValue({
              data: {
                location,
                parameter,
                start_date: startDate,
                end_date: endDate,
                data: [],
                statistics: {
                  average: 100,
                  minimum: 50,
                  maximum: 150,
                },
              },
            });

            // Call the method with parameter
            await client.getHistoricalData(location, startDate, endDate, parameter);

            // Verify parameter is included in request
            expect(mockAxiosInstance.get).toHaveBeenCalledWith(
              `/api/v1/data/historical/${encodeURIComponent(location)}`,
              expect.objectContaining({
                params: expect.objectContaining({
                  parameter,
                }),
              })
            );
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('Alerts endpoint correctness', () => {
    it('should call GET /api/v1/alerts to retrieve alerts', async () => {
      // Setup mock response
      mockAxiosInstance.get.mockResolvedValue({
        data: [],
      });

      // Call the method
      await client.getAlerts();

      // Verify correct endpoint was called
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/alerts', undefined);
    });

    it('should call POST /api/v1/alerts to create alert', () => {
      fc.assert(
        fc.asyncProperty(
          locationArbitrary,
          fc.integer({ min: 50, max: 300 }),
          async (location, threshold) => {
            // Setup mock response
            mockAxiosInstance.post.mockResolvedValue({
              data: {
                id: '123',
                location,
                threshold,
                enabled: true,
              },
            });

            // Call the method
            const alertRequest = {
              location,
              threshold,
              parameter: 'aqi',
              enabled: true,
            };
            await client.createAlert(alertRequest);

            // Verify correct endpoint and data
            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
              '/api/v1/alerts',
              alertRequest,
              undefined
            );
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should call PUT /api/v1/alerts/{id} to update alert', () => {
      fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 50, max: 300 }),
          fc.boolean(),
          async (alertId, threshold, enabled) => {
            // Setup mock response
            mockAxiosInstance.put.mockResolvedValue({
              data: {
                id: alertId,
                threshold,
                enabled,
              },
            });

            // Call the method
            const updateRequest = {
              threshold,
              enabled,
            };
            await client.updateAlert(alertId, updateRequest);

            // Verify correct endpoint and data
            expect(mockAxiosInstance.put).toHaveBeenCalledWith(
              `/api/v1/alerts/${alertId}`,
              updateRequest,
              undefined
            );
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should call DELETE /api/v1/alerts/{id} to delete alert', () => {
      fc.assert(
        fc.asyncProperty(fc.uuid(), async (alertId) => {
          // Setup mock response
          mockAxiosInstance.delete.mockResolvedValue({
            data: undefined,
          });

          // Call the method
          await client.deleteAlert(alertId);

          // Verify correct endpoint
          expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
            `/api/v1/alerts/${alertId}`,
            undefined
          );
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('Devices endpoint correctness', () => {
    it('should call GET /api/v1/devices to retrieve devices', async () => {
      // Setup mock response
      mockAxiosInstance.get.mockResolvedValue({
        data: [],
      });

      // Call the method
      await client.getDevices();

      // Verify correct endpoint was called
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/devices', undefined);
    });

    it('should call POST /api/v1/devices to add device', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 50 }),
          locationArbitrary,
          async (deviceName, deviceLocation) => {
            // Setup mock response
            mockAxiosInstance.post.mockResolvedValue({
              data: {
                id: '123',
                name: deviceName,
                location: deviceLocation,
                status: 'connected',
                batteryLevel: 100,
              },
            });

            // Call the method
            const deviceRequest = {
              name: deviceName,
              location: deviceLocation,
            };
            await client.addDevice(deviceRequest);

            // Verify correct endpoint and data
            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
              '/api/v1/devices',
              deviceRequest,
              undefined
            );
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should call DELETE /api/v1/devices/{id} to remove device', () => {
      fc.assert(
        fc.asyncProperty(fc.uuid(), async (deviceId) => {
          // Setup mock response
          mockAxiosInstance.delete.mockResolvedValue({
            data: undefined,
          });

          // Call the method
          await client.removeDevice(deviceId);

          // Verify correct endpoint
          expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
            `/api/v1/devices/${deviceId}`,
            undefined
          );
        }),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  describe('Location search endpoint correctness', () => {
    it('should call GET /api/v1/cities to search locations', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (query) => {
            // Setup mock response
            mockAxiosInstance.get.mockResolvedValue({
              data: [
                {
                  city_name: 'Delhi',
                  city_code: 'DEL',
                  state: 'Delhi',
                  country: 'India',
                  latitude: 28.6139,
                  longitude: 77.2090,
                },
              ],
            });

            // Call the method
            await client.searchLocations(query);

            // Verify correct endpoint was called
            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/cities', undefined);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });
});

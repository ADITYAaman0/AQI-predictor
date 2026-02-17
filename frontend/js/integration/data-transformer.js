/**
 * Data Transformer - Converts backend responses to frontend-compatible formats
 * Transforms measurement data to GeoJSON and calculates derived values
 */

import config from '../config/config.js';

class DataTransformer {
    constructor() {
        this.aqiBreakpoints = this.initializeAQIBreakpoints();
        this.aqiCategories = this.initializeAQICategories();
    }

    /**
     * Initialize AQI breakpoints for calculation
     */
    initializeAQIBreakpoints() {
        return {
            pm25: [
                { low: 0, high: 12, aqiLow: 0, aqiHigh: 50 },
                { low: 12.1, high: 35.4, aqiLow: 51, aqiHigh: 100 },
                { low: 35.5, high: 55.4, aqiLow: 101, aqiHigh: 150 },
                { low: 55.5, high: 150.4, aqiLow: 151, aqiHigh: 200 },
                { low: 150.5, high: 250.4, aqiLow: 201, aqiHigh: 300 },
                { low: 250.5, high: 500, aqiLow: 301, aqiHigh: 500 }
            ],
            pm10: [
                { low: 0, high: 54, aqiLow: 0, aqiHigh: 50 },
                { low: 55, high: 154, aqiLow: 51, aqiHigh: 100 },
                { low: 155, high: 254, aqiLow: 101, aqiHigh: 150 },
                { low: 255, high: 354, aqiLow: 151, aqiHigh: 200 },
                { low: 355, high: 424, aqiLow: 201, aqiHigh: 300 },
                { low: 425, high: 604, aqiLow: 301, aqiHigh: 500 }
            ],
            no2: [
                { low: 0, high: 53, aqiLow: 0, aqiHigh: 50 },
                { low: 54, high: 100, aqiLow: 51, aqiHigh: 100 },
                { low: 101, high: 360, aqiLow: 101, aqiHigh: 150 },
                { low: 361, high: 649, aqiLow: 151, aqiHigh: 200 },
                { low: 650, high: 1249, aqiLow: 201, aqiHigh: 300 },
                { low: 1250, high: 2049, aqiLow: 301, aqiHigh: 500 }
            ]
        };
    }

    /**
     * Initialize AQI categories and colors
     */
    initializeAQICategories() {
        return [
            { min: 0, max: 50, name: 'Good', color: '#00e400', class: 'aqi-good' },
            { min: 51, max: 100, name: 'Moderate', color: '#ffff00', class: 'aqi-moderate' },
            { min: 101, max: 150, name: 'Unhealthy for Sensitive Groups', color: '#ff7e00', class: 'aqi-unhealthy-sensitive' },
            { min: 151, max: 200, name: 'Unhealthy', color: '#ff0000', class: 'aqi-unhealthy' },
            { min: 201, max: 300, name: 'Very Unhealthy', color: '#8f3f97', class: 'aqi-very-unhealthy' },
            { min: 301, max: 500, name: 'Hazardous', color: '#7e0023', class: 'aqi-hazardous' }
        ];
    }

    /**
     * Convert measurement data to GeoJSON format
     * @param {Array} measurements - Raw measurement data from backend
     * @returns {Object} - GeoJSON FeatureCollection
     */
    toGeoJSON(measurements) {
        if (!Array.isArray(measurements)) {
            throw new Error('Measurements must be an array');
        }

        // Handle empty array
        if (measurements.length === 0) {
            return {
                type: 'FeatureCollection',
                features: [],
                metadata: {
                    count: 0,
                    generated_at: new Date().toISOString(),
                    bounds: null
                }
            };
        }

        const features = [];
        const errors = [];

        for (const measurement of measurements) {
            try {
                const feature = this.createGeoJSONFeature(measurement);
                features.push(feature);
            } catch (error) {
                errors.push({
                    measurement,
                    error: error.message
                });
                
                if (config.DEBUG) {
                    console.warn('Failed to create GeoJSON feature:', error.message, measurement);
                }
            }
        }

        // If ALL measurements failed, throw an error
        if (features.length === 0 && errors.length > 0) {
            throw new Error(`All measurements failed validation: ${errors[0].error}`);
        }

        return {
            type: 'FeatureCollection',
            features,
            metadata: {
                count: features.length,
                generated_at: new Date().toISOString(),
                bounds: this.calculateBounds(features),
                errors: errors.length > 0 ? errors : undefined
            }
        };
    }

    /**
     * Create individual GeoJSON feature from measurement
     * @param {Object} measurement - Single measurement object
     * @returns {Object} - GeoJSON Feature
     */
    createGeoJSONFeature(measurement) {
        // Validate required fields
        if (!measurement.location?.coordinates) {
            throw new Error('Missing location coordinates');
        }

        const [longitude, latitude] = measurement.location.coordinates;
        
        // Validate coordinates
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            throw new Error('Invalid coordinate types');
        }
        
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new Error('Coordinates out of valid range');
        }

        // Calculate AQI and pollutant data
        const pollutants = this.extractPollutants(measurement);
        const aqi = this.calculateOverallAQI(pollutants);
        const category = this.getAQICategory(aqi);

        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [longitude, latitude]
            },
            properties: {
                station_id: measurement.station_id,
                station_name: measurement.station_name || `Station ${measurement.station_id}`,
                district: measurement.district || 'Unknown',
                aqi: Math.round(aqi),
                category: category.name,
                color: category.color,
                class: category.class,
                pollutants,
                weather: this.extractWeatherData(measurement),
                source_attribution: this.extractSourceAttribution(measurement),
                forecast: this.extractForecastData(measurement),
                timestamp: measurement.time || new Date().toISOString(),
                confidence: measurement.confidence || 0.8
            }
        };
    }

    /**
     * Extract and process pollutant data
     * @param {Object} measurement - Measurement object
     * @returns {Object} - Processed pollutant data
     */
    extractPollutants(measurement) {
        const pollutants = {};
        const pollutantTypes = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];

        pollutantTypes.forEach(type => {
            if (measurement[type] !== undefined && measurement[type] !== null) {
                const value = parseFloat(measurement[type]);
                if (!isNaN(value) && value >= 0) {
                    pollutants[type] = {
                        value: Math.round(value * 10) / 10, // Round to 1 decimal
                        unit: this.getPollutantUnit(type),
                        aqi: Math.round(this.calculatePollutantAQI(type, value))
                    };
                }
            }
        });

        return pollutants;
    }

    /**
     * Get unit for pollutant type
     * @param {string} type - Pollutant type
     * @returns {string} - Unit string
     */
    getPollutantUnit(type) {
        const units = {
            pm25: 'μg/m³',
            pm10: 'μg/m³',
            no2: 'μg/m³',
            so2: 'μg/m³',
            co: 'mg/m³',
            o3: 'μg/m³'
        };
        return units[type] || 'μg/m³';
    }

    /**
     * Calculate AQI for individual pollutant
     * @param {string} pollutant - Pollutant type
     * @param {number} concentration - Concentration value
     * @returns {number} - AQI value
     */
    calculatePollutantAQI(pollutant, concentration) {
        const breakpoints = this.aqiBreakpoints[pollutant];
        if (!breakpoints) {
            return 0; // Unknown pollutant
        }

        // Find appropriate breakpoint
        const breakpoint = breakpoints.find(bp => 
            concentration >= bp.low && concentration <= bp.high
        );

        if (!breakpoint) {
            // Handle values above maximum breakpoint
            const maxBreakpoint = breakpoints[breakpoints.length - 1];
            if (concentration > maxBreakpoint.high) {
                return maxBreakpoint.aqiHigh;
            }
            return 0;
        }

        // Linear interpolation
        const aqi = ((breakpoint.aqiHigh - breakpoint.aqiLow) / 
                    (breakpoint.high - breakpoint.low)) * 
                   (concentration - breakpoint.low) + breakpoint.aqiLow;

        return Math.max(0, aqi);
    }

    /**
     * Calculate overall AQI from all pollutants
     * @param {Object} pollutants - Pollutant data object
     * @returns {number} - Overall AQI
     */
    calculateOverallAQI(pollutants) {
        const aqiValues = Object.values(pollutants)
            .map(p => p.aqi)
            .filter(aqi => !isNaN(aqi) && aqi > 0);

        if (aqiValues.length === 0) {
            return 0;
        }

        // Overall AQI is the maximum of individual pollutant AQIs
        return Math.max(...aqiValues);
    }

    /**
     * Get AQI category information
     * @param {number} aqi - AQI value
     * @returns {Object} - Category information
     */
    getAQICategory(aqi) {
        const category = this.aqiCategories.find(cat => 
            aqi >= cat.min && aqi <= cat.max
        );
        
        return category || this.aqiCategories[this.aqiCategories.length - 1];
    }

    /**
     * Extract weather data from measurement
     * @param {Object} measurement - Measurement object
     * @returns {Object} - Weather data
     */
    extractWeatherData(measurement) {
        return {
            temperature: measurement.temperature || null,
            humidity: measurement.humidity || null,
            wind_speed: measurement.wind_speed || null,
            wind_direction: measurement.wind_direction || null,
            pressure: measurement.pressure || null
        };
    }

    /**
     * Extract source attribution data
     * @param {Object} measurement - Measurement object
     * @returns {Object} - Source attribution data
     */
    extractSourceAttribution(measurement) {
        return {
            vehicular: measurement.vehicular_contribution || null,
            industrial: measurement.industrial_contribution || null,
            biomass: measurement.biomass_contribution || null,
            background: measurement.background_contribution || null
        };
    }

    /**
     * Extract forecast data
     * @param {Object} measurement - Measurement object
     * @returns {Object} - Forecast data
     */
    extractForecastData(measurement) {
        return {
            '1h': measurement.forecast_1h || null,
            '6h': measurement.forecast_6h || null,
            '24h': measurement.forecast_24h || null
        };
    }

    /**
     * Transform spatial grid data for heatmap
     * @param {Array} gridData - Spatial grid data
     * @returns {Object} - Heatmap data structure
     */
    transformSpatialData(gridData) {
        if (!Array.isArray(gridData)) {
            throw new Error('Grid data must be an array');
        }

        const features = gridData.map(point => {
            const aqi = point.predicted_aqi || point.aqi || 0;
            const category = this.getAQICategory(aqi);
            
            return {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [point.longitude, point.latitude]
                },
                properties: {
                    aqi: Math.round(aqi),
                    intensity: this.normalizeIntensity(aqi),
                    category: category.name,
                    color: category.color,
                    confidence: point.confidence || 0.5
                }
            };
        });

        return {
            type: 'FeatureCollection',
            features,
            metadata: {
                bounds: this.calculateBounds(features),
                resolution_km: gridData[0]?.resolution || 1.0,
                generated_at: new Date().toISOString()
            }
        };
    }

    /**
     * Normalize AQI value to 0-1 intensity for heatmap
     * @param {number} aqi - AQI value
     * @returns {number} - Normalized intensity (0-1)
     */
    normalizeIntensity(aqi) {
        // Normalize AQI (0-500) to intensity (0-1)
        return Math.min(1, Math.max(0, aqi / 500));
    }

    /**
     * Format forecast data for animation timeline
     * @param {Array} forecastData - Forecast data array
     * @returns {Array} - Animation frames
     */
    formatForecast(forecastData) {
        if (!Array.isArray(forecastData)) {
            throw new Error('Forecast data must be an array');
        }

        return forecastData.map((frame, index) => ({
            hour: index,
            timestamp: frame.timestamp,
            stations: frame.predictions?.map(prediction => ({
                station_id: prediction.station_id,
                coordinates: [prediction.longitude, prediction.latitude],
                aqi: Math.round(prediction.predicted_aqi || 0),
                category: this.getAQICategory(prediction.predicted_aqi || 0).name,
                color: this.getAQICategory(prediction.predicted_aqi || 0).color,
                confidence: {
                    lower: Math.round(prediction.confidence_lower || 0),
                    upper: Math.round(prediction.confidence_upper || 0),
                    level: this.getConfidenceLevel(prediction.confidence || 0.5)
                }
            })) || []
        }));
    }

    /**
     * Get confidence level description
     * @param {number} confidence - Confidence value (0-1)
     * @returns {string} - Confidence level
     */
    getConfidenceLevel(confidence) {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.6) return 'medium';
        return 'low';
    }

    /**
     * Calculate bounding box for features
     * @param {Array} features - GeoJSON features
     * @returns {Object} - Bounds object
     */
    calculateBounds(features) {
        if (!features || features.length === 0) {
            return null;
        }

        const coordinates = features.map(f => f.geometry.coordinates);
        const lngs = coordinates.map(c => c[0]);
        const lats = coordinates.map(c => c[1]);

        return {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lngs),
            west: Math.min(...lngs)
        };
    }

    /**
     * Validate transformed data structure
     * @param {Object} data - Transformed data
     * @returns {boolean} - Validation result
     */
    validateTransformedData(data) {
        try {
            // Check GeoJSON structure
            if (data.type !== 'FeatureCollection') {
                throw new Error('Invalid GeoJSON type');
            }

            if (!Array.isArray(data.features)) {
                throw new Error('Features must be an array');
            }

            // Validate each feature
            data.features.forEach((feature, index) => {
                if (feature.type !== 'Feature') {
                    throw new Error(`Invalid feature type at index ${index}`);
                }

                if (!feature.geometry || !feature.properties) {
                    throw new Error(`Missing geometry or properties at index ${index}`);
                }

                const coords = feature.geometry.coordinates;
                if (!Array.isArray(coords) || coords.length !== 2) {
                    throw new Error(`Invalid coordinates at index ${index}`);
                }

                const [lng, lat] = coords;
                if (typeof lat !== 'number' || typeof lng !== 'number') {
                    throw new Error(`Invalid coordinate types at index ${index}`);
                }
            });

            return true;
        } catch (error) {
            if (config.DEBUG) {
                console.error('Data validation failed:', error);
            }
            return false;
        }
    }
}

export default DataTransformer;
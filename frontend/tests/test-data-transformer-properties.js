/**
 * Property-Based Tests for Data Transformer
 * Tests Property 2: Data Transformation Preservation
 * Validates: Requirements 1.5, 2.1, 2.2, 2.3, 2.4
 */

import DataTransformer from '../js/integration/data-transformer.js';

class DataTransformerPropertyTests {
    constructor() {
        this.transformer = new DataTransformer();
        this.testResults = [];
        this.iterations = 100;
    }

    /**
     * Generate random measurement data for property testing
     */
    generateRandomMeasurement() {
        const stationId = `STA${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        const latitude = 28.4 + Math.random() * 0.8; // Delhi area
        const longitude = 76.8 + Math.random() * 0.8;
        
        return {
            station_id: stationId,
            station_name: `Station ${stationId}`,
            district: this.randomDistrict(),
            time: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            location: {
                coordinates: [longitude, latitude]
            },
            pm25: Math.random() * 300,
            pm10: Math.random() * 400,
            no2: Math.random() * 200,
            so2: Math.random() * 100,
            co: Math.random() * 10,
            o3: Math.random() * 150,
            temperature: 15 + Math.random() * 25,
            humidity: 30 + Math.random() * 50,
            wind_speed: Math.random() * 15,
            wind_direction: Math.random() * 360,
            pressure: 1000 + Math.random() * 50,
            vehicular_contribution: Math.random() * 60,
            industrial_contribution: Math.random() * 40,
            biomass_contribution: Math.random() * 30,
            background_contribution: Math.random() * 20,
            forecast_1h: Math.random() * 300,
            forecast_6h: Math.random() * 300,
            forecast_24h: Math.random() * 300,
            confidence: 0.5 + Math.random() * 0.5
        };
    }

    /**
     * Generate array of random measurements
     */
    generateRandomMeasurements(count = 5) {
        return Array.from({ length: count }, () => this.generateRandomMeasurement());
    }

    /**
     * Generate random district name
     */
    randomDistrict() {
        const districts = [
            'Central Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi',
            'New Delhi', 'North East Delhi', 'North West Delhi', 'South East Delhi', 'South West Delhi'
        ];
        return districts[Math.floor(Math.random() * districts.length)];
    }

    /**
     * Property 2: Data Transformation Preservation
     * For any valid backend API response containing measurement data,
     * the transformation should preserve all original data fields while
     * adding proper geographic formatting
     */
    async testDataTransformationPreservation() {
        console.log('🧪 Testing Property 2: Data Transformation Preservation');
        
        let passCount = 0;
        const failures = [];

        for (let i = 0; i < this.iterations; i++) {
            try {
                // Generate random measurement data
                const measurements = this.generateRandomMeasurements(Math.floor(Math.random() * 10) + 1);
                
                // Transform to GeoJSON
                const geoJson = this.transformer.toGeoJSON(measurements);
                
                // Verify transformation preserves data
                const preservationResult = this.verifyDataPreservation(measurements, geoJson);
                
                if (preservationResult.success) {
                    passCount++;
                } else {
                    failures.push({
                        iteration: i + 1,
                        input: measurements,
                        output: geoJson,
                        errors: preservationResult.errors
                    });
                }
                
            } catch (error) {
                failures.push({
                    iteration: i + 1,
                    error: error.message,
                    type: 'transformation_error'
                });
            }
        }

        const result = {
            property: 'Data Transformation Preservation',
            passed: passCount,
            failed: failures.length,
            total: this.iterations,
            success: failures.length === 0,
            failures: failures.slice(0, 5) // Show first 5 failures
        };

        this.testResults.push(result);
        return result;
    }

    /**
     * Verify that transformation preserves original data
     */
    verifyDataPreservation(originalMeasurements, geoJson) {
        const errors = [];

        try {
            // Check GeoJSON structure
            if (geoJson.type !== 'FeatureCollection') {
                errors.push('Output is not a valid GeoJSON FeatureCollection');
            }

            if (!Array.isArray(geoJson.features)) {
                errors.push('Features is not an array');
            }

            if (geoJson.features.length !== originalMeasurements.length) {
                errors.push(`Feature count mismatch: expected ${originalMeasurements.length}, got ${geoJson.features.length}`);
            }

            // Check each feature preserves original data
            geoJson.features.forEach((feature, index) => {
                const original = originalMeasurements[index];
                if (!original) return;

                // Verify geographic formatting
                this.verifyGeographicFormatting(feature, original, errors, index);
                
                // Verify data preservation
                this.verifyOriginalDataPreservation(feature, original, errors, index);
                
                // Verify derived data calculation
                this.verifyDerivedDataCalculation(feature, original, errors, index);
            });

        } catch (error) {
            errors.push(`Verification error: ${error.message}`);
        }

        return {
            success: errors.length === 0,
            errors
        };
    }

    /**
     * Verify proper geographic formatting
     */
    verifyGeographicFormatting(feature, original, errors, index) {
        // Check GeoJSON Point structure
        if (feature.type !== 'Feature') {
            errors.push(`Feature ${index}: Invalid type, expected 'Feature'`);
        }

        if (!feature.geometry || feature.geometry.type !== 'Point') {
            errors.push(`Feature ${index}: Invalid geometry type, expected 'Point'`);
        }

        // Check coordinates
        const coords = feature.geometry.coordinates;
        if (!Array.isArray(coords) || coords.length !== 2) {
            errors.push(`Feature ${index}: Invalid coordinates array`);
        }

        const [lng, lat] = coords;
        const [origLng, origLat] = original.location.coordinates;

        if (Math.abs(lng - origLng) > 0.0001) {
            errors.push(`Feature ${index}: Longitude not preserved (${lng} vs ${origLng})`);
        }

        if (Math.abs(lat - origLat) > 0.0001) {
            errors.push(`Feature ${index}: Latitude not preserved (${lat} vs ${origLat})`);
        }

        // Validate coordinate ranges
        if (lat < -90 || lat > 90) {
            errors.push(`Feature ${index}: Latitude out of range: ${lat}`);
        }

        if (lng < -180 || lng > 180) {
            errors.push(`Feature ${index}: Longitude out of range: ${lng}`);
        }
    }

    /**
     * Verify original data fields are preserved
     */
    verifyOriginalDataPreservation(feature, original, errors, index) {
        const props = feature.properties;

        // Check required fields are preserved
        if (props.station_id !== original.station_id) {
            errors.push(`Feature ${index}: Station ID not preserved`);
        }

        if (props.station_name !== (original.station_name || `Station ${original.station_id}`)) {
            errors.push(`Feature ${index}: Station name not preserved`);
        }

        if (props.district !== (original.district || 'Unknown')) {
            errors.push(`Feature ${index}: District not preserved`);
        }

        // Check timestamp preservation
        if (props.timestamp !== original.time) {
            errors.push(`Feature ${index}: Timestamp not preserved`);
        }

        // Check pollutant data preservation
        const pollutantTypes = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];
        pollutantTypes.forEach(type => {
            if (original[type] !== undefined && original[type] !== null) {
                if (!props.pollutants[type]) {
                    errors.push(`Feature ${index}: Pollutant ${type} not preserved`);
                } else {
                    const originalValue = parseFloat(original[type]);
                    const transformedValue = props.pollutants[type].value;
                    
                    // Allow small rounding differences
                    if (Math.abs(originalValue - transformedValue) > 0.1) {
                        errors.push(`Feature ${index}: Pollutant ${type} value not preserved (${originalValue} vs ${transformedValue})`);
                    }
                }
            }
        });

        // Check weather data preservation
        const weatherFields = ['temperature', 'humidity', 'wind_speed', 'wind_direction', 'pressure'];
        weatherFields.forEach(field => {
            if (original[field] !== undefined && original[field] !== null) {
                if (props.weather[field] !== original[field]) {
                    errors.push(`Feature ${index}: Weather field ${field} not preserved`);
                }
            }
        });

        // Check source attribution preservation
        const attributionFields = ['vehicular_contribution', 'industrial_contribution', 'biomass_contribution', 'background_contribution'];
        attributionFields.forEach(field => {
            const shortField = field.replace('_contribution', '');
            if (original[field] !== undefined && original[field] !== null) {
                if (props.source_attribution[shortField] !== original[field]) {
                    errors.push(`Feature ${index}: Attribution field ${field} not preserved`);
                }
            }
        });

        // Check forecast data preservation
        const forecastFields = ['forecast_1h', 'forecast_6h', 'forecast_24h'];
        forecastFields.forEach(field => {
            const shortField = field.replace('forecast_', '');
            if (original[field] !== undefined && original[field] !== null) {
                if (props.forecast[shortField] !== original[field]) {
                    errors.push(`Feature ${index}: Forecast field ${field} not preserved`);
                }
            }
        });
    }

    /**
     * Verify derived data is calculated correctly
     */
    verifyDerivedDataCalculation(feature, original, errors, index) {
        const props = feature.properties;

        // Check AQI calculation
        if (typeof props.aqi !== 'number' || props.aqi < 0 || props.aqi > 500) {
            errors.push(`Feature ${index}: Invalid AQI value: ${props.aqi}`);
        }

        // Check category assignment
        const validCategories = ['Good', 'Moderate', 'Unhealthy for Sensitive Groups', 'Unhealthy', 'Very Unhealthy', 'Hazardous'];
        if (!validCategories.includes(props.category)) {
            errors.push(`Feature ${index}: Invalid AQI category: ${props.category}`);
        }

        // Check color assignment
        if (typeof props.color !== 'string' || !props.color.startsWith('#')) {
            errors.push(`Feature ${index}: Invalid color format: ${props.color}`);
        }

        // Check confidence value
        if (typeof props.confidence !== 'number' || props.confidence < 0 || props.confidence > 1) {
            errors.push(`Feature ${index}: Invalid confidence value: ${props.confidence}`);
        }

        // Verify pollutant AQI calculations are reasonable
        Object.entries(props.pollutants).forEach(([type, data]) => {
            if (typeof data.aqi !== 'number' || data.aqi < 0 || data.aqi > 500) {
                errors.push(`Feature ${index}: Invalid ${type} AQI: ${data.aqi}`);
            }

            if (!data.unit || typeof data.unit !== 'string') {
                errors.push(`Feature ${index}: Missing or invalid ${type} unit`);
            }
        });
    }

    /**
     * Test edge cases for data transformation
     */
    async testEdgeCases() {
        console.log('🧪 Testing Data Transformation Edge Cases');
        
        const edgeCases = [
            // Empty array
            {
                name: 'Empty measurements array',
                input: [],
                expectValid: true
            },
            // Missing coordinates
            {
                name: 'Missing coordinates',
                input: [{
                    station_id: 'TEST001',
                    pm25: 50
                }],
                expectValid: false
            },
            // Invalid coordinates
            {
                name: 'Invalid coordinates',
                input: [{
                    station_id: 'TEST001',
                    location: { coordinates: [200, 100] }, // Out of range
                    pm25: 50
                }],
                expectValid: false
            },
            // Extreme pollutant values
            {
                name: 'Extreme pollutant values',
                input: [{
                    station_id: 'TEST001',
                    location: { coordinates: [77.2090, 28.6139] },
                    pm25: 1000, // Very high value
                    pm10: 0 // Zero value
                }],
                expectValid: true
            },
            // Missing optional fields
            {
                name: 'Minimal required fields only',
                input: [{
                    station_id: 'TEST001',
                    location: { coordinates: [77.2090, 28.6139] },
                    pm25: 50
                }],
                expectValid: true
            }
        ];

        const results = [];

        for (const testCase of edgeCases) {
            try {
                const result = this.transformer.toGeoJSON(testCase.input);
                const isValid = this.transformer.validateTransformedData(result);
                
                const passed = testCase.expectValid ? isValid : !isValid;
                
                results.push({
                    name: testCase.name,
                    passed,
                    expected: testCase.expectValid,
                    actual: isValid,
                    result
                });
                
            } catch (error) {
                // If we expect the case to be invalid (expectValid: false), then throwing an error is correct
                const passed = !testCase.expectValid;
                results.push({
                    name: testCase.name,
                    passed,
                    error: error.message,
                    expected: testCase.expectValid,
                    actual: false // Error thrown means transformation failed
                });
            }
        }

        return {
            property: 'Edge Case Handling',
            results,
            passed: results.filter(r => r.passed).length,
            failed: results.filter(r => !r.passed).length,
            success: results.every(r => r.passed)
        };
    }

    /**
     * Test spatial data transformation
     */
    async testSpatialDataTransformation() {
        console.log('🧪 Testing Spatial Data Transformation');
        
        let passCount = 0;
        const failures = [];

        for (let i = 0; i < 50; i++) {
            try {
                // Generate random spatial grid data
                const gridData = this.generateRandomGridData();
                
                // Transform spatial data
                const heatmapData = this.transformer.transformSpatialData(gridData);
                
                // Verify transformation
                const verificationResult = this.verifySpatialTransformation(gridData, heatmapData);
                
                if (verificationResult.success) {
                    passCount++;
                } else {
                    failures.push({
                        iteration: i + 1,
                        input: gridData,
                        output: heatmapData,
                        errors: verificationResult.errors
                    });
                }
                
            } catch (error) {
                failures.push({
                    iteration: i + 1,
                    error: error.message,
                    type: 'spatial_transformation_error'
                });
            }
        }

        return {
            property: 'Spatial Data Transformation',
            passed: passCount,
            failed: failures.length,
            total: 50,
            success: failures.length === 0,
            failures: failures.slice(0, 3)
        };
    }

    /**
     * Generate random spatial grid data
     */
    generateRandomGridData() {
        const count = Math.floor(Math.random() * 20) + 5;
        return Array.from({ length: count }, () => ({
            latitude: 28.4 + Math.random() * 0.8,
            longitude: 76.8 + Math.random() * 0.8,
            predicted_aqi: Math.random() * 400,
            confidence: 0.3 + Math.random() * 0.7,
            resolution: 1.0
        }));
    }

    /**
     * Verify spatial data transformation
     */
    verifySpatialTransformation(original, transformed) {
        const errors = [];

        try {
            // Check structure
            if (transformed.type !== 'FeatureCollection') {
                errors.push('Not a valid FeatureCollection');
            }

            if (transformed.features.length !== original.length) {
                errors.push(`Feature count mismatch: ${transformed.features.length} vs ${original.length}`);
            }

            // Check each feature
            transformed.features.forEach((feature, index) => {
                const orig = original[index];
                if (!orig) return;

                // Check coordinates preservation
                const [lng, lat] = feature.geometry.coordinates;
                if (Math.abs(lng - orig.longitude) > 0.0001 || Math.abs(lat - orig.latitude) > 0.0001) {
                    errors.push(`Feature ${index}: Coordinates not preserved`);
                }

                // Check AQI preservation
                const origAqi = Math.round(orig.predicted_aqi || orig.aqi || 0);
                if (feature.properties.aqi !== origAqi) {
                    errors.push(`Feature ${index}: AQI not preserved (${feature.properties.aqi} vs ${origAqi})`);
                }

                // Check intensity calculation
                const expectedIntensity = Math.min(1, Math.max(0, origAqi / 500));
                if (Math.abs(feature.properties.intensity - expectedIntensity) > 0.01) {
                    errors.push(`Feature ${index}: Intensity calculation incorrect`);
                }
            });

        } catch (error) {
            errors.push(`Verification error: ${error.message}`);
        }

        return {
            success: errors.length === 0,
            errors
        };
    }

    /**
     * Run all property tests
     */
    async runAllTests() {
        console.log('🚀 Starting Data Transformer Property Tests');
        console.log(`Running ${this.iterations} iterations for main property test`);
        
        const startTime = Date.now();
        
        // Run main property test
        const preservationResult = await this.testDataTransformationPreservation();
        
        // Run edge case tests
        const edgeCaseResult = await this.testEdgeCases();
        
        // Run spatial transformation tests
        const spatialResult = await this.testSpatialDataTransformation();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Compile final results
        const overallResult = {
            summary: {
                totalTests: 3,
                passedTests: [preservationResult, edgeCaseResult, spatialResult].filter(r => r.success).length,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            },
            results: {
                dataPreservation: preservationResult,
                edgeCases: edgeCaseResult,
                spatialTransformation: spatialResult
            },
            overallSuccess: preservationResult.success && edgeCaseResult.success && spatialResult.success
        };
        
        this.displayResults(overallResult);
        return overallResult;
    }

    /**
     * Display test results
     */
    displayResults(results) {
        console.log('\n📊 Data Transformer Property Test Results');
        console.log('=' .repeat(50));
        
        const { summary, results: testResults, overallSuccess } = results;
        
        console.log(`⏱️  Duration: ${summary.duration}`);
        console.log(`✅ Passed: ${summary.passedTests}/${summary.totalTests} test suites`);
        console.log(`${overallSuccess ? '🎉' : '❌'} Overall: ${overallSuccess ? 'PASSED' : 'FAILED'}`);
        
        console.log('\n📋 Detailed Results:');
        
        // Data Preservation Results
        const dp = testResults.dataPreservation;
        console.log(`\n🔄 Property 2: Data Transformation Preservation`);
        console.log(`   Iterations: ${dp.total}`);
        console.log(`   Passed: ${dp.passed} (${((dp.passed/dp.total)*100).toFixed(1)}%)`);
        console.log(`   Failed: ${dp.failed}`);
        console.log(`   Status: ${dp.success ? '✅ PASSED' : '❌ FAILED'}`);
        
        if (dp.failures.length > 0) {
            console.log(`   Sample failures:`);
            dp.failures.slice(0, 2).forEach((failure, i) => {
                console.log(`     ${i+1}. ${failure.errors?.[0] || failure.error || 'Unknown error'}`);
            });
        }
        
        // Edge Cases Results
        const ec = testResults.edgeCases;
        console.log(`\n🎯 Edge Case Handling`);
        console.log(`   Test cases: ${ec.results.length}`);
        console.log(`   Passed: ${ec.passed}`);
        console.log(`   Failed: ${ec.failed}`);
        console.log(`   Status: ${ec.success ? '✅ PASSED' : '❌ FAILED'}`);
        
        // Spatial Transformation Results
        const st = testResults.spatialTransformation;
        console.log(`\n🗺️  Spatial Data Transformation`);
        console.log(`   Iterations: ${st.total}`);
        console.log(`   Passed: ${st.passed} (${((st.passed/st.total)*100).toFixed(1)}%)`);
        console.log(`   Failed: ${st.failed}`);
        console.log(`   Status: ${st.success ? '✅ PASSED' : '❌ FAILED'}`);
        
        console.log('\n' + '='.repeat(50));
        
        if (overallSuccess) {
            console.log('🎉 All property tests PASSED!');
            console.log('✅ Property 2: Data Transformation Preservation is validated');
            console.log('✅ Requirements 1.5, 2.1, 2.2, 2.3, 2.4 are satisfied');
        } else {
            console.log('❌ Some property tests FAILED!');
            console.log('🔧 Review the failures above and fix the implementation');
        }
    }
}

// Export for use in test runner
export default DataTransformerPropertyTests;

// Auto-run if loaded directly
if (typeof window !== 'undefined' && window.location.pathname.includes('test')) {
    const tester = new DataTransformerPropertyTests();
    tester.runAllTests().then(results => {
        // Store results globally for test runner access
        window.dataTransformerTestResults = results;
    });
}
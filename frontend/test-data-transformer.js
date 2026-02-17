/**
 * Quick test of Data Transformer functionality
 */

import DataTransformer from './js/integration/data-transformer.js';

// Test the data transformer
const transformer = new DataTransformer();

// Sample measurement data
const sampleMeasurements = [
    {
        station_id: 'DEL001',
        station_name: 'Anand Vihar',
        district: 'East Delhi',
        time: '2024-01-15T10:30:00Z',
        location: {
            coordinates: [77.2090, 28.6139]
        },
        pm25: 165.5,
        pm10: 280.3,
        no2: 45.2,
        temperature: 28.5,
        humidity: 65,
        wind_speed: 3.2,
        vehicular_contribution: 45,
        industrial_contribution: 20,
        biomass_contribution: 25,
        background_contribution: 10,
        forecast_1h: 290,
        forecast_6h: 275,
        forecast_24h: 260,
        confidence: 0.8
    }
];

console.log('🧪 Testing Data Transformer...');

try {
    // Test GeoJSON transformation
    const geoJson = transformer.toGeoJSON(sampleMeasurements);
    console.log('✅ GeoJSON transformation successful');
    console.log('Features count:', geoJson.features.length);
    console.log('First feature AQI:', geoJson.features[0].properties.aqi);
    console.log('First feature category:', geoJson.features[0].properties.category);
    
    // Test validation
    const isValid = transformer.validateTransformedData(geoJson);
    console.log('✅ Validation result:', isValid);
    
    // Test spatial data transformation
    const spatialData = [
        {
            latitude: 28.6139,
            longitude: 77.2090,
            predicted_aqi: 285,
            confidence: 0.8
        }
    ];
    
    const heatmapData = transformer.transformSpatialData(spatialData);
    console.log('✅ Spatial transformation successful');
    console.log('Heatmap features count:', heatmapData.features.length);
    
    console.log('🎉 All basic tests passed!');
    
} catch (error) {
    console.error('❌ Test failed:', error);
}
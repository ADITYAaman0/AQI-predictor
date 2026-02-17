/**
 * Test script for get24HourForecast method
 * 
 * This script tests the get24HourForecast method by fetching real data
 * from the backend API endpoint /api/v1/forecast/24h/Delhi
 */

import { getAQIClient } from '../lib/api/aqi-client';

async function testGet24HourForecast() {
  console.log('🧪 Testing get24HourForecast method...\n');

  try {
    const client = getAQIClient();
    const location = 'Delhi';

    console.log(`📍 Fetching 24-hour forecast for: ${location}`);
    console.log(`🔗 Endpoint: /api/v1/forecast/24h/${location}\n`);

    const startTime = Date.now();
    const forecast = await client.get24HourForecast(location);
    const endTime = Date.now();

    console.log('✅ Successfully fetched 24-hour forecast!\n');
    console.log(`⏱️  Response time: ${endTime - startTime}ms\n`);

    // Display forecast summary
    console.log('📊 Forecast Summary:');
    console.log('─'.repeat(60));
    console.log(`Location: ${forecast.location.city}, ${forecast.location.state}`);
    console.log(`Forecast Type: ${forecast.forecastType}`);
    console.log(`Generated At: ${forecast.generatedAt}`);
    console.log(`Total Hours: ${forecast.forecasts.length}`);
    console.log('─'.repeat(60));
    console.log();

    // Display first 5 hourly forecasts
    console.log('🔮 First 5 Hourly Forecasts:');
    console.log('─'.repeat(60));
    forecast.forecasts.slice(0, 5).forEach((hourly, index) => {
      console.log(`\nHour ${index + 1}:`);
      console.log(`  Timestamp: ${hourly.timestamp}`);
      console.log(`  Forecast Hour: ${hourly.forecastHour}`);
      console.log(`  AQI: ${hourly.aqi.value}`);
      console.log(`  Category: ${hourly.aqi.categoryLabel} (${hourly.aqi.category})`);
      console.log(`  Color: ${hourly.aqi.color}`);
      console.log(`  Confidence Range: ${hourly.aqi.confidenceLower.toFixed(1)} - ${hourly.aqi.confidenceUpper.toFixed(1)}`);
      console.log(`  Confidence Score: ${hourly.confidence.score}`);
    });
    console.log('─'.repeat(60));
    console.log();

    // Display metadata
    console.log('📋 Metadata:');
    console.log('─'.repeat(60));
    console.log(`Model Version: ${forecast.metadata.model_version || 'N/A'}`);
    console.log(`Confidence Level: ${forecast.metadata.confidence_level || 'N/A'}`);
    console.log(`Data Sources: ${forecast.metadata.data_sources?.join(', ') || 'N/A'}`);
    console.log(`Spatial Resolution: ${(forecast.metadata as any).spatial_resolution || 'N/A'}`);
    console.log(`Update Frequency: ${(forecast.metadata as any).update_frequency || 'N/A'}`);
    console.log('─'.repeat(60));
    console.log();

    // Validate data structure
    console.log('🔍 Validating Data Structure:');
    console.log('─'.repeat(60));
    
    const validations = [
      { name: 'Location object exists', pass: !!forecast.location },
      { name: 'Location has city', pass: !!forecast.location.city },
      { name: 'Forecast type is 24_hour', pass: forecast.forecastType === '24_hour' },
      { name: 'Generated at timestamp exists', pass: !!forecast.generatedAt },
      { name: 'Forecasts array exists', pass: Array.isArray(forecast.forecasts) },
      { name: 'Has 24 hourly forecasts', pass: forecast.forecasts.length === 24 },
      { name: 'Metadata exists', pass: !!forecast.metadata },
    ];

    validations.forEach(({ name, pass }) => {
      console.log(`  ${pass ? '✅' : '❌'} ${name}`);
    });
    console.log('─'.repeat(60));
    console.log();

    // Validate first forecast structure
    if (forecast.forecasts.length > 0) {
      const firstForecast = forecast.forecasts[0];
      if (firstForecast) {
        console.log('🔍 Validating First Forecast Structure:');
        console.log('─'.repeat(60));
        
        const forecastValidations = [
          { name: 'Has timestamp', pass: !!firstForecast.timestamp },
          { name: 'Has forecastHour', pass: typeof firstForecast.forecastHour === 'number' },
          { name: 'Has AQI object', pass: !!firstForecast.aqi },
          { name: 'AQI has value', pass: typeof firstForecast.aqi.value === 'number' },
          { name: 'AQI has category', pass: !!firstForecast.aqi.category },
          { name: 'AQI has categoryLabel', pass: !!firstForecast.aqi.categoryLabel },
          { name: 'AQI has color', pass: !!firstForecast.aqi.color },
          { name: 'AQI has confidenceLower', pass: typeof firstForecast.aqi.confidenceLower === 'number' },
          { name: 'AQI has confidenceUpper', pass: typeof firstForecast.aqi.confidenceUpper === 'number' },
          { name: 'Has pollutants object', pass: !!firstForecast.pollutants },
          { name: 'Has weather object', pass: !!firstForecast.weather },
          { name: 'Has confidence object', pass: !!firstForecast.confidence },
        ];

        forecastValidations.forEach(({ name, pass }) => {
          console.log(`  ${pass ? '✅' : '❌'} ${name}`);
        });
        console.log('─'.repeat(60));
        console.log();
      }
    }

    // Test summary
    const allValidationsPassed = validations.every(v => v.pass);
    console.log('📝 Test Summary:');
    console.log('─'.repeat(60));
    console.log(`Status: ${allValidationsPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Endpoint: /api/v1/forecast/24h/${location}`);
    console.log(`Response Time: ${endTime - startTime}ms`);
    console.log(`Forecasts Returned: ${forecast.forecasts.length}`);
    console.log('─'.repeat(60));

    if (allValidationsPassed) {
      console.log('\n✅ All tests passed! The get24HourForecast method is working correctly.\n');
      process.exit(0);
    } else {
      console.log('\n❌ Some validations failed. Please review the output above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error testing get24HourForecast:');
    console.error('─'.repeat(60));
    if (error instanceof Error) {
      console.error(`Message: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    } else {
      console.error(error);
    }
    console.error('─'.repeat(60));
    console.log('\n❌ Test failed due to error.\n');
    process.exit(1);
  }
}

// Run the test
testGet24HourForecast();

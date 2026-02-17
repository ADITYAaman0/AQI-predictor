/**
 * Test script for getCurrentAQI method
 * 
 * This script tests the getCurrentAQI method by fetching real data
 * from the backend API for Delhi.
 * 
 * Usage:
 *   npx tsx scripts/test-get-current-aqi.ts
 */

import { AQIDashboardAPIClient } from '../lib/api/aqi-client';
import { env } from '../lib/env';

async function testGetCurrentAQI() {
  console.log('='.repeat(80));
  console.log('Testing getCurrentAQI Method');
  console.log('='.repeat(80));
  console.log();

  // Create API client
  const client = new AQIDashboardAPIClient(env.api.baseUrl);
  console.log(`✓ API Client created`);
  console.log(`  Base URL: ${env.api.baseUrl}`);
  console.log();

  // Test location
  const location = 'Delhi';
  console.log(`Testing location: ${location}`);
  console.log('-'.repeat(80));
  console.log();

  try {
    // Fetch current AQI data
    console.log('Fetching current AQI data...');
    const startTime = Date.now();
    const data = await client.getCurrentAQI(location);
    const duration = Date.now() - startTime;

    console.log(`✓ Data fetched successfully in ${duration}ms`);
    console.log();

    // Display results
    console.log('AQI Data:');
    console.log('-'.repeat(80));
    console.log(`  Value:           ${data.aqi.value}`);
    console.log(`  Category:        ${data.aqi.categoryLabel}`);
    console.log(`  Color:           ${data.aqi.color}`);
    console.log(`  Dominant:        ${data.aqi.dominantPollutant}`);
    console.log(`  Health Message:  ${data.aqi.healthMessage}`);
    console.log();

    console.log('Location:');
    console.log('-'.repeat(80));
    console.log(`  Name:            ${data.location.name || 'N/A'}`);
    console.log(`  City:            ${data.location.city || 'N/A'}`);
    console.log(`  Country:         ${data.location.country}`);
    console.log(`  Coordinates:     ${data.location.coordinates.latitude}, ${data.location.coordinates.longitude}`);
    console.log();

    console.log('Pollutants:');
    console.log('-'.repeat(80));
    Object.entries(data.pollutants).forEach(([key, pollutant]) => {
      console.log(`  ${key.toUpperCase().padEnd(6)}: ${pollutant.value.toFixed(2)} ${pollutant.unit} (AQI: ${pollutant.aqi_value || 'N/A'})`);
    });
    console.log();

    console.log('Weather:');
    console.log('-'.repeat(80));
    console.log(`  Temperature:     ${data.weather.temperature}°C`);
    console.log(`  Humidity:        ${data.weather.humidity}%`);
    console.log(`  Wind Speed:      ${data.weather.windSpeed} m/s`);
    console.log(`  Wind Direction:  ${data.weather.windDirection}°`);
    console.log(`  Pressure:        ${data.weather.pressure} hPa`);
    console.log();

    console.log('Source Attribution:');
    console.log('-'.repeat(80));
    console.log(`  Vehicular:       ${data.sourceAttribution.vehicular}%`);
    console.log(`  Industrial:      ${data.sourceAttribution.industrial}%`);
    console.log(`  Biomass:         ${data.sourceAttribution.biomass}%`);
    console.log(`  Background:      ${data.sourceAttribution.background}%`);
    console.log();

    console.log('Metadata:');
    console.log('-'.repeat(80));
    console.log(`  Timestamp:       ${data.timestamp}`);
    console.log(`  Last Updated:    ${data.lastUpdated}`);
    console.log(`  Model Version:   ${data.modelVersion}`);
    console.log(`  Data Sources:    ${data.dataSources.join(', ')}`);
    console.log();

    console.log('Confidence:');
    console.log('-'.repeat(80));
    console.log(`  Level:           ${data.confidence.level}`);
    console.log(`  Score:           ${data.confidence.score}`);
    console.log(`  PM2.5 Range:     ${data.confidence.pm25Lower.toFixed(1)} - ${data.confidence.pm25Upper.toFixed(1)}`);
    console.log();

    // Validate data structure
    console.log('Validation:');
    console.log('-'.repeat(80));
    
    const validations = [
      { name: 'AQI value is valid', pass: data.aqi.value >= 0 && data.aqi.value <= 500 },
      { name: 'Category is set', pass: !!data.aqi.category },
      { name: 'Color is set', pass: !!data.aqi.color },
      { name: 'Health message is set', pass: !!data.aqi.healthMessage },
      { name: 'Location has coordinates', pass: !!data.location.coordinates },
      { name: 'Has PM2.5 data', pass: !!data.pollutants.pm25 },
      { name: 'Has PM10 data', pass: !!data.pollutants.pm10 },
      { name: 'Has weather data', pass: !!data.weather },
      { name: 'Has source attribution', pass: !!data.sourceAttribution },
      { name: 'Has timestamp', pass: !!data.timestamp },
    ];

    validations.forEach(({ name, pass }) => {
      console.log(`  ${pass ? '✓' : '✗'} ${name}`);
    });

    const allPassed = validations.every(v => v.pass);
    console.log();
    console.log(`${allPassed ? '✓' : '✗'} All validations ${allPassed ? 'passed' : 'failed'}`);
    console.log();

    console.log('='.repeat(80));
    console.log('✓ Test completed successfully');
    console.log('='.repeat(80));

    return true;
  } catch (error: any) {
    console.error('✗ Error fetching data:');
    console.error(`  Message: ${error.message}`);
    if (error.statusCode) {
      console.error(`  Status Code: ${error.statusCode}`);
    }
    if (error.originalError) {
      console.error(`  Original Error: ${error.originalError.message}`);
    }
    console.log();
    console.log('='.repeat(80));
    console.log('✗ Test failed');
    console.log('='.repeat(80));

    return false;
  }
}

// Run the test
testGetCurrentAQI()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

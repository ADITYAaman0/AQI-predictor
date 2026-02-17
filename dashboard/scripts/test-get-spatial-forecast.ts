/**
 * Test script for getSpatialForecast method
 * 
 * This script tests the spatial forecast functionality by fetching
 * grid predictions for a bounding box around Delhi.
 * 
 * Usage: npx tsx scripts/test-get-spatial-forecast.ts
 */

import { getAQIClient } from '../lib/api/aqi-client';
import type { BoundingBox } from '../lib/api/types';

async function testGetSpatialForecast() {
  console.log('🧪 Testing getSpatialForecast method...\n');

  const client = getAQIClient();

  // Test 1: Valid bounding box around Delhi
  console.log('Test 1: Fetching spatial forecast for Delhi area');
  console.log('─────────────────────────────────────────────────');
  
  const delhiBounds: BoundingBox = {
    north: 28.7,
    south: 28.5,
    east: 77.3,
    west: 77.1,
  };

  try {
    const startTime = Date.now();
    const response = await client.getSpatialForecast(delhiBounds, 1.0, 'pm25');
    const duration = Date.now() - startTime;

    console.log('✅ Success!');
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Grid points: ${response.grid_predictions.length}`);
    console.log(`📏 Resolution: ${response.metadata.resolution_km} km`);
    console.log(`🕐 Generated at: ${response.metadata.generated_at}`);
    console.log(`🔢 Model version: ${response.metadata.model_version}`);
    
    if (response.grid_predictions.length > 0) {
      const firstPoint = response.grid_predictions[0];
      if (firstPoint) {
        console.log('\n📍 Sample grid point:');
        console.log(`   Coordinates: (${firstPoint.coordinates.latitude}, ${firstPoint.coordinates.longitude})`);
        console.log(`   AQI: ${firstPoint.aqi}`);
        console.log(`   Category: ${firstPoint.category}`);
        if (firstPoint.confidence) {
          console.log(`   Confidence: ${(firstPoint.confidence * 100).toFixed(1)}%`);
        }
      }
    }
    
    console.log('\n');
  } catch (error: any) {
    console.error('❌ Test 1 failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.log('\n');
  }

  // Test 2: Different resolution
  console.log('Test 2: Testing different resolution (5 km)');
  console.log('─────────────────────────────────────────────────');
  
  try {
    const startTime = Date.now();
    const response = await client.getSpatialForecast(delhiBounds, 5.0, 'pm25');
    const duration = Date.now() - startTime;

    console.log('✅ Success!');
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Grid points: ${response.grid_predictions.length}`);
    console.log(`📏 Resolution: ${response.metadata.resolution_km} km`);
    console.log('\n');
  } catch (error: any) {
    console.error('❌ Test 2 failed:', error.message);
    console.log('\n');
  }

  // Test 3: Different parameter (PM10)
  console.log('Test 3: Testing different parameter (PM10)');
  console.log('─────────────────────────────────────────────────');
  
  try {
    const startTime = Date.now();
    const response = await client.getSpatialForecast(delhiBounds, 2.0, 'pm10');
    const duration = Date.now() - startTime;

    console.log('✅ Success!');
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Grid points: ${response.grid_predictions.length}`);
    console.log('\n');
  } catch (error: any) {
    console.error('❌ Test 3 failed:', error.message);
    console.log('\n');
  }

  // Test 4: Invalid bounds (north <= south)
  console.log('Test 4: Testing invalid bounds (north <= south)');
  console.log('─────────────────────────────────────────────────');
  
  const invalidBounds1: BoundingBox = {
    north: 28.5,
    south: 28.7,
    east: 77.3,
    west: 77.1,
  };

  try {
    await client.getSpatialForecast(invalidBounds1, 1.0);
    console.error('❌ Test should have failed but succeeded');
    console.log('\n');
  } catch (error: any) {
    console.log('✅ Correctly rejected invalid bounds');
    console.log(`   Error: ${error.message}`);
    console.log('\n');
  }

  // Test 5: Invalid bounds (east <= west)
  console.log('Test 5: Testing invalid bounds (east <= west)');
  console.log('─────────────────────────────────────────────────');
  
  const invalidBounds2: BoundingBox = {
    north: 28.7,
    south: 28.5,
    east: 77.1,
    west: 77.3,
  };

  try {
    await client.getSpatialForecast(invalidBounds2, 1.0);
    console.error('❌ Test should have failed but succeeded');
    console.log('\n');
  } catch (error: any) {
    console.log('✅ Correctly rejected invalid bounds');
    console.log(`   Error: ${error.message}`);
    console.log('\n');
  }

  // Test 6: Invalid resolution (too small)
  console.log('Test 6: Testing invalid resolution (< 0.1)');
  console.log('─────────────────────────────────────────────────');
  
  try {
    await client.getSpatialForecast(delhiBounds, 0.05);
    console.error('❌ Test should have failed but succeeded');
    console.log('\n');
  } catch (error: any) {
    console.log('✅ Correctly rejected invalid resolution');
    console.log(`   Error: ${error.message}`);
    console.log('\n');
  }

  // Test 7: Invalid resolution (too large)
  console.log('Test 7: Testing invalid resolution (> 10.0)');
  console.log('─────────────────────────────────────────────────');
  
  try {
    await client.getSpatialForecast(delhiBounds, 15.0);
    console.error('❌ Test should have failed but succeeded');
    console.log('\n');
  } catch (error: any) {
    console.log('✅ Correctly rejected invalid resolution');
    console.log(`   Error: ${error.message}`);
    console.log('\n');
  }

  // Test 8: Larger area (Mumbai)
  console.log('Test 8: Testing larger area (Mumbai)');
  console.log('─────────────────────────────────────────────────');
  
  const mumbaiBounds: BoundingBox = {
    north: 19.3,
    south: 18.9,
    east: 72.95,
    west: 72.75,
  };

  try {
    const startTime = Date.now();
    const response = await client.getSpatialForecast(mumbaiBounds, 2.0, 'pm25');
    const duration = Date.now() - startTime;

    console.log('✅ Success!');
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Grid points: ${response.grid_predictions.length}`);
    console.log(`📏 Resolution: ${response.metadata.resolution_km} km`);
    console.log('\n');
  } catch (error: any) {
    console.error('❌ Test 8 failed:', error.message);
    console.log('\n');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('✨ All tests completed!');
  console.log('═══════════════════════════════════════════════════');
}

// Run tests
testGetSpatialForecast().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

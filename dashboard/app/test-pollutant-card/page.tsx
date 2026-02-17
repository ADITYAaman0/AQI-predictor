/**
 * Visual Test Page for PollutantCard Component
 * 
 * This page displays PollutantCard components with various configurations
 * to verify visual appearance and interactions.
 * 
 * Navigate to: http://localhost:3000/test-pollutant-card
 */

'use client';

import { PollutantCard } from '@/components/dashboard/PollutantCard';
import { PollutantType } from '@/lib/api/types';

export default function TestPollutantCardPage() {
  // Test data for different pollutants and AQI levels
  const testCases = [
    {
      pollutant: 'pm25' as PollutantType,
      value: 12.5,
      unit: 'μg/m³',
      aqi: 45,
      status: 'good',
    },
    {
      pollutant: 'pm10' as PollutantType,
      value: 55.3,
      unit: 'μg/m³',
      aqi: 75,
      status: 'moderate',
    },
    {
      pollutant: 'o3' as PollutantType,
      value: 85.7,
      unit: 'μg/m³',
      aqi: 120,
      status: 'unhealthy',
    },
    {
      pollutant: 'no2' as PollutantType,
      value: 125.4,
      unit: 'μg/m³',
      aqi: 175,
      status: 'very_unhealthy',
    },
    {
      pollutant: 'so2' as PollutantType,
      value: 250.8,
      unit: 'μg/m³',
      aqi: 350,
      status: 'hazardous',
    },
    {
      pollutant: 'co' as PollutantType,
      value: 8.5,
      unit: 'mg/m³',
      aqi: 95,
      status: 'moderate',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            PollutantCard Component Test
          </h1>
          <p className="text-gray-300">
            Visual verification of PollutantCard component with different pollutants and AQI levels
          </p>
        </div>

        {/* Test Instructions */}
        <div className="glass-card p-6 mb-8 rounded-2xl">
          <h2 className="text-2xl font-semibold text-white mb-4">Test Instructions</h2>
          <ul className="text-gray-300 space-y-2">
            <li>✓ Verify all cards display with glassmorphic styling</li>
            <li>✓ Check that each card shows: icon, name, value, unit, progress bar, and status</li>
            <li>✓ Verify color coding matches AQI levels (green → yellow → orange → red → brown)</li>
            <li>✓ Hover over cards to see lift effect and tooltip</li>
            <li>✓ Check that progress bars are filled according to AQI level</li>
            <li>✓ Verify all pollutant types display correctly (PM2.5, PM10, O₃, NO₂, SO₂, CO)</li>
          </ul>
        </div>

        {/* All Pollutants Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">All Pollutants</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {testCases.map((testCase, index) => (
              <div key={index} className="flex justify-center">
                <PollutantCard {...testCase} />
              </div>
            ))}
          </div>
        </div>

        {/* AQI Level Comparison - PM2.5 */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">
            AQI Level Comparison (PM2.5)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <div className="flex flex-col items-center gap-2">
              <PollutantCard
                pollutant="pm25"
                value={12.5}
                unit="μg/m³"
                aqi={30}
                status="good"
              />
              <span className="text-sm text-gray-400">Good (0-50)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <PollutantCard
                pollutant="pm25"
                value={35.4}
                unit="μg/m³"
                aqi={75}
                status="moderate"
              />
              <span className="text-sm text-gray-400">Moderate (51-100)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <PollutantCard
                pollutant="pm25"
                value={55.8}
                unit="μg/m³"
                aqi={125}
                status="unhealthy"
              />
              <span className="text-sm text-gray-400">Unhealthy (101-150)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <PollutantCard
                pollutant="pm25"
                value={150.2}
                unit="μg/m³"
                aqi={180}
                status="very_unhealthy"
              />
              <span className="text-sm text-gray-400">Very Unhealthy (151-200)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <PollutantCard
                pollutant="pm25"
                value={250.5}
                unit="μg/m³"
                aqi={350}
                status="hazardous"
              />
              <span className="text-sm text-gray-400">Hazardous (201+)</span>
            </div>
          </div>
        </div>

        {/* Custom Percentage Test */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Custom Percentage Values
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col items-center gap-2">
              <PollutantCard
                pollutant="pm25"
                value={25.0}
                unit="μg/m³"
                aqi={60}
                status="moderate"
                percentage={25}
              />
              <span className="text-sm text-gray-400">25% Progress</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <PollutantCard
                pollutant="pm10"
                value={50.0}
                unit="μg/m³"
                aqi={80}
                status="moderate"
                percentage={50}
              />
              <span className="text-sm text-gray-400">50% Progress</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <PollutantCard
                pollutant="o3"
                value={75.0}
                unit="μg/m³"
                aqi={100}
                status="moderate"
                percentage={75}
              />
              <span className="text-sm text-gray-400">75% Progress</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <PollutantCard
                pollutant="no2"
                value={100.0}
                unit="μg/m³"
                aqi={120}
                status="unhealthy"
                percentage={100}
              />
              <span className="text-sm text-gray-400">100% Progress</span>
            </div>
          </div>
        </div>

        {/* Interaction Test */}
        <div className="glass-card p-6 rounded-2xl">
          <h2 className="text-2xl font-semibold text-white mb-4">Interaction Test</h2>
          <p className="text-gray-300 mb-6">
            Hover over the card below to test the hover effect and tooltip display:
          </p>
          <div className="flex justify-center">
            <PollutantCard
              pollutant="pm25"
              value={85.5}
              unit="μg/m³"
              aqi={120}
              status="unhealthy"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-400 text-sm">
          <p>Task 6.1: Create PollutantCard component</p>
          <p>Requirements: 3.1, 3.2</p>
        </div>
      </div>
    </div>
  );
}

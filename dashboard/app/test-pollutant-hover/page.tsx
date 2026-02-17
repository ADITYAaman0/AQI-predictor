/**
 * Visual Test Page for PollutantCard Hover Interactions
 * 
 * Tests Task 6.4:
 * - Lift effect (4px translate)
 * - Enhanced shadow on hover
 * - Tooltip with detailed information
 * 
 * Requirements: 3.5, 12.1
 */

'use client';

import { PollutantCard } from '@/components/dashboard/PollutantCard';
import { PollutantType } from '@/lib/api/types';

export default function TestPollutantHoverPage() {
  const testCases = [
    {
      pollutant: 'pm25' as PollutantType,
      value: 35.2,
      unit: 'μg/m³',
      aqi: 45,
      status: 'good',
      percentage: 30,
      description: 'Good AQI - Green color',
    },
    {
      pollutant: 'pm10' as PollutantType,
      value: 78.5,
      unit: 'μg/m³',
      aqi: 85,
      status: 'moderate',
      percentage: 55,
      description: 'Moderate AQI - Yellow color',
    },
    {
      pollutant: 'o3' as PollutantType,
      value: 125.0,
      unit: 'μg/m³',
      aqi: 135,
      status: 'unhealthy_sensitive',
      percentage: 70,
      description: 'Unhealthy for Sensitive - Orange color',
    },
    {
      pollutant: 'no2' as PollutantType,
      value: 185.3,
      unit: 'μg/m³',
      aqi: 175,
      status: 'unhealthy',
      percentage: 85,
      description: 'Unhealthy - Red color',
    },
    {
      pollutant: 'so2' as PollutantType,
      value: 245.8,
      unit: 'μg/m³',
      aqi: 225,
      status: 'very_unhealthy',
      percentage: 92,
      description: 'Very Unhealthy - Dark red color',
    },
    {
      pollutant: 'co' as PollutantType,
      value: 15.5,
      unit: 'mg/m³',
      aqi: 350,
      status: 'hazardous',
      percentage: 98,
      description: 'Hazardous - Brown color',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            PollutantCard Hover Interactions Test
          </h1>
          <p className="text-gray-300 text-lg mb-2">
            Task 6.4: Add hover interactions
          </p>
          <div className="text-gray-400 text-sm space-y-1">
            <p>✓ Lift effect (4px translate)</p>
            <p>✓ Enhanced shadow on hover</p>
            <p>✓ Tooltip with detailed information</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Test Instructions
          </h2>
          <div className="text-gray-300 space-y-2">
            <p><strong>1. Hover over each card</strong> - Card should lift 4px upward</p>
            <p><strong>2. Check shadow enhancement</strong> - Shadow should become more prominent on hover</p>
            <p><strong>3. Verify tooltip display</strong> - Tooltip should appear with pollutant details</p>
            <p><strong>4. Check smooth transitions</strong> - All animations should be smooth (0.3s duration)</p>
            <p><strong>5. Test mouse leave</strong> - Card should return to normal state smoothly</p>
          </div>
        </div>

        {/* Test Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {testCases.map((testCase, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="mb-4">
                <PollutantCard {...testCase} />
              </div>
              <div className="text-center">
                <p className="text-white text-sm font-medium mb-1">
                  {testCase.description}
                </p>
                <p className="text-gray-400 text-xs">
                  AQI: {testCase.aqi} | Value: {testCase.value} {testCase.unit}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Hover Effect Details */}
        <div className="glass-card p-6 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Hover Effect Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-300">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                1. Lift Effect
              </h3>
              <ul className="space-y-1 text-sm">
                <li>• Transform: translateY(-4px)</li>
                <li>• Duration: 0.3s</li>
                <li>• Timing: ease</li>
                <li>• Applied via .hover-lift class</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                2. Enhanced Shadow
              </h3>
              <ul className="space-y-1 text-sm">
                <li>• Shadow: 0 8px 32px rgba(0,0,0,0.2)</li>
                <li>• Duration: 0.3s</li>
                <li>• Timing: ease</li>
                <li>• Applied via .hover-lift:hover</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                3. Tooltip Display
              </h3>
              <ul className="space-y-1 text-sm">
                <li>• Shows pollutant name</li>
                <li>• Shows value with 2 decimals</li>
                <li>• Shows AQI sub-index</li>
                <li>• Shows status label</li>
                <li>• Fade-in animation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CSS Verification */}
        <div className="glass-card p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">
            CSS Class Verification
          </h2>
          <div className="text-gray-300 space-y-2 text-sm font-mono">
            <p><strong className="text-white">.hover-lift</strong></p>
            <p className="ml-4">transition: transform var(--duration-normal) ease, box-shadow var(--duration-normal) ease;</p>
            <p className="mt-2"><strong className="text-white">.hover-lift:hover</strong></p>
            <p className="ml-4">transform: translateY(-4px);</p>
            <p className="ml-4">box-shadow: var(--shadow-level-3);</p>
            <p className="mt-2"><strong className="text-white">--duration-normal</strong>: 0.3s</p>
            <p className="mt-2"><strong className="text-white">--shadow-level-3</strong>: 0 8px 32px rgba(0, 0, 0, 0.2)</p>
          </div>
        </div>

        {/* Test Results Checklist */}
        <div className="glass-card p-6 mt-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Test Results Checklist
          </h2>
          <div className="text-gray-300 space-y-2">
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span>All cards lift 4px upward on hover</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span>Shadow becomes more prominent on hover</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span>Tooltip appears with correct information</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span>Transitions are smooth (0.3s duration)</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span>Card returns to normal state on mouse leave</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span>Tooltip disappears on mouse leave</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span>Hover effects work on all pollutant types</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5" />
              <span>No performance issues or jank</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

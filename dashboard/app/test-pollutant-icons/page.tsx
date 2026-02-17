/**
 * Visual Test Page for Pollutant Icons and Color Coding
 * 
 * Task 6.2: Add pollutant icons and color coding
 * 
 * This page displays all pollutant types with different AQI levels
 * to visually verify:
 * - Each pollutant has a distinct icon
 * - Colors match AQI categories correctly
 */

'use client';

import { PollutantCard } from '@/components/dashboard/PollutantCard';
import { PollutantType } from '@/lib/api/types';

export default function TestPollutantIconsPage() {
  // Test data for all pollutants at different AQI levels
  const pollutantTypes: PollutantType[] = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'];
  
  const aqiLevels = [
    { aqi: 40, status: 'good', label: 'Good (0-50)', color: '#4ADE80' },
    { aqi: 75, status: 'moderate', label: 'Moderate (51-100)', color: '#FCD34D' },
    { aqi: 125, status: 'unhealthy_sensitive', label: 'Unhealthy for Sensitive (101-150)', color: '#FB923C' },
    { aqi: 175, status: 'unhealthy', label: 'Unhealthy (151-200)', color: '#EF4444' },
    { aqi: 250, status: 'very_unhealthy', label: 'Very Unhealthy (201-300)', color: '#B91C1C' },
    { aqi: 400, status: 'hazardous', label: 'Hazardous (301+)', color: '#7C2D12' },
  ];

  const pollutantData = {
    pm25: { value: 35.5, unit: 'μg/m³', name: 'PM2.5 - Fine Particles' },
    pm10: { value: 85.2, unit: 'μg/m³', name: 'PM10 - Coarse Particles' },
    o3: { value: 120.8, unit: 'μg/m³', name: 'O₃ - Ozone' },
    no2: { value: 60.3, unit: 'μg/m³', name: 'NO₂ - Nitrogen Dioxide' },
    so2: { value: 40.1, unit: 'μg/m³', name: 'SO₂ - Sulfur Dioxide' },
    co: { value: 2.5, unit: 'mg/m³', name: 'CO - Carbon Monoxide' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Pollutant Icons & Color Coding Test
          </h1>
          <p className="text-gray-300 text-lg">
            Task 6.2: Visual verification of icons and AQI-based color coding
          </p>
        </div>

        {/* Test Section 1: All Pollutants at Moderate Level */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">
            All Pollutants - Moderate Level (AQI 75)
          </h2>
          <p className="text-gray-300 mb-4">
            Verify each pollutant has a distinct icon
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {pollutantTypes.map((pollutant) => (
              <div key={pollutant} className="flex flex-col items-center">
                <PollutantCard
                  pollutant={pollutant}
                  value={pollutantData[pollutant].value}
                  unit={pollutantData[pollutant].unit}
                  aqi={75}
                  status="moderate"
                />
                <p className="text-white text-sm mt-2 text-center">
                  {pollutantData[pollutant].name}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Test Section 2: PM2.5 at All AQI Levels */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">
            PM2.5 - All AQI Levels
          </h2>
          <p className="text-gray-300 mb-4">
            Verify color changes correctly across AQI categories
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {aqiLevels.map((level) => (
              <div key={level.aqi} className="flex flex-col items-center">
                <PollutantCard
                  pollutant="pm25"
                  value={pollutantData.pm25.value}
                  unit={pollutantData.pm25.unit}
                  aqi={level.aqi}
                  status={level.status}
                />
                <div className="mt-2 text-center">
                  <p className="text-white text-sm font-medium">{level.label}</p>
                  <p className="text-gray-400 text-xs">AQI: {level.aqi}</p>
                  <div 
                    className="w-16 h-3 rounded mt-1 mx-auto"
                    style={{ backgroundColor: level.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Test Section 3: Color Coding Matrix */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Color Coding Matrix
          </h2>
          <p className="text-gray-300 mb-4">
            All pollutants at all AQI levels
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-white text-left p-2 border border-gray-600">
                    Pollutant
                  </th>
                  {aqiLevels.map((level) => (
                    <th 
                      key={level.aqi} 
                      className="text-white text-center p-2 border border-gray-600"
                    >
                      <div className="text-sm">{level.label}</div>
                      <div className="text-xs text-gray-400">AQI {level.aqi}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pollutantTypes.map((pollutant) => (
                  <tr key={pollutant}>
                    <td className="text-white p-2 border border-gray-600">
                      {pollutantData[pollutant].name}
                    </td>
                    {aqiLevels.map((level) => (
                      <td 
                        key={`${pollutant}-${level.aqi}`}
                        className="p-2 border border-gray-600"
                      >
                        <div className="flex justify-center">
                          <div style={{ transform: 'scale(0.8)' }}>
                            <PollutantCard
                              pollutant={pollutant}
                              value={pollutantData[pollutant].value}
                              unit={pollutantData[pollutant].unit}
                              aqi={level.aqi}
                              status={level.status}
                            />
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Test Section 4: Icon Details */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Icon Design Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pollutantTypes.map((pollutant) => (
              <div 
                key={pollutant}
                className="glass-card p-6 rounded-lg"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-white scale-150">
                    <PollutantCard
                      pollutant={pollutant}
                      value={pollutantData[pollutant].value}
                      unit={pollutantData[pollutant].unit}
                      aqi={75}
                      status="moderate"
                    />
                  </div>
                </div>
                <h3 className="text-white font-semibold mb-2">
                  {pollutantData[pollutant].name}
                </h3>
                <p className="text-gray-300 text-sm">
                  {pollutant === 'pm25' && 'Fine particles - Multiple small dots representing tiny particles'}
                  {pollutant === 'pm10' && 'Coarse particles - Fewer, larger dots representing bigger particles'}
                  {pollutant === 'o3' && 'Ozone - Sun with rays representing atmospheric ozone'}
                  {pollutant === 'no2' && 'Nitrogen dioxide - Wave patterns representing gas emissions'}
                  {pollutant === 'so2' && 'Sulfur dioxide - Factory with smoke representing industrial emissions'}
                  {pollutant === 'co' && 'Carbon monoxide - Vehicle exhaust representing traffic emissions'}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Test Section 5: AQI Color Reference */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">
            AQI Color Reference
          </h2>
          <div className="glass-card p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aqiLevels.map((level) => (
                <div 
                  key={level.aqi}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ 
                    backgroundColor: `${level.color}20`,
                    borderLeft: `4px solid ${level.color}`
                  }}
                >
                  <div 
                    className="w-12 h-12 rounded-full"
                    style={{ backgroundColor: level.color }}
                  />
                  <div>
                    <div className="text-white font-semibold">
                      {level.label}
                    </div>
                    <div className="text-gray-300 text-sm">
                      {level.color}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Test Results */}
        <section className="glass-card p-6 rounded-lg">
          <h2 className="text-2xl font-semibold text-white mb-4">
            ✅ Test Checklist
          </h2>
          <div className="space-y-2 text-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Each pollutant (PM2.5, PM10, O₃, NO₂, SO₂, CO) has a distinct icon</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>PM2.5 icon shows fine particles (many small dots)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>PM10 icon shows coarse particles (fewer, larger dots)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>O₃ icon shows sun/ozone representation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>NO₂ icon shows gas/smoke waves</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>SO₂ icon shows industrial smoke</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>CO icon shows vehicle exhaust</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Good (0-50): Green color (#4ADE80)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Moderate (51-100): Yellow color (#FCD34D)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Unhealthy for Sensitive (101-150): Orange color (#FB923C)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Unhealthy (151-200): Red color (#EF4444)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Very Unhealthy (201-300): Dark red color (#B91C1C)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Hazardous (301+): Brown color (#7C2D12)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span>Colors are applied to card border, icon, status label, and progress bar</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

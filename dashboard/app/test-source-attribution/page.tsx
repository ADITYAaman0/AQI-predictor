/**
 * Test Page for SourceAttributionCard Component
 * 
 * Visual verification page for the SourceAttributionCard component.
 * Navigate to /test-source-attribution to view this page.
 */

'use client';

import React, { useState } from 'react';
import { SourceAttributionCard } from '@/components/insights';
import { SourceAttribution } from '@/lib/api/types';

export default function TestSourceAttributionPage() {
  const [isLoading, setIsLoading] = useState(false);

  // Mock data scenarios
  const mockDataBalanced: SourceAttribution = {
    vehicular: 45,
    industrial: 25,
    biomass: 20,
    background: 10,
  };

  const mockDataVehicularDominant: SourceAttribution = {
    vehicular: 70,
    industrial: 15,
    biomass: 10,
    background: 5,
  };

  const mockDataIndustrialDominant: SourceAttribution = {
    vehicular: 20,
    industrial: 60,
    biomass: 15,
    background: 5,
  };

  const mockDataTwoSources: SourceAttribution = {
    vehicular: 60,
    industrial: 40,
    biomass: 0,
    background: 0,
  };

  const mockDataEmpty: SourceAttribution = {
    vehicular: 0,
    industrial: 0,
    biomass: 0,
    background: 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            SourceAttributionCard Component Test
          </h1>
          <p className="text-white/70">
            Visual verification for the source attribution donut chart component
          </p>
        </div>

        {/* Controls */}
        <div className="glass-card p-6 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Controls</h2>
          <button
            onClick={() => setIsLoading(!isLoading)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Toggle Loading State: {isLoading ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Test Cases Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Balanced Distribution */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              1. Balanced Distribution
            </h3>
            <SourceAttributionCard
              sourceAttribution={mockDataBalanced}
              isLoading={isLoading}
            />
          </div>

          {/* Vehicular Dominant */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              2. Vehicular Dominant (70%)
            </h3>
            <SourceAttributionCard
              sourceAttribution={mockDataVehicularDominant}
              isLoading={isLoading}
            />
          </div>

          {/* Industrial Dominant */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              3. Industrial Dominant (60%)
            </h3>
            <SourceAttributionCard
              sourceAttribution={mockDataIndustrialDominant}
              isLoading={isLoading}
              title="Industrial Pollution Sources"
            />
          </div>

          {/* Two Sources Only */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              4. Two Sources Only
            </h3>
            <SourceAttributionCard
              sourceAttribution={mockDataTwoSources}
              isLoading={isLoading}
            />
          </div>

          {/* Empty State */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              5. Empty State (No Data)
            </h3>
            <SourceAttributionCard
              sourceAttribution={mockDataEmpty}
              isLoading={isLoading}
            />
          </div>

          {/* Loading State (Always On) */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              6. Loading State (Always On)
            </h3>
            <SourceAttributionCard
              sourceAttribution={mockDataBalanced}
              isLoading={true}
            />
          </div>
        </div>

        {/* Requirements Checklist */}
        <div className="glass-card p-6 rounded-2xl mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Requirements Checklist (16.1, 16.2)
          </h2>
          <div className="space-y-2 text-white/80">
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Donut/pie chart implemented with Recharts</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Legend with percentages displayed</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Color-coded source categories</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Glassmorphic styling applied</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Loading state implemented</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Empty state handled</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Interactive tooltips on hover</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>Responsive container</span>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="glass-card p-6 rounded-2xl mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Visual Verification Instructions
          </h2>
          <div className="space-y-3 text-white/80 text-sm">
            <p>1. Verify that all donut charts render correctly with proper colors</p>
            <p>2. Check that percentages in the legend match the chart segments</p>
            <p>3. Hover over chart segments to see tooltips with source names and percentages</p>
            <p>4. Toggle loading state to verify skeleton animation</p>
            <p>5. Verify empty state displays appropriate message</p>
            <p>6. Check that glassmorphic styling is consistent with other components</p>
            <p>7. Verify responsive behavior by resizing the browser window</p>
            <p>8. Check that colors are distinct and accessible</p>
          </div>
        </div>

        {/* Color Reference */}
        <div className="glass-card p-6 rounded-2xl mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Color Reference
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#3B82F6]"></div>
              <div>
                <p className="text-white font-medium">Vehicular</p>
                <p className="text-white/60 text-xs">#3B82F6</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#EF4444]"></div>
              <div>
                <p className="text-white font-medium">Industrial</p>
                <p className="text-white/60 text-xs">#EF4444</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F59E0B]"></div>
              <div>
                <p className="text-white font-medium">Biomass</p>
                <p className="text-white/60 text-xs">#F59E0B</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#6B7280]"></div>
              <div>
                <p className="text-white font-medium">Background</p>
                <p className="text-white/60 text-xs">#6B7280</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Test Page for Source Attribution Card Interactive Features
 * 
 * This page demonstrates and tests the interactive features of the SourceAttributionCard:
 * - Hover effects on chart segments
 * - Click to show detailed breakdown
 * - Animations
 * - Legend interactions
 */

'use client';

import React from 'react';
import { SourceAttributionCard } from '@/components/insights/SourceAttributionCard';
import { SourceAttribution } from '@/lib/api/types';

export default function TestSourceAttributionInteractivePage() {
  const mockSourceAttribution: SourceAttribution = {
    vehicular: 45,
    industrial: 25,
    biomass: 20,
    background: 10,
  };

  const mockHighVehicular: SourceAttribution = {
    vehicular: 70,
    industrial: 15,
    biomass: 10,
    background: 5,
  };

  const mockBalanced: SourceAttribution = {
    vehicular: 25,
    industrial: 25,
    biomass: 25,
    background: 25,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Source Attribution Card - Interactive Features Test
          </h1>
          <p className="text-white/70 text-lg">
            Test the interactive features: hover effects, click interactions, and animations
          </p>
        </div>

        {/* Test Instructions */}
        <div className="glass-card p-6 rounded-2xl mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Test Instructions</h2>
          <div className="space-y-3 text-white/80">
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">1.</span>
              <div>
                <strong>Hover over chart segments:</strong> Segments should brighten and show a glow effect
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">2.</span>
              <div>
                <strong>Hover over legend items:</strong> Legend items should highlight with background color and the color indicator should glow
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">3.</span>
              <div>
                <strong>Click on legend items:</strong> Should show detailed breakdown with description, animated progress bar, and fade-in animation
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">4.</span>
              <div>
                <strong>Click on chart segments:</strong> Should also show detailed breakdown
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">5.</span>
              <div>
                <strong>Switch between segments:</strong> Click different legend items to see smooth transitions
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 font-bold">6.</span>
              <div>
                <strong>Close details:</strong> Click the X button to close the detailed breakdown
              </div>
            </div>
          </div>
        </div>

        {/* Test Cases */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Case 1: Standard Distribution */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Test Case 1: Standard Distribution
            </h3>
            <SourceAttributionCard sourceAttribution={mockSourceAttribution} />
          </div>

          {/* Test Case 2: High Vehicular */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Test Case 2: High Vehicular Pollution
            </h3>
            <SourceAttributionCard
              sourceAttribution={mockHighVehicular}
              title="High Traffic Area"
            />
          </div>

          {/* Test Case 3: Balanced */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Test Case 3: Balanced Sources
            </h3>
            <SourceAttributionCard
              sourceAttribution={mockBalanced}
              title="Balanced Pollution Sources"
            />
          </div>

          {/* Test Case 4: Loading State */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Test Case 4: Loading State
            </h3>
            <SourceAttributionCard sourceAttribution={mockSourceAttribution} isLoading={true} />
          </div>
        </div>

        {/* Feature Checklist */}
        <div className="glass-card p-6 rounded-2xl mt-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Interactive Features Checklist</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Hover Effects</h3>
              <div className="space-y-1 text-white/70 text-sm">
                <div>☐ Chart segments brighten on hover</div>
                <div>☐ Chart segments show glow effect</div>
                <div>☐ Legend items highlight on hover</div>
                <div>☐ Color indicators glow on hover</div>
                <div>☐ Smooth transitions (0.3s)</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Click Interactions</h3>
              <div className="space-y-1 text-white/70 text-sm">
                <div>☐ Legend items are clickable</div>
                <div>☐ Chart segments are clickable</div>
                <div>☐ Detailed breakdown appears</div>
                <div>☐ Close button works</div>
                <div>☐ Can switch between segments</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Animations</h3>
              <div className="space-y-1 text-white/70 text-sm">
                <div>☐ Chart animates on load (800ms)</div>
                <div>☐ Details fade in smoothly</div>
                <div>☐ Progress bar animates (500ms)</div>
                <div>☐ Hover animations are smooth</div>
                <div>☐ No janky transitions</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white/90 mb-2">Detailed Breakdown</h3>
              <div className="space-y-1 text-white/70 text-sm">
                <div>☐ Shows source name</div>
                <div>☐ Shows percentage</div>
                <div>☐ Shows progress bar</div>
                <div>☐ Shows description</div>
                <div>☐ Color indicator matches source</div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

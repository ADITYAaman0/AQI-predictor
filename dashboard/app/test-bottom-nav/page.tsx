'use client';

import BottomNavigation from '@/components/layout/BottomNavigation';

export default function TestBottomNavPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">
          Bottom Navigation Test Page
        </h1>

        <div className="glass-card p-6 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Test Instructions
          </h2>
          <ul className="space-y-2 text-white/90">
            <li>✓ Bottom navigation should appear at the bottom of the screen</li>
            <li>✓ Should be visible on mobile viewports (&lt; 768px)</li>
            <li>✓ Should be hidden on desktop viewports (≥ 768px)</li>
            <li>✓ Should have glassmorphic styling with blur effect</li>
            <li>✓ Active page should be highlighted</li>
            <li>✓ All items should have minimum 44x44px touch targets</li>
            <li>✓ Should display icons and labels for each navigation item</li>
          </ul>
        </div>

        <div className="glass-card p-6 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Responsive Test
          </h2>
          <p className="text-white/90 mb-4">
            Resize your browser window to test responsive behavior:
          </p>
          <ul className="space-y-2 text-white/90">
            <li>
              <strong>Desktop (≥ 768px):</strong> Bottom navigation should be hidden
            </li>
            <li>
              <strong>Mobile (&lt; 768px):</strong> Bottom navigation should be visible
            </li>
          </ul>
        </div>

        <div className="glass-card p-6 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Navigation Items
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold text-white mb-2">Dashboard</h3>
              <p className="text-white/80 text-sm">Home icon - Links to /</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold text-white mb-2">Forecast</h3>
              <p className="text-white/80 text-sm">Chart icon - Links to /forecast</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold text-white mb-2">Insights</h3>
              <p className="text-white/80 text-sm">Trend icon - Links to /insights</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold text-white mb-2">Favorites</h3>
              <p className="text-white/80 text-sm">Star icon - Links to /favorites</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold text-white mb-2">Settings</h3>
              <p className="text-white/80 text-sm">Gear icon - Links to /settings</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 mb-24">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Accessibility Features
          </h2>
          <ul className="space-y-2 text-white/90">
            <li>✓ ARIA labels for screen readers</li>
            <li>✓ aria-current="page" for active navigation item</li>
            <li>✓ Focus ring for keyboard navigation</li>
            <li>✓ Minimum 44x44px touch targets</li>
            <li>✓ Semantic HTML with nav element</li>
          </ul>
        </div>

        {/* Spacer to ensure content is visible above bottom nav on mobile */}
        <div className="h-20 md:h-0" />
      </div>

      {/* Bottom Navigation Component */}
      <BottomNavigation />
    </div>
  );
}

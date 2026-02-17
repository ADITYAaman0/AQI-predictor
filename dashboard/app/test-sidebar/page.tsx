'use client';

import { Sidebar } from '@/components/layout';

export default function TestSidebarPage() {
  return (
    <div className="min-h-screen bg-gradient-good">
      <div className="fixed top-0 left-0 right-0 h-16 glass-card flex items-center px-6">
        <h1 className="text-white text-xl font-semibold">Sidebar Test Page</h1>
      </div>
      
      <Sidebar />
      
      <main className="ml-20 pt-20 p-8">
        <div className="glass-card p-8 max-w-4xl">
          <h2 className="text-h1 text-white mb-6">Sidebar Component Test</h2>
          
          <div className="space-y-4 text-white">
            <div className="glass-card p-4">
              <h3 className="text-h2 mb-2">✅ Sidebar Features</h3>
              <ul className="list-disc list-inside space-y-2 text-body">
                <li>Fixed left sidebar with glassmorphic styling</li>
                <li>Navigation icons: Dashboard, Dark mode, Favorites, Settings</li>
                <li>Active state highlighting with glow effect</li>
                <li>Hover effects on inactive items</li>
                <li>40x40px hit areas with 16px vertical spacing</li>
                <li>Accessible with ARIA labels and keyboard navigation</li>
              </ul>
            </div>

            <div className="glass-card p-4">
              <h3 className="text-h2 mb-2">🎨 Styling Details</h3>
              <ul className="list-disc list-inside space-y-2 text-body">
                <li>Background: rgba(255, 255, 255, 0.15)</li>
                <li>Backdrop blur: 20px</li>
                <li>Active state: bg-white/25 with shadow glow</li>
                <li>Inactive state: text-white/70 with hover effects</li>
                <li>Smooth transitions (300ms duration)</li>
              </ul>
            </div>

            <div className="glass-card p-4">
              <h3 className="text-h2 mb-2">🧪 Test Instructions</h3>
              <ol className="list-decimal list-inside space-y-2 text-body">
                <li>Check that the sidebar is visible on the left side</li>
                <li>Verify all 4 icons are displayed (Dashboard, Dark mode, Favorites, Settings)</li>
                <li>Click on each icon to test navigation</li>
                <li>Verify the Dashboard icon is highlighted (active state)</li>
                <li>Hover over inactive icons to see hover effects</li>
                <li>Test keyboard navigation (Tab key)</li>
                <li>Verify focus indicators are visible</li>
              </ol>
            </div>

            <div className="glass-card p-4">
              <h3 className="text-h2 mb-2">📋 Requirements Validation</h3>
              <ul className="list-disc list-inside space-y-2 text-body">
                <li>✅ Requirement 1.5: Vertical sidebar with navigation icons</li>
                <li>✅ Icons: Dashboard, Dark mode toggle, Favorites, Settings</li>
                <li>✅ Icon size: 24x24px within 40x40px hit areas</li>
                <li>✅ Vertical spacing: 16px (gap-4)</li>
                <li>✅ Active state: Colored background circle with glow</li>
                <li>✅ Glassmorphic styling applied</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

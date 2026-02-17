import { TopNavigation } from '@/components/layout';

export default function TestNavigationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      <TopNavigation />
      
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="glass-card p-8 rounded-2xl max-w-4xl mx-auto">
          <h1 className="text-h1 text-white mb-6">TopNavigation Component Test</h1>
          
          <div className="space-y-6 text-white">
            <section>
              <h2 className="text-h2 mb-3">✅ Features Implemented</h2>
              <ul className="list-disc list-inside space-y-2 text-body">
                <li>Glassmorphic styling with rgba(255, 255, 255, 0.15) background</li>
                <li>Backdrop blur effect (20px)</li>
                <li>Segmented control for views (Real-time | Forecast | Insights)</li>
                <li>Active state with glow effect</li>
                <li>Notification bell with badge count</li>
                <li>User profile circle</li>
                <li>Responsive design</li>
                <li>Accessibility features (ARIA labels, keyboard navigation)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-h2 mb-3">🧪 Test Instructions</h2>
              <ol className="list-decimal list-inside space-y-2 text-body">
                <li>Click on each navigation segment (Real-time, Forecast, Insights)</li>
                <li>Verify the active state changes with glow effect</li>
                <li>Verify navigation switches between views</li>
                <li>Check notification bell shows badge count (3)</li>
                <li>Hover over buttons to see hover effects</li>
                <li>Test keyboard navigation (Tab key)</li>
                <li>Verify glassmorphic styling is visible</li>
              </ol>
            </section>

            <section>
              <h2 className="text-h2 mb-3">📋 Requirements Validated</h2>
              <ul className="list-disc list-inside space-y-2 text-body">
                <li><strong>Requirement 1.3:</strong> Navigation system with segmented control ✓</li>
                <li><strong>Requirement 1.4:</strong> Notification bell and user profile ✓</li>
              </ul>
            </section>

            <section>
              <h2 className="text-h2 mb-3">🎨 Styling Details</h2>
              <ul className="list-disc list-inside space-y-2 text-body">
                <li>Background: rgba(255, 255, 255, 0.15)</li>
                <li>Backdrop filter: blur(20px)</li>
                <li>Active segment: rgba(255, 255, 255, 0.25) with glow</li>
                <li>Smooth transitions: 300ms duration</li>
                <li>Fixed positioning at top of viewport</li>
              </ul>
            </section>

            <section className="mt-8 p-4 bg-white/10 rounded-lg">
              <h3 className="text-h3 mb-2">Navigation Links</h3>
              <div className="flex gap-4">
                <a href="/" className="text-white hover:underline">Home (Real-time)</a>
                <a href="/forecast" className="text-white hover:underline">Forecast</a>
                <a href="/insights" className="text-white hover:underline">Insights</a>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

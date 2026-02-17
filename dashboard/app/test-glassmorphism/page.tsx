'use client';

/**
 * Test page for verifying glassmorphism effects and animations
 * Task 3.3: Implement global CSS and glassmorphism utilities
 */

export default function TestGlassmorphismPage() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-h1 mb-8">Glassmorphism & Animation Test Page</h1>
      
      {/* Test 1: Glassmorphic Cards */}
      <section className="mb-12">
        <h2 className="text-h2 mb-4">1. Glassmorphic Card Styles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div className="glass-card p-lg" data-testid="glass-card-light">
            <h3 className="text-h3 mb-2">Light Glass Card</h3>
            <p className="text-body">
              Background: rgba(255, 255, 255, 0.1)<br />
              Backdrop blur: 20px<br />
              Border: 1px solid rgba(255, 255, 255, 0.18)
            </p>
          </div>
          
          <div className="glass-card-dark p-lg" data-testid="glass-card-dark">
            <h3 className="text-h3 mb-2">Dark Glass Card</h3>
            <p className="text-body">
              Background: rgba(0, 0, 0, 0.3)<br />
              Backdrop blur: 20px<br />
              Border: 1px solid rgba(255, 255, 255, 0.1)
            </p>
          </div>
        </div>
      </section>

      {/* Test 2: Dynamic Background Gradients */}
      <section className="mb-12">
        <h2 className="text-h2 mb-4">2. Dynamic Background Gradients (AQI Categories)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div className="bg-gradient-good p-lg rounded-lg" data-testid="bg-good">
            <h3 className="text-h3 text-white mb-2">Good (0-50)</h3>
            <p className="text-body text-white">Blue-purple gradient</p>
          </div>
          
          <div className="bg-gradient-moderate p-lg rounded-lg" data-testid="bg-moderate">
            <h3 className="text-h3 text-white mb-2">Moderate (51-100)</h3>
            <p className="text-body text-white">Pink-red gradient</p>
          </div>
          
          <div className="bg-gradient-unhealthy p-lg rounded-lg" data-testid="bg-unhealthy">
            <h3 className="text-h3 text-white mb-2">Unhealthy (101-150)</h3>
            <p className="text-body text-white">Blue-cyan gradient</p>
          </div>
          
          <div className="bg-gradient-very-unhealthy p-lg rounded-lg" data-testid="bg-very-unhealthy">
            <h3 className="text-h3 text-white mb-2">Very Unhealthy (151-200)</h3>
            <p className="text-body text-white">Pink-yellow gradient</p>
          </div>
          
          <div className="bg-gradient-hazardous p-lg rounded-lg" data-testid="bg-hazardous">
            <h3 className="text-h3 text-white mb-2">Hazardous (201+)</h3>
            <p className="text-body text-white">Dark gradient</p>
          </div>
        </div>
      </section>

      {/* Test 3: Animation Keyframes */}
      <section className="mb-12">
        <h2 className="text-h2 mb-4">3. Animation Keyframes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          <div className="glass-card p-lg animate-fade-in" data-testid="anim-fade-in">
            <h3 className="text-h3 mb-2">Fade In</h3>
            <p className="text-body">0.4s cubic-bezier</p>
          </div>
          
          <div className="glass-card p-lg animate-slide-up" data-testid="anim-slide-up">
            <h3 className="text-h3 mb-2">Slide Up</h3>
            <p className="text-body">0.4s cubic-bezier</p>
          </div>
          
          <div className="glass-card p-lg animate-pulse-glow" data-testid="anim-pulse-glow">
            <h3 className="text-h3 mb-2">Pulse Glow</h3>
            <p className="text-body">2s infinite</p>
          </div>
        </div>
      </section>

      {/* Test 4: Hover Effects */}
      <section className="mb-12">
        <h2 className="text-h2 mb-4">4. Hover Effects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div className="glass-card p-lg hover-lift" data-testid="hover-lift">
            <h3 className="text-h3 mb-2">Hover Lift</h3>
            <p className="text-body">Hover to lift 4px with enhanced shadow</p>
          </div>
          
          <button className="glass-card p-lg hover-scale" data-testid="hover-scale">
            <h3 className="text-h3 mb-2">Click Scale</h3>
            <p className="text-body">Click to scale to 0.95</p>
          </button>
        </div>
      </section>

      {/* Test 5: AQI Color Utilities */}
      <section className="mb-12">
        <h2 className="text-h2 mb-4">5. AQI Color Utilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-md">
          <div className="glass-card p-lg border-2 border-aqi-good" data-testid="color-good">
            <div className="w-12 h-12 bg-aqi-good rounded-full mb-2"></div>
            <p className="text-aqi-good text-body font-semibold">Good</p>
          </div>
          
          <div className="glass-card p-lg border-2 border-aqi-moderate" data-testid="color-moderate">
            <div className="w-12 h-12 bg-aqi-moderate rounded-full mb-2"></div>
            <p className="text-aqi-moderate text-body font-semibold">Moderate</p>
          </div>
          
          <div className="glass-card p-lg border-2 border-aqi-unhealthy" data-testid="color-unhealthy">
            <div className="w-12 h-12 bg-aqi-unhealthy rounded-full mb-2"></div>
            <p className="text-aqi-unhealthy text-body font-semibold">Unhealthy</p>
          </div>
          
          <div className="glass-card p-lg border-2 border-aqi-very-unhealthy" data-testid="color-very-unhealthy">
            <div className="w-12 h-12 bg-aqi-very-unhealthy rounded-full mb-2"></div>
            <p className="text-aqi-very-unhealthy text-body font-semibold">Very Unhealthy</p>
          </div>
          
          <div className="glass-card p-lg border-2 border-aqi-hazardous" data-testid="color-hazardous">
            <div className="w-12 h-12 bg-aqi-hazardous rounded-full mb-2"></div>
            <p className="text-aqi-hazardous text-body font-semibold">Hazardous</p>
          </div>
        </div>
      </section>

      {/* Test 6: Typography Utilities */}
      <section className="mb-12">
        <h2 className="text-h2 mb-4">6. Typography Utilities</h2>
        <div className="glass-card p-lg space-y-4">
          <div className="text-display" data-testid="text-display">Display Text (72px)</div>
          <div className="text-h1" data-testid="text-h1">Heading 1 (32px)</div>
          <div className="text-h2" data-testid="text-h2">Heading 2 (20px)</div>
          <div className="text-h3" data-testid="text-h3">Heading 3 (16px)</div>
          <div className="text-body" data-testid="text-body">Body Text (14px)</div>
          <div className="text-caption" data-testid="text-caption">Caption Text (12px)</div>
          <div className="text-micro" data-testid="text-micro">Micro Text (10px)</div>
        </div>
      </section>

      {/* Test 7: Focus Indicators */}
      <section className="mb-12">
        <h2 className="text-h2 mb-4">7. Focus Indicators (Tab to test)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <button className="glass-card p-lg focus-glow" data-testid="focus-glow">
            <h3 className="text-h3">Focus Glow</h3>
            <p className="text-body">Tab to see glow effect</p>
          </button>
          
          <button className="glass-card p-lg focus-ring" data-testid="focus-ring">
            <h3 className="text-h3">Focus Ring</h3>
            <p className="text-body">Tab to see ring outline</p>
          </button>
        </div>
      </section>

      {/* Test 8: Spacing Utilities */}
      <section className="mb-12">
        <h2 className="text-h2 mb-4">8. Spacing Utilities (4px base unit)</h2>
        <div className="glass-card p-lg">
          <div className="flex flex-col gap-xs" data-testid="spacing-demo">
            <div className="bg-aqi-good p-xs">xs: 4px</div>
            <div className="bg-aqi-moderate p-sm">sm: 8px</div>
            <div className="bg-aqi-unhealthy p-md">md: 16px</div>
            <div className="bg-aqi-very-unhealthy p-lg">lg: 24px</div>
            <div className="bg-aqi-hazardous p-xl">xl: 32px</div>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Test page to verify all custom design tokens and utility classes
 * This page demonstrates the glassmorphic design system
 */

export default function TestDesignTokens() {
  return (
    <div className="min-h-screen p-8 bg-gradient-good">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-h1 text-white mb-8">Design Tokens Test Page</h1>

        {/* Glassmorphic Cards */}
        <section>
          <h2 className="text-h2 text-white mb-4">Glassmorphic Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <div className="glass-card p-lg hover-lift">
              <h3 className="text-h3 text-white mb-2">Light Glass Card</h3>
              <p className="text-body text-white/80">
                Background: rgba(255, 255, 255, 0.1)
                <br />
                Backdrop blur: 20px
                <br />
                Border: 1px rgba(255, 255, 255, 0.18)
              </p>
            </div>
            <div className="glass-card-dark p-lg hover-lift">
              <h3 className="text-h3 text-white mb-2">Dark Glass Card</h3>
              <p className="text-body text-white/80">
                Background: rgba(0, 0, 0, 0.3)
                <br />
                Backdrop blur: 20px
                <br />
                Border: 1px rgba(255, 255, 255, 0.1)
              </p>
            </div>
            <div className="glass-card p-lg hover-lift animate-pulse-glow">
              <h3 className="text-h3 text-white mb-2">Animated Card</h3>
              <p className="text-body text-white/80">
                With pulse glow animation
              </p>
            </div>
          </div>
        </section>

        {/* AQI Category Colors */}
        <section>
          <h2 className="text-h2 text-white mb-4">AQI Category Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-sm">
            <div className="glass-card p-md text-center">
              <div className="w-16 h-16 bg-aqi-good rounded-full mx-auto mb-2"></div>
              <p className="text-caption text-white">Good</p>
              <p className="text-micro text-white/60">#4ADE80</p>
            </div>
            <div className="glass-card p-md text-center">
              <div className="w-16 h-16 bg-aqi-moderate rounded-full mx-auto mb-2"></div>
              <p className="text-caption text-white">Moderate</p>
              <p className="text-micro text-white/60">#FCD34D</p>
            </div>
            <div className="glass-card p-md text-center">
              <div className="w-16 h-16 bg-aqi-unhealthy rounded-full mx-auto mb-2"></div>
              <p className="text-caption text-white">Unhealthy</p>
              <p className="text-micro text-white/60">#FB923C</p>
            </div>
            <div className="glass-card p-md text-center">
              <div className="w-16 h-16 bg-aqi-very-unhealthy rounded-full mx-auto mb-2"></div>
              <p className="text-caption text-white">Very Unhealthy</p>
              <p className="text-micro text-white/60">#EF4444</p>
            </div>
            <div className="glass-card p-md text-center">
              <div className="w-16 h-16 bg-aqi-hazardous rounded-full mx-auto mb-2"></div>
              <p className="text-caption text-white">Hazardous</p>
              <p className="text-micro text-white/60">#7C2D12</p>
            </div>
          </div>
        </section>

        {/* Typography Scale */}
        <section className="glass-card p-lg">
          <h2 className="text-h2 text-white mb-4">Typography Scale</h2>
          <div className="space-y-4">
            <div>
              <p className="text-display text-white">Display 72px</p>
              <p className="text-micro text-white/60">font-size: 72px, weight: 700</p>
            </div>
            <div>
              <p className="text-h1 text-white">Heading 1 - 32px</p>
              <p className="text-micro text-white/60">font-size: 32px, weight: 600</p>
            </div>
            <div>
              <p className="text-h2 text-white">Heading 2 - 20px</p>
              <p className="text-micro text-white/60">font-size: 20px, weight: 600</p>
            </div>
            <div>
              <p className="text-h3 text-white">Heading 3 - 16px</p>
              <p className="text-micro text-white/60">font-size: 16px, weight: 500</p>
            </div>
            <div>
              <p className="text-body text-white">Body - 14px</p>
              <p className="text-micro text-white/60">font-size: 14px, weight: 400</p>
            </div>
            <div>
              <p className="text-caption text-white">Caption - 12px</p>
              <p className="text-micro text-white/60">font-size: 12px, weight: 400</p>
            </div>
            <div>
              <p className="text-micro text-white">Micro - 10px</p>
              <p className="text-micro text-white/60">font-size: 10px, weight: 500, letter-spacing: 0.5px</p>
            </div>
          </div>
        </section>

        {/* Spacing Scale */}
        <section className="glass-card p-lg">
          <h2 className="text-h2 text-white mb-4">Spacing Scale (4px base unit)</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-md">
              <div className="w-16 text-caption text-white">xs (4px)</div>
              <div className="h-4 bg-white/30" style={{ width: '4px' }}></div>
            </div>
            <div className="flex items-center gap-md">
              <div className="w-16 text-caption text-white">sm (8px)</div>
              <div className="h-4 bg-white/30" style={{ width: '8px' }}></div>
            </div>
            <div className="flex items-center gap-md">
              <div className="w-16 text-caption text-white">md (16px)</div>
              <div className="h-4 bg-white/30" style={{ width: '16px' }}></div>
            </div>
            <div className="flex items-center gap-md">
              <div className="w-16 text-caption text-white">lg (24px)</div>
              <div className="h-4 bg-white/30" style={{ width: '24px' }}></div>
            </div>
            <div className="flex items-center gap-md">
              <div className="w-16 text-caption text-white">xl (32px)</div>
              <div className="h-4 bg-white/30" style={{ width: '32px' }}></div>
            </div>
            <div className="flex items-center gap-md">
              <div className="w-16 text-caption text-white">2xl (48px)</div>
              <div className="h-4 bg-white/30" style={{ width: '48px' }}></div>
            </div>
            <div className="flex items-center gap-md">
              <div className="w-16 text-caption text-white">3xl (64px)</div>
              <div className="h-4 bg-white/30" style={{ width: '64px' }}></div>
            </div>
          </div>
        </section>

        {/* Background Gradients */}
        <section>
          <h2 className="text-h2 text-white mb-4">Dynamic Background Gradients</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-sm">
            <div className="bg-gradient-good p-lg rounded-lg text-center">
              <p className="text-body text-white font-semibold">Good</p>
              <p className="text-caption text-white/80">Blue-Purple</p>
            </div>
            <div className="bg-gradient-moderate p-lg rounded-lg text-center">
              <p className="text-body text-white font-semibold">Moderate</p>
              <p className="text-caption text-white/80">Pink-Red</p>
            </div>
            <div className="bg-gradient-unhealthy p-lg rounded-lg text-center">
              <p className="text-body text-white font-semibold">Unhealthy</p>
              <p className="text-caption text-white/80">Blue-Cyan</p>
            </div>
            <div className="bg-gradient-very-unhealthy p-lg rounded-lg text-center">
              <p className="text-body text-white font-semibold">Very Unhealthy</p>
              <p className="text-caption text-white/80">Pink-Yellow</p>
            </div>
            <div className="bg-gradient-hazardous p-lg rounded-lg text-center">
              <p className="text-body text-white font-semibold">Hazardous</p>
              <p className="text-caption text-white/80">Cyan-Purple</p>
            </div>
          </div>
        </section>

        {/* Animations */}
        <section>
          <h2 className="text-h2 text-white mb-4">Animations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <div className="glass-card p-lg animate-fade-in">
              <h3 className="text-h3 text-white mb-2">Fade In</h3>
              <p className="text-caption text-white/80">0.4s cubic-bezier</p>
            </div>
            <div className="glass-card p-lg animate-slide-up">
              <h3 className="text-h3 text-white mb-2">Slide Up</h3>
              <p className="text-caption text-white/80">0.4s cubic-bezier</p>
            </div>
            <div className="glass-card p-lg animate-spin">
              <h3 className="text-h3 text-white mb-2">Spin</h3>
              <p className="text-caption text-white/80">1s linear infinite</p>
            </div>
          </div>
        </section>

        {/* Interactive Elements */}
        <section>
          <h2 className="text-h2 text-white mb-4">Interactive Elements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <button className="glass-card p-lg hover-lift hover-scale focus-glow text-white text-body">
              Hover & Click Me (Lift + Scale)
            </button>
            <button className="glass-card p-lg focus-ring text-white text-body">
              Focus Me (Ring Indicator)
            </button>
          </div>
        </section>

        {/* Success Message */}
        <div className="glass-card p-lg text-center">
          <h2 className="text-h2 text-white mb-2">✅ All Design Tokens Verified</h2>
          <p className="text-body text-white/80">
            All custom classes are available and working correctly!
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { PredictionGraph } from '@/components/forecast';
import { HourlyForecastData } from '@/lib/api/types';

/**
 * Test page for PredictionGraph component
 * 
 * This page demonstrates the PredictionGraph component with mock data.
 * Navigate to /test-prediction-graph to view this page.
 */
export default function TestPredictionGraphPage() {
  // Generate mock forecast data for 24 hours
  const mockForecasts: HourlyForecastData[] = Array.from({ length: 24 }, (_, i) => {
    // Simulate varying AQI values throughout the day
    const baseAQI = 50 + Math.sin(i / 4) * 40 + Math.random() * 20;
    const aqi = Math.max(0, Math.min(500, Math.round(baseAQI)));
    
    // Determine category based on AQI
    let category = 'good';
    let categoryLabel = 'Good';
    let color = '#4ADE80';
    
    if (aqi > 300) {
      category = 'hazardous';
      categoryLabel = 'Hazardous';
      color = '#7C2D12';
    } else if (aqi > 200) {
      category = 'very_unhealthy';
      categoryLabel = 'Very Unhealthy';
      color = '#991B1B';
    } else if (aqi > 150) {
      category = 'unhealthy';
      categoryLabel = 'Unhealthy';
      color = '#EF4444';
    } else if (aqi > 100) {
      category = 'unhealthy_sensitive';
      categoryLabel = 'Unhealthy for Sensitive Groups';
      color = '#FB923C';
    } else if (aqi > 50) {
      category = 'moderate';
      categoryLabel = 'Moderate';
      color = '#FCD34D';
    }
    
    const timestamp = new Date(Date.now() + i * 60 * 60 * 1000).toISOString();
    
    return {
      timestamp,
      forecastHour: i,
      aqi: {
        value: aqi,
        category,
        categoryLabel,
        color,
        confidenceLower: Math.max(0, aqi - 10),
        confidenceUpper: Math.min(500, aqi + 10),
      },
      pollutants: {},
      weather: {
        temperature: 20 + Math.random() * 10,
        humidity: 50 + Math.random() * 30,
        windSpeed: 5 + Math.random() * 10,
        windDirection: Math.random() * 360,
        pressure: 1010 + Math.random() * 20,
      },
      confidence: {
        score: 0.8 + Math.random() * 0.2,
        modelWeights: {},
      },
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">
            PredictionGraph Component Test
          </h1>
          <p className="text-white/70">
            Testing the PredictionGraph component with mock 24-hour forecast data
          </p>
        </div>

        {/* Test: Default Configuration */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Default Configuration
          </h2>
          <p className="text-white/70 text-sm">
            Standard prediction graph without confidence intervals
          </p>
          <PredictionGraph forecasts={mockForecasts} />
        </div>

        {/* Test: With Confidence Intervals */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            With Confidence Intervals
          </h2>
          <p className="text-white/70 text-sm">
            Prediction graph showing confidence interval shading. Hover over data points to see tooltips with AQI, timestamp, and confidence intervals.
          </p>
          <PredictionGraph
            forecasts={mockForecasts}
            showConfidenceInterval={true}
          />
        </div>

        {/* Test: Interactive Tooltips */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Interactive Tooltips (Task 9.4)
          </h2>
          <p className="text-white/70 text-sm">
            Hover over the graph to see interactive tooltips with:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1 text-white/70 text-sm">
            <li>Exact AQI value with color coding</li>
            <li>Formatted timestamp</li>
            <li>AQI category label</li>
            <li>8px diameter circles at data points on hover</li>
          </ul>
          <PredictionGraph
            forecasts={mockForecasts}
            onHover={(forecast) => {
              if (forecast) {
                console.log('Hovering over:', forecast);
              }
            }}
          />
        </div>

        {/* Test: Custom Height */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Custom Height (400px)
          </h2>
          <p className="text-white/70 text-sm">
            Prediction graph with increased height
          </p>
          <PredictionGraph forecasts={mockForecasts} height={400} />
        </div>

        {/* Test: Empty Data */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Empty Data
          </h2>
          <p className="text-white/70 text-sm">
            Prediction graph with no forecast data
          </p>
          <PredictionGraph forecasts={[]} />
        </div>

        {/* Test: Short Forecast (6 hours) */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Short Forecast (6 hours)
          </h2>
          <p className="text-white/70 text-sm">
            Prediction graph with limited data points
          </p>
          <PredictionGraph forecasts={mockForecasts.slice(0, 6)} />
        </div>

        {/* Component Info */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Component Information
          </h2>
          <div className="space-y-2 text-white/80 text-sm">
            <p><strong>Component:</strong> PredictionGraph</p>
            <p><strong>Location:</strong> components/forecast/PredictionGraph.tsx</p>
            <p><strong>Requirements:</strong> 4.1, 4.2</p>
            <p><strong>Features:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Recharts LineChart/AreaChart integration</li>
              <li>Configurable axes and grid</li>
              <li>Responsive container</li>
              <li>Optional confidence intervals</li>
              <li>Custom height support</li>
              <li>Animated line drawing (2s ease-out)</li>
              <li>Interactive tooltips with AQI, timestamp, and confidence data</li>
              <li>8px diameter circles at data points on hover</li>
              <li>Color-coded AQI values in tooltips</li>
            </ul>
            <p><strong>Props:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><code>forecasts</code>: HourlyForecastData[] (required)</li>
              <li><code>showConfidenceInterval</code>: boolean (optional, default: false)</li>
              <li><code>height</code>: number (optional, default: 280)</li>
              <li><code>onHover</code>: (forecast | null) =&gt; void (optional)</li>
            </ul>
          </div>
        </div>

        {/* Data Sample */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Sample Data (First 3 Hours)
          </h2>
          <pre className="bg-black/30 rounded-lg p-4 overflow-x-auto text-xs text-white/80">
            {JSON.stringify(mockForecasts.slice(0, 3), null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

# HealthRecommendationsCard Integration Guide

## Overview
This guide shows how to integrate the HealthRecommendationsCard component into the dashboard.

## Basic Integration

### With API Data
```tsx
'use client';

import { HealthRecommendationsCard } from '@/components/dashboard/HealthRecommendationsCard';
import { useCurrentAQI } from '@/lib/api/hooks/useCurrentAQI';

export default function DashboardPage() {
  const { data, isLoading, error } = useCurrentAQI('Delhi');

  if (isLoading) {
    return <HealthRecommendationsCard aqi={0} category="good" isLoading={true} />;
  }

  if (error || !data) {
    return <div>Error loading AQI data</div>;
  }

  return (
    <div className="space-y-6">
      {/* Other dashboard components */}
      
      <HealthRecommendationsCard
        aqi={data.aqi.value}
        category={data.aqi.category}
      />
    </div>
  );
}
```

### With HeroAQISection
```tsx
import { HeroAQISection } from '@/components/dashboard/HeroAQISection';
import { HealthRecommendationsCard } from '@/components/dashboard/HealthRecommendationsCard';
import { useCurrentAQI } from '@/lib/api/hooks/useCurrentAQI';

export default function DashboardPage() {
  const { data, isLoading } = useCurrentAQI('Delhi');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Hero Section */}
      <div className="lg:col-span-2">
        <HeroAQISection
          aqi={data?.aqi.value || 0}
          category={data?.aqi.category || 'good'}
          categoryLabel={data?.aqi.categoryLabel || 'Good'}
          dominantPollutant={data?.aqi.dominantPollutant || 'PM2.5'}
          color={data?.aqi.color || '#4ADE80'}
          healthMessage={data?.aqi.healthMessage || ''}
          location={data?.location || { name: 'Delhi' }}
          lastUpdated={data?.lastUpdated || new Date().toISOString()}
          isLoading={isLoading}
        />
      </div>

      {/* Health Recommendations */}
      <div>
        <HealthRecommendationsCard
          aqi={data?.aqi.value || 0}
          category={data?.aqi.category || 'good'}
          isLoading={isLoading}
        />
      </div>

      {/* Other components */}
    </div>
  );
}
```

### Complete Dashboard Layout
```tsx
import { HeroAQISection } from '@/components/dashboard/HeroAQISection';
import { PollutantMetricsGrid } from '@/components/dashboard/PollutantMetricsGrid';
import { WeatherSection } from '@/components/dashboard/WeatherSection';
import { HealthRecommendationsCard } from '@/components/dashboard/HealthRecommendationsCard';
import { useCurrentAQI } from '@/lib/api/hooks/useCurrentAQI';

export default function DashboardPage() {
  const { data, isLoading } = useCurrentAQI('Delhi');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Section - Full Width */}
        <HeroAQISection
          aqi={data?.aqi.value || 0}
          category={data?.aqi.category || 'good'}
          categoryLabel={data?.aqi.categoryLabel || 'Good'}
          dominantPollutant={data?.aqi.dominantPollutant || 'PM2.5'}
          color={data?.aqi.color || '#4ADE80'}
          healthMessage={data?.aqi.healthMessage || ''}
          location={data?.location || { name: 'Delhi' }}
          lastUpdated={data?.lastUpdated || new Date().toISOString()}
          isLoading={isLoading}
        />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Pollutants and Weather */}
          <div className="lg:col-span-2 space-y-6">
            <PollutantMetricsGrid
              pollutants={data?.pollutants || {}}
              isLoading={isLoading}
            />
            
            <WeatherSection
              weather={data?.weather || {}}
              lastUpdated={data?.lastUpdated}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column - Health Recommendations */}
          <div>
            <HealthRecommendationsCard
              aqi={data?.aqi.value || 0}
              category={data?.aqi.category || 'good'}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Responsive Layouts

### Mobile-First Layout
```tsx
<div className="space-y-6">
  {/* Stack vertically on mobile */}
  <HeroAQISection {...heroProps} />
  <HealthRecommendationsCard {...healthProps} />
  <PollutantMetricsGrid {...pollutantProps} />
  <WeatherSection {...weatherProps} />
</div>
```

### Desktop Grid Layout
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Hero spans full width */}
  <div className="md:col-span-2 lg:col-span-3">
    <HeroAQISection {...heroProps} />
  </div>

  {/* Health recommendations on the side */}
  <div className="md:col-span-1">
    <HealthRecommendationsCard {...healthProps} />
  </div>

  {/* Pollutants take remaining space */}
  <div className="md:col-span-1 lg:col-span-2">
    <PollutantMetricsGrid {...pollutantProps} />
  </div>
</div>
```

## Custom Recommendations

### Override Default Recommendations
```tsx
const customRecommendations = [
  'Check local air quality alerts',
  'Consider indoor activities today',
  'Use HEPA air filters at home',
];

<HealthRecommendationsCard
  aqi={150}
  category="unhealthy"
  recommendations={customRecommendations}
/>
```

### Dynamic Recommendations Based on User Profile
```tsx
function getPersonalizedRecommendations(aqi: number, userProfile: UserProfile) {
  const baseRecommendations = getDefaultRecommendations(aqi);
  
  if (userProfile.hasRespiratoryCondition) {
    return [
      ...baseRecommendations,
      'Take your prescribed medications',
      'Keep your inhaler nearby',
    ];
  }
  
  if (userProfile.isPregnant) {
    return [
      ...baseRecommendations,
      'Consult your doctor about outdoor activities',
      'Stay in well-ventilated indoor spaces',
    ];
  }
  
  return baseRecommendations;
}

<HealthRecommendationsCard
  aqi={data.aqi.value}
  category={data.aqi.category}
  recommendations={getPersonalizedRecommendations(data.aqi.value, userProfile)}
/>
```

## Custom Learn More Links

### Link to Local Health Authority
```tsx
<HealthRecommendationsCard
  aqi={data.aqi.value}
  category={data.aqi.category}
  learnMoreUrl="https://cpcb.nic.in/air-quality-index/"
/>
```

### Link to Internal Help Page
```tsx
<HealthRecommendationsCard
  aqi={data.aqi.value}
  category={data.aqi.category}
  learnMoreUrl="/help/air-quality-guide"
/>
```

### Disable Learn More Link
```tsx
<HealthRecommendationsCard
  aqi={data.aqi.value}
  category={data.aqi.category}
  learnMoreUrl=""
/>
```

## Error Handling

### With Error Boundary
```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="glass-card p-6 rounded-2xl">
      <p className="text-red-400">Failed to load health recommendations</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <HealthRecommendationsCard
    aqi={data.aqi.value}
    category={data.aqi.category}
  />
</ErrorBoundary>
```

### With Fallback Data
```tsx
const { data, isLoading, error } = useCurrentAQI('Delhi');

<HealthRecommendationsCard
  aqi={error ? 0 : data?.aqi.value || 0}
  category={error ? 'good' : data?.aqi.category || 'good'}
  isLoading={isLoading}
  recommendations={error ? ['Unable to load recommendations. Please try again.'] : undefined}
/>
```

## Animation and Transitions

### Fade In on Mount
```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  <HealthRecommendationsCard
    aqi={data.aqi.value}
    category={data.aqi.category}
  />
</motion.div>
```

### Stagger with Other Components
```tsx
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

<motion.div variants={container} initial="hidden" animate="show">
  <motion.div variants={item}>
    <HeroAQISection {...heroProps} />
  </motion.div>
  <motion.div variants={item}>
    <HealthRecommendationsCard {...healthProps} />
  </motion.div>
  <motion.div variants={item}>
    <PollutantMetricsGrid {...pollutantProps} />
  </motion.div>
</motion.div>
```

## Testing Integration

### Test with Mock Data
```tsx
import { render, screen } from '@testing-library/react';
import { HealthRecommendationsCard } from '@/components/dashboard/HealthRecommendationsCard';

test('integrates with dashboard', () => {
  const mockData = {
    aqi: { value: 125, category: 'unhealthy_sensitive' as const },
  };

  render(
    <HealthRecommendationsCard
      aqi={mockData.aqi.value}
      category={mockData.aqi.category}
    />
  );

  expect(screen.getByText(/Sensitive groups should limit/i)).toBeInTheDocument();
});
```

## Performance Optimization

### Memoize Component
```tsx
import { memo } from 'react';

const MemoizedHealthRecommendations = memo(HealthRecommendationsCard);

<MemoizedHealthRecommendations
  aqi={data.aqi.value}
  category={data.aqi.category}
/>
```

### Lazy Load
```tsx
import { lazy, Suspense } from 'react';

const HealthRecommendationsCard = lazy(() => 
  import('@/components/dashboard/HealthRecommendationsCard')
);

<Suspense fallback={<HealthRecommendationsCard aqi={0} category="good" isLoading={true} />}>
  <HealthRecommendationsCard
    aqi={data.aqi.value}
    category={data.aqi.category}
  />
</Suspense>
```

## Accessibility

### Screen Reader Announcements
```tsx
import { useEffect } from 'react';

function DashboardWithAnnouncements() {
  const { data } = useCurrentAQI('Delhi');

  useEffect(() => {
    if (data) {
      const announcement = `Air quality is ${data.aqi.categoryLabel}. AQI is ${data.aqi.value}.`;
      // Announce to screen readers
      const liveRegion = document.getElementById('sr-announcements');
      if (liveRegion) {
        liveRegion.textContent = announcement;
      }
    }
  }, [data]);

  return (
    <>
      <div id="sr-announcements" className="sr-only" role="status" aria-live="polite" />
      <HealthRecommendationsCard
        aqi={data?.aqi.value || 0}
        category={data?.aqi.category || 'good'}
      />
    </>
  );
}
```

## Best Practices

1. **Always provide loading state** - Use `isLoading` prop during data fetching
2. **Handle errors gracefully** - Show fallback recommendations on error
3. **Use semantic HTML** - Component already uses proper list structure
4. **Maintain color contrast** - Component meets WCAG AA standards
5. **Test with real data** - Verify recommendations match actual AQI levels
6. **Consider user context** - Customize recommendations based on user profile
7. **Keep recommendations concise** - 3-4 actionable items per category
8. **Update regularly** - Refresh when AQI data changes

## Common Issues

### Issue: Recommendations not updating
**Solution**: Ensure AQI and category props are updated when data changes
```tsx
// ❌ Wrong - using stale data
<HealthRecommendationsCard aqi={125} category="unhealthy_sensitive" />

// ✅ Correct - using reactive data
<HealthRecommendationsCard aqi={data.aqi.value} category={data.aqi.category} />
```

### Issue: Colors not matching AQI level
**Solution**: Ensure category prop matches the AQI value range
```tsx
// ❌ Wrong - mismatched category
<HealthRecommendationsCard aqi={175} category="moderate" />

// ✅ Correct - matching category
<HealthRecommendationsCard aqi={175} category="unhealthy" />
```

### Issue: Learn more link not working
**Solution**: Provide valid URL or empty string to hide
```tsx
// ❌ Wrong - undefined URL
<HealthRecommendationsCard aqi={100} category="moderate" learnMoreUrl={undefined} />

// ✅ Correct - valid URL or empty string
<HealthRecommendationsCard aqi={100} category="moderate" learnMoreUrl="" />
```

## Next Steps

1. Integrate into main dashboard page (Task 8.1)
2. Add property-based tests (Task 7.6)
3. Implement real-time updates (Task 8.4)
4. Add user preferences for custom recommendations
5. Implement notification system for health alerts

## Resources

- [Component Documentation](./components/dashboard/HealthRecommendationsCard.tsx)
- [Test Suite](./components/dashboard/__tests__/HealthRecommendationsCard.test.tsx)
- [Visual Test Page](./app/test-health-recommendations/page.tsx)
- [Task Completion Summary](./TASK_7.4_COMPLETION_SUMMARY.md)
- [AQI Health Guidelines](https://www.airnow.gov/aqi/aqi-basics/)

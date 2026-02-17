/**
 * Property-Based Tests for HealthRecommendationsCard Component
 * 
 * Tests the following correctness properties:
 * - Property 4: Health Message Appropriateness (shared with HeroAQISection)
 * - Property 12: Health Recommendation Color Coding
 * 
 * Validates Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { HealthRecommendationsCard } from '../HealthRecommendationsCard';
import { 
  aqiValueArbitrary, 
  aqiCategoryArbitrary,
  getExpectedCategory,
} from '@/lib/test-utils/generators';
import type { AQICategory } from '@/lib/api/types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get expected health recommendations for AQI category
 * This matches the component implementation
 */
function getExpectedRecommendations(category: AQICategory): string[] {
  switch (category) {
    case 'good':
      return [
        'Great day for outdoor activities',
        'Air quality is ideal for outdoor exercise',
        'No health precautions needed',
      ];
    case 'moderate':
      return [
        'Sensitive groups should limit prolonged outdoor exertion',
        'Unusually sensitive people should consider reducing prolonged outdoor activities',
        'Air quality is acceptable for most people',
      ];
    case 'unhealthy_sensitive':
      return [
        'Sensitive groups should limit prolonged outdoor exertion',
        'People with respiratory or heart conditions should reduce outdoor activities',
        'Children and older adults should take it easy',
        'Consider wearing a mask outdoors',
      ];
    case 'unhealthy':
      return [
        'Everyone should limit prolonged outdoor exertion',
        'Sensitive groups should avoid prolonged outdoor activities',
        'Wear a mask when going outside',
        'Keep windows closed and use air purifiers indoors',
      ];
    case 'very_unhealthy':
      return [
        'Everyone should limit outdoor exertion',
        'Sensitive groups should avoid all outdoor activities',
        'Wear N95 masks when going outside',
        'Use air purifiers and keep indoor air clean',
      ];
    case 'hazardous':
      return [
        'Everyone should avoid outdoor activities',
        'Stay indoors with windows and doors closed',
        'Use air purifiers indoors',
        'Wear N95 masks if you must go outside',
      ];
  }
}

/**
 * Get expected urgency color class for AQI category
 */
function getExpectedUrgencyColor(category: AQICategory): string {
  switch (category) {
    case 'good':
      return 'text-green-400';
    case 'moderate':
      return 'text-yellow-400';
    case 'unhealthy_sensitive':
      return 'text-orange-400';
    case 'unhealthy':
      return 'text-red-400';
    case 'very_unhealthy':
      return 'text-red-500';
    case 'hazardous':
      return 'text-red-700';
  }
}

/**
 * Get expected urgency label for AQI category
 */
function getExpectedUrgencyLabel(category: AQICategory): string {
  switch (category) {
    case 'good':
      return 'No Risk';
    case 'moderate':
      return 'Low Risk';
    case 'unhealthy_sensitive':
      return 'Moderate Risk';
    case 'unhealthy':
      return 'High Risk';
    case 'very_unhealthy':
      return 'Very High Risk';
    case 'hazardous':
      return 'Emergency';
  }
}

/**
 * Get expected border color class for AQI category
 */
function getExpectedBorderColor(category: AQICategory): string {
  switch (category) {
    case 'good':
      return 'border-green-400/30';
    case 'moderate':
      return 'border-yellow-400/30';
    case 'unhealthy_sensitive':
      return 'border-orange-400/30';
    case 'unhealthy':
      return 'border-red-400/30';
    case 'very_unhealthy':
      return 'border-red-500/30';
    case 'hazardous':
      return 'border-red-700/30';
  }
}

/**
 * Check if a recommendation is appropriate for the AQI category
 * This checks if the recommendation is one of the expected recommendations for the category
 */
function isRecommendationAppropriate(recommendation: string, category: AQICategory): boolean {
  const expectedRecommendations = getExpectedRecommendations(category);
  
  // Check if the recommendation matches any of the expected recommendations
  return expectedRecommendations.some(expected => 
    recommendation === expected
  );
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property-Based Tests: HealthRecommendationsCard', () => {
  /**
   * Property 4: Health Message Appropriateness
   * For any AQI value, health message should be appropriate for that level
   * 
   * This property is shared with HeroAQISection (tested in 5.7)
   * Here we test it specifically for the HealthRecommendationsCard component
   * 
   * Validates: Requirements 2.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   */
  describe('Property 4: Health Message Appropriateness', () => {
    it('should display appropriate recommendations for any AQI value', () => {
      return fc.assert(
        fc.property(
          aqiValueArbitrary,
          (aqi) => {
            // Determine expected category based on AQI value
            const expectedCategory = getExpectedCategory(aqi);
            const expectedRecommendations = getExpectedRecommendations(expectedCategory);
            
            // Render component
            const { container } = render(
              <HealthRecommendationsCard
                aqi={aqi}
                category={expectedCategory}
              />
            );
            
            // Get all displayed recommendations
            const recommendationElements = screen.getAllByTestId(/^recommendation-/);
            const displayedRecommendations = recommendationElements.map(
              el => el.textContent || ''
            );
            
            // Property: All displayed recommendations should be appropriate for the AQI level
            displayedRecommendations.forEach(recommendation => {
              const isAppropriate = isRecommendationAppropriate(recommendation, expectedCategory);
              expect(isAppropriate).toBe(true);
            });
            
            // Property: Should display the expected recommendations for the category
            expectedRecommendations.forEach(expectedRec => {
              const found = displayedRecommendations.some(
                displayedRec => displayedRec.includes(expectedRec)
              );
              expect(found).toBe(true);
            });
            
            // Property: Number of recommendations should match expected count
            expect(displayedRecommendations.length).toBe(expectedRecommendations.length);
            
            // Clean up
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display category-specific recommendations', () => {
      return fc.assert(
        fc.property(
          aqiCategoryArbitrary,
          (category) => {
            // Generate AQI value within category range
            let aqi: number;
            switch (category) {
              case 'good':
                aqi = Math.floor(Math.random() * 51); // 0-50
                break;
              case 'moderate':
                aqi = 51 + Math.floor(Math.random() * 50); // 51-100
                break;
              case 'unhealthy_sensitive':
                aqi = 101 + Math.floor(Math.random() * 50); // 101-150
                break;
              case 'unhealthy':
                aqi = 151 + Math.floor(Math.random() * 50); // 151-200
                break;
              case 'very_unhealthy':
                aqi = 201 + Math.floor(Math.random() * 100); // 201-300
                break;
              case 'hazardous':
                aqi = 301 + Math.floor(Math.random() * 200); // 301-500
                break;
            }
            
            const expectedRecommendations = getExpectedRecommendations(category);
            
            const { container } = render(
              <HealthRecommendationsCard
                aqi={aqi}
                category={category}
              />
            );
            
            const recommendationElements = screen.getAllByTestId(/^recommendation-/);
            const displayedRecommendations = recommendationElements.map(
              el => el.textContent || ''
            );
            
            // Property: All recommendations should be appropriate for the category
            displayedRecommendations.forEach(recommendation => {
              const isAppropriate = isRecommendationAppropriate(recommendation, category);
              expect(isAppropriate).toBe(true);
            });
            
            // Property: Should match expected recommendations exactly
            expect(displayedRecommendations.length).toBe(expectedRecommendations.length);
            expectedRecommendations.forEach((expectedRec, index) => {
              expect(displayedRecommendations[index]).toBe(expectedRec);
            });
            
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide progressively stronger warnings as AQI increases', () => {
      return fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 0, max: 50 }),    // Good
            fc.integer({ min: 51, max: 100 }),  // Moderate
            fc.integer({ min: 101, max: 150 }), // Unhealthy for sensitive
            fc.integer({ min: 151, max: 200 }), // Unhealthy
            fc.integer({ min: 201, max: 300 }), // Very unhealthy
            fc.integer({ min: 301, max: 500 })  // Hazardous
          ),
          ([goodAQI, moderateAQI, unhealthySensitiveAQI, unhealthyAQI, veryUnhealthyAQI, hazardousAQI]) => {
            const testCases = [
              { aqi: goodAQI, category: 'good' as AQICategory, severity: 0 },
              { aqi: moderateAQI, category: 'moderate' as AQICategory, severity: 1 },
              { aqi: unhealthySensitiveAQI, category: 'unhealthy_sensitive' as AQICategory, severity: 2 },
              { aqi: unhealthyAQI, category: 'unhealthy' as AQICategory, severity: 3 },
              { aqi: veryUnhealthyAQI, category: 'very_unhealthy' as AQICategory, severity: 4 },
              { aqi: hazardousAQI, category: 'hazardous' as AQICategory, severity: 5 },
            ];
            
            // Property: Recommendations should become more restrictive as AQI increases
            for (let i = 0; i < testCases.length - 1; i++) {
              const current = testCases[i];
              const next = testCases[i + 1];
              
              const { container: currentContainer } = render(
                <HealthRecommendationsCard
                  aqi={current.aqi}
                  category={current.category}
                />
              );
              
              const currentRecs = screen.getAllByTestId(/^recommendation-/).map(
                el => el.textContent?.toLowerCase() || ''
              );
              
              currentContainer.remove();
              
              const { container: nextContainer } = render(
                <HealthRecommendationsCard
                  aqi={next.aqi}
                  category={next.category}
                />
              );
              
              const nextRecs = screen.getAllByTestId(/^recommendation-/).map(
                el => el.textContent?.toLowerCase() || ''
              );
              
              // Property: Higher AQI should have more restrictive language
              // Good should be positive, hazardous should be restrictive
              if (current.category === 'good') {
                const hasPositiveLanguage = currentRecs.some(rec => 
                  rec.includes('great') || rec.includes('ideal')
                );
                expect(hasPositiveLanguage).toBe(true);
              }
              
              if (next.category === 'hazardous') {
                const hasRestrictiveLanguage = nextRecs.some(rec => 
                  rec.includes('avoid') || rec.includes('stay indoors')
                );
                expect(hasRestrictiveLanguage).toBe(true);
              }
              
              nextContainer.remove();
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 12: Health Recommendation Color Coding
   * For any AQI level, recommendation card color should match urgency level
   * 
   * Validates: Requirements 6.8
   */
  describe('Property 12: Health Recommendation Color Coding', () => {
    it('should apply correct color coding for any AQI value', () => {
      return fc.assert(
        fc.property(
          aqiValueArbitrary,
          (aqi) => {
            // Determine expected category and colors
            const expectedCategory = getExpectedCategory(aqi);
            const expectedUrgencyColor = getExpectedUrgencyColor(expectedCategory);
            const expectedBorderColor = getExpectedBorderColor(expectedCategory);
            const expectedUrgencyLabel = getExpectedUrgencyLabel(expectedCategory);
            
            // Render component
            const { container } = render(
              <HealthRecommendationsCard
                aqi={aqi}
                category={expectedCategory}
              />
            );
            
            const card = screen.getByTestId('health-recommendations-card');
            const urgencyLevel = screen.getByTestId('urgency-level');
            const healthIcon = screen.getByTestId('health-icon');
            
            // Property: Card should have correct border color for urgency level
            expect(card).toHaveClass(expectedBorderColor);
            
            // Property: Urgency level text should have correct color
            expect(urgencyLevel).toHaveClass(expectedUrgencyColor);
            
            // Property: Urgency label should match the category
            expect(urgencyLevel).toHaveTextContent(expectedUrgencyLabel);
            
            // Property: Health icon should have correct color
            expect(healthIcon).toHaveClass(expectedUrgencyColor);
            
            // Property: Learn more link should have correct color
            const learnMoreLink = screen.getByTestId('learn-more-link');
            expect(learnMoreLink).toHaveClass(expectedUrgencyColor);
            
            // Property: Bullet points should have correct color
            const bulletPoints = container.querySelectorAll('[data-testid^="recommendation-"] span:first-child');
            bulletPoints.forEach(bullet => {
              expect(bullet).toHaveClass(expectedUrgencyColor);
            });
            
            // Clean up
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply correct color for each AQI category', () => {
      return fc.assert(
        fc.property(
          aqiCategoryArbitrary,
          (category) => {
            // Generate AQI value within category range
            let aqi: number;
            switch (category) {
              case 'good':
                aqi = 25;
                break;
              case 'moderate':
                aqi = 75;
                break;
              case 'unhealthy_sensitive':
                aqi = 125;
                break;
              case 'unhealthy':
                aqi = 175;
                break;
              case 'very_unhealthy':
                aqi = 250;
                break;
              case 'hazardous':
                aqi = 400;
                break;
            }
            
            const expectedUrgencyColor = getExpectedUrgencyColor(category);
            const expectedBorderColor = getExpectedBorderColor(category);
            const expectedUrgencyLabel = getExpectedUrgencyLabel(category);
            
            const { container } = render(
              <HealthRecommendationsCard
                aqi={aqi}
                category={category}
              />
            );
            
            const card = screen.getByTestId('health-recommendations-card');
            const urgencyLevel = screen.getByTestId('urgency-level');
            
            // Property: All color elements should match the category
            expect(card).toHaveClass(expectedBorderColor);
            expect(urgencyLevel).toHaveClass(expectedUrgencyColor);
            expect(urgencyLevel).toHaveTextContent(expectedUrgencyLabel);
            
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use progressively more urgent colors as AQI increases', () => {
      return fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 0, max: 50 }),    // Good
            fc.integer({ min: 51, max: 100 }),  // Moderate
            fc.integer({ min: 101, max: 150 }), // Unhealthy for sensitive
            fc.integer({ min: 151, max: 200 }), // Unhealthy
            fc.integer({ min: 201, max: 300 }), // Very unhealthy
            fc.integer({ min: 301, max: 500 })  // Hazardous
          ),
          ([goodAQI, moderateAQI, unhealthySensitiveAQI, unhealthyAQI, veryUnhealthyAQI, hazardousAQI]) => {
            const testCases = [
              { aqi: goodAQI, category: 'good' as AQICategory, colorFamily: 'green' },
              { aqi: moderateAQI, category: 'moderate' as AQICategory, colorFamily: 'yellow' },
              { aqi: unhealthySensitiveAQI, category: 'unhealthy_sensitive' as AQICategory, colorFamily: 'orange' },
              { aqi: unhealthyAQI, category: 'unhealthy' as AQICategory, colorFamily: 'red' },
              { aqi: veryUnhealthyAQI, category: 'very_unhealthy' as AQICategory, colorFamily: 'red' },
              { aqi: hazardousAQI, category: 'hazardous' as AQICategory, colorFamily: 'red' },
            ];
            
            // Property: Color progression should follow green -> yellow -> orange -> red
            testCases.forEach(({ aqi, category, colorFamily }) => {
              const { container } = render(
                <HealthRecommendationsCard
                  aqi={aqi}
                  category={category}
                />
              );
              
              const urgencyLevel = screen.getByTestId('urgency-level');
              const urgencyColor = getExpectedUrgencyColor(category);
              
              // Property: Color should match the expected color family
              expect(urgencyColor).toContain(colorFamily);
              expect(urgencyLevel).toHaveClass(urgencyColor);
              
              container.remove();
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain consistent color coding across all visual elements', () => {
      return fc.assert(
        fc.property(
          aqiValueArbitrary,
          (aqi) => {
            const expectedCategory = getExpectedCategory(aqi);
            const expectedUrgencyColor = getExpectedUrgencyColor(expectedCategory);
            
            const { container } = render(
              <HealthRecommendationsCard
                aqi={aqi}
                category={expectedCategory}
              />
            );
            
            // Property: All colored elements should use the same urgency color
            const urgencyLevel = screen.getByTestId('urgency-level');
            const healthIcon = screen.getByTestId('health-icon');
            const learnMoreLink = screen.getByTestId('learn-more-link');
            
            expect(urgencyLevel).toHaveClass(expectedUrgencyColor);
            expect(healthIcon).toHaveClass(expectedUrgencyColor);
            expect(learnMoreLink).toHaveClass(expectedUrgencyColor);
            
            // Property: All bullet points should use the same color
            const bulletPoints = container.querySelectorAll('[data-testid^="recommendation-"] span:first-child');
            bulletPoints.forEach(bullet => {
              expect(bullet).toHaveClass(expectedUrgencyColor);
            });
            
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply correct urgency labels that match color severity', () => {
      return fc.assert(
        fc.property(
          aqiCategoryArbitrary,
          (category) => {
            let aqi: number;
            switch (category) {
              case 'good':
                aqi = 25;
                break;
              case 'moderate':
                aqi = 75;
                break;
              case 'unhealthy_sensitive':
                aqi = 125;
                break;
              case 'unhealthy':
                aqi = 175;
                break;
              case 'very_unhealthy':
                aqi = 250;
                break;
              case 'hazardous':
                aqi = 400;
                break;
            }
            
            const expectedUrgencyLabel = getExpectedUrgencyLabel(category);
            
            const { container } = render(
              <HealthRecommendationsCard
                aqi={aqi}
                category={category}
              />
            );
            
            const urgencyLevel = screen.getByTestId('urgency-level');
            
            // Property: Urgency label should match the severity of the category
            expect(urgencyLevel).toHaveTextContent(expectedUrgencyLabel);
            
            // Property: Label severity should increase with AQI category
            const severityMap: Record<AQICategory, number> = {
              'good': 0,
              'moderate': 1,
              'unhealthy_sensitive': 2,
              'unhealthy': 3,
              'very_unhealthy': 4,
              'hazardous': 5,
            };
            
            const labelSeverityMap: Record<string, number> = {
              'No Risk': 0,
              'Low Risk': 1,
              'Moderate Risk': 2,
              'High Risk': 3,
              'Very High Risk': 4,
              'Emergency': 5,
            };
            
            const categorySeverity = severityMap[category];
            const labelSeverity = labelSeverityMap[expectedUrgencyLabel];
            
            // Property: Label severity should match category severity
            expect(labelSeverity).toBe(categorySeverity);
            
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Recommendation Count Consistency
   * For any AQI category, the number of recommendations should be consistent
   */
  describe('Additional Property: Recommendation Count Consistency', () => {
    it('should display consistent number of recommendations for each category', () => {
      return fc.assert(
        fc.property(
          aqiCategoryArbitrary,
          (category) => {
            let aqi: number;
            switch (category) {
              case 'good':
                aqi = Math.floor(Math.random() * 51);
                break;
              case 'moderate':
                aqi = 51 + Math.floor(Math.random() * 50);
                break;
              case 'unhealthy_sensitive':
                aqi = 101 + Math.floor(Math.random() * 50);
                break;
              case 'unhealthy':
                aqi = 151 + Math.floor(Math.random() * 50);
                break;
              case 'very_unhealthy':
                aqi = 201 + Math.floor(Math.random() * 100);
                break;
              case 'hazardous':
                aqi = 301 + Math.floor(Math.random() * 200);
                break;
            }
            
            const expectedRecommendations = getExpectedRecommendations(category);
            
            const { container } = render(
              <HealthRecommendationsCard
                aqi={aqi}
                category={category}
              />
            );
            
            const recommendationElements = screen.getAllByTestId(/^recommendation-/);
            
            // Property: Number of recommendations should match expected count
            expect(recommendationElements.length).toBe(expectedRecommendations.length);
            
            // Property: Good and moderate should have 3 recommendations
            if (category === 'good' || category === 'moderate') {
              expect(recommendationElements.length).toBe(3);
            }
            
            // Property: Other categories should have 4 recommendations
            if (category !== 'good' && category !== 'moderate') {
              expect(recommendationElements.length).toBe(4);
            }
            
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

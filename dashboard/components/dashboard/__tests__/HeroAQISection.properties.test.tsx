/**
 * Property-Based Tests for HeroAQISection Component
 * 
 * Tests the following correctness properties:
 * - Property 2: Dynamic Background Matching
 * - Property 3: Hero Ring Color Matching
 * - Property 4: Health Message Appropriateness
 * - Property 16: Threshold Crossing Animation
 * 
 * Validates Requirements: 1.2, 2.5, 2.7, 9.4
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import { HeroAQISection, HeroAQISectionProps } from '../HeroAQISection';
import { 
  aqiValueArbitrary, 
  aqiCategoryArbitrary,
  locationInfoArbitrary,
  timestampArbitrary,
  getExpectedCategory,
  getExpectedColor,
} from '@/lib/test-utils/generators';
import type { AQICategory } from '@/lib/api/types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get expected background gradient class for AQI category
 * Note: This matches the actual component implementation where
 * unhealthy_sensitive and unhealthy share the same gradient
 */
function getExpectedBackgroundGradient(category: AQICategory): string {
  switch (category) {
    case 'good':
      return 'bg-gradient-good';
    case 'moderate':
      return 'bg-gradient-moderate';
    case 'unhealthy_sensitive':
    case 'unhealthy':
      return 'bg-gradient-unhealthy';
    case 'very_unhealthy':
      return 'bg-gradient-very-unhealthy';
    case 'hazardous':
      return 'bg-gradient-hazardous';
  }
}

/**
 * Get expected health message for AQI category
 */
function getExpectedHealthMessages(category: AQICategory): string[] {
  switch (category) {
    case 'good':
      return ['Great day for outdoor activities', 'outdoor activities'];
    case 'moderate':
      return ['Sensitive groups should limit prolonged outdoor exertion', 'sensitive groups', 'limit'];
    case 'unhealthy_sensitive':
      return ['Sensitive groups should limit prolonged outdoor exertion', 'sensitive groups', 'limit'];
    case 'unhealthy':
      return ['Everyone should limit prolonged outdoor exertion', 'everyone', 'limit'];
    case 'very_unhealthy':
      return ['Everyone should limit outdoor exertion', 'everyone', 'limit'];
    case 'hazardous':
      return ['Everyone should avoid outdoor activities', 'avoid', 'everyone'];
  }
}

/**
 * Get category label for AQI category
 */
function getCategoryLabel(category: AQICategory): string {
  switch (category) {
    case 'good':
      return 'Good';
    case 'moderate':
      return 'Moderate';
    case 'unhealthy_sensitive':
      return 'Unhealthy for Sensitive Groups';
    case 'unhealthy':
      return 'Unhealthy';
    case 'very_unhealthy':
      return 'Very Unhealthy';
    case 'hazardous':
      return 'Hazardous';
  }
}

/**
 * Create mock props for HeroAQISection
 */
function createMockProps(
  aqi: number,
  category: AQICategory,
  location: any,
  timestamp: string
): HeroAQISectionProps {
  const color = getExpectedColor(category);
  const categoryLabel = getCategoryLabel(category);
  const healthMessages = getExpectedHealthMessages(category);
  
  return {
    aqi,
    category,
    categoryLabel,
    dominantPollutant: 'pm25',
    color,
    healthMessage: healthMessages[0] || '',
    location: {
      name: location.name,
      city: location.city,
      state: location.state,
      country: location.country,
    },
    lastUpdated: timestamp,
    isLoading: false,
    error: null,
  };
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property-Based Tests: HeroAQISection', () => {
  /**
   * Property 2: Dynamic Background Matching
   * For any AQI value, background gradient should match AQI category
   * 
   * Validates: Requirements 1.2
   */
  describe('Property 2: Dynamic Background Matching', () => {
    it('should apply correct background gradient for any AQI value', () => {
      return fc.assert(
        fc.property(
          aqiValueArbitrary,
          locationInfoArbitrary,
          timestampArbitrary,
          (aqi, location, timestamp) => {
            // Determine expected category based on AQI value
            const expectedCategory = getExpectedCategory(aqi);
            const expectedGradient = getExpectedBackgroundGradient(expectedCategory);
            
            // Create props with the expected category
            const props = createMockProps(aqi, expectedCategory, location, timestamp);
            
            // Render component
            const { container } = render(<HeroAQISection {...props} />);
            const section = screen.getByTestId('hero-aqi-section');
            
            // Property: Background gradient class should match AQI category
            expect(section).toHaveClass(expectedGradient);
            
            // Property: data-aqi-category attribute should match category
            expect(section).toHaveAttribute('data-aqi-category', expectedCategory);
            
            // Clean up
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply correct gradient for each specific AQI category', () => {
      return fc.assert(
        fc.property(
          aqiCategoryArbitrary,
          locationInfoArbitrary,
          timestampArbitrary,
          (category, location, timestamp) => {
            // Generate AQI value within the category range
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
            
            const expectedGradient = getExpectedBackgroundGradient(category);
            const props = createMockProps(aqi, category, location, timestamp);
            
            const { container } = render(<HeroAQISection {...props} />);
            const section = screen.getByTestId('hero-aqi-section');
            
            // Property: Background gradient should match the category
            expect(section).toHaveClass(expectedGradient);
            
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Hero Ring Color Matching
   * For any AQI value, circular ring stroke should match AQI category color
   * 
   * Validates: Requirements 2.5
   */
  describe('Property 3: Hero Ring Color Matching', () => {
    it('should apply correct ring color for any AQI value', async () => {
      return fc.assert(
        fc.asyncProperty(
          aqiValueArbitrary,
          locationInfoArbitrary,
          timestampArbitrary,
          async (aqi, location, timestamp) => {
            // Determine expected category and color
            const expectedCategory = getExpectedCategory(aqi);
            const expectedColor = getExpectedColor(expectedCategory);
            
            const props = createMockProps(aqi, expectedCategory, location, timestamp);
            
            // Render component
            const { container } = render(<HeroAQISection {...props} />);
            
            // Wait for component to render
            await waitFor(() => {
              expect(screen.getByTestId('aqi-meter-value')).toBeInTheDocument();
            });
            
            const aqiValue = screen.getByTestId('aqi-meter-value');
            
            // Property: AQI value should have the correct color
            expect(aqiValue).toHaveStyle({ color: expectedColor });
            
            // Property: Progress ring should use gradient with the category color
            const progressRing = screen.getByTestId('aqi-meter-progress');
            const stroke = progressRing.getAttribute('stroke');
            
            // Should use a gradient URL
            expect(stroke).toMatch(/url\(#aqi-gradient-/);
            
            // Clean up
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    }, 10000); // 10 second timeout for async property test

    it('should use correct color for each AQI category', async () => {
      return fc.assert(
        fc.asyncProperty(
          aqiCategoryArbitrary,
          locationInfoArbitrary,
          timestampArbitrary,
          async (category, location, timestamp) => {
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
            
            const expectedColor = getExpectedColor(category);
            const props = createMockProps(aqi, category, location, timestamp);
            
            const { container } = render(<HeroAQISection {...props} />);
            
            await waitFor(() => {
              expect(screen.getByTestId('aqi-meter-value')).toBeInTheDocument();
            });
            
            const aqiValue = screen.getByTestId('aqi-meter-value');
            
            // Property: Color should match the expected color for the category
            expect(aqiValue).toHaveStyle({ color: expectedColor });
            
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    }, 10000); // 10 second timeout for async property test
  });

  /**
   * Property 4: Health Message Appropriateness
   * For any AQI value, health message should be appropriate for that level
   * 
   * Validates: Requirements 2.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   */
  describe('Property 4: Health Message Appropriateness', () => {
    it('should display appropriate health message for any AQI value', () => {
      return fc.assert(
        fc.property(
          aqiValueArbitrary,
          locationInfoArbitrary,
          timestampArbitrary,
          (aqi, location, timestamp) => {
            // Determine expected category
            const expectedCategory = getExpectedCategory(aqi);
            const expectedMessages = getExpectedHealthMessages(expectedCategory);
            
            const props = createMockProps(aqi, expectedCategory, location, timestamp);
            
            // Render component
            const { container } = render(<HeroAQISection {...props} />);
            const healthMessage = screen.getByTestId('health-message');
            const messageText = healthMessage.textContent?.toLowerCase() || '';
            
            // Property: Health message should contain at least one expected keyword
            const containsExpectedMessage = expectedMessages.some(msg => 
              messageText.includes(msg.toLowerCase())
            );
            
            expect(containsExpectedMessage).toBe(true);
            
            // Clean up
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display category-specific health messages', () => {
      return fc.assert(
        fc.property(
          aqiCategoryArbitrary,
          locationInfoArbitrary,
          timestampArbitrary,
          (category, location, timestamp) => {
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
            
            const expectedMessages = getExpectedHealthMessages(category);
            const props = createMockProps(aqi, category, location, timestamp);
            
            const { container } = render(<HeroAQISection {...props} />);
            const healthMessage = screen.getByTestId('health-message');
            const messageText = healthMessage.textContent?.toLowerCase() || '';
            
            // Property: Message should be appropriate for the category
            const isAppropriate = expectedMessages.some(msg => 
              messageText.includes(msg.toLowerCase())
            );
            
            expect(isAppropriate).toBe(true);
            
            // Additional validation: Good AQI should have positive message
            if (category === 'good') {
              expect(messageText).toMatch(/great|good|outdoor/i);
            }
            
            // Hazardous AQI should have strong warning
            if (category === 'hazardous') {
              expect(messageText).toMatch(/avoid|everyone/i);
            }
            
            container.remove();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 16: Threshold Crossing Animation
   * For any AQI crossing threshold, flash/glow effect should apply
   * 
   * Note: This property tests the component's ability to handle threshold values.
   * The actual flash/glow animation is triggered by AQI value changes in the parent
   * component and would be tested in integration tests.
   * 
   * Here we verify that the component correctly renders at threshold boundaries
   * and applies appropriate styling that would support animation effects.
   * 
   * Validates: Requirements 9.4
   */
  describe('Property 16: Threshold Crossing Animation', () => {
    // AQI thresholds: 50, 100, 150, 200, 300
    const thresholds = [50, 100, 150, 200, 300];
    
    it('should correctly render at threshold boundaries', () => {
      return fc.assert(
        fc.property(
          fc.constantFrom(...thresholds),
          fc.integer({ min: -5, max: 5 }),
          locationInfoArbitrary,
          timestampArbitrary,
          (threshold, offset, location, timestamp) => {
            const aqi = threshold + offset;
            
            // Skip invalid AQI values
            if (aqi < 0 || aqi > 500) {
              return true;
            }
            
            const expectedCategory = getExpectedCategory(aqi);
            const props = createMockProps(aqi, expectedCategory, location, timestamp);
            
            const { container } = render(<HeroAQISection {...props} />);
            const section = screen.getByTestId('hero-aqi-section');
            
            // Property: Component should render successfully at threshold boundaries
            expect(section).toBeInTheDocument();
            
            // Property: Should have transition classes that support animations
            expect(section).toHaveClass('transition-all');
            expect(section).toHaveClass('duration-1000');
            
            // Property: Category should change appropriately when crossing thresholds
            const categoryBefore = getExpectedCategory(threshold - 1);
            const categoryAt = getExpectedCategory(threshold);
            const categoryAfter = getExpectedCategory(threshold + 1);
            
            // At major thresholds, category should change
            if (threshold === 50 || threshold === 100 || threshold === 150 || 
                threshold === 200 || threshold === 300) {
              // Category should be different on either side of threshold
              if (offset < 0) {
                expect(expectedCategory).toBe(categoryBefore);
              } else if (offset > 0) {
                expect(expectedCategory).toBe(categoryAfter);
              } else {
                expect(expectedCategory).toBe(categoryAt);
              }
            }
            
            container.remove();
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply different styling when crossing category thresholds', () => {
      return fc.assert(
        fc.property(
          fc.constantFrom(...thresholds),
          locationInfoArbitrary,
          timestampArbitrary,
          (threshold, location, timestamp) => {
            // Test values just below and just above threshold
            const aqiBelow = threshold - 1;
            const aqiAbove = threshold + 1;
            
            const categoryBelow = getExpectedCategory(aqiBelow);
            const categoryAbove = getExpectedCategory(aqiAbove);
            
            const propsBelow = createMockProps(aqiBelow, categoryBelow, location, timestamp);
            const propsAbove = createMockProps(aqiAbove, categoryAbove, location, timestamp);
            
            // Render component with value below threshold
            const { container: containerBelow, unmount: unmountBelow } = render(<HeroAQISection {...propsBelow} />);
            const sectionBelow = containerBelow.querySelector('[data-testid="hero-aqi-section"]');
            const gradientBelow = getExpectedBackgroundGradient(categoryBelow);
            
            expect(sectionBelow).toHaveClass(gradientBelow);
            unmountBelow();
            
            // Render component with value above threshold
            const { container: containerAbove, unmount: unmountAbove } = render(<HeroAQISection {...propsAbove} />);
            const sectionAbove = containerAbove.querySelector('[data-testid="hero-aqi-section"]');
            const gradientAbove = getExpectedBackgroundGradient(categoryAbove);
            
            expect(sectionAbove).toHaveClass(gradientAbove);
            
            // Property: Component should render correctly at threshold boundaries
            // Note: Some categories share the same gradient (unhealthy_sensitive and unhealthy)
            // so we only check that gradients differ when they're expected to differ
            const gradientsExpectedToDiffer = 
              (categoryBelow === 'good' && categoryAbove === 'moderate') ||
              (categoryBelow === 'moderate' && categoryAbove === 'unhealthy_sensitive') ||
              (categoryBelow === 'unhealthy' && categoryAbove === 'very_unhealthy') ||
              (categoryBelow === 'very_unhealthy' && categoryAbove === 'hazardous');
            
            if (gradientsExpectedToDiffer) {
              expect(gradientBelow).not.toBe(gradientAbove);
            }
            
            unmountAbove();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent rendering across rapid threshold crossings', () => {
      return fc.assert(
        fc.property(
          fc.array(aqiValueArbitrary, { minLength: 5, maxLength: 10 }),
          locationInfoArbitrary,
          timestampArbitrary,
          (aqiValues, location, timestamp) => {
            // Simulate rapid AQI changes (as would happen with real-time updates)
            for (const aqi of aqiValues) {
              const category = getExpectedCategory(aqi);
              const props = createMockProps(aqi, category, location, timestamp);
              
              const { container } = render(<HeroAQISection {...props} />);
              const section = screen.getByTestId('hero-aqi-section');
              
              // Property: Component should render correctly for each value
              expect(section).toBeInTheDocument();
              
              // Property: Should have correct gradient for current value
              const expectedGradient = getExpectedBackgroundGradient(category);
              expect(section).toHaveClass(expectedGradient);
              
              container.remove();
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

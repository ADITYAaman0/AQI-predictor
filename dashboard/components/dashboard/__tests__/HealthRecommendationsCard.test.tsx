/**
 * Unit tests for HealthRecommendationsCard component
 * 
 * Tests:
 * - Rendering with different AQI categories
 * - Correct recommendations for each category
 * - Color coding by urgency level
 * - Medical icon display
 * - Learn more link
 * - Loading state
 * - Custom recommendations
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HealthRecommendationsCard } from '../HealthRecommendationsCard';
import { AQICategory } from '@/lib/api/types';

describe('HealthRecommendationsCard', () => {
  // ============================================================================
  // Basic Rendering Tests
  // ============================================================================

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      render(
        <HealthRecommendationsCard
          aqi={50}
          category="good"
        />
      );
      expect(screen.getByTestId('health-recommendations-card')).toBeInTheDocument();
    });

    it('displays the heading', () => {
      render(
        <HealthRecommendationsCard
          aqi={50}
          category="good"
        />
      );
      expect(screen.getByTestId('health-heading')).toHaveTextContent('Health Recommendations');
    });

    it('displays the medical icon', () => {
      render(
        <HealthRecommendationsCard
          aqi={50}
          category="good"
        />
      );
      expect(screen.getByTestId('health-icon')).toBeInTheDocument();
    });

    it('displays recommendations list', () => {
      render(
        <HealthRecommendationsCard
          aqi={50}
          category="good"
        />
      );
      expect(screen.getByTestId('recommendations-list')).toBeInTheDocument();
    });

    it('displays learn more link by default', () => {
      render(
        <HealthRecommendationsCard
          aqi={50}
          category="good"
        />
      );
      const link = screen.getByTestId('learn-more-link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://www.airnow.gov/aqi/aqi-basics/');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // ============================================================================
  // AQI Category Tests - Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
  // ============================================================================

  describe('Good AQI (0-50)', () => {
    it('displays correct recommendations for good AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={25}
          category="good"
        />
      );
      expect(screen.getByText(/Great day for outdoor activities/i)).toBeInTheDocument();
      expect(screen.getByText(/Air quality is ideal for outdoor exercise/i)).toBeInTheDocument();
    });

    it('displays "No Risk" urgency level for good AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={25}
          category="good"
        />
      );
      expect(screen.getByTestId('urgency-level')).toHaveTextContent('No Risk');
    });

    it('applies green color for good AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={25}
          category="good"
        />
      );
      const urgencyLevel = screen.getByTestId('urgency-level');
      expect(urgencyLevel).toHaveClass('text-green-400');
    });
  });

  describe('Moderate AQI (51-100)', () => {
    it('displays correct recommendations for moderate AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={75}
          category="moderate"
        />
      );
      expect(screen.getByText(/Sensitive groups should limit prolonged outdoor exertion/i)).toBeInTheDocument();
    });

    it('displays "Low Risk" urgency level for moderate AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={75}
          category="moderate"
        />
      );
      expect(screen.getByTestId('urgency-level')).toHaveTextContent('Low Risk');
    });

    it('applies yellow color for moderate AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={75}
          category="moderate"
        />
      );
      const urgencyLevel = screen.getByTestId('urgency-level');
      expect(urgencyLevel).toHaveClass('text-yellow-400');
    });
  });

  describe('Unhealthy for Sensitive Groups AQI (101-150)', () => {
    it('displays correct recommendations for unhealthy_sensitive AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={125}
          category="unhealthy_sensitive"
        />
      );
      expect(screen.getByText(/Sensitive groups should limit prolonged outdoor exertion/i)).toBeInTheDocument();
      expect(screen.getByText(/People with respiratory or heart conditions/i)).toBeInTheDocument();
    });

    it('displays "Moderate Risk" urgency level', () => {
      render(
        <HealthRecommendationsCard
          aqi={125}
          category="unhealthy_sensitive"
        />
      );
      expect(screen.getByTestId('urgency-level')).toHaveTextContent('Moderate Risk');
    });

    it('applies orange color for unhealthy_sensitive AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={125}
          category="unhealthy_sensitive"
        />
      );
      const urgencyLevel = screen.getByTestId('urgency-level');
      expect(urgencyLevel).toHaveClass('text-orange-400');
    });
  });

  describe('Unhealthy AQI (151-200)', () => {
    it('displays correct recommendations for unhealthy AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={175}
          category="unhealthy"
        />
      );
      expect(screen.getByText(/Everyone should limit prolonged outdoor exertion/i)).toBeInTheDocument();
      expect(screen.getByText(/Wear a mask when going outside/i)).toBeInTheDocument();
    });

    it('displays "High Risk" urgency level', () => {
      render(
        <HealthRecommendationsCard
          aqi={175}
          category="unhealthy"
        />
      );
      expect(screen.getByTestId('urgency-level')).toHaveTextContent('High Risk');
    });

    it('applies red color for unhealthy AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={175}
          category="unhealthy"
        />
      );
      const urgencyLevel = screen.getByTestId('urgency-level');
      expect(urgencyLevel).toHaveClass('text-red-400');
    });
  });

  describe('Very Unhealthy AQI (201-300)', () => {
    it('displays correct recommendations for very_unhealthy AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={250}
          category="very_unhealthy"
        />
      );
      expect(screen.getByText(/Everyone should limit outdoor exertion/i)).toBeInTheDocument();
      expect(screen.getByText(/Wear N95 masks when going outside/i)).toBeInTheDocument();
    });

    it('displays "Very High Risk" urgency level', () => {
      render(
        <HealthRecommendationsCard
          aqi={250}
          category="very_unhealthy"
        />
      );
      expect(screen.getByTestId('urgency-level')).toHaveTextContent('Very High Risk');
    });

    it('applies dark red color for very_unhealthy AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={250}
          category="very_unhealthy"
        />
      );
      const urgencyLevel = screen.getByTestId('urgency-level');
      expect(urgencyLevel).toHaveClass('text-red-500');
    });
  });

  describe('Hazardous AQI (301+)', () => {
    it('displays correct recommendations for hazardous AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={350}
          category="hazardous"
        />
      );
      expect(screen.getByText(/Everyone should avoid outdoor activities/i)).toBeInTheDocument();
      expect(screen.getByText(/Use air purifiers indoors/i)).toBeInTheDocument();
    });

    it('displays "Emergency" urgency level', () => {
      render(
        <HealthRecommendationsCard
          aqi={350}
          category="hazardous"
        />
      );
      expect(screen.getByTestId('urgency-level')).toHaveTextContent('Emergency');
    });

    it('applies darkest red color for hazardous AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={350}
          category="hazardous"
        />
      );
      const urgencyLevel = screen.getByTestId('urgency-level');
      expect(urgencyLevel).toHaveClass('text-red-700');
    });
  });

  // ============================================================================
  // Recommendations Count Tests
  // ============================================================================

  describe('Recommendations Count', () => {
    it('displays 3 recommendations for good AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={25}
          category="good"
        />
      );
      const recommendations = screen.getAllByTestId(/^recommendation-/);
      expect(recommendations).toHaveLength(3);
    });

    it('displays 3 recommendations for moderate AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={75}
          category="moderate"
        />
      );
      const recommendations = screen.getAllByTestId(/^recommendation-/);
      expect(recommendations).toHaveLength(3);
    });

    it('displays 4 recommendations for unhealthy_sensitive AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={125}
          category="unhealthy_sensitive"
        />
      );
      const recommendations = screen.getAllByTestId(/^recommendation-/);
      expect(recommendations).toHaveLength(4);
    });

    it('displays 4 recommendations for unhealthy AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={175}
          category="unhealthy"
        />
      );
      const recommendations = screen.getAllByTestId(/^recommendation-/);
      expect(recommendations).toHaveLength(4);
    });

    it('displays 4 recommendations for very_unhealthy AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={250}
          category="very_unhealthy"
        />
      );
      const recommendations = screen.getAllByTestId(/^recommendation-/);
      expect(recommendations).toHaveLength(4);
    });

    it('displays 4 recommendations for hazardous AQI', () => {
      render(
        <HealthRecommendationsCard
          aqi={350}
          category="hazardous"
        />
      );
      const recommendations = screen.getAllByTestId(/^recommendation-/);
      expect(recommendations).toHaveLength(4);
    });
  });

  // ============================================================================
  // Custom Props Tests
  // ============================================================================

  describe('Custom Props', () => {
    it('displays custom recommendations when provided', () => {
      const customRecommendations = [
        'Custom recommendation 1',
        'Custom recommendation 2',
      ];
      render(
        <HealthRecommendationsCard
          aqi={100}
          category="moderate"
          recommendations={customRecommendations}
        />
      );
      expect(screen.getByText('Custom recommendation 1')).toBeInTheDocument();
      expect(screen.getByText('Custom recommendation 2')).toBeInTheDocument();
    });

    it('uses custom learn more URL when provided', () => {
      const customUrl = 'https://example.com/health';
      render(
        <HealthRecommendationsCard
          aqi={100}
          category="moderate"
          learnMoreUrl={customUrl}
        />
      );
      const link = screen.getByTestId('learn-more-link');
      expect(link).toHaveAttribute('href', customUrl);
    });

    it('hides learn more link when URL is empty', () => {
      render(
        <HealthRecommendationsCard
          aqi={100}
          category="moderate"
          learnMoreUrl=""
        />
      );
      expect(screen.queryByTestId('learn-more-link')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('Loading State', () => {
    it('displays loading skeleton when isLoading is true', () => {
      render(
        <HealthRecommendationsCard
          aqi={100}
          category="moderate"
          isLoading={true}
        />
      );
      expect(screen.getByTestId('health-recommendations-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('health-recommendations-card')).not.toBeInTheDocument();
    });

    it('displays loading animation elements', () => {
      const { container } = render(
        <HealthRecommendationsCard
          aqi={100}
          category="moderate"
          isLoading={true}
        />
      );
      const pulseElements = container.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Styling Tests - Requirement 6.8
  // ============================================================================

  describe('Styling and Color Coding', () => {
    it('applies glassmorphic card styling', () => {
      const { container } = render(
        <HealthRecommendationsCard
          aqi={100}
          category="moderate"
        />
      );
      const card = screen.getByTestId('health-recommendations-card');
      expect(card).toHaveClass('glass-card');
      expect(card).toHaveClass('rounded-2xl');
    });

    it('applies correct border color for each category', () => {
      const categories: Array<{ category: AQICategory; borderClass: string }> = [
        { category: 'good', borderClass: 'border-green-400/30' },
        { category: 'moderate', borderClass: 'border-yellow-400/30' },
        { category: 'unhealthy_sensitive', borderClass: 'border-orange-400/30' },
        { category: 'unhealthy', borderClass: 'border-red-400/30' },
        { category: 'very_unhealthy', borderClass: 'border-red-500/30' },
        { category: 'hazardous', borderClass: 'border-red-700/30' },
      ];

      categories.forEach(({ category, borderClass }) => {
        const { unmount } = render(
          <HealthRecommendationsCard
            aqi={100}
            category={category}
          />
        );
        const card = screen.getByTestId('health-recommendations-card');
        expect(card).toHaveClass(borderClass);
        unmount();
      });
    });

    it('applies transition classes for smooth animations', () => {
      render(
        <HealthRecommendationsCard
          aqi={100}
          category="moderate"
        />
      );
      const card = screen.getByTestId('health-recommendations-card');
      expect(card).toHaveClass('transition-all');
      expect(card).toHaveClass('duration-300');
    });
  });

  // ============================================================================
  // Data Attributes Tests
  // ============================================================================

  describe('Data Attributes', () => {
    it('includes AQI value in data attribute', () => {
      render(
        <HealthRecommendationsCard
          aqi={125}
          category="unhealthy_sensitive"
        />
      );
      const card = screen.getByTestId('health-recommendations-card');
      expect(card).toHaveAttribute('data-aqi', '125');
    });

    it('includes category in data attribute', () => {
      render(
        <HealthRecommendationsCard
          aqi={125}
          category="unhealthy_sensitive"
        />
      );
      const card = screen.getByTestId('health-recommendations-card');
      expect(card).toHaveAttribute('data-category', 'unhealthy_sensitive');
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('uses semantic HTML list for recommendations', () => {
      render(
        <HealthRecommendationsCard
          aqi={100}
          category="moderate"
        />
      );
      const list = screen.getByTestId('recommendations-list');
      expect(list.tagName).toBe('UL');
    });

    it('each recommendation is a list item', () => {
      const { container } = render(
        <HealthRecommendationsCard
          aqi={100}
          category="moderate"
        />
      );
      const listItems = container.querySelectorAll('li');
      expect(listItems.length).toBeGreaterThan(0);
    });

    it('learn more link has proper accessibility attributes', () => {
      render(
        <HealthRecommendationsCard
          aqi={100}
          category="moderate"
        />
      );
      const link = screen.getByTestId('learn-more-link');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });
});

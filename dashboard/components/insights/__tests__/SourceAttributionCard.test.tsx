/**
 * SourceAttributionCard Component Tests
 * 
 * Tests for the SourceAttributionCard component including:
 * - Rendering with mock data
 * - Loading state
 * - Empty state
 * - Chart rendering
 * - Legend display
 * - Data transformation
 * - Interactive features (hover, click, animations)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SourceAttributionCard } from '../SourceAttributionCard';
import { SourceAttribution } from '@/lib/api/types';

// ============================================================================
// Mock Data
// ============================================================================

const mockSourceAttribution: SourceAttribution = {
  vehicular: 45,
  industrial: 25,
  biomass: 20,
  background: 10,
};

const mockEmptySourceAttribution: SourceAttribution = {
  vehicular: 0,
  industrial: 0,
  biomass: 0,
  background: 0,
};

const mockPartialSourceAttribution: SourceAttribution = {
  vehicular: 60,
  industrial: 40,
  biomass: 0,
  background: 0,
};

// ============================================================================
// Tests
// ============================================================================

describe('SourceAttributionCard', () => {
  describe('Rendering', () => {
    it('should render with mock data', () => {
      render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
      
      expect(screen.getByTestId('source-attribution-card')).toBeInTheDocument();
      expect(screen.getByTestId('source-attribution-title')).toHaveTextContent('Pollution Sources');
      expect(screen.getByTestId('source-attribution-chart')).toBeInTheDocument();
      expect(screen.getByTestId('source-attribution-legend')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(
        <SourceAttributionCard
          sourceAttribution={mockSourceAttribution}
          title="Custom Source Title"
        />
      );
      
      expect(screen.getByTestId('source-attribution-title')).toHaveTextContent('Custom Source Title');
    });

    it('should render loading state', () => {
      render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} isLoading={true} />);
      
      expect(screen.getByTestId('source-attribution-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('source-attribution-card')).not.toBeInTheDocument();
    });

    it('should render empty state when all values are zero', () => {
      render(<SourceAttributionCard sourceAttribution={mockEmptySourceAttribution} />);
      
      expect(screen.getByTestId('source-attribution-empty')).toBeInTheDocument();
      expect(screen.getByText('No source attribution data available')).toBeInTheDocument();
    });
  });

  describe('Legend Display', () => {
    it('should display all source categories with percentages', () => {
      render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
      
      // Check vehicular
      expect(screen.getByTestId('legend-item-vehicular')).toBeInTheDocument();
      expect(screen.getByTestId('legend-value-vehicular')).toHaveTextContent('45%');
      
      // Check industrial
      expect(screen.getByTestId('legend-item-industrial')).toBeInTheDocument();
      expect(screen.getByTestId('legend-value-industrial')).toHaveTextContent('25%');
      
      // Check biomass
      expect(screen.getByTestId('legend-item-biomass')).toBeInTheDocument();
      expect(screen.getByTestId('legend-value-biomass')).toHaveTextContent('20%');
      
      // Check background
      expect(screen.getByTestId('legend-item-background')).toBeInTheDocument();
      expect(screen.getByTestId('legend-value-background')).toHaveTextContent('10%');
    });

    it('should only display non-zero source categories', () => {
      render(<SourceAttributionCard sourceAttribution={mockPartialSourceAttribution} />);
      
      // Should display vehicular and industrial
      expect(screen.getByTestId('legend-item-vehicular')).toBeInTheDocument();
      expect(screen.getByTestId('legend-item-industrial')).toBeInTheDocument();
      
      // Should not display biomass and background
      expect(screen.queryByTestId('legend-item-biomass')).not.toBeInTheDocument();
      expect(screen.queryByTestId('legend-item-background')).not.toBeInTheDocument();
    });

    it('should display correct source labels', () => {
      render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
      
      expect(screen.getByText('Vehicular')).toBeInTheDocument();
      expect(screen.getByText('Industrial')).toBeInTheDocument();
      expect(screen.getByText('Biomass Burning')).toBeInTheDocument();
      expect(screen.getByText('Background')).toBeInTheDocument();
    });
  });

  describe('Chart Rendering', () => {
    it('should render chart container', () => {
      render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
      
      const chartContainer = screen.getByTestId('source-attribution-chart');
      expect(chartContainer).toBeInTheDocument();
      expect(chartContainer).toHaveClass('h-64');
    });

    it('should render ResponsiveContainer', () => {
      const { container } = render(
        <SourceAttributionCard sourceAttribution={mockSourceAttribution} />
      );
      
      // Recharts renders a ResponsiveContainer with specific class
      const responsiveContainer = container.querySelector('.recharts-responsive-container');
      expect(responsiveContainer).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply glassmorphic card styling', () => {
      render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
      
      const card = screen.getByTestId('source-attribution-card');
      expect(card).toHaveClass('glass-card');
      expect(card).toHaveClass('p-6');
      expect(card).toHaveClass('rounded-2xl');
    });

    it('should have transition animation', () => {
      render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
      
      const card = screen.getByTestId('source-attribution-card');
      expect(card).toHaveClass('transition-all');
      expect(card).toHaveClass('duration-300');
    });
  });

  describe('Info Note', () => {
    it('should display info note about source attribution', () => {
      render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
      
      expect(screen.getByText(/Source attribution is estimated using machine learning models/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper test ids for all elements', () => {
      render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
      
      expect(screen.getByTestId('source-attribution-card')).toBeInTheDocument();
      expect(screen.getByTestId('source-attribution-title')).toBeInTheDocument();
      expect(screen.getByTestId('source-attribution-chart')).toBeInTheDocument();
      expect(screen.getByTestId('source-attribution-legend')).toBeInTheDocument();
    });

    it('should have descriptive text for screen readers', () => {
      render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
      
      expect(screen.getByText('Breakdown of pollution sources contributing to current air quality')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single source attribution', () => {
      const singleSource: SourceAttribution = {
        vehicular: 100,
        industrial: 0,
        biomass: 0,
        background: 0,
      };
      
      render(<SourceAttributionCard sourceAttribution={singleSource} />);
      
      expect(screen.getByTestId('legend-item-vehicular')).toBeInTheDocument();
      expect(screen.getByTestId('legend-value-vehicular')).toHaveTextContent('100%');
      expect(screen.queryByTestId('legend-item-industrial')).not.toBeInTheDocument();
    });

    it('should handle decimal percentages', () => {
      const decimalSource: SourceAttribution = {
        vehicular: 33.33,
        industrial: 33.33,
        biomass: 33.34,
        background: 0,
      };
      
      render(<SourceAttributionCard sourceAttribution={decimalSource} />);
      
      expect(screen.getByTestId('legend-value-vehicular')).toHaveTextContent('33.33%');
      expect(screen.getByTestId('legend-value-industrial')).toHaveTextContent('33.33%');
      expect(screen.getByTestId('legend-value-biomass')).toHaveTextContent('33.34%');
    });
  });

  describe('Interactive Features', () => {
    describe('Legend Interactions', () => {
      it('should make legend items clickable', () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        const legendItem = screen.getByTestId('legend-item-vehicular');
        expect(legendItem).toHaveClass('cursor-pointer');
      });

      it('should show detailed breakdown when legend item is clicked', async () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        const legendItem = screen.getByTestId('legend-item-vehicular');
        fireEvent.click(legendItem);
        
        await waitFor(() => {
          expect(screen.getByTestId('selected-segment-details')).toBeInTheDocument();
        });
        
        // Check that the details section contains the expected content
        const detailsSection = screen.getByTestId('selected-segment-details');
        expect(detailsSection).toHaveTextContent('Vehicular');
        expect(detailsSection).toHaveTextContent('45%');
        expect(detailsSection).toHaveTextContent('Contribution');
      });

      it('should display source description in detailed breakdown', async () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        const legendItem = screen.getByTestId('legend-item-vehicular');
        fireEvent.click(legendItem);
        
        await waitFor(() => {
          expect(screen.getByText(/Emissions from cars, trucks, buses/i)).toBeInTheDocument();
        });
      });

      it('should close detailed breakdown when close button is clicked', async () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        // Open details
        const legendItem = screen.getByTestId('legend-item-vehicular');
        fireEvent.click(legendItem);
        
        await waitFor(() => {
          expect(screen.getByTestId('selected-segment-details')).toBeInTheDocument();
        });
        
        // Close details
        const closeButton = screen.getByTestId('close-details-button');
        fireEvent.click(closeButton);
        
        await waitFor(() => {
          expect(screen.queryByTestId('selected-segment-details')).not.toBeInTheDocument();
        });
      });

      it('should switch between different segments when clicking legend items', async () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        // Click vehicular
        fireEvent.click(screen.getByTestId('legend-item-vehicular'));
        await waitFor(() => {
          expect(screen.getByTestId('selected-segment-details')).toBeInTheDocument();
        });
        
        let detailsSection = screen.getByTestId('selected-segment-details');
        expect(detailsSection).toHaveTextContent('Vehicular');
        
        // Click industrial
        fireEvent.click(screen.getByTestId('legend-item-industrial'));
        await waitFor(() => {
          detailsSection = screen.getByTestId('selected-segment-details');
          expect(detailsSection).toHaveTextContent('Industrial');
        });
      });
    });

    describe('Hover Effects', () => {
      it('should apply hover styles to legend items', () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        const legendItem = screen.getByTestId('legend-item-vehicular');
        expect(legendItem).toHaveClass('hover:bg-white/5');
        expect(legendItem).toHaveClass('hover:scale-[1.02]');
      });

      it('should have transition classes for smooth animations', () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        const legendItem = screen.getByTestId('legend-item-vehicular');
        expect(legendItem).toHaveClass('transition-all');
        expect(legendItem).toHaveClass('duration-200');
      });
    });

    describe('Animations', () => {
      it('should animate detailed breakdown appearance', async () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        const legendItem = screen.getByTestId('legend-item-vehicular');
        fireEvent.click(legendItem);
        
        await waitFor(() => {
          const details = screen.getByTestId('selected-segment-details');
          expect(details).toHaveClass('animate-fade-in');
        });
      });

      it('should show progress bar with animation in detailed breakdown', async () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        const legendItem = screen.getByTestId('legend-item-vehicular');
        fireEvent.click(legendItem);
        
        await waitFor(() => {
          const details = screen.getByTestId('selected-segment-details');
          const progressBar = details.querySelector('.h-full.rounded-full');
          expect(progressBar).toHaveClass('transition-all');
          expect(progressBar).toHaveClass('duration-500');
          expect(progressBar).toHaveClass('ease-out');
        });
      });
    });

    describe('Detailed Breakdown Content', () => {
      it('should display all required information in breakdown', async () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        fireEvent.click(screen.getByTestId('legend-item-industrial'));
        
        await waitFor(() => {
          const details = screen.getByTestId('selected-segment-details');
          
          // Check for title
          expect(details).toHaveTextContent('Industrial');
          
          // Check for contribution label
          expect(details).toHaveTextContent('Contribution');
          
          // Check for percentage
          expect(details).toHaveTextContent('25%');
          
          // Check for description
          expect(details).toHaveTextContent(/Pollution from factories/i);
        });
      });

      it('should display correct color indicator in breakdown', async () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        fireEvent.click(screen.getByTestId('legend-item-biomass'));
        
        await waitFor(() => {
          const details = screen.getByTestId('selected-segment-details');
          const colorIndicator = details.querySelector('.w-6.h-6.rounded-full');
          expect(colorIndicator).toHaveStyle({ backgroundColor: '#F59E0B' }); // Biomass color
        });
      });

      it('should display progress bar with correct width', async () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        fireEvent.click(screen.getByTestId('legend-item-vehicular'));
        
        await waitFor(() => {
          const details = screen.getByTestId('selected-segment-details');
          const progressBar = details.querySelector('.h-full.rounded-full');
          expect(progressBar).toHaveStyle({ width: '45%' });
        });
      });
    });

    describe('Source Descriptions', () => {
      it('should display correct description for vehicular source', async () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        fireEvent.click(screen.getByTestId('legend-item-vehicular'));
        
        await waitFor(() => {
          expect(screen.getByText(/Emissions from cars, trucks, buses/i)).toBeInTheDocument();
        });
      });

      it('should display correct description for industrial source', async () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        fireEvent.click(screen.getByTestId('legend-item-industrial'));
        
        await waitFor(() => {
          expect(screen.getByText(/Pollution from factories, power plants/i)).toBeInTheDocument();
        });
      });

      it('should display correct description for biomass source', async () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        fireEvent.click(screen.getByTestId('legend-item-biomass'));
        
        await waitFor(() => {
          expect(screen.getByText(/Smoke and particulates from burning/i)).toBeInTheDocument();
        });
      });

      it('should display correct description for background source', async () => {
        render(<SourceAttributionCard sourceAttribution={mockSourceAttribution} />);
        
        fireEvent.click(screen.getByTestId('legend-item-background'));
        
        await waitFor(() => {
          expect(screen.getByText(/Natural and long-range transported pollution/i)).toBeInTheDocument();
        });
      });
    });
  });
});

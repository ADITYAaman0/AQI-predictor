/**
 * Export Button Component Tests
 * 
 * Unit tests for the ExportButton component.
 * 
 * Tests:
 * - Button rendering
 * - Dropdown menu functionality
 * - CSV export action
 * - JSON export action
 * - Loading state
 * - Success feedback
 * - Disabled state
 * - Click outside to close
 * 
 * Requirements: 19.8 (Historical Data and Trends)
 * Task: 10.4 - Add forecast export functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExportButton } from '../ExportButton';
import { HourlyForecastData } from '@/lib/api/types';
import * as exportUtils from '@/lib/utils/exportUtils';

// Mock the export utilities
jest.mock('@/lib/utils/exportUtils', () => ({
  exportForecastData: jest.fn(),
}));

// Mock forecast data
const mockForecasts: HourlyForecastData[] = [
  {
    timestamp: '2024-01-15T12:00:00Z',
    forecastHour: 0,
    aqi: {
      value: 75,
      category: 'moderate',
      categoryLabel: 'Moderate',
      color: '#FCD34D',
      confidenceLower: 65,
      confidenceUpper: 85,
    },
    pollutants: {
      pm25: {
        parameter: 'pm25',
        value: 35.5,
        unit: 'μg/m³',
        aqi_value: 75,
      },
    } as any,
    weather: {
      temperature: 25.5,
      humidity: 65,
      windSpeed: 3.5,
      windDirection: 180,
      pressure: 1013.25,
    },
    confidence: {
      score: 0.85,
      modelWeights: {},
    },
  },
];

describe('ExportButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render export button', () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Export');
    });

    it('should render with download icon', () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
          disabled={true}
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      expect(button).toBeDisabled();
    });

    it('should be disabled when forecasts array is empty', () => {
      render(
        <ExportButton
          forecasts={[]}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Dropdown Menu', () => {
    it('should open dropdown menu on button click', () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      fireEvent.click(button);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();
      expect(screen.getByText('Export as JSON')).toBeInTheDocument();
    });

    it('should close dropdown menu on second button click', () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      
      // Open dropdown
      fireEvent.click(button);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Close dropdown
      fireEvent.click(button);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', () => {
      render(
        <div>
          <ExportButton
            forecasts={mockForecasts}
            location="Delhi"
          />
          <div data-testid="outside">Outside</div>
        </div>
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      
      // Open dropdown
      fireEvent.click(button);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Click outside
      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('should display CSV option with description', () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      fireEvent.click(button);

      expect(screen.getByText('Export as CSV')).toBeInTheDocument();
      expect(screen.getByText('Spreadsheet format')).toBeInTheDocument();
    });

    it('should display JSON option with description', () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      fireEvent.click(button);

      expect(screen.getByText('Export as JSON')).toBeInTheDocument();
      expect(screen.getByText('Developer format')).toBeInTheDocument();
    });
  });

  describe('Export Actions', () => {
    it('should call exportForecastData with CSV format', async () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      fireEvent.click(button);

      const csvOption = screen.getByText('Export as CSV');
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(exportUtils.exportForecastData).toHaveBeenCalledWith(
          mockForecasts,
          'csv',
          'Delhi',
          { includeMetadata: true }
        );
      });
    });

    it('should call exportForecastData with JSON format', async () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      fireEvent.click(button);

      const jsonOption = screen.getByText('Export as JSON');
      fireEvent.click(jsonOption);

      await waitFor(() => {
        expect(exportUtils.exportForecastData).toHaveBeenCalledWith(
          mockForecasts,
          'json',
          'Delhi',
          { includeMetadata: true }
        );
      });
    });

    it('should close dropdown after selecting export option', async () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      fireEvent.click(button);

      const csvOption = screen.getByText('Export as CSV');
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during export', async () => {
      // Mock exportForecastData to delay
      (exportUtils.exportForecastData as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      fireEvent.click(button);

      const csvOption = screen.getByText('Export as CSV');
      fireEvent.click(csvOption);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Exporting...')).toBeInTheDocument();
      });
    });

    it('should disable button during export', async () => {
      // Mock exportForecastData to delay
      (exportUtils.exportForecastData as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      fireEvent.click(button);

      const csvOption = screen.getByText('Export as CSV');
      fireEvent.click(csvOption);

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /export forecast data/i });
        expect(exportButton).toBeDisabled();
      });
    });
  });

  describe('Success Feedback', () => {
    it('should show success state after export', async () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      fireEvent.click(button);

      const csvOption = screen.getByText('Export as CSV');
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(screen.getByText('Exported!')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should return to normal state after success timeout', async () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      fireEvent.click(button);

      const csvOption = screen.getByText('Export as CSV');
      fireEvent.click(csvOption);

      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText('Exported!')).toBeInTheDocument();
      });

      // Wait for return to normal state
      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Error Handling', () => {
    it('should handle export errors gracefully', async () => {
      // Mock exportForecastData to throw error
      (exportUtils.exportForecastData as jest.Mock).mockImplementation(() => {
        throw new Error('Export failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      fireEvent.click(button);

      const csvOption = screen.getByText('Export as CSV');
      fireEvent.click(csvOption);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      expect(button).toHaveAttribute('aria-label', 'Export forecast data');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update aria-expanded when dropdown opens', () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have menu role for dropdown', () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      fireEvent.click(button);

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('should have menuitem role for options', () => {
      render(
        <ExportButton
          forecasts={mockForecasts}
          location="Delhi"
        />
      );

      const button = screen.getByRole('button', { name: /export forecast data/i });
      fireEvent.click(button);

      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(2);
    });
  });
});

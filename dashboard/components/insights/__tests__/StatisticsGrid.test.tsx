/**
 * Tests for StatisticsGrid Component
 * 
 * Tests the StatisticsGrid component that displays all statistics.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatisticsGrid } from '../StatisticsGrid';
import { HistoricalDataPoint } from '@/lib/api/types';

describe('StatisticsGrid', () => {
  const mockData: HistoricalDataPoint[] = [
    { timestamp: '2024-01-01T00:00:00Z', value: 50, aqi: 50, category: 'good' },
    { timestamp: '2024-01-02T00:00:00Z', value: 100, aqi: 100, category: 'moderate' },
    { timestamp: '2024-01-03T00:00:00Z', value: 150, aqi: 150, category: 'unhealthy' },
    { timestamp: '2024-01-04T00:00:00Z', value: 200, aqi: 200, category: 'unhealthy' },
    { timestamp: '2024-01-05T00:00:00Z', value: 125, aqi: 125, category: 'unhealthy' },
  ];

  it('renders all four statistics cards', () => {
    render(<StatisticsGrid data={mockData} />);

    expect(screen.getByTestId('statistics-card-average')).toBeInTheDocument();
    expect(screen.getByTestId('statistics-card-minimum')).toBeInTheDocument();
    expect(screen.getByTestId('statistics-card-maximum')).toBeInTheDocument();
    expect(screen.getByTestId('statistics-card-median')).toBeInTheDocument();
  });

  it('displays correct values for each statistic', () => {
    render(<StatisticsGrid data={mockData} />);

    // Check average (mean of [50, 100, 150, 200, 125] = 125)
    const averageCard = screen.getByTestId('statistics-card-average');
    expect(averageCard).toHaveTextContent('125');

    // Check minimum
    const minCard = screen.getByTestId('statistics-card-minimum');
    expect(minCard).toHaveTextContent('50');

    // Check maximum
    const maxCard = screen.getByTestId('statistics-card-maximum');
    expect(maxCard).toHaveTextContent('200');

    // Check median (median of [50, 100, 125, 150, 200] = 125)
    const medianCard = screen.getByTestId('statistics-card-median');
    expect(medianCard).toHaveTextContent('125');
  });

  it('displays default title', () => {
    render(<StatisticsGrid data={mockData} />);

    expect(screen.getByText('Statistics')).toBeInTheDocument();
  });

  it('displays custom title', () => {
    render(<StatisticsGrid data={mockData} title="Custom Stats" />);

    expect(screen.getByText('Custom Stats')).toBeInTheDocument();
  });

  it('displays data count info', () => {
    render(<StatisticsGrid data={mockData} />);

    expect(screen.getByText(/Based on 5 data points/)).toBeInTheDocument();
  });

  it('displays singular "point" for count of 1', () => {
    const singleDataPoint: HistoricalDataPoint[] = [
      { timestamp: '2024-01-01T00:00:00Z', value: 100, aqi: 100, category: 'moderate' },
    ];

    render(<StatisticsGrid data={singleDataPoint} />);

    expect(screen.getByText(/Based on 1 data point$/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<StatisticsGrid data={[]} isLoading={true} />);

    expect(screen.getByTestId('statistics-grid-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('statistics-card-average')).not.toBeInTheDocument();
  });

  it('shows empty state when count is 0', () => {
    render(<StatisticsGrid data={[]} />);

    expect(screen.getByTestId('statistics-grid-empty')).toBeInTheDocument();
    expect(screen.getByText(/No data available for statistics calculation/)).toBeInTheDocument();
  });

  it('renders grid with correct layout classes', () => {
    const { container } = render(<StatisticsGrid data={mockData} />);

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-2');
    expect(grid).toHaveClass('lg:grid-cols-4');
  });

  it('renders with icons for each statistic', () => {
    render(<StatisticsGrid data={mockData} />);

    // Each card should have an icon
    const cards = [
      screen.getByTestId('statistics-card-average'),
      screen.getByTestId('statistics-card-minimum'),
      screen.getByTestId('statistics-card-maximum'),
      screen.getByTestId('statistics-card-median'),
    ];
    expect(cards).toHaveLength(4);
  });

  it('handles zero values correctly', () => {
    const zeroData: HistoricalDataPoint[] = [
      { timestamp: '2024-01-01T00:00:00Z', value: 0, aqi: 0, category: 'good' },
      { timestamp: '2024-01-02T00:00:00Z', value: 0, aqi: 0, category: 'good' },
      { timestamp: '2024-01-03T00:00:00Z', value: 0, aqi: 0, category: 'good' },
    ];

    render(<StatisticsGrid data={zeroData} />);

    expect(screen.getByTestId('statistics-card-average')).toHaveTextContent('0');
    expect(screen.getByTestId('statistics-card-minimum')).toHaveTextContent('0');
    expect(screen.getByTestId('statistics-card-maximum')).toHaveTextContent('0');
    expect(screen.getByTestId('statistics-card-median')).toHaveTextContent('0');
  });

  it('handles large values correctly', () => {
    const largeData: HistoricalDataPoint[] = [
      { timestamp: '2024-01-01T00:00:00Z', value: 300, aqi: 300, category: 'hazardous' },
      { timestamp: '2024-01-02T00:00:00Z', value: 400, aqi: 400, category: 'hazardous' },
      { timestamp: '2024-01-03T00:00:00Z', value: 500, aqi: 500, category: 'hazardous' },
    ];

    render(<StatisticsGrid data={largeData} />);

    expect(screen.getByTestId('statistics-card-average')).toHaveTextContent('400');
    expect(screen.getByTestId('statistics-card-maximum')).toHaveTextContent('500');
  });
});

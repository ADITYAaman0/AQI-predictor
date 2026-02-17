/**
 * Tests for StatisticsCard Component
 * 
 * Tests the StatisticsCard component that displays individual statistics.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatisticsCard } from '../StatisticsCard';

describe('StatisticsCard', () => {
  it('renders with label and value', () => {
    render(<StatisticsCard label="Average" value={125} />);

    expect(screen.getByTestId('statistics-card-label')).toHaveTextContent('Average');
    expect(screen.getByTestId('statistics-card-value')).toHaveTextContent('125');
  });

  it('displays correct category label for Good AQI', () => {
    render(<StatisticsCard label="Minimum" value={45} />);

    expect(screen.getByTestId('statistics-card-category')).toHaveTextContent('Good');
  });

  it('displays correct category label for Moderate AQI', () => {
    render(<StatisticsCard label="Average" value={75} />);

    expect(screen.getByTestId('statistics-card-category')).toHaveTextContent('Moderate');
  });

  it('displays correct category label for Unhealthy AQI', () => {
    render(<StatisticsCard label="Maximum" value={175} />);

    expect(screen.getByTestId('statistics-card-category')).toHaveTextContent('Unhealthy');
  });

  it('displays correct category label for Hazardous AQI', () => {
    render(<StatisticsCard label="Maximum" value={350} />);

    expect(screen.getByTestId('statistics-card-category')).toHaveTextContent('Hazardous');
  });

  it('applies correct color for Good AQI', () => {
    render(<StatisticsCard label="Minimum" value={45} />);

    const value = screen.getByTestId('statistics-card-value');
    expect(value).toHaveStyle({ color: '#4ADE80' });
  });

  it('applies correct color for Moderate AQI', () => {
    render(<StatisticsCard label="Average" value={75} />);

    const value = screen.getByTestId('statistics-card-value');
    expect(value).toHaveStyle({ color: '#FCD34D' });
  });

  it('applies correct color for Unhealthy AQI', () => {
    render(<StatisticsCard label="Maximum" value={175} />);

    const value = screen.getByTestId('statistics-card-value');
    expect(value).toHaveStyle({ color: '#EF4444' });
  });

  it('renders with custom icon', () => {
    const icon = <span data-testid="custom-icon">📊</span>;
    render(<StatisticsCard label="Average" value={100} icon={icon} />);

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders without icon', () => {
    render(<StatisticsCard label="Average" value={100} />);

    expect(screen.queryByTestId('statistics-card-icon')).not.toBeInTheDocument();
  });

  it('uses custom testId when provided', () => {
    render(<StatisticsCard label="Average" value={100} testId="custom-test-id" />);

    expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
  });

  it('uses default testId based on label', () => {
    render(<StatisticsCard label="Average" value={100} />);

    expect(screen.getByTestId('statistics-card-average')).toBeInTheDocument();
  });

  it('rounds decimal values to nearest integer', () => {
    render(<StatisticsCard label="Average" value={125.7} />);

    expect(screen.getByTestId('statistics-card-value')).toHaveTextContent('126');
  });

  it('has glassmorphic styling', () => {
    const { container } = render(<StatisticsCard label="Average" value={100} />);

    const card = container.firstChild;
    expect(card).toHaveClass('glass-card');
  });

  it('has hover scale effect', () => {
    const { container } = render(<StatisticsCard label="Average" value={100} />);

    const card = container.firstChild;
    expect(card).toHaveClass('hover:scale-105');
  });
});

/**
 * RefreshButton Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RefreshButton } from '../RefreshButton';

describe('RefreshButton', () => {
  it('renders refresh button', () => {
    const mockRefresh = jest.fn();
    render(<RefreshButton onRefresh={mockRefresh} />);
    
    const button = screen.getByRole('button', { name: /refresh data/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onRefresh when clicked', async () => {
    const mockRefresh = jest.fn().mockResolvedValue(undefined);
    render(<RefreshButton onRefresh={mockRefresh} />);
    
    const button = screen.getByRole('button', { name: /refresh data/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('shows spinning animation during refresh', async () => {
    const mockRefresh = jest.fn<Promise<void>, []>(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<RefreshButton onRefresh={mockRefresh} />);
    
    const button = screen.getByRole('button', { name: /refresh data/i });
    fireEvent.click(button);
    
    // Button should be disabled during refresh
    expect(button).toBeDisabled();
    
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    }, { timeout: 1000 });
  });

  it('disables button when disabled prop is true', () => {
    const mockRefresh = jest.fn();
    render(<RefreshButton onRefresh={mockRefresh} disabled={true} />);
    
    const button = screen.getByRole('button', { name: /refresh data/i });
    expect(button).toBeDisabled();
  });

  it('does not call onRefresh when disabled', () => {
    const mockRefresh = jest.fn();
    render(<RefreshButton onRefresh={mockRefresh} disabled={true} />);
    
    const button = screen.getByRole('button', { name: /refresh data/i });
    fireEvent.click(button);
    
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('shows label when showLabel is true', () => {
    const mockRefresh = jest.fn();
    render(<RefreshButton onRefresh={mockRefresh} showLabel={true} />);
    
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('applies different size classes', () => {
    const mockRefresh = jest.fn();
    const { rerender } = render(<RefreshButton onRefresh={mockRefresh} size="small" />);
    
    let button = screen.getByRole('button', { name: /refresh data/i });
    expect(button).toHaveClass('w-8', 'h-8');
    
    rerender(<RefreshButton onRefresh={mockRefresh} size="large" />);
    button = screen.getByRole('button', { name: /refresh data/i });
    expect(button).toHaveClass('w-12', 'h-12');
  });

  it('is keyboard accessible', () => {
    const mockRefresh = jest.fn().mockResolvedValue(undefined);
    render(<RefreshButton onRefresh={mockRefresh} />);
    
    const button = screen.getByRole('button', { name: /refresh data/i });
    button.focus();
    
    expect(button).toHaveFocus();
    
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('prevents multiple simultaneous refreshes', async () => {
    const mockRefresh = jest.fn<Promise<void>, []>(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<RefreshButton onRefresh={mockRefresh} />);
    
    const button = screen.getByRole('button', { name: /refresh data/i });
    
    // Click multiple times rapidly
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    
    // Should only call once
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });
});

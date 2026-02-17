/**
 * Error Handling Tests
 * 
 * Tests for error boundary, error display components, and error handling functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary } from '../ErrorBoundary';
import { 
  ErrorDisplay, 
  CompactErrorDisplay, 
  NetworkErrorDisplay,
  OfflineBanner,
  CachedDataIndicator 
} from '../ErrorDisplay';
import { APIError } from '@/lib/api/client';

// ============================================================================
// Test Components
// ============================================================================

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

// ============================================================================
// ErrorBoundary Tests
// ============================================================================

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('resets error state when Try Again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    // After reset, the component should try to render children again
    // In a real scenario, the error might not occur again
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});

// ============================================================================
// ErrorDisplay Tests
// ============================================================================

describe('ErrorDisplay', () => {
  it('displays generic error message', () => {
    const error = new Error('Test error message');

    render(<ErrorDisplay error={error} />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('displays API error with status code', () => {
    const error = new APIError('Server error', 500);

    render(<ErrorDisplay error={error} />);

    expect(screen.getByText('Server Error')).toBeInTheDocument();
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });

  it('displays network error', () => {
    const error = new APIError('Unable to connect');

    render(<ErrorDisplay error={error} />);

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
  });

  it('displays timeout error', () => {
    const error = new APIError('Request timeout', 408);

    render(<ErrorDisplay error={error} />);

    expect(screen.getByText('Request Timeout')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    const error = new Error('Test error');

    render(<ErrorDisplay error={error} onRetry={onRetry} />);

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button when onRetry is not provided', () => {
    const error = new Error('Test error');

    render(<ErrorDisplay error={error} />);

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });
});

// ============================================================================
// CompactErrorDisplay Tests
// ============================================================================

describe('CompactErrorDisplay', () => {
  it('displays compact error message', () => {
    const error = new Error('Compact error');

    render(<CompactErrorDisplay error={error} />);

    expect(screen.getByText('Compact error')).toBeInTheDocument();
  });

  it('displays retry button in compact mode', () => {
    const onRetry = jest.fn();
    const error = new Error('Test error');

    render(<CompactErrorDisplay error={error} onRetry={onRetry} />);

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// NetworkErrorDisplay Tests
// ============================================================================

describe('NetworkErrorDisplay', () => {
  it('displays network error message', () => {
    render(<NetworkErrorDisplay />);

    expect(screen.getByText('No Connection')).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();

    render(<NetworkErrorDisplay onRetry={onRetry} />);

    const retryButton = screen.getByText('Retry Connection');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// OfflineBanner Tests
// ============================================================================

describe('OfflineBanner', () => {
  it('displays offline banner', () => {
    render(<OfflineBanner />);

    expect(screen.getByText('You are offline')).toBeInTheDocument();
    expect(screen.getByText(/Showing cached data/)).toBeInTheDocument();
  });
});

// ============================================================================
// CachedDataIndicator Tests
// ============================================================================

describe('CachedDataIndicator', () => {
  it('displays cached data indicator', () => {
    render(<CachedDataIndicator />);

    expect(screen.getByText('Showing cached data')).toBeInTheDocument();
  });

  it('displays last updated time when provided', () => {
    render(<CachedDataIndicator lastUpdated="5 minutes ago" />);

    expect(screen.getByText(/Showing cached data from 5 minutes ago/)).toBeInTheDocument();
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Error Handling Integration', () => {
  it('handles multiple error states correctly', () => {
    const { rerender } = render(<ErrorDisplay error={null} />);

    // Initially no error
    expect(screen.getByText('Error')).toBeInTheDocument();

    // Network error
    rerender(<ErrorDisplay error={new APIError('Network error')} />);
    expect(screen.getByText('Connection Error')).toBeInTheDocument();

    // Server error
    rerender(<ErrorDisplay error={new APIError('Server error', 500)} />);
    expect(screen.getByText('Server Error')).toBeInTheDocument();

    // Timeout error
    rerender(<ErrorDisplay error={new APIError('Timeout', 408)} />);
    expect(screen.getByText('Request Timeout')).toBeInTheDocument();
  });

  it('error boundary catches errors from nested components', () => {
    const NestedComponent = () => {
      return (
        <div>
          <ThrowError shouldThrow={true} />
        </div>
      );
    };

    render(
      <ErrorBoundary>
        <NestedComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});

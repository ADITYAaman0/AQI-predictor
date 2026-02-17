/**
 * Tests for NotificationPermissionPrompt component
 * 
 * Requirements: 18.4
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationPermissionPrompt } from '../NotificationPermissionPrompt';
import { useNotifications } from '@/lib/hooks/useNotifications';

// Mock the useNotifications hook
jest.mock('@/lib/hooks/useNotifications');

const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;

describe('NotificationPermissionPrompt', () => {
  const mockRequestPermission = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockUseNotifications.mockReturnValue({
      permission: 'default',
      isSupported: true,
      isGranted: false,
      isDenied: false,
      requestPermission: mockRequestPermission,
      showNotification: jest.fn(),
      showAQIAlert: jest.fn(),
      showThresholdNotification: jest.fn(),
    });
  });

  describe('rendering', () => {
    it('should render the prompt when permission is default', () => {
      render(<NotificationPermissionPrompt />);
      
      expect(screen.getByText('Enable Air Quality Alerts')).toBeInTheDocument();
      expect(screen.getByText(/Get notified when air quality reaches unhealthy levels/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Enable notifications/i })).toBeInTheDocument();
    });

    it('should not render when notifications are not supported', () => {
      mockUseNotifications.mockReturnValue({
        permission: 'denied',
        isSupported: false,
        isGranted: false,
        isDenied: true,
        requestPermission: mockRequestPermission,
        showNotification: jest.fn(),
        showAQIAlert: jest.fn(),
        showThresholdNotification: jest.fn(),
      });
      
      const { container } = render(<NotificationPermissionPrompt />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should not render when permission is already granted', () => {
      mockUseNotifications.mockReturnValue({
        permission: 'granted',
        isSupported: true,
        isGranted: true,
        isDenied: false,
        requestPermission: mockRequestPermission,
        showNotification: jest.fn(),
        showAQIAlert: jest.fn(),
        showThresholdNotification: jest.fn(),
      });
      
      const { container } = render(<NotificationPermissionPrompt />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should show denied message when permission is denied', () => {
      mockUseNotifications.mockReturnValue({
        permission: 'denied',
        isSupported: true,
        isGranted: false,
        isDenied: true,
        requestPermission: mockRequestPermission,
        showNotification: jest.fn(),
        showAQIAlert: jest.fn(),
        showThresholdNotification: jest.fn(),
      });
      
      render(<NotificationPermissionPrompt />);
      
      expect(screen.getByText(/Notifications are blocked/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Enable notifications/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should request permission when enable button is clicked', async () => {
      mockRequestPermission.mockResolvedValue('granted');
      
      render(<NotificationPermissionPrompt />);
      
      const enableButton = screen.getByRole('button', { name: /Enable notifications/i });
      fireEvent.click(enableButton);
      
      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
      });
    });

    it('should show loading state while requesting permission', async () => {
      mockRequestPermission.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('granted'), 100)));
      
      render(<NotificationPermissionPrompt />);
      
      const enableButton = screen.getByRole('button', { name: /Enable notifications/i });
      fireEvent.click(enableButton);
      
      expect(screen.getByText(/Requesting.../)).toBeInTheDocument();
      expect(enableButton).toBeDisabled();
      
      await waitFor(() => {
        expect(mockRequestPermission).toHaveBeenCalled();
      });
    });

    it('should call onPermissionGranted when permission is granted', async () => {
      mockRequestPermission.mockResolvedValue('granted');
      const onPermissionGranted = jest.fn();
      
      render(<NotificationPermissionPrompt onPermissionGranted={onPermissionGranted} />);
      
      const enableButton = screen.getByRole('button', { name: /Enable notifications/i });
      fireEvent.click(enableButton);
      
      await waitFor(() => {
        expect(onPermissionGranted).toHaveBeenCalled();
      });
    });

    it('should call onPermissionDenied when permission is denied', async () => {
      mockRequestPermission.mockResolvedValue('denied');
      const onPermissionDenied = jest.fn();
      
      render(<NotificationPermissionPrompt onPermissionDenied={onPermissionDenied} />);
      
      const enableButton = screen.getByRole('button', { name: /Enable notifications/i });
      fireEvent.click(enableButton);
      
      await waitFor(() => {
        expect(onPermissionDenied).toHaveBeenCalled();
      });
    });

    it('should call onDismiss when dismiss button is clicked', () => {
      const onDismiss = jest.fn();
      
      render(<NotificationPermissionPrompt onDismiss={onDismiss} />);
      
      const dismissButton = screen.getByRole('button', { name: /Dismiss notification prompt/i });
      fireEvent.click(dismissButton);
      
      expect(onDismiss).toHaveBeenCalled();
    });

    it('should call onDismiss when close button is clicked', () => {
      const onDismiss = jest.fn();
      
      render(<NotificationPermissionPrompt onDismiss={onDismiss} />);
      
      const closeButton = screen.getByRole('button', { name: /Close/i });
      fireEvent.click(closeButton);
      
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<NotificationPermissionPrompt />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('should have accessible button labels', () => {
      render(<NotificationPermissionPrompt />);
      
      expect(screen.getByRole('button', { name: /Enable notifications/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Dismiss notification prompt/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
    });

    it('should have proper focus management', () => {
      render(<NotificationPermissionPrompt />);
      
      const enableButton = screen.getByRole('button', { name: /Enable notifications/i });
      const dismissButton = screen.getByRole('button', { name: /Dismiss notification prompt/i });
      const closeButton = screen.getByRole('button', { name: /Close/i });
      
      expect(enableButton).toHaveClass('focus:outline-none', 'focus:ring-2');
      expect(dismissButton).toHaveClass('focus:outline-none', 'focus:ring-2');
      expect(closeButton).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });

  describe('styling', () => {
    it('should apply glassmorphic styling', () => {
      const { container } = render(<NotificationPermissionPrompt />);
      
      const promptElement = container.firstChild as HTMLElement;
      expect(promptElement).toHaveClass('bg-white/10', 'backdrop-blur-glass', 'border-white/18');
    });

    it('should apply custom className', () => {
      const { container } = render(<NotificationPermissionPrompt className="custom-class" />);
      
      const promptElement = container.firstChild as HTMLElement;
      expect(promptElement).toHaveClass('custom-class');
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AlertsList } from '../AlertsList';
import type { AlertSubscriptionResponse } from '@/lib/api/types';

// Mock alert data
const mockAlerts: AlertSubscriptionResponse[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    location: {
      coordinates: {
        latitude: 28.6139,
        longitude: 77.2090,
      },
      country: 'India',
    },
    location_name: 'Delhi',
    threshold: 150,
    channels: ['email', 'push'],
    is_active: true,
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174001',
    location: {
      coordinates: {
        latitude: 19.0760,
        longitude: 72.8777,
      },
      country: 'India',
    },
    location_name: 'Mumbai',
    threshold: 100,
    channels: ['sms'],
    is_active: false,
    created_at: '2024-01-10T08:15:00Z',
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174002',
    location: {
      coordinates: {
        latitude: 12.9716,
        longitude: 77.5946,
      },
      country: 'India',
    },
    location_name: 'Bangalore',
    threshold: 200,
    channels: ['email', 'sms', 'push'],
    is_active: true,
    created_at: '2024-01-20T14:45:00Z',
  },
];

describe('AlertsList', () => {
  describe('Rendering', () => {
    it('renders all alerts correctly', () => {
      render(<AlertsList alerts={mockAlerts} />);

      // Check that all alerts are rendered
      expect(screen.getByText('Delhi')).toBeInTheDocument();
      expect(screen.getByText('Mumbai')).toBeInTheDocument();
      expect(screen.getByText('Bangalore')).toBeInTheDocument();
    });

    it('displays alert thresholds correctly', () => {
      render(<AlertsList alerts={mockAlerts} />);

      expect(screen.getByText('AQI 150')).toBeInTheDocument();
      expect(screen.getByText('AQI 100')).toBeInTheDocument();
      expect(screen.getByText('AQI 200')).toBeInTheDocument();
    });

    it('displays notification channels correctly', () => {
      render(<AlertsList alerts={mockAlerts} />);

      expect(screen.getByText('Email, Push')).toBeInTheDocument();
      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByText('Email, SMS, Push')).toBeInTheDocument();
    });

    it('displays coordinates when location name is not provided', () => {
      const alertWithoutName: AlertSubscriptionResponse = {
        ...mockAlerts[0],
        location_name: undefined,
      };

      render(<AlertsList alerts={[alertWithoutName]} />);

      expect(screen.getByText(/28\.61.*77\.21/)).toBeInTheDocument();
    });

    it('displays created date in formatted form', () => {
      render(<AlertsList alerts={mockAlerts} />);

      // Check that dates are displayed (format may vary by locale)
      const createdTexts = screen.getAllByText(/Created/);
      expect(createdTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Status Indicators', () => {
    it('shows active status indicator for active alerts', () => {
      render(<AlertsList alerts={mockAlerts} />);

      const statusBadges = screen.getAllByTestId('alert-status-badge');
      const activeBadges = statusBadges.filter(badge => badge.textContent === 'Active');
      
      expect(activeBadges).toHaveLength(2); // Delhi and Bangalore are active
    });

    it('shows inactive status indicator for inactive alerts', () => {
      render(<AlertsList alerts={mockAlerts} />);

      const statusBadges = screen.getAllByTestId('alert-status-badge');
      const inactiveBadges = statusBadges.filter(badge => badge.textContent === 'Inactive');
      
      expect(inactiveBadges).toHaveLength(1); // Mumbai is inactive
    });

    it('applies correct styling to status indicators', () => {
      render(<AlertsList alerts={mockAlerts} />);

      const statusIndicators = screen.getAllByTestId('alert-status-indicator');
      
      // Active alerts should have green indicator
      expect(statusIndicators[0]).toHaveClass('bg-green-400');
      
      // Inactive alerts should have gray indicator
      expect(statusIndicators[1]).toHaveClass('bg-gray-400');
    });
  });

  describe('AQI Category Colors', () => {
    it('applies correct color for good AQI (≤50)', () => {
      const goodAlert: AlertSubscriptionResponse = {
        ...mockAlerts[0],
        threshold: 50,
      };

      render(<AlertsList alerts={[goodAlert]} />);

      // Check that the threshold display has the correct color
      const thresholdElement = screen.getByText('AQI 50').closest('div')?.previousSibling as HTMLElement;
      expect(thresholdElement).toHaveStyle({ backgroundColor: expect.stringContaining('4ADE80') });
    });

    it('applies correct color for moderate AQI (51-100)', () => {
      const moderateAlert: AlertSubscriptionResponse = {
        ...mockAlerts[0],
        threshold: 100,
      };

      render(<AlertsList alerts={[moderateAlert]} />);

      const thresholdElement = screen.getByText('AQI 100').closest('div')?.previousSibling as HTMLElement;
      expect(thresholdElement).toHaveStyle({ backgroundColor: expect.stringContaining('FCD34D') });
    });

    it('applies correct color for unhealthy AQI (151-200)', () => {
      const unhealthyAlert: AlertSubscriptionResponse = {
        ...mockAlerts[0],
        threshold: 200,
      };

      render(<AlertsList alerts={[unhealthyAlert]} />);

      const thresholdElement = screen.getByText('AQI 200').closest('div')?.previousSibling as HTMLElement;
      expect(thresholdElement).toHaveStyle({ backgroundColor: expect.stringContaining('FB923C') });
    });

    it('applies correct color for hazardous AQI (>300)', () => {
      const hazardousAlert: AlertSubscriptionResponse = {
        ...mockAlerts[0],
        threshold: 350,
      };

      render(<AlertsList alerts={[hazardousAlert]} />);

      const thresholdElement = screen.getByText('AQI 350').closest('div')?.previousSibling as HTMLElement;
      expect(thresholdElement).toHaveStyle({ backgroundColor: expect.stringContaining('7C2D12') });
    });
  });

  describe('Edit Functionality', () => {
    it('calls onEdit when edit button is clicked', () => {
      const onEdit = jest.fn();
      render(<AlertsList alerts={mockAlerts} onEdit={onEdit} />);

      const editButtons = screen.getAllByLabelText('Edit alert');
      fireEvent.click(editButtons[0]);

      expect(onEdit).toHaveBeenCalledWith(mockAlerts[0]);
    });

    it('does not render edit button when onEdit is not provided', () => {
      render(<AlertsList alerts={mockAlerts} />);

      expect(screen.queryByLabelText('Edit alert')).not.toBeInTheDocument();
    });
  });

  describe('Delete Functionality', () => {
    it('shows confirmation dialog when delete button is clicked', () => {
      const onDelete = jest.fn();
      render(<AlertsList alerts={mockAlerts} onDelete={onDelete} />);

      const deleteButtons = screen.getAllByLabelText('Delete alert');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText(/Are you sure you want to delete this alert/)).toBeInTheDocument();
    });

    it('calls onDelete when delete is confirmed', () => {
      const onDelete = jest.fn();
      render(<AlertsList alerts={mockAlerts} onDelete={onDelete} />);

      const deleteButtons = screen.getAllByLabelText('Delete alert');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      expect(onDelete).toHaveBeenCalledWith(mockAlerts[0].id);
    });

    it('hides confirmation dialog when cancel is clicked', () => {
      const onDelete = jest.fn();
      render(<AlertsList alerts={mockAlerts} onDelete={onDelete} />);

      const deleteButtons = screen.getAllByLabelText('Delete alert');
      fireEvent.click(deleteButtons[0]);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText(/Are you sure you want to delete this alert/)).not.toBeInTheDocument();
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('does not render delete button when onDelete is not provided', () => {
      render(<AlertsList alerts={mockAlerts} />);

      expect(screen.queryByLabelText('Delete alert')).not.toBeInTheDocument();
    });
  });

  describe('Toggle Active Functionality', () => {
    it('calls onToggleActive when toggle button is clicked for active alert', async () => {
      const onToggleActive = jest.fn().mockResolvedValue(undefined);
      render(<AlertsList alerts={mockAlerts} onToggleActive={onToggleActive} />);

      const toggleButtons = screen.getAllByLabelText(/activate alert/i);
      fireEvent.click(toggleButtons[0]); // Click on first alert (active)

      await waitFor(() => {
        expect(onToggleActive).toHaveBeenCalledWith(mockAlerts[0].id, false);
      });
    });

    it('calls onToggleActive when toggle button is clicked for inactive alert', async () => {
      const onToggleActive = jest.fn().mockResolvedValue(undefined);
      render(<AlertsList alerts={mockAlerts} onToggleActive={onToggleActive} />);

      const toggleButtons = screen.getAllByLabelText(/activate alert/i);
      fireEvent.click(toggleButtons[1]); // Click on second alert (inactive)

      await waitFor(() => {
        expect(onToggleActive).toHaveBeenCalledWith(mockAlerts[1].id, true);
      });
    });

    it('shows loading state while toggling', async () => {
      const onToggleActive = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      render(<AlertsList alerts={mockAlerts} onToggleActive={onToggleActive} />);

      const toggleButtons = screen.getAllByLabelText(/activate alert/i);
      fireEvent.click(toggleButtons[0]);

      // Check for loading spinner - get the first button specifically
      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /deactivate alert/i });
        expect(buttons[0]).toBeDisabled();
      });
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no alerts are provided', () => {
      render(<AlertsList alerts={[]} />);

      expect(screen.getByText('No Alerts Yet')).toBeInTheDocument();
      expect(screen.getByText(/Create your first alert/)).toBeInTheDocument();
    });

    it('does not display alerts list when empty', () => {
      render(<AlertsList alerts={[]} />);

      expect(screen.queryByTestId('alerts-list')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('displays skeleton loaders when loading', () => {
      render(<AlertsList alerts={[]} isLoading={true} />);

      // Check for loading animation
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('does not display alerts when loading', () => {
      render(<AlertsList alerts={mockAlerts} isLoading={true} />);

      expect(screen.queryByText('Delhi')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', () => {
      render(<AlertsList alerts={mockAlerts} onEdit={jest.fn()} onDelete={jest.fn()} />);

      expect(screen.getAllByLabelText('Edit alert')).toHaveLength(3);
      expect(screen.getAllByLabelText('Delete alert')).toHaveLength(3);
      expect(screen.getAllByLabelText(/activate alert/i)).toHaveLength(3);
    });

    it('has proper test IDs for testing', () => {
      render(<AlertsList alerts={mockAlerts} />);

      expect(screen.getByTestId('alerts-list')).toBeInTheDocument();
      expect(screen.getAllByTestId('alert-item')).toHaveLength(3);
      expect(screen.getAllByTestId('alert-status-indicator')).toHaveLength(3);
      expect(screen.getAllByTestId('alert-status-badge')).toHaveLength(3);
    });
  });

  describe('Styling', () => {
    it('applies glassmorphic styling to alert cards', () => {
      render(<AlertsList alerts={mockAlerts} />);

      const alertItems = screen.getAllByTestId('alert-item');
      alertItems.forEach(item => {
        expect(item).toHaveClass('bg-white/10');
        expect(item).toHaveClass('backdrop-blur-glass');
        expect(item).toHaveClass('border');
        expect(item).toHaveClass('border-white/18');
      });
    });

    it('applies hover effects to alert cards', () => {
      render(<AlertsList alerts={mockAlerts} />);

      const alertItems = screen.getAllByTestId('alert-item');
      alertItems.forEach(item => {
        expect(item).toHaveClass('hover:bg-white/15');
        expect(item).toHaveClass('hover:shadow-level2');
      });
    });

    it('applies custom className', () => {
      const { container } = render(<AlertsList alerts={mockAlerts} className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

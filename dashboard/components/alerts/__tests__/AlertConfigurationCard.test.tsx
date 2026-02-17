import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AlertConfigurationCard } from '../AlertConfigurationCard';
import type { LocationInfo, CreateAlertRequest } from '@/lib/api/types';

// Mock the LocationSelector component
jest.mock('@/components/common/LocationSelector', () => ({
  LocationSelector: ({ currentLocation, onLocationChange }: any) => (
    <div data-testid="location-selector">
      <span>{currentLocation.name}</span>
      <button onClick={() => onLocationChange({ ...currentLocation, name: 'Mumbai' })}>
        Change Location
      </button>
    </div>
  ),
}));

describe('AlertConfigurationCard', () => {
  const mockLocation: LocationInfo = {
    id: 'delhi-1',
    name: 'Delhi',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.2090,
  };

  const mockFavorites: LocationInfo[] = [
    mockLocation,
    {
      id: 'mumbai-1',
      name: 'Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      latitude: 19.0760,
      longitude: 72.8777,
    },
  ];

  describe('Rendering', () => {
    it('renders the configuration card with all elements', () => {
      render(<AlertConfigurationCard initialLocation={mockLocation} />);

      // Check header
      expect(screen.getByText('Configure Alert')).toBeInTheDocument();
      expect(screen.getByText('Set up notifications for air quality changes')).toBeInTheDocument();

      // Check location selector
      expect(screen.getByTestId('location-selector')).toBeInTheDocument();

      // Check threshold slider
      expect(screen.getByLabelText(/AQI threshold slider/i)).toBeInTheDocument();
      expect(screen.getByText(/AQI Threshold:/i)).toBeInTheDocument();

      // Check condition buttons
      expect(screen.getByText('Above Threshold')).toBeInTheDocument();
      expect(screen.getByText('Below Threshold')).toBeInTheDocument();

      // Check notification channels
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByText('Push Notification')).toBeInTheDocument();

      // Check action button
      expect(screen.getByText('Create Alert')).toBeInTheDocument();
    });

    it('renders with default location when not provided', () => {
      render(<AlertConfigurationCard />);
      
      expect(screen.getByTestId('location-selector')).toBeInTheDocument();
      expect(screen.getByText('Delhi')).toBeInTheDocument();
    });

    it('renders cancel button when onCancel is provided', () => {
      const mockCancel = jest.fn();
      render(<AlertConfigurationCard onCancel={mockCancel} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('does not render cancel button when onCancel is not provided', () => {
      render(<AlertConfigurationCard />);

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });

  describe('Threshold Slider', () => {
    it('displays default threshold value of 150', () => {
      render(<AlertConfigurationCard />);

      const slider = screen.getByLabelText(/AQI threshold slider/i) as HTMLInputElement;
      expect(slider.value).toBe('150');
      expect(screen.getByText(/AQI Threshold: 150/i)).toBeInTheDocument();
    });

    it('updates threshold value when slider is moved', () => {
      render(<AlertConfigurationCard />);

      const slider = screen.getByLabelText(/AQI threshold slider/i) as HTMLInputElement;
      
      fireEvent.change(slider, { target: { value: '200' } });

      expect(slider.value).toBe('200');
      expect(screen.getByText(/AQI Threshold: 200/i)).toBeInTheDocument();
    });

    it('displays correct AQI category for threshold value', () => {
      render(<AlertConfigurationCard />);

      const slider = screen.getByLabelText(/AQI threshold slider/i);

      // Test Good (0-50)
      fireEvent.change(slider, { target: { value: '30' } });
      expect(screen.getByText('Good')).toBeInTheDocument();

      // Test Moderate (51-100)
      fireEvent.change(slider, { target: { value: '75' } });
      expect(screen.getByText('Moderate')).toBeInTheDocument();

      // Test Unhealthy for Sensitive Groups (101-150)
      fireEvent.change(slider, { target: { value: '125' } });
      expect(screen.getByText('Unhealthy for Sensitive Groups')).toBeInTheDocument();

      // Test Unhealthy (151-200)
      fireEvent.change(slider, { target: { value: '175' } });
      expect(screen.getByText('Unhealthy')).toBeInTheDocument();

      // Test Very Unhealthy (201-300)
      fireEvent.change(slider, { target: { value: '250' } });
      expect(screen.getByText('Very Unhealthy')).toBeInTheDocument();

      // Test Hazardous (301+)
      fireEvent.change(slider, { target: { value: '350' } });
      expect(screen.getByText('Hazardous')).toBeInTheDocument();
    });

    it('has correct slider attributes', () => {
      render(<AlertConfigurationCard />);

      const slider = screen.getByLabelText(/AQI threshold slider/i) as HTMLInputElement;

      expect(slider).toHaveAttribute('type', 'range');
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '500');
      expect(slider).toHaveAttribute('step', '10');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '500');
    });
  });

  describe('Condition Toggle', () => {
    it('defaults to "above" condition', () => {
      render(<AlertConfigurationCard />);

      const aboveButton = screen.getByText('Above Threshold');
      const belowButton = screen.getByText('Below Threshold');

      expect(aboveButton).toHaveAttribute('aria-pressed', 'true');
      expect(belowButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('toggles between above and below conditions', () => {
      render(<AlertConfigurationCard />);

      const aboveButton = screen.getByText('Above Threshold');
      const belowButton = screen.getByText('Below Threshold');

      // Click below button
      fireEvent.click(belowButton);
      expect(belowButton).toHaveAttribute('aria-pressed', 'true');
      expect(aboveButton).toHaveAttribute('aria-pressed', 'false');

      // Click above button
      fireEvent.click(aboveButton);
      expect(aboveButton).toHaveAttribute('aria-pressed', 'true');
      expect(belowButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('updates helper text based on condition', () => {
      render(<AlertConfigurationCard />);

      const belowButton = screen.getByText('Below Threshold');

      // Default is "above"
      expect(screen.getByText(/exceeds this value/i)).toBeInTheDocument();

      // Change to "below"
      fireEvent.click(belowButton);
      expect(screen.getByText(/falls below this value/i)).toBeInTheDocument();
    });
  });

  describe('Notification Channels', () => {
    it('defaults to email channel selected', () => {
      render(<AlertConfigurationCard />);

      const emailCheckbox = screen.getByLabelText(/Enable Email notifications/i) as HTMLInputElement;
      const smsCheckbox = screen.getByLabelText(/Enable SMS notifications/i) as HTMLInputElement;
      const pushCheckbox = screen.getByLabelText(/Enable Push Notification notifications/i) as HTMLInputElement;

      expect(emailCheckbox.checked).toBe(true);
      expect(smsCheckbox.checked).toBe(false);
      expect(pushCheckbox.checked).toBe(false);
    });

    it('toggles notification channels on click', () => {
      render(<AlertConfigurationCard />);

      const smsCheckbox = screen.getByLabelText(/Enable SMS notifications/i) as HTMLInputElement;
      const pushCheckbox = screen.getByLabelText(/Enable Push Notification notifications/i) as HTMLInputElement;

      // Add SMS
      fireEvent.click(smsCheckbox);
      expect(smsCheckbox.checked).toBe(true);

      // Add Push
      fireEvent.click(pushCheckbox);
      expect(pushCheckbox.checked).toBe(true);

      // Remove SMS
      fireEvent.click(smsCheckbox);
      expect(smsCheckbox.checked).toBe(false);
    });

    it('prevents unchecking the last selected channel', () => {
      render(<AlertConfigurationCard />);

      const emailCheckbox = screen.getByLabelText(/Enable Email notifications/i) as HTMLInputElement;

      // Try to uncheck the only selected channel
      fireEvent.click(emailCheckbox);

      // Should still be checked
      expect(emailCheckbox.checked).toBe(true);
    });

    it('allows unchecking when multiple channels are selected', () => {
      render(<AlertConfigurationCard />);

      const emailCheckbox = screen.getByLabelText(/Enable Email notifications/i) as HTMLInputElement;
      const smsCheckbox = screen.getByLabelText(/Enable SMS notifications/i) as HTMLInputElement;

      // Add SMS
      fireEvent.click(smsCheckbox);
      expect(smsCheckbox.checked).toBe(true);

      // Now uncheck email (should work since SMS is also checked)
      fireEvent.click(emailCheckbox);
      expect(emailCheckbox.checked).toBe(false);
      expect(smsCheckbox.checked).toBe(true);
    });

    it('displays all channel options with descriptions', () => {
      render(<AlertConfigurationCard />);

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Receive alerts via email')).toBeInTheDocument();

      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByText('Receive alerts via text message')).toBeInTheDocument();

      expect(screen.getByText('Push Notification')).toBeInTheDocument();
      expect(screen.getByText('Receive browser push notifications')).toBeInTheDocument();
    });
  });

  describe('Location Selection', () => {
    it('updates location when changed', () => {
      render(<AlertConfigurationCard initialLocation={mockLocation} />);

      expect(screen.getByText('Delhi')).toBeInTheDocument();

      // Click the change location button in the mocked component
      const changeButton = screen.getByText('Change Location');
      fireEvent.click(changeButton);

      expect(screen.getByText('Mumbai')).toBeInTheDocument();
    });

    it('passes favorite locations to LocationSelector', () => {
      render(
        <AlertConfigurationCard
          initialLocation={mockLocation}
          favoriteLocations={mockFavorites}
        />
      );

      expect(screen.getByTestId('location-selector')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls onCreateAlert with correct data when form is submitted', () => {
      const mockOnCreateAlert = jest.fn();
      render(
        <AlertConfigurationCard
          initialLocation={mockLocation}
          onCreateAlert={mockOnCreateAlert}
        />
      );

      // Set threshold
      const slider = screen.getByLabelText(/AQI threshold slider/i);
      fireEvent.change(slider, { target: { value: '200' } });

      // Set condition to below
      const belowButton = screen.getByText('Below Threshold');
      fireEvent.click(belowButton);

      // Add SMS channel
      const smsCheckbox = screen.getByLabelText(/Enable SMS notifications/i);
      fireEvent.click(smsCheckbox);

      // Submit form
      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      expect(mockOnCreateAlert).toHaveBeenCalledTimes(1);
      expect(mockOnCreateAlert).toHaveBeenCalledWith({
        location: 'Delhi',
        threshold: 200,
        condition: 'below',
        notificationChannels: ['email', 'sms'],
      });
    });

    it('includes updated location in submission', () => {
      const mockOnCreateAlert = jest.fn();
      render(
        <AlertConfigurationCard
          initialLocation={mockLocation}
          onCreateAlert={mockOnCreateAlert}
        />
      );

      // Change location
      const changeButton = screen.getByText('Change Location');
      fireEvent.click(changeButton);

      // Submit form
      const submitButton = screen.getByText('Create Alert');
      fireEvent.click(submitButton);

      expect(mockOnCreateAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'Mumbai',
        })
      );
    });

    it('does not call onCreateAlert when not provided', () => {
      render(<AlertConfigurationCard initialLocation={mockLocation} />);

      const submitButton = screen.getByText('Create Alert');
      
      // Should not throw error
      expect(() => fireEvent.click(submitButton)).not.toThrow();
    });
  });

  describe('Cancel Action', () => {
    it('calls onCancel when cancel button is clicked', () => {
      const mockOnCancel = jest.fn();
      render(<AlertConfigurationCard onCancel={mockOnCancel} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      render(<AlertConfigurationCard />);

      expect(screen.getByLabelText(/AQI threshold slider/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Enable Email notifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Enable SMS notifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Enable Push Notification notifications/i)).toBeInTheDocument();
    });

    it('has proper aria-pressed attributes for condition buttons', () => {
      render(<AlertConfigurationCard />);

      const aboveButton = screen.getByText('Above Threshold');
      const belowButton = screen.getByText('Below Threshold');

      expect(aboveButton).toHaveAttribute('aria-pressed');
      expect(belowButton).toHaveAttribute('aria-pressed');
    });

    it('disables last channel checkbox with proper attributes', () => {
      render(<AlertConfigurationCard />);

      const emailCheckbox = screen.getByLabelText(/Enable Email notifications/i) as HTMLInputElement;

      // Email is the only selected channel, so it should be disabled
      expect(emailCheckbox).toBeDisabled();
    });
  });

  describe('Visual Feedback', () => {
    it('displays AQI category with appropriate styling', () => {
      render(<AlertConfigurationCard />);

      const slider = screen.getByLabelText(/AQI threshold slider/i);

      // Set to hazardous level
      fireEvent.change(slider, { target: { value: '400' } });

      const categoryDisplay = screen.getByText('Hazardous');
      expect(categoryDisplay).toBeInTheDocument();
    });

    it('shows threshold markers on slider', () => {
      render(<AlertConfigurationCard />);

      // Check for threshold value labels
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
      expect(screen.getByText('300')).toBeInTheDocument();
    });
  });
});

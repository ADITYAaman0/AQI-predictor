import { render, screen, fireEvent } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import TopNavigation from '../TopNavigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

describe('TopNavigation', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the navigation component', () => {
      render(<TopNavigation />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('renders the brand/logo', () => {
      render(<TopNavigation />);
      expect(screen.getByText('AQI Dashboard')).toBeInTheDocument();
    });

    it('renders all three view segments', () => {
      render(<TopNavigation />);
      expect(screen.getByRole('tab', { name: 'Real-time' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Forecast' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Insights' })).toBeInTheDocument();
    });

    it('renders notification bell button', () => {
      render(<TopNavigation />);
      const notificationButton = screen.getByLabelText(/Notifications/);
      expect(notificationButton).toBeInTheDocument();
    });

    it('renders user profile button', () => {
      render(<TopNavigation />);
      const profileButton = screen.getByLabelText('User profile menu');
      expect(profileButton).toBeInTheDocument();
    });

    it('displays notification badge count', () => {
      render(<TopNavigation />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    it('marks Real-time as active when on home page', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      render(<TopNavigation />);
      const realTimeTab = screen.getByRole('tab', { name: 'Real-time' });
      expect(realTimeTab).toHaveAttribute('aria-selected', 'true');
    });

    it('marks Forecast as active when on forecast page', () => {
      (usePathname as jest.Mock).mockReturnValue('/forecast');
      render(<TopNavigation />);
      const forecastTab = screen.getByRole('tab', { name: 'Forecast' });
      expect(forecastTab).toHaveAttribute('aria-selected', 'true');
    });

    it('marks Insights as active when on insights page', () => {
      (usePathname as jest.Mock).mockReturnValue('/insights');
      render(<TopNavigation />);
      const insightsTab = screen.getByRole('tab', { name: 'Insights' });
      expect(insightsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('applies active styling to selected tab', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      render(<TopNavigation />);
      const realTimeTab = screen.getByRole('tab', { name: 'Real-time' });
      expect(realTimeTab).toHaveClass('bg-white/25');
    });
  });

  describe('Glassmorphic Styling', () => {
    it('applies glassmorphic background', () => {
      const { container } = render(<TopNavigation />);
      const nav = container.querySelector('nav');
      const style = nav?.getAttribute('style');
      // Check for background color (backdrop-filter may not render in JSDOM)
      expect(style).toContain('rgba(255, 255, 255, 0.15)');
    });

    it('has glass-card class', () => {
      const { container } = render(<TopNavigation />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('glass-card');
    });
  });

  describe('Interactions', () => {
    it('calls console.log when notification bell is clicked', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      render(<TopNavigation />);
      const notificationButton = screen.getByLabelText(/Notifications/);
      fireEvent.click(notificationButton);
      expect(consoleSpy).toHaveBeenCalledWith('Open notifications');
      consoleSpy.mockRestore();
    });

    it('calls console.log when user profile is clicked', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      render(<TopNavigation />);
      const profileButton = screen.getByLabelText('User profile menu');
      fireEvent.click(profileButton);
      expect(consoleSpy).toHaveBeenCalledWith('Open user profile');
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA role for navigation', () => {
      render(<TopNavigation />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('has proper ARIA role for tablist', () => {
      render(<TopNavigation />);
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Dashboard views');
    });

    it('has proper ARIA attributes for tabs', () => {
      render(<TopNavigation />);
      const realTimeTab = screen.getByRole('tab', { name: 'Real-time' });
      expect(realTimeTab).toHaveAttribute('aria-selected');
      expect(realTimeTab).toHaveAttribute('aria-controls', 'real-time-panel');
    });

    it('has descriptive aria-label for notification button', () => {
      render(<TopNavigation />);
      const notificationButton = screen.getByLabelText('Notifications (3 unread)');
      expect(notificationButton).toBeInTheDocument();
    });

    it('has aria-label for user profile button', () => {
      render(<TopNavigation />);
      const profileButton = screen.getByLabelText('User profile menu');
      expect(profileButton).toBeInTheDocument();
    });

    it('has focus-ring class on interactive elements', () => {
      render(<TopNavigation />);
      const notificationButton = screen.getByLabelText(/Notifications/);
      expect(notificationButton).toHaveClass('focus-ring');
    });
  });

  describe('Responsive Design', () => {
    it('applies fixed positioning', () => {
      const { container } = render(<TopNavigation />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('fixed', 'top-0', 'left-0', 'right-0');
    });

    it('has z-index for layering', () => {
      const { container } = render(<TopNavigation />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('z-50');
    });

    it('has responsive padding classes', () => {
      const { container } = render(<TopNavigation />);
      const innerContainer = container.querySelector('.container');
      expect(innerContainer).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
    });
  });

  describe('Custom className', () => {
    it('accepts and applies custom className', () => {
      const { container } = render(<TopNavigation className="custom-class" />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('custom-class');
    });
  });
});

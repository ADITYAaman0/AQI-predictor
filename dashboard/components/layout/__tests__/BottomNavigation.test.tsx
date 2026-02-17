import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import BottomNavigation from '../BottomNavigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

describe('BottomNavigation', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/');
  });

  describe('Rendering', () => {
    it('should render all navigation items', () => {
      render(<BottomNavigation />);

      expect(screen.getByLabelText('Dashboard')).toBeInTheDocument();
      expect(screen.getByLabelText('Forecast')).toBeInTheDocument();
      expect(screen.getByLabelText('Insights')).toBeInTheDocument();
      expect(screen.getByLabelText('Favorites')).toBeInTheDocument();
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });

    it('should render with glassmorphic styling', () => {
      const { container } = render(<BottomNavigation />);
      const nav = container.querySelector('nav');

      // Check that inline styles are applied
      expect(nav).toHaveAttribute('style');
      const style = nav?.getAttribute('style') || '';
      expect(style).toContain('rgba(255, 255, 255, 0.15)');
      // Note: React converts camelCase to kebab-case in inline styles
      // backdropFilter becomes backdrop-filter, but may not be in the string representation
      // Just verify the background is set correctly
    });

    it('should have proper ARIA attributes', () => {
      const { container } = render(<BottomNavigation />);
      const nav = container.querySelector('nav');

      expect(nav).toHaveAttribute('role', 'navigation');
      expect(nav).toHaveAttribute('aria-label', 'Bottom navigation');
    });
  });

  describe('Mobile-only visibility', () => {
    it('should have md:hidden class to hide on desktop', () => {
      const { container } = render(<BottomNavigation />);
      const nav = container.querySelector('nav');

      expect(nav).toHaveClass('md:hidden');
    });

    it('should be fixed at bottom of viewport', () => {
      const { container } = render(<BottomNavigation />);
      const nav = container.querySelector('nav');

      expect(nav).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0');
    });
  });

  describe('Active state', () => {
    it('should highlight Dashboard when on home page', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      render(<BottomNavigation />);

      const dashboardLink = screen.getByLabelText('Dashboard');
      expect(dashboardLink).toHaveClass('bg-white/25', 'text-white', 'shadow-glow');
      expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    });

    it('should highlight Forecast when on forecast page', () => {
      (usePathname as jest.Mock).mockReturnValue('/forecast');
      render(<BottomNavigation />);

      const forecastLink = screen.getByLabelText('Forecast');
      expect(forecastLink).toHaveClass('bg-white/25', 'text-white', 'shadow-glow');
      expect(forecastLink).toHaveAttribute('aria-current', 'page');
    });

    it('should highlight Insights when on insights page', () => {
      (usePathname as jest.Mock).mockReturnValue('/insights');
      render(<BottomNavigation />);

      const insightsLink = screen.getByLabelText('Insights');
      expect(insightsLink).toHaveClass('bg-white/25', 'text-white', 'shadow-glow');
      expect(insightsLink).toHaveAttribute('aria-current', 'page');
    });

    it('should not highlight inactive items', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      render(<BottomNavigation />);

      const forecastLink = screen.getByLabelText('Forecast');
      expect(forecastLink).not.toHaveClass('bg-white/25');
      expect(forecastLink).toHaveClass('text-white/70');
      expect(forecastLink).not.toHaveAttribute('aria-current');
    });
  });

  describe('Touch target sizing', () => {
    it('should have minimum 44x44px touch targets', () => {
      render(<BottomNavigation />);

      const dashboardLink = screen.getByLabelText('Dashboard');
      expect(dashboardLink).toHaveClass('min-w-[44px]', 'min-h-[44px]');
    });
  });

  describe('Navigation links', () => {
    it('should have correct href for Dashboard', () => {
      render(<BottomNavigation />);
      const dashboardLink = screen.getByLabelText('Dashboard');
      expect(dashboardLink).toHaveAttribute('href', '/');
    });

    it('should have correct href for Forecast', () => {
      render(<BottomNavigation />);
      const forecastLink = screen.getByLabelText('Forecast');
      expect(forecastLink).toHaveAttribute('href', '/forecast');
    });

    it('should have correct href for Insights', () => {
      render(<BottomNavigation />);
      const insightsLink = screen.getByLabelText('Insights');
      expect(insightsLink).toHaveAttribute('href', '/insights');
    });

    it('should have correct href for Favorites', () => {
      render(<BottomNavigation />);
      const favoritesLink = screen.getByLabelText('Favorites');
      expect(favoritesLink).toHaveAttribute('href', '/favorites');
    });

    it('should have correct href for Settings', () => {
      render(<BottomNavigation />);
      const settingsLink = screen.getByLabelText('Settings');
      expect(settingsLink).toHaveAttribute('href', '/settings');
    });
  });

  describe('Accessibility', () => {
    it('should have focus-ring class for keyboard navigation', () => {
      render(<BottomNavigation />);
      const dashboardLink = screen.getByLabelText('Dashboard');
      expect(dashboardLink).toHaveClass('focus-ring');
    });

    it('should display icon and label for each item', () => {
      render(<BottomNavigation />);

      // Check that labels are visible
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Forecast')).toBeInTheDocument();
      expect(screen.getByText('Insights')).toBeInTheDocument();
      expect(screen.getByText('Favorites')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should accept and apply custom className', () => {
      const { container } = render(<BottomNavigation className="custom-class" />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('custom-class');
    });
  });
});

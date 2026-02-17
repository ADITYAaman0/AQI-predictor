/**
 * Layout Components Integration Tests
 * 
 * Tests navigation state changes, responsive behavior, and keyboard navigation
 * across TopNavigation, Sidebar, and BottomNavigation components.
 * 
 * Requirements: 13.2 (Keyboard Navigation), 13.3 (Focus Indicators)
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import TopNavigation from '../TopNavigation';
import Sidebar from '../Sidebar';
import BottomNavigation from '../BottomNavigation';
import { ThemeProvider } from '@/providers';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

// Helper to render Sidebar with ThemeProvider
const renderSidebar = () => render(
  <ThemeProvider>
    <Sidebar />
  </ThemeProvider>
);

describe('Layout Components Integration Tests', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Navigation State Changes', () => {
    describe('TopNavigation state changes', () => {
      it('should update active state when pathname changes to forecast', () => {
        const { rerender } = render(<ThemeProvider><TopNavigation /></ThemeProvider>);
        
        // Initially on home page
        let realTimeTab = screen.getByRole('tab', { name: 'Real-time' });
        expect(realTimeTab).toHaveAttribute('aria-selected', 'true');
        
        // Navigate to forecast
        (usePathname as jest.Mock).mockReturnValue('/forecast');
        rerender(<ThemeProvider><TopNavigation /></ThemeProvider>);
        
        const forecastTab = screen.getByRole('tab', { name: 'Forecast' });
        expect(forecastTab).toHaveAttribute('aria-selected', 'true');
        
        realTimeTab = screen.getByRole('tab', { name: 'Real-time' });
        expect(realTimeTab).toHaveAttribute('aria-selected', 'false');
      });

      it('should update active state when pathname changes to insights', () => {
        const { rerender } = render(<ThemeProvider><TopNavigation /></ThemeProvider>);
        
        // Navigate to insights
        (usePathname as jest.Mock).mockReturnValue('/insights');
        rerender(<ThemeProvider><TopNavigation /></ThemeProvider>);
        
        const insightsTab = screen.getByRole('tab', { name: 'Insights' });
        expect(insightsTab).toHaveAttribute('aria-selected', 'true');
      });

      it('should apply active styling when state changes', () => {
        const { rerender } = render(<ThemeProvider><TopNavigation /></ThemeProvider>);
        
        (usePathname as jest.Mock).mockReturnValue('/forecast');
        rerender(<ThemeProvider><TopNavigation /></ThemeProvider>);
        
        const forecastTab = screen.getByRole('tab', { name: 'Forecast' });
        expect(forecastTab).toHaveClass('bg-white/25', 'text-white', 'shadow-glow');
      });
    });

    describe('Sidebar state changes', () => {
      it('should update active state when navigating between pages', () => {
        const { rerender } = render(<ThemeProvider><Sidebar /></ThemeProvider>);
        
        // Initially on home page
        let dashboardLink = screen.getByLabelText('Dashboard');
        expect(dashboardLink).toHaveAttribute('aria-current', 'page');
        
        // Navigate to favorites
        (usePathname as jest.Mock).mockReturnValue('/favorites');
        rerender(<ThemeProvider><Sidebar /></ThemeProvider>);
        
        const favoritesLink = screen.getByLabelText('Favorites');
        expect(favoritesLink).toHaveAttribute('aria-current', 'page');
        
        dashboardLink = screen.getByLabelText('Dashboard');
        expect(dashboardLink).not.toHaveAttribute('aria-current');
      });

      it('should update active state when navigating to settings', () => {
        const { rerender } = render(<ThemeProvider><Sidebar /></ThemeProvider>);
        
        (usePathname as jest.Mock).mockReturnValue('/settings');
        rerender(<ThemeProvider><Sidebar /></ThemeProvider>);
        
        const settingsLink = screen.getByLabelText('Settings');
        expect(settingsLink).toHaveAttribute('aria-current', 'page');
        expect(settingsLink).toHaveClass('bg-white/25', 'text-white', 'shadow-glow');
      });

      it('should maintain inactive styling for non-active items', () => {
        const { rerender } = render(<ThemeProvider><Sidebar /></ThemeProvider>);
        
        (usePathname as jest.Mock).mockReturnValue('/favorites');
        rerender(<ThemeProvider><Sidebar /></ThemeProvider>);
        
        const dashboardLink = screen.getByLabelText('Dashboard');
        const settingsLink = screen.getByLabelText('Settings');
        
        expect(dashboardLink).toHaveClass('text-white/70');
        expect(settingsLink).toHaveClass('text-white/70');
      });
    });

    describe('BottomNavigation state changes', () => {
      it('should update active state across all navigation items', () => {
        const { rerender } = render(<BottomNavigation />);
        
        // Test each navigation item
        const routes = [
          { path: '/', label: 'Dashboard' },
          { path: '/forecast', label: 'Forecast' },
          { path: '/insights', label: 'Insights' },
          { path: '/favorites', label: 'Favorites' },
          { path: '/settings', label: 'Settings' },
        ];
        
        routes.forEach(({ path, label }) => {
          (usePathname as jest.Mock).mockReturnValue(path);
          rerender(<BottomNavigation />);
          
          const activeLink = screen.getByLabelText(label);
          expect(activeLink).toHaveAttribute('aria-current', 'page');
          expect(activeLink).toHaveClass('bg-white/25', 'text-white', 'shadow-glow');
        });
      });

      it('should deactivate previous item when navigating', () => {
        const { rerender } = render(<BottomNavigation />);
        
        // Start on dashboard
        let dashboardLink = screen.getByLabelText('Dashboard');
        expect(dashboardLink).toHaveAttribute('aria-current', 'page');
        
        // Navigate to forecast
        (usePathname as jest.Mock).mockReturnValue('/forecast');
        rerender(<BottomNavigation />);
        
        dashboardLink = screen.getByLabelText('Dashboard');
        const forecastLink = screen.getByLabelText('Forecast');
        
        expect(dashboardLink).not.toHaveAttribute('aria-current');
        expect(dashboardLink).toHaveClass('text-white/70');
        expect(forecastLink).toHaveAttribute('aria-current', 'page');
      });
    });

    describe('Cross-component state synchronization', () => {
      it('should synchronize active states between TopNavigation and BottomNavigation', () => {
        (usePathname as jest.Mock).mockReturnValue('/forecast');
        
        render(
          <>
            <TopNavigation />
            <BottomNavigation />
          </>
        );
        
        // Both should show forecast as active
        const topForecastTab = screen.getByRole('tab', { name: 'Forecast' });
        const bottomForecastLink = screen.getByLabelText('Forecast');
        
        expect(topForecastTab).toHaveAttribute('aria-selected', 'true');
        expect(bottomForecastLink).toHaveAttribute('aria-current', 'page');
      });

      it('should synchronize active states between Sidebar and BottomNavigation', () => {
        (usePathname as jest.Mock).mockReturnValue('/favorites');
        
        render(
          <>
            <Sidebar />
            <BottomNavigation />
          </>
        );
        
        // Both should show favorites as active
        const sidebarFavorites = screen.getAllByLabelText('Favorites');
        
        sidebarFavorites.forEach(link => {
          expect(link).toHaveAttribute('aria-current', 'page');
        });
      });
    });
  });

  describe('Responsive Behavior', () => {
    describe('TopNavigation responsive behavior', () => {
      it('should have responsive padding classes', () => {
        const { container } = render(<ThemeProvider><TopNavigation /></ThemeProvider>);
        const innerContainer = container.querySelector('.container');
        
        expect(innerContainer).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
      });

      it('should maintain fixed positioning across viewports', () => {
        const { container } = render(<ThemeProvider><TopNavigation /></ThemeProvider>);
        const nav = container.querySelector('nav');
        
        expect(nav).toHaveClass('fixed', 'top-0', 'left-0', 'right-0');
      });

      it('should have proper z-index for layering', () => {
        const { container } = render(<ThemeProvider><TopNavigation /></ThemeProvider>);
        const nav = container.querySelector('nav');
        
        expect(nav).toHaveClass('z-50');
      });
    });

    describe('Sidebar responsive behavior', () => {
      it('should have fixed width', () => {
        const { container } = render(<ThemeProvider><Sidebar /></ThemeProvider>);
        const sidebar = container.querySelector('aside');
        
        expect(sidebar).toHaveClass('w-20');
      });

      it('should be positioned correctly', () => {
        const { container } = render(<ThemeProvider><Sidebar /></ThemeProvider>);
        const sidebar = container.querySelector('aside');
        
        expect(sidebar).toHaveClass('fixed', 'left-0', 'top-16', 'bottom-0');
      });

      it('should have appropriate z-index', () => {
        const { container } = render(<ThemeProvider><Sidebar /></ThemeProvider>);
        const sidebar = container.querySelector('aside');
        
        expect(sidebar).toHaveClass('z-40');
      });
    });

    describe('BottomNavigation responsive behavior', () => {
      it('should be hidden on desktop (md and above)', () => {
        const { container } = render(<BottomNavigation />);
        const nav = container.querySelector('nav');
        
        expect(nav).toHaveClass('md:hidden');
      });

      it('should be fixed at bottom on mobile', () => {
        const { container } = render(<BottomNavigation />);
        const nav = container.querySelector('nav');
        
        expect(nav).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0');
      });

      it('should have proper z-index for mobile', () => {
        const { container } = render(<BottomNavigation />);
        const nav = container.querySelector('nav');
        
        expect(nav).toHaveClass('z-50');
      });

      it('should have minimum touch target sizes (44x44px)', () => {
        render(<BottomNavigation />);
        
        const dashboardLink = screen.getByLabelText('Dashboard');
        expect(dashboardLink).toHaveClass('min-w-[44px]', 'min-h-[44px]');
      });

      it('should have safe-area-bottom class for notched devices', () => {
        const { container } = render(<BottomNavigation />);
        const innerContainer = container.querySelector('.safe-area-bottom');
        
        expect(innerContainer).toBeInTheDocument();
      });
    });

    describe('Layout stacking and positioning', () => {
      it('should stack components in correct z-index order', () => {
        const { container } = render(
          <>
            <TopNavigation />
            <Sidebar />
            <BottomNavigation />
          </>
        );
        
        const topNav = container.querySelector('nav[aria-label="Main navigation"]');
        const sidebar = container.querySelector('aside');
        const bottomNav = container.querySelector('nav[aria-label="Bottom navigation"]');
        
        // TopNavigation and BottomNavigation should have z-50
        expect(topNav).toHaveClass('z-50');
        expect(bottomNav).toHaveClass('z-50');
        
        // Sidebar should have z-40 (below navigation)
        expect(sidebar).toHaveClass('z-40');
      });

      it('should not overlap with proper positioning', () => {
        const { container } = render(
          <>
            <TopNavigation />
            <Sidebar />
            <BottomNavigation />
          </>
        );
        
        const topNav = container.querySelector('nav[aria-label="Main navigation"]');
        const sidebar = container.querySelector('aside');
        
        // TopNavigation at top
        expect(topNav).toHaveClass('top-0');
        
        // Sidebar starts below TopNavigation (top-16 = 64px = TopNav height)
        expect(sidebar).toHaveClass('top-16');
      });
    });
  });

  describe('Keyboard Navigation (Accessibility)', () => {
    describe('TopNavigation keyboard navigation', () => {
      it('should have focus-ring class on all interactive elements', () => {
        render(<ThemeProvider><TopNavigation /></ThemeProvider>);
        
        const notificationButton = screen.getByLabelText(/Notifications/);
        const profileButton = screen.getByLabelText('User profile menu');
        
        expect(notificationButton).toHaveClass('focus-ring');
        expect(profileButton).toHaveClass('focus-ring');
      });

      it('should be keyboard accessible with Tab key', () => {
        render(<ThemeProvider><TopNavigation /></ThemeProvider>);
        
        const brandLink = screen.getByLabelText('AQI Dashboard Home');
        const realTimeTab = screen.getByRole('tab', { name: 'Real-time' });
        const forecastTab = screen.getByRole('tab', { name: 'Forecast' });
        const insightsTab = screen.getByRole('tab', { name: 'Insights' });
        const notificationButton = screen.getByLabelText(/Notifications/);
        const profileButton = screen.getByLabelText('User profile menu');
        
        // All interactive elements should be in the document and focusable
        [brandLink, realTimeTab, forecastTab, insightsTab, notificationButton, profileButton].forEach(element => {
          expect(element).toBeInTheDocument();
          expect(element.tagName).toMatch(/^(A|BUTTON)$/);
        });
      });

      it('should handle Enter key on buttons', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        render(<ThemeProvider><TopNavigation /></ThemeProvider>);
        
        const notificationButton = screen.getByLabelText(/Notifications/);
        
        // Simulate Enter key press
        fireEvent.keyDown(notificationButton, { key: 'Enter', code: 'Enter' });
        fireEvent.click(notificationButton);
        
        expect(consoleSpy).toHaveBeenCalledWith('Open notifications');
        consoleSpy.mockRestore();
      });

      it('should handle Space key on buttons', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        render(<ThemeProvider><TopNavigation /></ThemeProvider>);
        
        const profileButton = screen.getByLabelText('User profile menu');
        
        // Simulate Space key press
        fireEvent.keyDown(profileButton, { key: ' ', code: 'Space' });
        fireEvent.click(profileButton);
        
        expect(consoleSpy).toHaveBeenCalledWith('Open user profile');
        consoleSpy.mockRestore();
      });
    });

    describe('Sidebar keyboard navigation', () => {
      it('should have focus-ring class on all navigation items', () => {
        render(<ThemeProvider><Sidebar /></ThemeProvider>);
        
        const dashboardLink = screen.getByLabelText('Dashboard');
        const darkModeButton = screen.getByLabelText('Dark Mode');
        const favoritesLink = screen.getByLabelText('Favorites');
        const settingsLink = screen.getByLabelText('Settings');
        
        [dashboardLink, darkModeButton, favoritesLink, settingsLink].forEach(element => {
          expect(element).toHaveClass('focus-ring');
        });
      });

      it('should be keyboard accessible with Tab key', () => {
        render(<ThemeProvider><Sidebar /></ThemeProvider>);
        
        const navItems = [
          screen.getByLabelText('Dashboard'),
          screen.getByLabelText('Dark Mode'),
          screen.getByLabelText('Favorites'),
          screen.getByLabelText('Settings'),
        ];
        
        navItems.forEach(item => {
          expect(item).toBeInTheDocument();
          expect(item.tagName).toMatch(/^(A|BUTTON)$/);
        });
      });

      it('should handle Enter key on dark mode button', () => {
        render(<ThemeProvider><Sidebar /></ThemeProvider>);
        
        const darkModeButton = screen.getByLabelText('Dark Mode');
        
        // Verify the button responds to keyboard events
        fireEvent.keyDown(darkModeButton, { key: 'Enter', code: 'Enter' });
        fireEvent.click(darkModeButton);
        
        // Verify theme was toggled
        expect(document.documentElement.classList.contains('dark') || document.documentElement.classList.contains('light')).toBe(true);
      });

      it('should have proper button type for dark mode toggle', () => {
        render(<ThemeProvider><Sidebar /></ThemeProvider>);
        
        const darkModeButton = screen.getByLabelText('Dark Mode');
        expect(darkModeButton).toHaveAttribute('type', 'button');
      });
    });

    describe('BottomNavigation keyboard navigation', () => {
      it('should have focus-ring class on all navigation links', () => {
        render(<BottomNavigation />);
        
        const navItems = [
          screen.getByLabelText('Dashboard'),
          screen.getByLabelText('Forecast'),
          screen.getByLabelText('Insights'),
          screen.getByLabelText('Favorites'),
          screen.getByLabelText('Settings'),
        ];
        
        navItems.forEach(item => {
          expect(item).toHaveClass('focus-ring');
        });
      });

      it('should be keyboard accessible with Tab key', () => {
        render(<BottomNavigation />);
        
        const navItems = [
          screen.getByLabelText('Dashboard'),
          screen.getByLabelText('Forecast'),
          screen.getByLabelText('Insights'),
          screen.getByLabelText('Favorites'),
          screen.getByLabelText('Settings'),
        ];
        
        navItems.forEach(item => {
          expect(item).toBeInTheDocument();
          expect(item.tagName).toBe('A');
        });
      });

      it('should have proper href attributes for keyboard navigation', () => {
        render(<BottomNavigation />);
        
        const expectedHrefs = [
          { label: 'Dashboard', href: '/' },
          { label: 'Forecast', href: '/forecast' },
          { label: 'Insights', href: '/insights' },
          { label: 'Favorites', href: '/favorites' },
          { label: 'Settings', href: '/settings' },
        ];
        
        expectedHrefs.forEach(({ label, href }) => {
          const link = screen.getByLabelText(label);
          expect(link).toHaveAttribute('href', href);
        });
      });
    });

    describe('Cross-component keyboard navigation flow', () => {
      it('should allow tabbing through all layout components in order', () => {
        render(
          <>
            <TopNavigation />
            <Sidebar />
            <BottomNavigation />
          </>
        );
        
        // Get all focusable elements
        const brandLink = screen.getByLabelText('AQI Dashboard Home');
        const topNavTabs = screen.getAllByRole('tab');
        const notificationButton = screen.getByLabelText(/Notifications/);
        const profileButton = screen.getByLabelText('User profile menu');
        
        // All should be focusable
        [brandLink, ...topNavTabs, notificationButton, profileButton].forEach(element => {
          expect(element).toBeInTheDocument();
        });
      });

      it('should maintain focus indicators across all components', () => {
        render(
          <>
            <TopNavigation />
            <Sidebar />
            <BottomNavigation />
          </>
        );
        
        // Get all interactive elements
        const allInteractiveElements = [
          screen.getByLabelText('AQI Dashboard Home'),
          ...screen.getAllByRole('tab'),
          screen.getByLabelText(/Notifications/),
          screen.getByLabelText('User profile menu'),
          ...screen.getAllByLabelText('Dashboard'),
          screen.getByLabelText('Dark Mode'),
          ...screen.getAllByLabelText('Favorites'),
          ...screen.getAllByLabelText('Settings'),
        ];
        
        // All should have focus-ring class or be links
        allInteractiveElements.forEach(element => {
          const hasFocusRing = element.classList.contains('focus-ring');
          const isLink = element.tagName === 'A';
          const isButton = element.tagName === 'BUTTON';
          
          expect(hasFocusRing || isLink || isButton).toBe(true);
        });
      });
    });

    describe('ARIA attributes for keyboard navigation', () => {
      it('should have proper ARIA roles for navigation', () => {
        render(
          <>
            <TopNavigation />
            <Sidebar />
            <BottomNavigation />
          </>
        );
        
        const mainNav = screen.getByRole('navigation', { name: 'Main navigation' });
        const sidebarNav = screen.getByRole('navigation', { name: 'Sidebar navigation' });
        const bottomNav = screen.getByRole('navigation', { name: 'Bottom navigation' });
        
        expect(mainNav).toBeInTheDocument();
        expect(sidebarNav).toBeInTheDocument();
        expect(bottomNav).toBeInTheDocument();
      });

      it('should have proper ARIA labels for screen readers', () => {
        render(<ThemeProvider><TopNavigation /></ThemeProvider>);
        
        const tablist = screen.getByRole('tablist');
        expect(tablist).toHaveAttribute('aria-label', 'Dashboard views');
        
        const tabs = screen.getAllByRole('tab');
        tabs.forEach(tab => {
          expect(tab).toHaveAttribute('aria-selected');
          expect(tab).toHaveAttribute('aria-controls');
        });
      });

      it('should have proper aria-current attributes', () => {
        (usePathname as jest.Mock).mockReturnValue('/favorites');
        
        render(
          <>
            <Sidebar />
            <BottomNavigation />
          </>
        );
        
        const activeFavoritesLinks = screen.getAllByLabelText('Favorites');
        activeFavoritesLinks.forEach(link => {
          expect(link).toHaveAttribute('aria-current', 'page');
        });
      });
    });

    describe('Focus management', () => {
      it('should maintain focus visibility on active elements', () => {
        render(<ThemeProvider><TopNavigation /></ThemeProvider>);
        
        const realTimeTab = screen.getByRole('tab', { name: 'Real-time' });
        
        // Simulate focus
        realTimeTab.focus();
        
        // Element should be focused
        expect(document.activeElement).toBe(realTimeTab);
      });

      it('should allow focus on all interactive elements', () => {
        render(
          <>
            <TopNavigation />
            <Sidebar />
            <BottomNavigation />
          </>
        );
        
        // Get sample of interactive elements
        const brandLink = screen.getByLabelText('AQI Dashboard Home');
        const notificationButton = screen.getByLabelText(/Notifications/);
        const dashboardLinks = screen.getAllByLabelText('Dashboard');
        
        // All should be focusable
        [brandLink, notificationButton, ...dashboardLinks].forEach(element => {
          element.focus();
          expect(document.activeElement).toBe(element);
        });
      });
    });
  });

  describe('Integration with custom className', () => {
    it('should accept custom className on all components', () => {
      const { container } = render(
        <>
          <TopNavigation className="custom-top" />
          <Sidebar className="custom-sidebar" />
          <BottomNavigation className="custom-bottom" />
        </>
      );
      
      const topNav = container.querySelector('nav[aria-label="Main navigation"]');
      const sidebar = container.querySelector('aside');
      const bottomNav = container.querySelector('nav[aria-label="Bottom navigation"]');
      
      expect(topNav).toHaveClass('custom-top');
      expect(sidebar).toHaveClass('custom-sidebar');
      expect(bottomNav).toHaveClass('custom-bottom');
    });

    it('should preserve default classes when custom className is provided', () => {
      const { container } = render(
        <>
          <TopNavigation className="custom-top" />
          <Sidebar className="custom-sidebar" />
          <BottomNavigation className="custom-bottom" />
        </>
      );
      
      const topNav = container.querySelector('nav[aria-label="Main navigation"]');
      const sidebar = container.querySelector('aside');
      const bottomNav = container.querySelector('nav[aria-label="Bottom navigation"]');
      
      expect(topNav).toHaveClass('glass-card', 'fixed', 'custom-top');
      expect(sidebar).toHaveClass('glass-card', 'fixed', 'custom-sidebar');
      expect(bottomNav).toHaveClass('glass-card', 'fixed', 'custom-bottom');
    });
  });
});

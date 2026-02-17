import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import Sidebar from '../Sidebar';
import { ThemeProvider } from '@/providers';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

describe('Sidebar Component', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the sidebar navigation', () => {
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const nav = screen.getByRole('navigation', { name: /sidebar navigation/i });
      expect(nav).toBeInTheDocument();
    });

    it('should render all navigation items', () => {
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      expect(screen.getByLabelText('Dashboard')).toBeInTheDocument();
      expect(screen.getByLabelText('Dark Mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Favorites')).toBeInTheDocument();
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });

    it('should render navigation icons', () => {
      const { container } = render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Active State', () => {
    it('should highlight Dashboard when on home page', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const dashboardLink = screen.getByLabelText('Dashboard');
      expect(dashboardLink).toHaveAttribute('aria-current', 'page');
      expect(dashboardLink).toHaveClass('bg-white/25');
    });

    it('should highlight Favorites when on favorites page', () => {
      (usePathname as jest.Mock).mockReturnValue('/favorites');
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const favoritesLink = screen.getByLabelText('Favorites');
      expect(favoritesLink).toHaveAttribute('aria-current', 'page');
      expect(favoritesLink).toHaveClass('bg-white/25');
    });

    it('should highlight Settings when on settings page', () => {
      (usePathname as jest.Mock).mockReturnValue('/settings');
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const settingsLink = screen.getByLabelText('Settings');
      expect(settingsLink).toHaveAttribute('aria-current', 'page');
      expect(settingsLink).toHaveClass('bg-white/25');
    });

    it('should not highlight inactive items', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const favoritesLink = screen.getByLabelText('Favorites');
      const settingsLink = screen.getByLabelText('Settings');
      
      expect(favoritesLink).not.toHaveAttribute('aria-current');
      expect(settingsLink).not.toHaveAttribute('aria-current');
      expect(favoritesLink).toHaveClass('text-white/70');
      expect(settingsLink).toHaveClass('text-white/70');
    });
  });

  describe('Styling', () => {
    it('should apply glassmorphic styling', () => {
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const sidebar = screen.getByRole('navigation', { name: /sidebar navigation/i });
      expect(sidebar).toHaveClass('glass-card');
    });

    it('should have fixed positioning', () => {
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const sidebar = screen.getByRole('navigation', { name: /sidebar navigation/i });
      expect(sidebar).toHaveClass('fixed');
    });

    it('should apply active state styling with glow', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const dashboardLink = screen.getByLabelText('Dashboard');
      expect(dashboardLink).toHaveClass('bg-white/25', 'text-white', 'shadow-glow');
    });

    it('should apply inactive state styling', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const favoritesLink = screen.getByLabelText('Favorites');
      expect(favoritesLink).toHaveClass('text-white/70');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      expect(screen.getByLabelText('Dashboard')).toBeInTheDocument();
      expect(screen.getByLabelText('Dark Mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Favorites')).toBeInTheDocument();
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });

    it('should have aria-current on active item', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const dashboardLink = screen.getByLabelText('Dashboard');
      expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    });

    it('should have title attributes for tooltips', () => {
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      expect(screen.getByLabelText('Dashboard')).toHaveAttribute('title', 'Dashboard');
      expect(screen.getByLabelText('Dark Mode')).toHaveAttribute('title', 'Dark Mode');
      expect(screen.getByLabelText('Favorites')).toHaveAttribute('title', 'Favorites');
      expect(screen.getByLabelText('Settings')).toHaveAttribute('title', 'Settings');
    });

    it('should have focus-ring class for keyboard navigation', () => {
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const dashboardLink = screen.getByLabelText('Dashboard');
      expect(dashboardLink).toHaveClass('focus-ring');
    });

    it('should hide icons from screen readers', () => {
      const { container } = render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const icons = container.querySelectorAll('svg');
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Navigation', () => {
    it('should render Dashboard as a link', () => {
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const dashboardLink = screen.getByLabelText('Dashboard');
      expect(dashboardLink).toHaveAttribute('href', '/');
    });

    it('should render Favorites as a link', () => {
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const favoritesLink = screen.getByLabelText('Favorites');
      expect(favoritesLink).toHaveAttribute('href', '/favorites');
    });

    it('should render Settings as a link', () => {
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const settingsLink = screen.getByLabelText('Settings');
      expect(settingsLink).toHaveAttribute('href', '/settings');
    });

    it('should render Dark Mode as a button', () => {
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const darkModeButton = screen.getByLabelText('Dark Mode');
      expect(darkModeButton.tagName).toBe('BUTTON');
      expect(darkModeButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Custom className', () => {
    it('should accept and apply custom className', () => {
      render(<Sidebar className="custom-class" />);
      
      const sidebar = screen.getByRole('navigation', { name: /sidebar navigation/i });
      expect(sidebar).toHaveClass('custom-class');
    });

    it('should preserve default classes when custom className is provided', () => {
      render(<Sidebar className="custom-class" />);
      
      const sidebar = screen.getByRole('navigation', { name: /sidebar navigation/i });
      expect(sidebar).toHaveClass('glass-card', 'fixed', 'custom-class');
    });
  });

  describe('Layout', () => {
    it('should have correct width', () => {
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const sidebar = screen.getByRole('navigation', { name: /sidebar navigation/i });
      expect(sidebar).toHaveClass('w-20');
    });

    it('should be positioned on the left', () => {
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const sidebar = screen.getByRole('navigation', { name: /sidebar navigation/i });
      expect(sidebar).toHaveClass('left-0');
    });

    it('should span from top to bottom', () => {
      render(<ThemeProvider><Sidebar /></ThemeProvider>);
      
      const sidebar = screen.getByRole('navigation', { name: /sidebar navigation/i });
      expect(sidebar).toHaveClass('top-16', 'bottom-0');
    });
  });
});

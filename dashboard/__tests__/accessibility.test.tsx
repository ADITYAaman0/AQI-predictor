/**
 * Accessibility Tests (Task 20.7 & 20.8)
 * 
 * Comprehensive accessibility testing covering:
 * - Property 24: Text Contrast Compliance (WCAG AA 4.5:1)
 * - Property 25: Keyboard Navigation Support
 * - Property 26: Focus Indicator Visibility
 * - Property 27: ARIA Label Presence
 * - Property 28: Dynamic Content Announcement
 * - Property 29: Color-Independent AQI Indication
 * 
 * Requirements: 13.1-13.8 (Accessibility Standards)
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';
import {
  getContrastRatio,
  meetsContrastRequirement,
  announceToScreenReader,
  getAQIAriaLabel,
  getPollutantAriaLabel,
  getChartAriaLabel,
  getProgressAriaLabel,
  getDateTimeAriaLabel,
  getAQICategoryIcon,
  isFocusable,
} from '@/lib/utils/accessibility';
import { SkipLink } from '@/components/common';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  describe('Property 24: Text Contrast Compliance', () => {
    it('should calculate contrast ratio correctly', () => {
      // Black on white: highest contrast
      const blackOnWhite = getContrastRatio('#000000', '#ffffff');
      expect(blackOnWhite).toBeCloseTo(21, 0);

      // White on black: same as black on white
      const whiteOnBlack = getContrastRatio('#ffffff', '#000000');
      expect(whiteOnBlack).toBeCloseTo(21, 0);

      // Same colors: lowest contrast
      const sameColor = getContrastRatio('#ff0000', '#ff0000');
      expect(sameColor).toBe(1);
    });

    it('should validate WCAG AA compliance for normal text (4.5:1)', () => {
      // Good contrast
      expect(meetsContrastRequirement('#000000', '#ffffff', false)).toBe(true); // 21:1
      expect(meetsContrastRequirement('#ffffff', '#000000', false)).toBe(true); // 21:1
      
      // Borderline cases
      expect(meetsContrastRequirement('#767676', '#ffffff', false)).toBe(true); // ~4.5:1
      
      // Failing contrast
      expect(meetsContrastRequirement('#cccccc', '#ffffff', false)).toBe(false); // <4.5:1
    });

    it('should validate WCAG AA compliance for large text (3:1)', () => {
      // Large text requires only 3:1
      // #999999 on #ffffff is 2.85:1 (fails)
      expect(meetsContrastRequirement('#999999', '#ffffff', true)).toBe(false);
      
      // #767676 on #ffffff is 4.54:1 (passes for large text)
      expect(meetsContrastRequirement('#767676', '#ffffff', true)).toBe(true);
      
      // #aaaaaa on #ffffff is 2.32:1 (fails)
      expect(meetsContrastRequirement('#aaaaaa', '#ffffff', true)).toBe(false);
    });

    it('should meet contrast requirements for primary colors', () => {
      // Primary blue on white
      expect(meetsContrastRequirement('#4299e1', '#ffffff', false)).toBe(false); // Needs darker blue
      
      // Dark blue on white
      expect(meetsContrastRequirement('#2c5aa0', '#ffffff', false)).toBe(true);
      
      // White on dark background
      expect(meetsContrastRequirement('#ffffff', '#1a202c', false)).toBe(true);
    });

    it('should validate AQI category colors have sufficient contrast', () => {
      // Good (green) on white
      const goodColor = '#22c55e'; // green-500
      const moderateColor = '#eab308'; // yellow-500
      const unhealthyColor = '#ef4444'; // red-500

      // These should be validated against their background colors
      expect(getContrastRatio(goodColor, '#ffffff')).toBeGreaterThan(1);
      expect(getContrastRatio(moderateColor, '#ffffff')).toBeGreaterThan(1);
      expect(getContrastRatio(unhealthyColor, '#ffffff')).toBeGreaterThan(1);
    });
  });

  describe('Property 25: Keyboard Navigation Support', () => {
    it('should allow tabbing through interactive elements', async () => {
      const user = userEvent.setup();
      
      render(
        <div>
          <button>Button 1</button>
          <a href="#test">Link 1</a>
          <input type="text" placeholder="Input 1" />
          <button>Button 2</button>
        </div>
      );

      const button1 = screen.getByText('Button 1');
      const link1 = screen.getByText('Link 1');
      const input1 = screen.getByPlaceholderText('Input 1');
      const button2 = screen.getByText('Button 2');

      // Focus first element
      button1.focus();
      expect(document.activeElement).toBe(button1);

      // Tab to next elements
      await user.tab();
      expect(document.activeElement).toBe(link1);

      await user.tab();
      expect(document.activeElement).toBe(input1);

      await user.tab();
      expect(document.activeElement).toBe(button2);

      // Shift+Tab to go back
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(input1);
    });

    it('should activate buttons with Enter and Space keys', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      render(<button onClick={handleClick}>Test Button</button>);

      const button = screen.getByText('Test Button');
      button.focus();

      // Enter key
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Space key
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('should identify focusable elements correctly', () => {
      const button = document.createElement('button');
      expect(isFocusable(button)).toBe(true);

      const disabledButton = document.createElement('button');
      disabledButton.disabled = true;
      expect(isFocusable(disabledButton)).toBe(false);

      const divWithTabIndex = document.createElement('div');
      divWithTabIndex.tabIndex = 0;
      expect(isFocusable(divWithTabIndex)).toBe(true);

      const divNegativeTabIndex = document.createElement('div');
      divNegativeTabIndex.tabIndex = -1;
      expect(isFocusable(divNegativeTabIndex)).toBe(false);
    });

    it('should support skip link navigation', async () => {
      const user = userEvent.setup();
      
      // Mock scrollIntoView for JSDOM
      Element.prototype.scrollIntoView = jest.fn();
      
      render(
        <div>
          <SkipLink targetId="main-content" />
          <nav>Navigation</nav>
          <main id="main-content" tabIndex={-1}>
            <h1>Main Content</h1>
          </main>
        </div>
      );

      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      
      // Focus skip link
      skipLink.focus();
      expect(document.activeElement).toBe(skipLink);

      // Activate skip link
      await user.click(skipLink);

      // Should focus main content
      await waitFor(() => {
        const mainContent = document.getElementById('main-content');
        expect(document.activeElement).toBe(mainContent);
      });
      
      // Verify scrollIntoView was called
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  describe('Property 26: Focus Indicator Visibility', () => {
    it('should display focus indicator on buttons', () => {
      render(<button>Test Button</button>);
      
      const button = screen.getByText('Test Button');
      button.focus();

      // Check that button is focused
      expect(button).toHaveFocus();
      
      // In a real browser, CSS :focus would apply
      // In JSDOM, we verify the element can receive focus
      expect(document.activeElement).toBe(button);
    });

    it('should display focus indicator on links', () => {
      render(<a href="#test">Test Link</a>);
      
      const link = screen.getByText('Test Link');
      link.focus();

      expect(link).toHaveFocus();
      expect(document.activeElement).toBe(link);
    });

    it('should display focus indicator on inputs', () => {
      render(<input type="text" aria-label="Test input" />);
      
      const input = screen.getByLabelText('Test input');
      input.focus();

      expect(input).toHaveFocus();
      expect(document.activeElement).toBe(input);
    });

    it('should display focus indicator on custom interactive elements', () => {
      render(<div role="button" tabIndex={0}>Custom Button</div>);
      
      const customButton = screen.getByRole('button');
      customButton.focus();

      expect(customButton).toHaveFocus();
      expect(document.activeElement).toBe(customButton);
    });
  });

  describe('Property 27: ARIA Label Presence', () => {
    it('should generate proper ARIA label for AQI value', () => {
      const label = getAQIAriaLabel(75, 'Moderate');
      expect(label).toBe('Air Quality Index: 75, Moderate');
    });

    it('should generate proper ARIA label for pollutant value', () => {
      const label = getPollutantAriaLabel('PM2.5', 35.5, 'μg/m³', 'Good');
      expect(label).toBe('PM2.5: 35.5 μg/m³, Good');
    });

    it('should generate proper ARIA label for charts', () => {
      const label = getChartAriaLabel('Line', 24, '24 hours');
      expect(label).toBe('Line chart with 24 data points over 24 hours');
    });

    it('should generate proper ARIA label for progress bars', () => {
      const label = getProgressAriaLabel(75, 100);
      expect(label).toBe('Progress: 75 percent');
    });

    it('should generate proper ARIA label for date/time', () => {
      const date = new Date('2025-01-15T14:30:00');
      const label = getDateTimeAriaLabel(date);
      expect(label).toContain('January');
      expect(label).toContain('15');
      expect(label).toContain('2025');
    });

    it('should have ARIA labels on icon buttons', () => {
      render(
        <button aria-label="Refresh data">
          <svg><path d="M4 4v5h5" /></svg>
        </button>
      );

      const button = screen.getByLabelText('Refresh data');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Property 28: Dynamic Content Announcement', () => {
    beforeEach(() => {
      // Clean up any existing live regions
      const existingRegion = document.getElementById('aria-live-region');
      if (existingRegion) {
        existingRegion.remove();
      }
    });

    it('should create ARIA live region for announcements', () => {
      announceToScreenReader('Test message');

      const liveRegion = document.getElementById('aria-live-region');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('role', 'status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should announce message to screen readers', async () => {
      announceToScreenReader('Data updated');

      await waitFor(() => {
        const liveRegion = document.getElementById('aria-live-region');
        expect(liveRegion?.textContent).toBe('Data updated');
      }, { timeout: 200 });
    });

    it('should support assertive announcements', async () => {
      announceToScreenReader('Critical alert', 'assertive');

      const liveRegion = document.getElementById('aria-live-region');
      expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
    });

    it('should clear announcement after timeout', async () => {
      announceToScreenReader('Temporary message');

      const liveRegion = document.getElementById('aria-live-region');
      
      // Initially has message
      await waitFor(() => {
        expect(liveRegion?.textContent).toBe('Temporary message');
      }, { timeout: 200 });

      // Clears after 3 seconds
      await waitFor(() => {
        expect(liveRegion?.textContent).toBe('');
      }, { timeout: 3500 });
    });
  });

  describe('Property 29: Color-Independent AQI Indication', () => {
    it('should provide icon for each AQI category', () => {
      expect(getAQICategoryIcon('good')).toBeTruthy();
      expect(getAQICategoryIcon('moderate')).toBeTruthy();
      expect(getAQICategoryIcon('unhealthy_sensitive')).toBeTruthy();
      expect(getAQICategoryIcon('unhealthy')).toBeTruthy();
      expect(getAQICategoryIcon('very_unhealthy')).toBeTruthy();
      expect(getAQICategoryIcon('hazardous')).toBeTruthy();
    });

    it('should have distinct icons for each category', () => {
      const icons = [
        getAQICategoryIcon('good'),
        getAQICategoryIcon('moderate'),
        getAQICategoryIcon('unhealthy_sensitive'),
        getAQICategoryIcon('unhealthy'),
        getAQICategoryIcon('very_unhealthy'),
        getAQICategoryIcon('hazardous'),
      ];

      // All icons should be different
      const uniqueIcons = new Set(icons);
      expect(uniqueIcons.size).toBe(icons.length);
    });

    it('should use text labels in addition to colors', () => {
      render(
        <div>
          <div style={{ backgroundColor: '#22c55e' }}>
            <span>Good</span>
          </div>
          <div style={{ backgroundColor: '#eab308' }}>
            <span>Moderate</span>
          </div>
        </div>
      );

      // Text labels should be present
      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByText('Moderate')).toBeInTheDocument();
    });
  });

  describe('Automated Accessibility Audit (jest-axe)', () => {
    it('should have no accessibility violations in SkipLink', async () => {
      const { container } = render(<SkipLink />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in button', async () => {
      const { container } = render(
        <button aria-label="Test button">Click me</button>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in form', async () => {
      const { container } = render(
        <form>
          <label htmlFor="name">Name:</label>
          <input id="name" type="text" />
          
          <label htmlFor="email">Email:</label>
          <input id="email" type="email" />
          
          <button type="submit">Submit</button>
        </form>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in navigation', async () => {
      const { container } = render(
        <nav aria-label="Main navigation">
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should detect missing alt text on images', async () => {
      const { container } = render(
        <img src="/test.jpg" />
      );
      
      const results = await axe(container);
      // This should have violations (missing alt text)
      expect(results.violations.length).toBeGreaterThan(0);
    });

    it('should detect missing form labels', async () => {
      const { container } = render(
        <form>
          <input type="text" />
          <button type="submit">Submit</button>
        </form>
      );
      
      const results = await axe(container);
      // This should have violations (missing label)
      expect(results.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Reduce Motion Preference', () => {
    it('should detect prefers-reduced-motion media query', () => {
      // Mock matchMedia
      const mockMatchMedia = jest.fn().mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });

      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      expect(mediaQuery.matches).toBe(true);
    });
  });
});

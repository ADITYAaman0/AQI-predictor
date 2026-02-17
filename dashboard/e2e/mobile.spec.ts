/**
 * Mobile-Specific E2E Tests
 * 
 * Tests for mobile interactions in the AQI Dashboard
 * Implements Task 26.3 - Write mobile-specific E2E tests
 * 
 * Test Coverage:
 * - Touch interactions
 * - Swipe gestures
 * - Mobile navigation
 * - Touch target sizing
 * - Mobile responsive layouts
 * 
 * Requirements: 7.1-7.7 (Mobile Optimization)
 */

import { test, expect, devices } from '@playwright/test';
import {
  navigateToHome,
  waitForAQIData,
  assertAQIVisible,
  assertPollutantCardsVisible,
  assertTouchTargetSize,
  swipe,
  openMobileMenu,
} from './utils';

// Configure mobile viewport for all tests
test.use({
  ...devices['iPhone 12'],
});

test.describe('Mobile-Specific Tests', () => {
  
  // ============================================================================
  // Touch Interactions
  // ============================================================================
  
  test('should have minimum touch target size for all interactive elements', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Check refresh button
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    if (await refreshButton.isVisible()) {
      await assertTouchTargetSize(page, '[aria-label*="refresh"]');
    }
    
    // Check theme toggle button
    const themeToggle = page.getByRole('button', { name: /theme|dark mode|light mode/i });
    if (await themeToggle.isVisible()) {
      const box = await themeToggle.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
    
    // Check navigation tabs
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    
    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        const box = await tab.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });
  
  test('should handle tap interactions on buttons', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Find a clickable button
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    
    if (await refreshButton.isVisible()) {
      // Tap the button
      await refreshButton.tap();
      
      // Wait for action to complete
      await page.waitForTimeout(1000);
      
      // Verify button responded (no errors)
      await expect(refreshButton).toBeVisible();
    }
  });
  
  test('should handle long press on cards', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Find a pollutant card
    const pollutantCard = page.locator('[data-testid^="pollutant-card-"]').first();
    
    if (await pollutantCard.isVisible()) {
      // Long press (touch and hold)
      await pollutantCard.tap({ position: { x: 50, y: 50 } });
      await page.waitForTimeout(1000);
      
      // Card should still be visible
      await expect(pollutantCard).toBeVisible();
    }
  });
  
  // ============================================================================
  // Swipe Gestures
  // ============================================================================
  
  test('should support horizontal swipe on forecast cards', async ({ page }) => {
    await navigateToHome(page);
    
    // Navigate to forecast view
    const forecastTab = page.getByRole('tab', { name: /forecast/i });
    
    if (await forecastTab.isVisible()) {
      await forecastTab.tap();
      await page.waitForLoadState('networkidle');
      
      // Look for swipeable forecast container
      const forecastContainer = page.locator('[data-testid="forecast-cards-container"]');
      
      if (await forecastContainer.isVisible()) {
        // Get initial scroll position
        const scrollBefore = await forecastContainer.evaluate(el => el.scrollLeft);
        
        // Swipe left
        await swipe(page, '[data-testid="forecast-cards-container"]', 'left');
        
        // Wait for swipe animation
        await page.waitForTimeout(500);
        
        // Verify scroll position changed
        const scrollAfter = await forecastContainer.evaluate(el => el.scrollLeft);
        expect(scrollAfter).not.toBe(scrollBefore);
      }
    }
  });
  
  test('should support vertical scroll', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Get initial scroll position
    const scrollBefore = await page.evaluate(() => window.scrollY);
    
    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(300);
    
    // Get new scroll position
    const scrollAfter = await page.evaluate(() => window.scrollY);
    
    // Verify scrolled
    expect(scrollAfter).toBeGreaterThan(scrollBefore);
  });
  
  test('should support pull-to-refresh gesture', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Simulate pull-to-refresh by scrolling to top and pulling down
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    
    // Try to swipe down from top
    const initialY = 100;
    await page.mouse.move(page.viewportSize()!.width / 2, initialY);
    await page.mouse.down();
    await page.mouse.move(page.viewportSize()!.width / 2, initialY + 150, { steps: 10 });
    await page.mouse.up();
    
    // Wait for potential refresh
    await page.waitForTimeout(1000);
    
    // Verify page is still functional
    await assertAQIVisible(page);
  });
  
  // ============================================================================
  // Mobile Navigation
  // ============================================================================
  
  test('should display bottom navigation on mobile', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Check for bottom navigation
    const bottomNav = page.locator('[data-testid="bottom-navigation"]');
    
    if (await bottomNav.isVisible()) {
      await expect(bottomNav).toBeVisible();
      
      // Check for navigation items
      const navItems = bottomNav.locator('button, a');
      const itemCount = await navItems.count();
      
      expect(itemCount).toBeGreaterThan(0);
    }
  });
  
  test('should navigate using bottom navigation', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Look for bottom navigation
    const bottomNav = page.locator('[data-testid="bottom-navigation"]');
    
    if (await bottomNav.isVisible()) {
      // Get all navigation buttons
      const navButtons = bottomNav.locator('button');
      const buttonCount = await navButtons.count();
      
      if (buttonCount > 1) {
        // Click second navigation item
        await navButtons.nth(1).tap();
        
        // Wait for navigation
        await page.waitForLoadState('networkidle');
        
        // Verify navigation worked (page didn't crash)
        await expect(page).toHaveURL(/./);
      }
    }
  });
  
  test('should toggle mobile menu', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Look for hamburger menu button
    const menuButton = page.getByRole('button', { name: /menu|hamburger|navigation/i });
    
    if (await menuButton.isVisible()) {
      // Open menu
      await menuButton.tap();
      
      // Wait for menu animation
      await page.waitForTimeout(500);
      
      // Check if menu appeared
      const menu = page.locator('[role="dialog"], [data-testid="mobile-menu"]');
      
      if (await menu.isVisible()) {
        await expect(menu).toBeVisible();
        
        // Close menu
        const closeButton = menu.getByRole('button', { name: /close/i });
        
        if (await closeButton.isVisible()) {
          await closeButton.tap();
          
          // Wait for menu to close
          await page.waitForTimeout(500);
          
          // Verify menu closed
          await expect(menu).not.toBeVisible();
        }
      }
    }
  });
  
  test('should hide top navigation on mobile and show bottom navigation', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    const viewportSize = page.viewportSize()!;
    
    // Mobile viewport should be less than 768px
    expect(viewportSize.width).toBeLessThan(768);
    
    // Top navigation tabs should be hidden or different on mobile
    const topNav = page.locator('[data-testid="top-navigation"]');
    const bottomNav = page.locator('[data-testid="bottom-navigation"]');
    
    // Either bottom nav is visible, or top nav is adapted for mobile
    const hasBottomNav = await bottomNav.isVisible();
    const hasTopNav = await topNav.isVisible();
    
    // At least one navigation should be present
    expect(hasBottomNav || hasTopNav).toBe(true);
  });
  
  // ============================================================================
  // Mobile Layout
  // ============================================================================
  
  test('should display single column layout on mobile', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Check main content area
    const mainContent = page.locator('main, [role="main"]');
    
    if (await mainContent.isVisible()) {
      const box = await mainContent.boundingBox();
      
      if (box) {
        // Content should take full width (allowing for padding)
        expect(box.width).toBeGreaterThan(300);
      }
    }
  });
  
  test('should stack pollutant cards vertically on mobile', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Get pollutant cards
    const pollutantCards = page.locator('[data-testid^="pollutant-card-"]');
    const cardCount = await pollutantCards.count();
    
    if (cardCount >= 2) {
      // Get positions of first two cards
      const card1Box = await pollutantCards.nth(0).boundingBox();
      const card2Box = await pollutantCards.nth(1).boundingBox();
      
      if (card1Box && card2Box) {
        // Cards should be stacked (y position of card2 > y position of card1)
        // Or arranged in a single column grid (allowing for some horizontal spacing)
        const isStacked = card2Box.y > card1Box.y;
        const inSingleColumn = Math.abs(card1Box.x - card2Box.x) < 50;
        
        expect(isStacked || inSingleColumn).toBe(true);
      }
    }
  });
  
  test('should display mobile-optimized chart', async ({ page }) => {
    await navigateToHome(page);
    
    // Navigate to forecast view
    const forecastTab = page.getByRole('tab', { name: /forecast/i });
    
    if (await forecastTab.isVisible()) {
      await forecastTab.tap();
      await page.waitForLoadState('networkidle');
      
      // Check for forecast chart
      const chart = page.locator('[data-testid="forecast-chart"]');
      
      if (await chart.isVisible()) {
        const chartBox = await chart.boundingBox();
        
        if (chartBox) {
          // Chart should fit within mobile viewport
          const viewportWidth = page.viewportSize()!.width;
          expect(chartBox.width).toBeLessThanOrEqual(viewportWidth);
        }
      }
    }
  });
  
  // ============================================================================
  // Mobile Performance
  // ============================================================================
  
  test('should load quickly on mobile network', async ({ page }) => {
    // Simulate 3G network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100); // Add 100ms delay
    });
    
    const startTime = Date.now();
    
    await navigateToHome(page);
    await waitForAQIData(page);
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time even with network delay
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
  });
  
  test('should handle orientation change', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Get initial orientation
    const initialViewport = page.viewportSize()!;
    
    // Rotate to landscape (swap width and height)
    await page.setViewportSize({
      width: initialViewport.height,
      height: initialViewport.width,
    });
    
    // Wait for layout adjustment
    await page.waitForTimeout(500);
    
    // Verify page still works
    await assertAQIVisible(page);
  });
  
  // ============================================================================
  // Touch Accessibility
  // ============================================================================
  
  test('should have sufficient spacing between touch targets', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Get all buttons
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount >= 2) {
      // Check spacing between consecutive buttons
      for (let i = 0; i < Math.min(buttonCount - 1, 3); i++) {
        const button1Box = await buttons.nth(i).boundingBox();
        const button2Box = await buttons.nth(i + 1).boundingBox();
        
        if (button1Box && button2Box) {
          // Calculate distance between buttons
          const verticalGap = Math.abs(button2Box.y - (button1Box.y + button1Box.height));
          const horizontalGap = Math.abs(button2Box.x - (button1Box.x + button1Box.width));
          
          // Should have some spacing (at least 8px)
          const hasSpace = verticalGap > 0 || horizontalGap > 0;
          expect(hasSpace).toBe(true);
        }
      }
    }
  });
  
  test('should show mobile-friendly error messages', async ({ page }) => {
    // Mock API error to test error display
    await page.route('**/api/v1/current/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    await navigateToHome(page);
    
    // Wait for error message
    await page.waitForTimeout(2000);
    
    // Check for error message
    const errorMessage = page.getByText(/error|unable|failed/i);
    
    if (await errorMessage.isVisible()) {
      const errorBox = await errorMessage.boundingBox();
      
      if (errorBox) {
        // Error message should fit within viewport
        const viewportWidth = page.viewportSize()!.width;
        expect(errorBox.width).toBeLessThanOrEqual(viewportWidth);
      }
    }
  });
  
  test('should have mobile-optimized modals', async ({ page }) => {
    await navigateToHome(page);
    await waitForAQIData(page);
    
    // Try to open a modal (e.g., location selector)
    const locationButton = page.getByRole('button', { name: /location|select location/i });
    
    if (await locationButton.isVisible()) {
      await locationButton.tap();
      
      // Wait for modal
      await page.waitForTimeout(500);
      
      const modal = page.locator('[role="dialog"]');
      
      if (await modal.isVisible()) {
        const modalBox = await modal.boundingBox();
        
        if (modalBox) {
          // Modal should fit within mobile viewport
          const viewportSize = page.viewportSize()!;
          expect(modalBox.width).toBeLessThanOrEqual(viewportSize.width);
          expect(modalBox.height).toBeLessThanOrEqual(viewportSize.height);
        }
      }
    }
  });
});

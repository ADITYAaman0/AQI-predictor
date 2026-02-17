/**
 * Property-Based Tests for Mobile Responsiveness
 * 
 * Property 11: Mobile Responsiveness
 * For any screen size below 768px, the Leaflet Frontend should adapt control panels 
 * to touch-friendly layouts, reorganize UI elements to prevent overlap, and optimize 
 * marker clustering for mobile viewport sizes.
 * 
 * Validates: Requirements 5.1, 5.2, 5.4
 */

import mobileResponsive from '../js/utils/mobile-responsive.js';

// Test utilities
const TestUtils = {
    /**
     * Simulate viewport resize
     */
    simulateViewportResize(width, height) {
        // Store original values
        const originalInnerWidth = window.innerWidth;
        const originalInnerHeight = window.innerHeight;
        
        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: width
        });
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: height
        });
        
        // Trigger resize detection
        mobileResponsive.detectDevice();
        
        // Restore original values
        return () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: originalInnerWidth
            });
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                configurable: true,
                value: originalInnerHeight
            });
            mobileResponsive.detectDevice();
        };
    },

    /**
     * Check if element has touch-friendly sizing
     */
    isTouchFriendly(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        const minTouchTarget = 40; // Minimum recommended touch target size
        
        return rect.width >= minTouchTarget && rect.height >= minTouchTarget;
    },

    /**
     * Check if elements overlap
     */
    elementsOverlap(elem1, elem2) {
        if (!elem1 || !elem2) return false;
        
        const rect1 = elem1.getBoundingClientRect();
        const rect2 = elem2.getBoundingClientRect();
        
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    },

    /**
     * Get all interactive elements
     */
    getInteractiveElements() {
        return Array.from(document.querySelectorAll(
            'button, a, input, select, textarea, [role="button"]'
        ));
    },

    /**
     * Check if control panel is properly positioned for mobile
     */
    isControlPanelMobileOptimized() {
        const controlPanel = document.querySelector('.control-panel');
        if (!controlPanel) return false;
        
        const styles = window.getComputedStyle(controlPanel);
        const position = styles.position;
        
        // On mobile, control panel should be fixed at bottom
        if (mobileResponsive.isMobileDevice()) {
            return position === 'fixed' && 
                   (styles.bottom === '0px' || parseInt(styles.bottom) >= 0);
        }
        
        return true;
    }
};

// Property Test Suite
const MobileResponsivenessTests = {
    /**
     * Property 11.1: Touch-Friendly Layouts Below 768px
     * For any screen width below 768px, all interactive elements should have 
     * minimum touch-friendly dimensions (40x40px minimum)
     */
    testTouchFriendlyLayouts() {
        console.log('\n=== Property 11.1: Touch-Friendly Layouts ===');
        
        const testCases = [
            { width: 320, height: 568, name: 'iPhone SE' },
            { width: 375, height: 667, name: 'iPhone 8' },
            { width: 414, height: 896, name: 'iPhone 11' },
            { width: 768, height: 1024, name: 'iPad Portrait' },
            { width: 360, height: 640, name: 'Android Small' },
            { width: 412, height: 915, name: 'Android Large' }
        ];
        
        let passed = 0;
        let failed = 0;
        const failures = [];
        
        testCases.forEach(testCase => {
            const restore = TestUtils.simulateViewportResize(testCase.width, testCase.height);
            
            try {
                // Check if device is correctly detected as mobile/tablet
                const isMobileViewport = testCase.width <= 768;
                const detectedAsMobile = mobileResponsive.isMobileDevice();
                
                if (isMobileViewport && !detectedAsMobile) {
                    failures.push(`${testCase.name}: Not detected as mobile device`);
                    failed++;
                    restore();
                    return;
                }
                
                // Check interactive elements for touch-friendly sizing
                const interactiveElements = TestUtils.getInteractiveElements();
                const nonTouchFriendly = interactiveElements.filter(elem => {
                    return !TestUtils.isTouchFriendly(elem);
                });
                
                if (isMobileViewport && nonTouchFriendly.length > 0) {
                    failures.push(
                        `${testCase.name}: ${nonTouchFriendly.length} elements not touch-friendly`
                    );
                    failed++;
                } else {
                    passed++;
                }
                
            } catch (error) {
                failures.push(`${testCase.name}: ${error.message}`);
                failed++;
            } finally {
                restore();
            }
        });
        
        console.log(`Passed: ${passed}/${testCases.length}`);
        console.log(`Failed: ${failed}/${testCases.length}`);
        
        if (failures.length > 0) {
            console.log('Failures:');
            failures.forEach(f => console.log(`  - ${f}`));
        }
        
        return {
            passed,
            failed,
            total: testCases.length,
            failures,
            success: failed === 0
        };
    },

    /**
     * Property 11.2: UI Element Reorganization
     * For any screen width below 768px, UI elements should be reorganized 
     * to prevent overlap
     */
    testUIElementReorganization() {
        console.log('\n=== Property 11.2: UI Element Reorganization ===');
        
        const testCases = [
            { width: 320, height: 568, name: 'Very Small' },
            { width: 480, height: 800, name: 'Small Mobile' },
            { width: 768, height: 1024, name: 'Tablet' }
        ];
        
        let passed = 0;
        let failed = 0;
        const failures = [];
        
        testCases.forEach(testCase => {
            const restore = TestUtils.simulateViewportResize(testCase.width, testCase.height);
            
            try {
                // Check control panel positioning
                const controlPanelOptimized = TestUtils.isControlPanelMobileOptimized();
                
                if (!controlPanelOptimized) {
                    failures.push(`${testCase.name}: Control panel not optimized for mobile`);
                    failed++;
                    restore();
                    return;
                }
                
                // Check for overlapping elements
                const interactiveElements = TestUtils.getInteractiveElements();
                let hasOverlap = false;
                
                for (let i = 0; i < interactiveElements.length; i++) {
                    for (let j = i + 1; j < interactiveElements.length; j++) {
                        if (TestUtils.elementsOverlap(interactiveElements[i], interactiveElements[j])) {
                            hasOverlap = true;
                            break;
                        }
                    }
                    if (hasOverlap) break;
                }
                
                if (hasOverlap) {
                    failures.push(`${testCase.name}: UI elements overlap`);
                    failed++;
                } else {
                    passed++;
                }
                
            } catch (error) {
                failures.push(`${testCase.name}: ${error.message}`);
                failed++;
            } finally {
                restore();
            }
        });
        
        console.log(`Passed: ${passed}/${testCases.length}`);
        console.log(`Failed: ${failed}/${testCases.length}`);
        
        if (failures.length > 0) {
            console.log('Failures:');
            failures.forEach(f => console.log(`  - ${f}`));
        }
        
        return {
            passed,
            failed,
            total: testCases.length,
            failures,
            success: failed === 0
        };
    },

    /**
     * Property 11.3: Marker Clustering Optimization
     * For any mobile viewport size, marker clustering should be optimized 
     * with appropriate cluster radius and max zoom settings
     */
    testMarkerClusteringOptimization() {
        console.log('\n=== Property 11.3: Marker Clustering Optimization ===');
        
        const testCases = [
            { width: 320, height: 568, name: 'Mobile Small', expectedRadius: 60, expectedMaxZoom: 14 },
            { width: 480, height: 800, name: 'Mobile Large', expectedRadius: 60, expectedMaxZoom: 14 },
            { width: 768, height: 1024, name: 'Tablet', expectedRadius: 50, expectedMaxZoom: 15 },
            { width: 1024, height: 768, name: 'Desktop', expectedRadius: 40, expectedMaxZoom: 16 }
        ];
        
        let passed = 0;
        let failed = 0;
        const failures = [];
        
        testCases.forEach(testCase => {
            const restore = TestUtils.simulateViewportResize(testCase.width, testCase.height);
            
            try {
                const clusterRadius = mobileResponsive.getOptimalClusterRadius();
                const clusterMaxZoom = mobileResponsive.getOptimalClusterMaxZoom();
                
                // Verify cluster radius is optimized for viewport
                if (clusterRadius !== testCase.expectedRadius) {
                    failures.push(
                        `${testCase.name}: Expected cluster radius ${testCase.expectedRadius}, got ${clusterRadius}`
                    );
                    failed++;
                    restore();
                    return;
                }
                
                // Verify max zoom is optimized for viewport
                if (clusterMaxZoom !== testCase.expectedMaxZoom) {
                    failures.push(
                        `${testCase.name}: Expected max zoom ${testCase.expectedMaxZoom}, got ${clusterMaxZoom}`
                    );
                    failed++;
                    restore();
                    return;
                }
                
                passed++;
                
            } catch (error) {
                failures.push(`${testCase.name}: ${error.message}`);
                failed++;
            } finally {
                restore();
            }
        });
        
        console.log(`Passed: ${passed}/${testCases.length}`);
        console.log(`Failed: ${failed}/${testCases.length}`);
        
        if (failures.length > 0) {
            console.log('Failures:');
            failures.forEach(f => console.log(`  - ${f}`));
        }
        
        return {
            passed,
            failed,
            total: testCases.length,
            failures,
            success: failed === 0
        };
    },

    /**
     * Property 11.4: Viewport Detection Accuracy
     * For any viewport size, the system should correctly detect device type 
     * and apply appropriate optimizations
     */
    testViewportDetectionAccuracy() {
        console.log('\n=== Property 11.4: Viewport Detection Accuracy ===');
        
        const testCases = [
            { width: 320, height: 568, expectedMobile: true, expectedTablet: false, name: 'Mobile 320' },
            { width: 480, height: 800, expectedMobile: true, expectedTablet: false, name: 'Mobile 480' },
            { width: 600, height: 1024, expectedMobile: false, expectedTablet: true, name: 'Tablet 600' },
            { width: 768, height: 1024, expectedMobile: false, expectedTablet: true, name: 'Tablet 768' },
            { width: 1024, height: 768, expectedMobile: false, expectedTablet: false, name: 'Desktop' }
        ];
        
        let passed = 0;
        let failed = 0;
        const failures = [];
        
        testCases.forEach(testCase => {
            const restore = TestUtils.simulateViewportResize(testCase.width, testCase.height);
            
            try {
                const deviceInfo = mobileResponsive.getDeviceInfo();
                
                if (deviceInfo.isMobile !== testCase.expectedMobile) {
                    failures.push(
                        `${testCase.name}: Expected mobile=${testCase.expectedMobile}, got ${deviceInfo.isMobile}`
                    );
                    failed++;
                    restore();
                    return;
                }
                
                if (deviceInfo.isTablet !== testCase.expectedTablet) {
                    failures.push(
                        `${testCase.name}: Expected tablet=${testCase.expectedTablet}, got ${deviceInfo.isTablet}`
                    );
                    failed++;
                    restore();
                    return;
                }
                
                passed++;
                
            } catch (error) {
                failures.push(`${testCase.name}: ${error.message}`);
                failed++;
            } finally {
                restore();
            }
        });
        
        console.log(`Passed: ${passed}/${testCases.length}`);
        console.log(`Failed: ${failed}/${testCases.length}`);
        
        if (failures.length > 0) {
            console.log('Failures:');
            failures.forEach(f => console.log(`  - ${f}`));
        }
        
        return {
            passed,
            failed,
            total: testCases.length,
            failures,
            success: failed === 0
        };
    },

    /**
     * Run all mobile responsiveness property tests
     */
    runAll() {
        console.log('========================================');
        console.log('Mobile Responsiveness Property Tests');
        console.log('Property 11: Mobile Responsiveness');
        console.log('Validates: Requirements 5.1, 5.2, 5.4');
        console.log('========================================');
        
        const results = {
            touchFriendly: this.testTouchFriendlyLayouts(),
            uiReorganization: this.testUIElementReorganization(),
            clusterOptimization: this.testMarkerClusteringOptimization(),
            viewportDetection: this.testViewportDetectionAccuracy()
        };
        
        const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
        const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
        const totalTests = Object.values(results).reduce((sum, r) => sum + r.total, 0);
        const allSuccess = Object.values(results).every(r => r.success);
        
        console.log('\n========================================');
        console.log('Overall Results');
        console.log('========================================');
        console.log(`Total Passed: ${totalPassed}/${totalTests}`);
        console.log(`Total Failed: ${totalFailed}/${totalTests}`);
        console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
        console.log(`Overall Status: ${allSuccess ? 'PASSED ✓' : 'FAILED ✗'}`);
        
        return {
            results,
            summary: {
                totalPassed,
                totalFailed,
                totalTests,
                successRate: (totalPassed / totalTests) * 100,
                allSuccess
            }
        };
    }
};

// Export for use in test runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileResponsivenessTests;
}

// Auto-run if loaded directly
if (typeof window !== 'undefined' && window.location.pathname.includes('test-runner')) {
    window.MobileResponsivenessTests = MobileResponsivenessTests;
}

export default MobileResponsivenessTests;

/**
 * Test runner for Animation Property-Based Tests
 * Executes Property 7: Animation Smoothness tests
 */

import { runAnimationTests } from './test-animation-properties.js';

// Run tests when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await runAnimationTests();
    });
} else {
    runAnimationTests();
}

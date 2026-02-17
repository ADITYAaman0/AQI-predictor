/**
 * Comprehensive Test Runner for All Frontend Property-Based Tests
 * Executes all property tests for the Leaflet Integration
 */

// Mock browser globals for Node.js environment BEFORE any imports
global.window = {
    location: {
        hostname: 'localhost',
        port: '8080',
        pathname: '/test-runner.html',
        protocol: 'http:'
    },
    localStorage: {
        data: {},
        getItem(key) {
            return this.data[key] || null;
        },
        setItem(key, value) {
            this.data[key] = String(value);
        },
        removeItem(key) {
            delete this.data[key];
        },
        clear() {
            this.data = {};
        }
    },
    addEventListener(event, handler) {
        // Mock event listener
    },
    removeEventListener(event, handler) {
        // Mock event listener removal
    },
    dispatchEvent(event) {
        // Mock event dispatching
        return true;
    },
    CustomEvent: class CustomEvent {
        constructor(type, options) {
            this.type = type;
            this.detail = options?.detail;
        }
    },
    innerWidth: 1024,
    innerHeight: 768,
    matchMedia(query) {
        return {
            matches: false,
            media: query,
            addEventListener() {},
            removeEventListener() {}
        };
    }
};

// Mock document for DOM-dependent tests
global.document = {
    createElement(tag) {
        return {
            tagName: tag.toUpperCase(),
            style: {},
            classList: {
                add() {},
                remove() {},
                contains() { return false; }
            },
            setAttribute() {},
            getAttribute() { return null; },
            appendChild() {},
            removeChild() {},
            addEventListener() {},
            removeEventListener() {},
            innerHTML: '',
            textContent: '',
            children: [],
            parentNode: null
        };
    },
    getElementById(id) {
        return this.createElement('div');
    },
    querySelector(selector) {
        return this.createElement('div');
    },
    querySelectorAll(selector) {
        return [];
    },
    body: {
        appendChild() {},
        removeChild() {},
        children: [],
        classList: {
            add() {},
            remove() {},
            contains() { return false; }
        }
    },
    addEventListener() {},
    removeEventListener() {}
};

global.fetch = async (url, options) => {
    // Mock fetch for testing
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
            get: (name) => {
                if (name === 'content-type') return 'application/json';
                if (name === 'x-ratelimit-remaining') return '100';
                if (name === 'x-ratelimit-limit') return '100';
                return null;
            }
        },
        json: async () => ({ mock: 'response', data: [] })
    };
};

global.URLSearchParams = class URLSearchParams {
    constructor() {
        this.params = new Map();
    }
    
    append(key, value) {
        this.params.set(key, value);
    }
    
    toString() {
        const pairs = [];
        for (const [key, value] of this.params) {
            pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
        return pairs.join('&');
    }
};

global.URL = class URL {
    constructor(url) {
        this.href = url;
        this.pathname = url.split('?')[0].replace(/^https?:\/\/[^\/]+/, '');
        this.search = url.includes('?') ? '?' + url.split('?')[1] : '';
    }
};

global.AbortController = class AbortController {
    constructor() {
        this.signal = { aborted: false };
    }
    
    abort() {
        this.signal.aborted = true;
    }
};

global.setTimeout = setTimeout;
global.clearTimeout = clearTimeout;
global.setInterval = setInterval;
global.clearInterval = clearInterval;

/**
 * Run all frontend property-based tests
 */
async function runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     Leaflet Integration - Comprehensive Test Suite        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // Dynamic imports after global mocks are set up
    const { runAPIRouterTests } = await import('./test-api-router-properties.js');
    const DataTransformerModule = await import('./test-data-transformer-properties.js');
    const DataTransformerPropertyTests = DataTransformerModule.default;
    const { runAuthManagerTests } = await import('./test-auth-manager-properties.js');
    const { runSecurityComplianceTests } = await import('./test-security-compliance-properties.js');
    const { runVisualizationTests } = await import('./test-visualization-properties.js');
    const { runPerformanceTests } = await import('./test-performance-properties.js');
    const { runCachingOfflineTests } = await import('./test-caching-offline-properties.js');
    const { runAnimationTests } = await import('./test-animation-properties.js');
    const { runFilteringTests } = await import('./test-filtering-properties.js');
    
    /**
     * Wrapper for Data Transformer tests
     */
    async function runDataTransformerTests() {
        const tester = new DataTransformerPropertyTests();
        const results = await tester.runAllTests();
        return results.overallSuccess;
    }
    
    const testSuites = [
        { name: 'API Router (Property 1)', runner: runAPIRouterTests, task: '2.2' },
        { name: 'Data Transformer (Property 2)', runner: runDataTransformerTests, task: '2.4' },
        { name: 'Auth Manager (Property 3)', runner: runAuthManagerTests, task: '3.2' },
        { name: 'Security Compliance (Properties 14, 15)', runner: runSecurityComplianceTests, task: '3.4' },
        { name: 'Visualization (Properties 8, 9)', runner: runVisualizationTests, task: '5.2, 5.4' },
        { name: 'Performance (Property 4)', runner: runPerformanceTests, task: '6.2' },
        { name: 'Caching & Offline (Properties 5, 6, 13, 18)', runner: runCachingOfflineTests, task: '6.4' },
        { name: 'Animation (Property 7)', runner: runAnimationTests, task: '7.2' },
        { name: 'Filtering (Property 10)', runner: runFilteringTests, task: '7.4' }
    ];
    
    const results = [];
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const suite of testSuites) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📋 Running: ${suite.name} (Task ${suite.task})`);
        console.log('='.repeat(60));
        
        try {
            const success = await suite.runner();
            results.push({
                name: suite.name,
                task: suite.task,
                success,
                error: null
            });
            
            if (success) {
                totalPassed++;
                console.log(`✅ ${suite.name} - PASSED`);
            } else {
                totalFailed++;
                console.log(`❌ ${suite.name} - FAILED`);
            }
        } catch (error) {
            totalFailed++;
            results.push({
                name: suite.name,
                task: suite.task,
                success: false,
                error: error.message
            });
            console.error(`💥 ${suite.name} - ERROR: ${error.message}`);
        }
    }
    
    // Print summary
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log(`Total Test Suites: ${testSuites.length}`);
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}\n`);
    
    // Detailed results
    console.log('Detailed Results:');
    console.log('-'.repeat(60));
    results.forEach((result, index) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${index + 1}. ${status} - ${result.name} (Task ${result.task})`);
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    });
    
    console.log('\n' + '='.repeat(60));
    
    const allPassed = totalFailed === 0;
    if (allPassed) {
        console.log('🎉 ALL TESTS PASSED! Frontend functionality is ready.');
    } else {
        console.log('⚠️  Some tests failed. Review the output above for details.');
    }
    
    return allPassed;
}

// Execute if run directly
runAllTests()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Test runner crashed:', error);
        console.error(error.stack);
        process.exit(1);
    });

export { runAllTests };


/**
 * Node.js test runner for API Router property tests
 * Simulates browser environment for testing
 */

// Mock browser globals for Node.js environment
global.window = {
    location: {
        hostname: 'localhost',
        port: '8080',
        pathname: '/test-runner.html'
    }
};

global.fetch = async (url, options) => {
    // Mock fetch for testing - just return a successful response
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
            get: (name) => {
                if (name === 'content-type') return 'application/json';
                return null;
            }
        },
        json: async () => ({ mock: 'response' })
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

// Mock setTimeout for Node.js
global.setTimeout = setTimeout;
global.clearTimeout = clearTimeout;

// Import the test module
import('./test-api-router-properties.js').then(async (module) => {
    const { runAPIRouterTests } = module;
    
    console.log('🧪 Running API Router Property Tests in Node.js environment...\n');
    
    try {
        const success = await runAPIRouterTests();
        
        console.log('\n=== FINAL TEST SUMMARY ===');
        console.log(`Overall Result: ${success ? '✅ SUCCESS' : '❌ FAILURE'}`);
        
        if (!success) {
            console.log('\n⚠️  Some tests failed. Review the output above.');
            process.exit(1);
        } else {
            console.log('\n🎉 All property tests passed!');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Failed to load test module:', error.message);
    process.exit(1);
});
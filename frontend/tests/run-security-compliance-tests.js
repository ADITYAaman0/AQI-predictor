/**
 * Node.js test runner for Security Compliance property tests
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
    // Mock fetch for testing - simulate rate limiting and CORS
    const headers = options?.headers || {};
    
    // Simulate rate limiting check
    if (headers['X-Rate-Limit-Test'] === 'exceed') {
        return {
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            headers: {
                get: (name) => {
                    if (name === 'Retry-After') return '60';
                    if (name === 'X-RateLimit-Remaining') return '0';
                    return null;
                }
            },
            json: async () => ({ error: 'Rate limit exceeded' })
        };
    }
    
    // Simulate CORS preflight
    if (options?.method === 'OPTIONS') {
        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: {
                get: (name) => {
                    if (name === 'Access-Control-Allow-Origin') return '*';
                    if (name === 'Access-Control-Allow-Methods') return 'GET, POST, PUT, DELETE, OPTIONS';
                    if (name === 'Access-Control-Allow-Headers') return 'Content-Type, Authorization';
                    return null;
                }
            }
        };
    }
    
    // Normal successful response
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
            get: (name) => {
                if (name === 'content-type') return 'application/json';
                if (name === 'Access-Control-Allow-Origin') return '*';
                return null;
            }
        },
        json: async () => ({ mock: 'response' })
    };
};

// Mock URL constructor for Node.js to handle relative URLs
const OriginalURL = URL;
global.URL = class URL extends OriginalURL {
    constructor(url, base) {
        if (base) {
            super(url, base);
        } else if (url.startsWith('http://') || url.startsWith('https://')) {
            super(url);
        } else {
            super(url, 'http://localhost:8000');
        }
    }
};

// Import the test module
import('./test-security-compliance-properties.js').then(async (module) => {
    const { runSecurityComplianceTests } = module;
    
    console.log('🧪 Running Security Compliance Property Tests in Node.js environment...\n');
    
    try {
        const results = await runSecurityComplianceTests();
        
        console.log('\n=== FINAL TEST SUMMARY ===');
        console.log(`Overall Result: ${results.success ? '✅ SUCCESS' : '❌ FAILURE'}`);
        
        if (!results.success) {
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
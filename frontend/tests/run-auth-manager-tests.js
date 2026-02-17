/**
 * Node.js test runner for Authentication Manager property tests
 */

// Mock browser globals for Node.js environment
global.window = {
    location: {
        hostname: 'localhost',
        port: '8080',
        pathname: '/test-runner.html'
    }
};

global.localStorage = {
    storage: {},
    getItem(key) {
        return this.storage[key] || null;
    },
    setItem(key, value) {
        this.storage[key] = value;
    },
    removeItem(key) {
        delete this.storage[key];
    },
    clear() {
        this.storage = {};
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
        json: async () => ({ 
            access_token: 'mock_token_123',
            token_type: 'bearer',
            expires_in: 3600
        })
    };
};

// Mock URL constructor for Node.js
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
import('./test-auth-manager-properties.js').then(async (module) => {
    const { runAuthManagerTests } = module;
    
    console.log('🧪 Running Authentication Manager Property Tests in Node.js environment...\n');
    
    try {
        const results = await runAuthManagerTests();
        
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
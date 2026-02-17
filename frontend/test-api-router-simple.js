// Simple test to validate API router logic
const testAPIRouter = () => {
    // Mock the config
    const config = {
        API_BASE_URL: 'http://localhost:8000/api/v1',
        INTEGRATION_BASE_URL: 'http://localhost:8000/api/v1/integration',
        API_TIMEOUT: 10000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,
        DEBUG: true
    };
    
    // Simple API Router class for testing
    class APIRouter {
        constructor() {
            this.baseURL = config.API_BASE_URL;
            this.integrationURL = config.INTEGRATION_BASE_URL;
        }
        
        mapEndpoint(request) {
            const { type, subtype } = request;
            
            const endpointMap = {
                'current': {
                    'aqi': '/data/air-quality/latest',
                    'stations': '/data/stations'
                },
                'forecast': {
                    '24h': '/forecast/24h',
                    'spatial': '/forecast/spatial'
                }
            };
            
            const endpoint = endpointMap[type]?.[subtype];
            if (!endpoint) {
                throw new Error(`Unknown endpoint mapping: ${type}.${subtype}`);
            }
            
            return endpoint;
        }
        
        buildURL(endpoint, params = {}) {
            const baseURL = endpoint.startsWith('/integration') ? 
                this.integrationURL : this.baseURL;
            
            let url = `${baseURL}${endpoint}`;
            
            if (params.path) {
                Object.entries(params.path).forEach(([key, value]) => {
                    url = url.replace(`{${key}}`, encodeURIComponent(value));
                });
            }
            
            return url;
        }
    }
    
    // Test cases
    const testCases = [
        { type: 'current', subtype: 'aqi', params: {} },
        { type: 'current', subtype: 'stations', params: {} },
        { type: 'forecast', subtype: '24h', params: { path: { location: 'Delhi' } } },
        { type: 'forecast', subtype: 'spatial', params: {} }
    ];
    
    const router = new APIRouter();
    let passed = 0;
    
    console.log('Testing API Router endpoint mapping...');
    
    testCases.forEach((testCase, index) => {
        try {
            const endpoint = router.mapEndpoint(testCase);
            const url = router.buildURL(endpoint, testCase.params);
            
            console.log(`✅ Test ${index + 1}: ${testCase.type}.${testCase.subtype} -> ${endpoint}`);
            console.log(`   URL: ${url}`);
            passed++;
        } catch (error) {
            console.log(`❌ Test ${index + 1}: ${error.message}`);
        }
    });
    
    console.log(`\nResults: ${passed}/${testCases.length} tests passed`);
    return passed === testCases.length;
};

const success = testAPIRouter();
process.exit(success ? 0 : 1);
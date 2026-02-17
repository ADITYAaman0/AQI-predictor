/**
 * Node.js test runner for Data Transformer property tests
 */

// Mock browser globals for Node.js environment
global.window = {
    location: {
        hostname: 'localhost',
        port: '8080',
        pathname: '/test-runner.html'
    }
};

// Import the test module
import('./test-data-transformer-properties.js').then(async (module) => {
    const DataTransformerPropertyTests = module.default;
    
    console.log('🧪 Running Data Transformer Property Tests in Node.js environment...\n');
    
    try {
        const tester = new DataTransformerPropertyTests();
        const results = await tester.runAllTests();
        
        console.log('\n=== FINAL TEST SUMMARY ===');
        console.log(`Overall Result: ${results.overallSuccess ? '✅ SUCCESS' : '❌ FAILURE'}`);
        
        if (!results.overallSuccess) {
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
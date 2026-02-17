# Implementation Plan: Leaflet.js Integration

## Overview

This implementation plan converts the Leaflet.js integration design into a series of discrete coding tasks that build incrementally toward a complete integration with the existing AQI Predictor system. Each task focuses on specific components while ensuring seamless integration with the production-ready FastAPI backend.

## Tasks

- [x] 1. Set up project structure and integration layer foundation
  - Create directory structure for frontend and integration components
  - Set up basic HTML structure with Leaflet.js and OpenFreeMap
  - Configure development environment with existing backend
  - _Requirements: 6.1, 6.2, 6.5_

- [-] 2. Implement core integration layer components
  - [x] 2.1 Create API Router for endpoint mapping
    - Implement JavaScript class to route frontend requests to existing backend endpoints
    - Map current AQI, forecast, spatial, and station requests to appropriate API paths
    - Handle request transformation and error routing
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 2.2 Write property test for API routing
    - **Property 1: API Routing Consistency**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
  
  - [x] 2.3 Create Data Transformer for GeoJSON conversion
    - Implement transformation from existing API responses to GeoJSON format
    - Convert coordinates to GeoJSON Point features
    - Preserve all original data fields while adding geographic formatting
    - _Requirements: 1.5, 2.1, 2.2, 2.3, 2.4_
  
  - [x] 2.4 Write property test for data transformation
    - **Property 2: Data Transformation Preservation**
    - **Validates: Requirements 1.5, 2.1, 2.2, 2.3, 2.4**

- [x] 3. Implement authentication and security integration
  - [x] 3.1 Create Authentication Manager
    - Implement JWT token handling using existing `/api/v1/auth` endpoints
    - Handle token refresh and authorization headers
    - Integrate with existing authentication system
    - _Requirements: 1.6, 7.1, 7.2, 7.3_
  
  - [x] 3.2 Write property test for authentication integration
    - **Property 3: Authentication Integration**
    - **Validates: Requirements 1.6, 7.1, 7.2, 7.3**
  
  - [x] 3.3 Implement CORS and rate limiting compliance
    - Configure CORS handling for frontend-backend communication
    - Implement rate limiting compliance with existing middleware
    - _Requirements: 7.4, 7.5_
  
  - [ ] 3.4 Write property test for security compliance
    - **Property 14: Rate Limiting Compliance**
    - **Property 15: CORS Handling**
    - **Validates: Requirements 7.4, 7.5**

- [x] 4. Checkpoint - Ensure integration layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement frontend map controller and visualization
  - [x] 5.1 Create Map Controller with Leaflet.js initialization
    - Initialize Leaflet map with OpenFreeMap tiles
    - Implement view switching (current/forecast) and visualization modes (markers/heatmap)
    - Handle user interactions and map state management
    - _Requirements: 4.1, 4.2, 4.4_
  
  - [x] 5.2 Write property test for visualization mode switching
    - **Property 8: Visualization Mode Switching**
    - **Validates: Requirements 4.1, 4.2, 4.4**
  
  - [x] 5.3 Create Layer Manager for markers and heatmaps
    - Implement marker clustering with AQI color coding
    - Create heatmap layer rendering for spatial data
    - Generate interactive popups with detailed station information
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 5.4 Write property test for interactive features
    - **Property 9: Interactive Feature Completeness**
    - **Validates: Requirements 4.3**

- [x] 6. Implement data loading and caching system
  - [x] 6.1 Create Data Loader with API communication
    - Implement data fetching from integration layer endpoints
    - Handle authentication token inclusion in requests
    - Implement error handling and retry logic
    - _Requirements: 3.1, 3.4_
  
  - [x] 6.2 Write property test for performance requirements
    - **Property 4: Performance Requirements**
    - **Validates: Requirements 3.1, 9.1**
  
  - [x] 6.3 Implement Cache Controller for client-side caching
    - Create browser-based caching with Redis integration
    - Handle cache expiration and offline scenarios
    - Implement data usage optimization for mobile
    - _Requirements: 3.4, 3.5, 5.5, 9.2, 9.5_
  
  - [x] 6.4 Write property test for caching and offline handling
    - **Property 5: Real-Time Data Updates**
    - **Property 6: Offline Graceful Degradation**
    - **Property 13: Data Usage Optimization**
    - **Property 18: Caching Integration**
    - **Validates: Requirements 3.2, 3.4, 3.5, 5.5, 9.2, 9.5**

- [x] 7. Implement forecast animation and timeline controls
  - [x] 7.1 Create Animation Controller
    - Implement 24-hour forecast animation with play/pause/scrub controls
    - Handle smooth transitions between hourly predictions
    - Implement frame preloading for smooth playback
    - _Requirements: 3.3, 9.3_
  
  - [x] 7.2 Write property test for animation functionality
    - **Property 7: Animation Smoothness**
    - **Validates: Requirements 3.3, 9.3**
  
  - [x] 7.3 Implement filtering and district-based controls
    - Create district-based filtering using existing city/state data
    - Implement UI controls for filter selection
    - _Requirements: 4.5_
  
  - [x] 7.4 Write property test for filtering functionality
    - **Property 10: Filtering Functionality**
    - **Validates: Requirements 4.5**

- [x] 8. Checkpoint - Ensure frontend functionality tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 9. Implement mobile responsiveness and optimization
  - [x] 9.1 Create responsive design for mobile devices
    - Implement touch-friendly layouts for screens below 768px
    - Reorganize UI elements to prevent overlap on mobile
    - Optimize marker clustering for mobile viewport sizes
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [x] 9.2 Write property test for mobile responsiveness
    - **Property 11: Mobile Responsiveness**
    - **Validates: Requirements 5.1, 5.2, 5.4**
  
  - [x] 9.3 Implement touch gesture support
    - Add pinch-to-zoom and pan navigation for touch devices
    - Optimize touch interactions for map controls
    - _Requirements: 5.3_
  
  - [-] 9.4 Write property test for touch interactions
    - **Property 12: Touch Interaction Support**
    - **Validates: Requirements 5.3**
  
  - [ ] 9.5 Implement performance optimizations
    - Add marker clustering efficiency for large datasets
    - Implement progressive loading and data compression
    - _Requirements: 9.4_
  
  - [ ] 9.6 Write property test for performance optimization
    - **Property 19: Marker Clustering Efficiency**
    - **Validates: Requirements 9.4**

- [x] 10. Implement deployment integration and configuration
  - [x] 10.1 Create Docker and Nginx integration
    - Update existing Docker configuration to include frontend assets
    - Configure Nginx reverse proxy to serve Leaflet frontend
    - Ensure frontend is served through existing infrastructure
    - _Requirements: 6.1, 6.2_
  
  - [x] 10.2 Implement environment configuration management
    - Create configuration files for development, staging, and production
    - Implement environment variable reading for API endpoints
    - Ensure configuration consistency with existing backend
    - _Requirements: 6.3, 10.1, 10.2, 10.3_
  
  - [x] 10.3 Write property test for configuration management
    - **Property 20: Configuration Consistency**
    - **Property 21: Environment Configuration Validation**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

- [x] 11. Implement backward compatibility preservation
  - [x] 11.1 Ensure Streamlit dashboard compatibility
    - Verify existing Streamlit dashboard remains functional
    - Test that both frontends can run simultaneously
    - Validate existing API endpoint contracts are preserved
    - _Requirements: 8.1, 8.2, 8.5_
  
  - [x] 11.2 Write property test for backward compatibility
    - **Property 16: Backward Compatibility Preservation**
    - **Validates: Requirements 8.1, 8.2**
  
  - [x] 11.3 Test dual frontend performance
    - Verify backend can serve both Streamlit and Leaflet efficiently
    - Test concurrent usage scenarios
    - _Requirements: 8.3_
  
  - [x] 11.4 Write property test for dual frontend performance
    - **Property 17: Dual Frontend Performance**
    - **Validates: Requirements 8.3**

- [x] 12. Integration testing and final wiring
  - [x] 12.1 Connect all components and test end-to-end functionality
    - Wire together all frontend components with integration layer
    - Test complete data flow from backend through integration to frontend
    - Verify all interactive features work with real backend data
    - _Requirements: All requirements integration_
  
  - [x] 12.2 Write integration tests for complete system
    - Test complete user workflows (viewing current data, forecast animation, mobile usage)
    - Verify error handling and graceful degradation scenarios
    - Test authentication flows and security features
  
  - [x] 12.3 Performance testing and optimization
    - Test loading times on various connection speeds
    - Verify caching effectiveness and data usage optimization
    - Test concurrent user scenarios

- [x] 13. Final checkpoint - Ensure all tests pass and system is production ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Integration tests validate complete system functionality
- The implementation leverages existing backend infrastructure without modifications
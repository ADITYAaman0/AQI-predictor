"""
Mobile-Responsive Styles for Streamlit Dashboard
Provides CSS for mobile optimization and touch-friendly interfaces.
"""


def get_mobile_responsive_css() -> str:
    """
    Get mobile-responsive CSS styles.
    
    Returns:
        CSS string for mobile responsiveness
    """
    return """
    <style>
    /* Mobile-First Responsive Design */
    
    /* Base mobile styles */
    @media only screen and (max-width: 768px) {
        /* Adjust container padding */
        .main .block-container {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
            padding-top: 1rem !important;
        }
        
        /* Make cards stack vertically */
        .glass-card {
            margin-bottom: 1rem !important;
        }
        
        /* Adjust font sizes for mobile */
        h1 {
            font-size: 1.5rem !important;
        }
        
        h2 {
            font-size: 1.25rem !important;
        }
        
        h3 {
            font-size: 1.1rem !important;
        }
        
        /* Make buttons full width on mobile */
        .stButton > button {
            width: 100% !important;
            margin-bottom: 0.5rem !important;
        }
        
        /* Adjust metric cards */
        [data-testid="stMetric"] {
            padding: 0.5rem !important;
        }
        
        [data-testid="stMetricLabel"] {
            font-size: 0.875rem !important;
        }
        
        [data-testid="stMetricValue"] {
            font-size: 1.25rem !important;
        }
        
        /* Make charts responsive */
        .js-plotly-plot {
            width: 100% !important;
        }
        
        /* Adjust sidebar for mobile */
        [data-testid="stSidebar"] {
            width: 100% !important;
        }
        
        /* Make tables scrollable */
        .dataframe {
            overflow-x: auto !important;
            display: block !important;
        }
        
        /* Touch-friendly input fields */
        input, select, textarea {
            font-size: 16px !important; /* Prevents zoom on iOS */
            padding: 0.75rem !important;
            min-height: 44px !important; /* Apple's recommended touch target */
        }
        
        /* Touch-friendly radio buttons */
        .stRadio > div {
            gap: 1rem !important;
        }
        
        .stRadio label {
            padding: 0.75rem !important;
            min-height: 44px !important;
        }
        
        /* Adjust slider for touch */
        .stSlider {
            padding: 1rem 0 !important;
        }
        
        /* Make selectbox touch-friendly */
        .stSelectbox > div > div {
            min-height: 44px !important;
        }
    }
    
    /* Tablet styles */
    @media only screen and (min-width: 769px) and (max-width: 1024px) {
        .main .block-container {
            padding-left: 2rem !important;
            padding-right: 2rem !important;
        }
        
        /* Adjust columns for tablet */
        [data-testid="column"] {
            padding: 0 0.5rem !important;
        }
    }
    
    /* Touch-friendly elements for all devices */
    .touch-target {
        min-width: 44px !important;
        min-height: 44px !important;
        padding: 0.75rem !important;
        cursor: pointer !important;
    }
    
    /* Improve tap highlighting */
    * {
        -webkit-tap-highlight-color: rgba(74, 222, 128, 0.3);
        -webkit-touch-callout: none;
    }
    
    /* Smooth scrolling */
    html {
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
    }
    
    /* Prevent text selection on double-tap */
    .no-select {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }
    
    /* Loading spinner for mobile */
    .stSpinner > div {
        border-width: 3px !important;
    }
    
    /* Alert banners on mobile */
    .stAlert {
        padding: 1rem !important;
        margin-bottom: 1rem !important;
    }
    
    /* Improve form layout on mobile */
    @media only screen and (max-width: 768px) {
        .stForm {
            padding: 1rem !important;
        }
        
        .stForm > div {
            gap: 1rem !important;
        }
    }
    
    /* Optimize images for mobile */
    img {
        max-width: 100% !important;
        height: auto !important;
    }
    
    /* Hide elements on mobile if needed */
    @media only screen and (max-width: 768px) {
        .hide-mobile {
            display: none !important;
        }
    }
    
    /* Show only on mobile */
    .show-mobile {
        display: none !important;
    }
    
    @media only screen and (max-width: 768px) {
        .show-mobile {
            display: block !important;
        }
    }
    
    /* Improve accessibility */
    :focus {
        outline: 2px solid #4ADE80 !important;
        outline-offset: 2px !important;
    }
    
    /* Dark mode optimizations for mobile */
    @media (prefers-color-scheme: dark) {
        body {
            background-color: #0F172A !important;
        }
    }
    
    /* Reduce motion for users who prefer it */
    @media (prefers-reduced-motion: reduce) {
        * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
        }
    }
    
    /* Landscape orientation adjustments */
    @media only screen and (max-width: 768px) and (orientation: landscape) {
        .main .block-container {
            padding-top: 0.5rem !important;
        }
        
        h1 {
            font-size: 1.25rem !important;
        }
    }
    
    /* PWA-specific styles */
    @media all and (display-mode: standalone) {
        /* Styles for when app is installed as PWA */
        body {
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
        }
        
        /* Hide browser chrome elements */
        .hide-in-pwa {
            display: none !important;
        }
    }
    
    /* Safe area insets for notched devices */
    @supports (padding: max(0px)) {
        body {
            padding-left: max(0px, env(safe-area-inset-left));
            padding-right: max(0px, env(safe-area-inset-right));
        }
    }
    </style>
    """


def get_touch_gestures_js() -> str:
    """
    Get JavaScript for touch gesture support.
    
    Returns:
        JavaScript string for touch gestures
    """
    return """
    <script>
    // Touch gesture support
    (function() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        
        const minSwipeDistance = 50;
        
        document.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, false);
        
        document.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        }, false);
        
        function handleSwipe() {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            // Horizontal swipe
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    // Swipe right - could open sidebar
                    console.log('Swipe right detected');
                } else {
                    // Swipe left - could close sidebar
                    console.log('Swipe left detected');
                }
            }
            
            // Vertical swipe
            if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
                if (deltaY > 0) {
                    // Swipe down - could refresh
                    console.log('Swipe down detected');
                } else {
                    // Swipe up
                    console.log('Swipe up detected');
                }
            }
        }
        
        // Pull to refresh
        let startY = 0;
        let isPulling = false;
        
        document.addEventListener('touchstart', function(e) {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
                isPulling = true;
            }
        });
        
        document.addEventListener('touchmove', function(e) {
            if (isPulling) {
                const currentY = e.touches[0].pageY;
                const pullDistance = currentY - startY;
                
                if (pullDistance > 100) {
                    // Show refresh indicator
                    console.log('Pull to refresh triggered');
                }
            }
        });
        
        document.addEventListener('touchend', function() {
            isPulling = false;
        });
        
        // Prevent double-tap zoom on specific elements
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Add haptic feedback for supported devices
        function hapticFeedback() {
            if ('vibrate' in navigator) {
                navigator.vibrate(10);
            }
        }
        
        // Add haptic feedback to buttons
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('touchstart', hapticFeedback);
        });
    })();
    </script>
    """


def get_offline_support_js() -> str:
    """
    Get JavaScript for offline support and caching.
    
    Returns:
        JavaScript string for offline functionality
    """
    return """
    <script>
    // Offline support and caching
    (function() {
        // Check online status
        function updateOnlineStatus() {
            const statusElement = document.getElementById('online-status');
            if (statusElement) {
                if (navigator.onLine) {
                    statusElement.textContent = '🟢 Online';
                    statusElement.style.color = '#4ADE80';
                } else {
                    statusElement.textContent = '🔴 Offline';
                    statusElement.style.color = '#EF4444';
                }
            }
        }
        
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        // Cache API data
        const CACHE_NAME = 'aqi-predictor-v1';
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        
        function cacheData(key, data) {
            const cacheEntry = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(cacheEntry));
        }
        
        function getCachedData(key) {
            const cached = localStorage.getItem(key);
            if (!cached) return null;
            
            const cacheEntry = JSON.parse(cached);
            const age = Date.now() - cacheEntry.timestamp;
            
            if (age > CACHE_DURATION) {
                localStorage.removeItem(key);
                return null;
            }
            
            return cacheEntry.data;
        }
        
        // Service Worker registration for PWA
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(function(registration) {
                        console.log('ServiceWorker registered:', registration);
                    })
                    .catch(function(error) {
                        console.log('ServiceWorker registration failed:', error);
                    });
            });
        }
        
        // Install prompt for PWA
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show install button
            const installButton = document.getElementById('install-pwa');
            if (installButton) {
                installButton.style.display = 'block';
                
                installButton.addEventListener('click', function() {
                    installButton.style.display = 'none';
                    deferredPrompt.prompt();
                    
                    deferredPrompt.userChoice.then(function(choiceResult) {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('User accepted the install prompt');
                        }
                        deferredPrompt = null;
                    });
                });
            }
        });
        
        // Detect if running as PWA
        function isPWA() {
            return window.matchMedia('(display-mode: standalone)').matches ||
                   window.navigator.standalone === true;
        }
        
        if (isPWA()) {
            console.log('Running as PWA');
            document.body.classList.add('pwa-mode');
        }
    })();
    </script>
    """

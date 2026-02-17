# Mobile & PWA Implementation Guide

## Overview

The AQI Predictor dashboard has been enhanced with mobile-responsive design and Progressive Web App (PWA) capabilities, providing a native app-like experience on mobile devices.

## Features Implemented

### Mobile-Responsive Design

#### 1. Responsive Layout
- **Fluid Grid System**: Automatically adjusts to screen size
- **Flexible Images**: Scale appropriately on all devices
- **Touch-Friendly Targets**: Minimum 44x44px touch targets (Apple guidelines)
- **Optimized Typography**: Readable font sizes on mobile (16px minimum to prevent zoom)

#### 2. Mobile-First CSS
- Breakpoints:
  - Mobile: ≤ 768px
  - Tablet: 769px - 1024px
  - Desktop: > 1024px
- Stack columns vertically on mobile
- Full-width buttons on mobile
- Adjusted padding and margins

#### 3. Touch Gestures
- **Swipe Detection**: Left/right swipe for navigation
- **Pull to Refresh**: Swipe down from top to refresh data
- **Haptic Feedback**: Vibration on button taps (supported devices)
- **Double-Tap Prevention**: Prevents accidental zoom

#### 4. Performance Optimizations
- Lazy loading for images
- Reduced animations on mobile
- Optimized chart rendering
- Compressed assets

### Progressive Web App (PWA)

#### 1. Installability
- **Add to Home Screen**: Install as standalone app
- **App Icons**: Multiple sizes (72px to 512px)
- **Splash Screen**: Custom loading screen
- **Standalone Mode**: Runs without browser chrome

#### 2. Offline Support
- **Service Worker**: Caches assets and API responses
- **Offline Fallback**: Shows cached data when offline
- **Background Sync**: Syncs data when connection restored
- **Cache Strategy**: Network-first with cache fallback

#### 3. Push Notifications
- **AQI Alerts**: Receive notifications for air quality changes
- **Background Updates**: Updates even when app closed
- **Action Buttons**: Quick actions from notifications

#### 4. App-Like Experience
- **Full Screen**: No browser UI in standalone mode
- **Custom Theme**: Branded colors and styling
- **App Shortcuts**: Quick access to key features
- **Safe Area Support**: Handles notched devices

## Installation

### For Users

#### Android
1. Open dashboard in Chrome
2. Tap menu (⋮) → "Add to Home screen"
3. Confirm installation
4. App icon appears on home screen

#### iOS
1. Open dashboard in Safari
2. Tap Share button (□↑)
3. Scroll and tap "Add to Home Screen"
4. Confirm installation
5. App icon appears on home screen

### For Developers

#### Prerequisites
```bash
# Ensure manifest.json is accessible
# Ensure service-worker.js is in root directory
# Ensure HTTPS is enabled (required for PWA)
```

#### Configuration Files

**manifest.json** - PWA configuration
```json
{
  "name": "AQI Predictor",
  "short_name": "AQI",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#4ADE80",
  "background_color": "#0F172A"
}
```

**service-worker.js** - Offline support
- Caches static assets
- Caches API responses
- Provides offline fallback
- Handles push notifications

## Mobile Features

### 1. Responsive Navigation
- Collapsible sidebar on mobile
- Bottom navigation bar option
- Swipe gestures for page switching

### 2. Touch-Optimized Controls
- Large tap targets (44x44px minimum)
- Increased padding on interactive elements
- Touch-friendly sliders and inputs
- Swipe-enabled carousels

### 3. Mobile-Specific UI
- Simplified layouts for small screens
- Stacked cards instead of columns
- Full-width buttons
- Optimized charts for mobile viewing

### 4. Performance
- Lazy loading of images and charts
- Reduced animations
- Compressed assets
- Efficient rendering

## Offline Capabilities

### What Works Offline

✅ **Available Offline**:
- View cached current AQI data
- View cached forecast data
- Browse cached historical data
- View spatial maps (cached)
- Access settings
- View help documentation

❌ **Requires Connection**:
- Fetch new forecast data
- Update real-time data
- Create alert subscriptions
- Export data
- Policy scenario analysis

### Cache Strategy

1. **Static Assets**: Cache-first
   - HTML, CSS, JavaScript
   - Images and icons
   - Fonts

2. **API Responses**: Network-first with cache fallback
   - Current AQI data (5 min cache)
   - Forecast data (1 hour cache)
   - Historical data (24 hour cache)

3. **User Data**: IndexedDB storage
   - User preferences
   - Alert subscriptions
   - Saved locations

## Testing

### Mobile Responsiveness

#### Chrome DevTools
1. Open DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select device or custom dimensions
4. Test different screen sizes

#### Real Device Testing
```bash
# Find your local IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# Access from mobile device
http://YOUR_IP:8501
```

### PWA Features

#### Lighthouse Audit
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select "Progressive Web App"
4. Run audit
5. Address any issues

#### PWA Checklist
- [ ] Manifest.json present and valid
- [ ] Service worker registered
- [ ] HTTPS enabled
- [ ] Icons provided (multiple sizes)
- [ ] Installable
- [ ] Works offline
- [ ] Fast load time (<3s)
- [ ] Responsive design

## Browser Support

### Mobile Browsers

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Responsive Design | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Add to Home Screen | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ⚠️ | ✅ | ✅ |
| Background Sync | ✅ | ❌ | ✅ | ✅ |

✅ Full support | ⚠️ Partial support | ❌ No support

### Desktop Browsers

All modern desktop browsers support PWA features:
- Chrome 67+
- Edge 79+
- Firefox 44+
- Safari 11.1+

## Troubleshooting

### PWA Not Installing

**Issue**: "Add to Home Screen" not appearing

**Solutions**:
1. Ensure HTTPS is enabled
2. Check manifest.json is accessible
3. Verify service worker is registered
4. Check browser console for errors
5. Ensure all required icons are present

### Offline Mode Not Working

**Issue**: App doesn't work offline

**Solutions**:
1. Check service worker registration
2. Verify cache strategy in service-worker.js
3. Check browser console for cache errors
4. Clear cache and re-register service worker
5. Test with DevTools offline mode

### Touch Gestures Not Responding

**Issue**: Swipe gestures not working

**Solutions**:
1. Check touch event listeners are registered
2. Verify no conflicting scroll handlers
3. Test on actual device (not emulator)
4. Check browser console for JavaScript errors

### Slow Performance on Mobile

**Issue**: App is slow on mobile devices

**Solutions**:
1. Enable lazy loading for images
2. Reduce chart complexity
3. Minimize JavaScript execution
4. Optimize API response sizes
5. Use compression for assets

## Best Practices

### Mobile Design
1. **Touch Targets**: Minimum 44x44px
2. **Font Size**: Minimum 16px (prevents zoom)
3. **Contrast**: WCAG AA compliant (4.5:1)
4. **Loading States**: Show spinners for async operations
5. **Error Messages**: Clear and actionable

### PWA Development
1. **Cache Wisely**: Don't cache everything
2. **Update Strategy**: Prompt users for updates
3. **Offline UX**: Clear offline indicators
4. **Performance**: Target <3s load time
5. **Testing**: Test on real devices

### Accessibility
1. **Keyboard Navigation**: All features accessible
2. **Screen Readers**: Proper ARIA labels
3. **Color Contrast**: Sufficient contrast ratios
4. **Focus Indicators**: Visible focus states
5. **Reduced Motion**: Respect user preferences

## Future Enhancements

### Planned Features
- [ ] Biometric authentication
- [ ] Geolocation-based auto-city selection
- [ ] Voice commands
- [ ] AR visualization of air quality
- [ ] Wearable device integration
- [ ] Offline data sync improvements
- [ ] Advanced gesture controls
- [ ] Dark mode auto-switching

### Performance Goals
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Lighthouse PWA score > 90
- [ ] Mobile PageSpeed score > 85

## Resources

### Documentation
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)

### Tools
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PWA Builder](https://www.pwabuilder.com/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)

### Testing
- [BrowserStack](https://www.browserstack.com/) - Cross-browser testing
- [LambdaTest](https://www.lambdatest.com/) - Mobile device testing
- [WebPageTest](https://www.webpagetest.org/) - Performance testing

## Support

For issues or questions:
1. Check browser console for errors
2. Review service worker status in DevTools
3. Test in incognito/private mode
4. Clear cache and try again
5. Report issues with device/browser details

## Changelog

### Version 2.0 (Current)
- ✅ Mobile-responsive design
- ✅ PWA support with offline mode
- ✅ Touch gesture support
- ✅ Service worker implementation
- ✅ App manifest configuration
- ✅ Push notification support

### Version 1.0
- Basic Streamlit dashboard
- Desktop-only design
- No offline support

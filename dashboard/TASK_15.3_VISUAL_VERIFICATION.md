# Task 15.3: Alert Creation - Visual Verification Guide

## Quick Start

1. **Start Backend API:**
   ```bash
   cd ..
   uvicorn src.main:app --reload
   ```

2. **Start Dashboard:**
   ```bash
   cd dashboard
   npm run dev
   ```

3. **Open Test Page:**
   ```
   http://localhost:3000/test-alert-creation
   ```

## Visual Verification Checklist

### 1. Initial Page Load
**What to Check:**
- [ ] Page loads without errors
- [ ] Alert configuration card displays with glassmorphic styling
- [ ] All form elements are visible and styled correctly
- [ ] Default location (Delhi) is pre-selected
- [ ] Threshold slider shows default value (150)
- [ ] Email notification channel is pre-selected
- [ ] "Above Threshold" condition is selected by default

**Expected Appearance:**
- Gradient background (blue-purple-pink)
- Glassmorphic card with frosted glass effect
- Bell icon in header
- Location selector with Delhi
- Threshold slider with AQI color gradient
- Current category badge (Unhealthy for 150)
- Notification channel checkboxes
- Create Alert and Cancel buttons

### 2. Success Flow
**Steps:**
1. Keep default values
2. Click "Create Alert" button

**What to Check:**
- [ ] Loading overlay appears with spinner
- [ ] "Creating alert..." message displays
- [ ] Form becomes disabled (opacity 60%, pointer-events-none)
- [ ] After ~1 second, success message appears
- [ ] Success message has green background
- [ ] Success message shows: "Alert created successfully for Delhi!"
- [ ] Success message has checkmark icon
- [ ] Success message has dismiss button (X)
- [ ] Created alert appears in the list below
- [ ] Success message auto-dismisses after 3 seconds

**Expected Appearance:**
```
┌─────────────────────────────────────────┐
│ ✓ Alert created successfully for Delhi!│ [X]
│   (Green background, white text)        │
└─────────────────────────────────────────┘
```

### 3. Error Flow - Duplicate Alert
**Steps:**
1. Create an alert for Delhi
2. Try to create another alert for Delhi

**What to Check:**
- [ ] Error message appears with red background
- [ ] Error message shows: "An alert already exists for this location..."
- [ ] Error message has warning icon
- [ ] Error message has dismiss button (X)
- [ ] Form remains enabled after error
- [ ] User can dismiss error and try again

**Expected Appearance:**
```
┌─────────────────────────────────────────┐
│ ⚠ An alert already exists for this     │ [X]
│   location. Please choose a different   │
│   location or update the existing alert.│
│   (Red background, white text)          │
└─────────────────────────────────────────┘
```

### 4. Threshold Slider Interaction
**Steps:**
1. Move threshold slider to different values

**What to Check:**
- [ ] Slider moves smoothly
- [ ] Threshold value updates in real-time
- [ ] Category badge updates based on threshold:
  - 0-50: Good (green)
  - 51-100: Moderate (yellow)
  - 101-150: Unhealthy for Sensitive Groups (orange)
  - 151-200: Unhealthy (red)
  - 201-300: Very Unhealthy (dark red)
  - 301-500: Hazardous (brown)
- [ ] Category badge color matches AQI level
- [ ] Help text updates: "You'll be notified when AQI above/below this value"

**Expected Appearance:**
```
AQI Threshold: 150
┌─────────────────────────────────────────┐
│ ⚠ Unhealthy for Sensitive Groups        │
│   (Orange border and background)        │
└─────────────────────────────────────────┘
[====================================] 150
0    50   100  150  200  300  500
```

### 5. Condition Toggle
**Steps:**
1. Click "Below Threshold" button
2. Click "Above Threshold" button

**What to Check:**
- [ ] Active button has white/20 background
- [ ] Active button has white/40 border
- [ ] Active button has white text
- [ ] Inactive button has white/5 background
- [ ] Inactive button has white/10 border
- [ ] Inactive button has white/60 text
- [ ] Buttons have smooth transition (200ms)
- [ ] Help text updates based on selection

### 6. Notification Channels
**Steps:**
1. Try to uncheck the last remaining channel
2. Check/uncheck different channels

**What to Check:**
- [ ] Cannot uncheck the last channel (disabled state)
- [ ] Last channel checkbox is disabled
- [ ] Last channel has opacity-75 and cursor-not-allowed
- [ ] Can check/uncheck when multiple channels selected
- [ ] Checkboxes have proper styling
- [ ] Channel icons display correctly (Mail, Smartphone, MessageSquare)
- [ ] Help text: "Select at least one notification method"

### 7. Location Selector
**Steps:**
1. Click location selector
2. Select different locations from favorites

**What to Check:**
- [ ] Location dropdown opens
- [ ] Favorite locations display
- [ ] Can select different location
- [ ] Selected location updates in form
- [ ] Location selector closes after selection

### 8. Loading State
**Steps:**
1. Click "Create Alert" button
2. Observe loading state

**What to Check:**
- [ ] Loading overlay appears immediately
- [ ] Spinner animation is smooth (rotating)
- [ ] "Creating alert..." text displays
- [ ] Form is disabled during loading
- [ ] Cannot click buttons during loading
- [ ] Loading overlay has semi-transparent background

**Expected Appearance:**
```
┌─────────────────────────────────────────┐
│                                         │
│           ⟳ (spinning)                  │
│       Creating alert...                 │
│                                         │
└─────────────────────────────────────────┘
```

### 9. Created Alerts List
**Steps:**
1. Create multiple alerts
2. Check the created alerts list

**What to Check:**
- [ ] List displays below the form
- [ ] Each alert shows:
  - Location name
  - Active/Inactive badge
  - Threshold value
  - Condition (above/below)
  - Notification channels
  - Created timestamp
- [ ] Alerts have glassmorphic card styling
- [ ] Success checkmark icon displays
- [ ] List updates in real-time

**Expected Appearance:**
```
Created Alerts (2)
┌─────────────────────────────────────────┐
│ Delhi                    [Active]       │
│ Threshold: AQI above 150                │
│ Channels: email                         │
│ Created: 1/15/2024, 10:00:00 AM         │
└─────────────────────────────────────────┘
```

### 10. Responsive Design
**Steps:**
1. Resize browser window
2. Test on mobile viewport

**What to Check:**
- [ ] Form adapts to smaller screens
- [ ] All elements remain accessible
- [ ] Touch targets are adequate (44x44px minimum)
- [ ] Text remains readable
- [ ] Buttons stack vertically on mobile

### 11. Accessibility
**Steps:**
1. Use keyboard navigation (Tab key)
2. Use screen reader (if available)

**What to Check:**
- [ ] Can tab through all form elements
- [ ] Focus indicators are visible
- [ ] Can submit form with Enter key
- [ ] ARIA labels are present
- [ ] Success/error messages are announced
- [ ] All interactive elements are keyboard accessible

### 12. Error Scenarios

#### Network Error
**Steps:**
1. Stop the backend API
2. Try to create an alert

**Expected:**
- [ ] Error message: "Network error. Please check your connection and try again."

#### Unauthorized (401)
**Steps:**
1. Remove authentication token (if implemented)
2. Try to create an alert

**Expected:**
- [ ] Error message: "You must be logged in to create alerts."

#### Rate Limit (429)
**Steps:**
1. Create many alerts rapidly (if rate limiting is enabled)

**Expected:**
- [ ] Error message: "Too many requests. Please wait a moment and try again."

## Testing Instructions Section

**What to Check:**
- [ ] Testing instructions card displays
- [ ] Test cases list is visible
- [ ] Requirements validated section shows
- [ ] "What to Check" section displays
- [ ] API status shows backend URL
- [ ] Instructions are clear and helpful

## Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

## Performance

**What to Check:**
- [ ] Page loads quickly (<2 seconds)
- [ ] Form interactions are responsive (<100ms)
- [ ] Animations are smooth (60fps)
- [ ] No console errors
- [ ] No memory leaks

## Common Issues and Solutions

### Issue: Success message doesn't appear
**Solution:** Check browser console for errors, verify backend is running

### Issue: Form doesn't submit
**Solution:** Check validation errors, verify all required fields are filled

### Issue: Loading state doesn't clear
**Solution:** Check network tab for failed requests, verify backend response

### Issue: Styling looks broken
**Solution:** Clear browser cache, verify Tailwind CSS is compiled

## Sign-Off Checklist

- [ ] All visual elements display correctly
- [ ] Success flow works end-to-end
- [ ] Error handling displays appropriate messages
- [ ] Loading states work correctly
- [ ] Form validation prevents invalid submissions
- [ ] Accessibility features work
- [ ] Responsive design adapts to different screen sizes
- [ ] No console errors
- [ ] Performance is acceptable

## Screenshots Locations

Take screenshots of:
1. Initial page load
2. Success message
3. Error message
4. Loading state
5. Created alerts list
6. Different threshold values
7. Mobile view

Save screenshots to: `dashboard/screenshots/task-15.3/`

## Conclusion

This visual verification guide ensures that Task 15.3 (Alert Creation) is fully functional and meets all design and UX requirements. Complete all checklist items before marking the task as verified.

**Verification Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Verified By:** ________________

**Date:** ________________

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

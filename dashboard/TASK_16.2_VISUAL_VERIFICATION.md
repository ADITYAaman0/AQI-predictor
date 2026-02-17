# Task 16.2 Visual Verification Guide: DeviceCard Component

## Quick Start

1. Start the development server:
   ```bash
   cd dashboard
   npm run dev
   ```

2. Open the test page:
   ```
   http://localhost:3000/test-device-card
   ```

## Visual Checklist

### ✅ Status Indicators

**Connected Devices (Green)**
- [ ] Green dot (#4ADE80) is visible
- [ ] Dot has pulsing animation
- [ ] "Connected" label is displayed
- [ ] Wifi icon is shown

**Low Battery Devices (Yellow)**
- [ ] Yellow dot (#FCD34D) is visible
- [ ] No pulsing animation
- [ ] "Low Battery" label is displayed
- [ ] BatteryLow icon is shown

**Disconnected Devices (Red)**
- [ ] Red dot (#EF4444) is visible
- [ ] No pulsing animation
- [ ] "Disconnected" label is displayed
- [ ] WifiOff icon is shown

### ✅ Glassmorphic Styling

- [ ] Semi-transparent white background (white/10)
- [ ] Backdrop blur effect is visible
- [ ] Subtle white border (white/18)
- [ ] Rounded corners (xl)
- [ ] Soft shadow effect

### ✅ Hover Effects

**Test by hovering over any device card:**
- [ ] Card lifts up by 4px
- [ ] Shadow becomes more prominent
- [ ] Background becomes slightly more opaque
- [ ] Transition is smooth (300ms)
- [ ] Cursor changes to pointer (if buttons present)

### ✅ Battery Display

**High Battery (>20%)**
- [ ] Battery icon is white/gray
- [ ] Percentage is displayed correctly
- [ ] Badge has glassmorphic styling

**Low Battery (≤20%)**
- [ ] Battery icon is red
- [ ] Percentage is displayed correctly
- [ ] Visual warning is clear

### ✅ Last Reading Section

- [ ] AQI value is large and prominent
- [ ] "AQI" label is shown below value
- [ ] Timestamp shows relative time
  - [ ] "Just now" for very recent
  - [ ] "Xm ago" for minutes
  - [ ] "Xh ago" for hours
  - [ ] "Xd ago" for days
- [ ] Section has subtle background

### ✅ Action Buttons

**View Details Button**
- [ ] Button is visible when callback provided
- [ ] Button has glassmorphic styling
- [ ] Hover effect changes background
- [ ] Click scales button down slightly
- [ ] Alert shows device ID on click

**Remove Button**
- [ ] Button is visible when callback provided
- [ ] Button has red accent styling
- [ ] Hover effect changes background
- [ ] Click scales button down slightly
- [ ] Confirmation dialog appears
- [ ] Device is removed after confirmation

### ✅ Layout Tests

**Grid Layout (3 columns)**
- [ ] Cards align properly in grid
- [ ] Spacing is consistent
- [ ] Cards have equal height

**Grid Layout (2 columns)**
- [ ] Cards adapt to tablet size
- [ ] Spacing remains consistent

**Single Column (Mobile)**
- [ ] Cards stack vertically
- [ ] Full width on mobile
- [ ] Touch targets are adequate

### ✅ Typography

- [ ] Device name is clear and prominent
- [ ] Status label is readable
- [ ] Location text is legible
- [ ] Battery percentage is clear
- [ ] AQI value is large and bold
- [ ] Timestamp is subtle but readable

### ✅ Icons

- [ ] All icons render correctly
- [ ] Icons have appropriate size
- [ ] Icons have proper color
- [ ] Icons align with text

### ✅ Responsive Behavior

**Desktop (1440px+)**
- [ ] 3-column grid works well
- [ ] All content is visible
- [ ] Hover effects work

**Tablet (768px - 1439px)**
- [ ] 2-column grid works well
- [ ] Content remains readable
- [ ] Touch targets are adequate

**Mobile (<768px)**
- [ ] Single column layout
- [ ] Cards are full width
- [ ] All content is accessible
- [ ] Touch targets are 44x44px minimum

### ✅ Accessibility

**Keyboard Navigation**
- [ ] Tab key moves between buttons
- [ ] Focus indicators are visible
- [ ] Enter key activates buttons
- [ ] Focus order is logical

**Screen Reader**
- [ ] Device name is announced
- [ ] Status is announced with color
- [ ] Battery level is announced
- [ ] Button labels are descriptive

### ✅ Edge Cases

**Invalid Data**
- [ ] Invalid timestamp shows "Unknown"
- [ ] Zero battery level displays correctly
- [ ] Very high AQI values display correctly

**Missing Callbacks**
- [ ] Cards without callbacks don't show buttons
- [ ] Layout adjusts appropriately

**Custom Styling**
- [ ] Custom className is applied
- [ ] Custom styles don't break layout

## Browser Testing

Test in the following browsers:

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Performance Checks

- [ ] Hover animations are smooth (60fps)
- [ ] No layout shifts on hover
- [ ] Images/icons load quickly
- [ ] No console errors
- [ ] No console warnings

## Requirements Verification

### Requirement 11.2 ✅
**Device cards display device name, connection status, location, and battery level**

Verify:
- [ ] Device name is prominently displayed
- [ ] Connection status is shown with colored dot
- [ ] Location is displayed with icon
- [ ] Battery level is shown with percentage

### Requirement 11.3 ✅
**"View Details" link is shown on each device card**

Verify:
- [ ] "View Details" button is present
- [ ] Button is clickable
- [ ] Button triggers correct action

### Requirement 11.4 ✅
**Device status with colored dot indicator**

Verify:
- [ ] Green dot for connected devices
- [ ] Yellow dot for low battery devices
- [ ] Red dot for disconnected devices
- [ ] Colors match specification exactly

### Requirement 12.1 ✅
**Hover effect lifts card by 4px with enhanced shadow**

Verify:
- [ ] Card lifts exactly 4px on hover
- [ ] Shadow is enhanced
- [ ] Transition takes 0.3 seconds
- [ ] Easing is smooth

## Screenshot Checklist

Take screenshots of:
1. [ ] All three device states side by side
2. [ ] Hover effect on a card
3. [ ] Mobile layout (single column)
4. [ ] Tablet layout (2 columns)
5. [ ] Desktop layout (3 columns)
6. [ ] Low battery warning state
7. [ ] Disconnected device state
8. [ ] Button interactions

## Common Issues to Check

- [ ] No text overflow or truncation
- [ ] No layout breaks at any screen size
- [ ] No flickering animations
- [ ] No color contrast issues
- [ ] No missing icons
- [ ] No broken hover states
- [ ] No accessibility violations

## Sign-off

Once all items are verified:

- [ ] All visual elements render correctly
- [ ] All interactions work as expected
- [ ] All requirements are met
- [ ] Component is ready for integration

**Verified by:** _________________

**Date:** _________________

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

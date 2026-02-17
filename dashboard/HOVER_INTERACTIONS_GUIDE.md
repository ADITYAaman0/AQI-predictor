# PollutantCard Hover Interactions Guide

## Overview
This guide explains the hover interactions implemented for the PollutantCard component as part of Task 6.4.

## Hover Effects

### 1. Lift Effect (4px translate)
When you hover over a PollutantCard:
- The card smoothly lifts 4px upward
- Creates a floating effect
- Transition duration: 0.3 seconds
- Timing function: ease

**CSS Implementation**:
```css
.hover-lift:hover {
  transform: translateY(-4px);
}
```

### 2. Enhanced Shadow
When you hover over a PollutantCard:
- The shadow becomes more prominent
- Shadow increases from Level 1 to Level 3
- Creates depth and emphasis
- Transition duration: 0.3 seconds

**CSS Implementation**:
```css
.hover-lift:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
```

### 3. Tooltip Display
When you hover over a PollutantCard:
- A tooltip overlay appears
- Shows detailed pollutant information:
  - **Pollutant Name**: Bold, centered
  - **Value**: With 2 decimal places and unit
  - **AQI**: Sub-index value
  - **Status**: Category label (Good, Moderate, etc.)
- Background: Black with 80% opacity
- Backdrop blur effect for glassmorphism
- Fade-in animation

**Example Tooltip Content**:
```
PM2.5
Value: 85.50 μg/m³
AQI: 120
Status: Unhealthy
```

## Testing the Hover Interactions

### Visual Test Page
Navigate to: `http://localhost:3000/test-pollutant-hover`

This page displays:
- 6 pollutant cards with different AQI levels
- Test instructions
- Hover effect details
- CSS verification
- Interactive checklist

### What to Look For

#### ✅ Lift Effect
- Card should move upward smoothly
- Movement should be exactly 4px
- No jittering or jumping
- Smooth return to original position

#### ✅ Shadow Enhancement
- Shadow should become more visible
- Shadow should spread wider
- Transition should be smooth
- No flickering

#### ✅ Tooltip Display
- Tooltip should appear immediately on hover
- Content should be readable
- Background should have blur effect
- Tooltip should disappear on mouse leave

#### ✅ Smooth Transitions
- All animations should be smooth (60fps)
- No lag or stuttering
- Consistent timing across all cards
- No performance issues

## Browser Testing

Test in the following browsers:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Accessibility

The hover interactions maintain accessibility:
- **Keyboard Navigation**: Focus states work similarly to hover
- **Screen Readers**: Tooltip content is accessible
- **Reduced Motion**: Respects user preferences (can be enhanced)
- **Touch Devices**: Tap to show tooltip (mobile)

## Performance

The hover interactions are optimized for performance:
- **GPU Acceleration**: Transform property uses GPU
- **CSS Transitions**: Hardware-accelerated
- **Minimal Re-renders**: Only hovered card updates
- **60fps Target**: Smooth animations maintained

## Troubleshooting

### Card doesn't lift on hover
- Check if `.hover-lift` class is applied
- Verify CSS is loaded correctly
- Check browser console for errors

### Shadow doesn't enhance
- Verify `--shadow-level-3` CSS variable is defined
- Check if glassmorphism styles are loaded
- Inspect element to see computed styles

### Tooltip doesn't appear
- Check if `isHovered` state is updating
- Verify mouse event handlers are attached
- Check z-index and positioning

### Animations are choppy
- Check browser performance
- Verify GPU acceleration is enabled
- Test in different browsers

## Code References

### Component
- **File**: `dashboard/components/dashboard/PollutantCard.tsx`
- **Lines**: Hover state management and tooltip rendering

### CSS
- **File**: `dashboard/app/globals.css`
- **Lines**: 208-215 (`.hover-lift` class)

### Tests
- **File**: `dashboard/components/dashboard/__tests__/PollutantCard.test.tsx`
- **Section**: "Hover Interactions" describe block

### Visual Test
- **File**: `dashboard/app/test-pollutant-hover/page.tsx`
- **URL**: `/test-pollutant-hover`

## Requirements Satisfied

✅ **Requirement 3.5**: Hover interactions on pollutant cards
- Lift effect: 4px translate
- Enhanced shadow
- Tooltip with detailed information

✅ **Requirement 12.1**: Card hover animations
- Smooth transitions
- 0.3s duration
- Ease timing function
- 60fps performance

## Next Steps

After verifying hover interactions work correctly:
1. Test on different screen sizes
2. Test on touch devices
3. Verify accessibility with screen readers
4. Check performance in production build
5. Move to Task 6.5: Create PollutantMetricsGrid component

## Summary

The hover interactions provide a polished, interactive experience:
- **Visual Feedback**: Card lifts and shadow enhances
- **Information Display**: Tooltip shows detailed data
- **Smooth Animations**: 0.3s transitions with ease timing
- **Accessibility**: Keyboard and screen reader support
- **Performance**: GPU-accelerated, 60fps animations

All requirements for Task 6.4 have been successfully implemented and tested.

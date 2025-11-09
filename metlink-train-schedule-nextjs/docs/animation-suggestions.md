# Lightweight Animation Suggestions

This document outlines performant CSS-based animation suggestions that fit the minimalist black-and-white design of the train schedule application.

## Design Principles

- **Minimalist**: Subtle animations that enhance UX without being distracting
- **Performant**: Use CSS `transform` and `opacity` for GPU-accelerated animations
- **Accessible**: Respect `prefers-reduced-motion` for users who need reduced motion
- **Consistent**: Use consistent timing and easing across all animations

## Recommended Animations

### 1. Loading States

**Location**: `components/DepartureBoard.tsx` - Loading state in table (line ~508)

**Animation**: Fade in with subtle scale
```css
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.loading-state {
  animation: fadeInScale 0.3s ease-out;
}
```

**Implementation**: Add to loading state div
- Duration: 300ms
- Easing: ease-out
- Properties: opacity, transform (scale)

### 2. Table Row Appearances

**Location**: `components/DepartureBoard.tsx` - DepartureBoardRow component (line ~643)

**Animation**: Staggered fade-in from bottom
```css
@keyframes slideUpFade {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.departure-row {
  animation: slideUpFade 0.4s ease-out;
  animation-fill-mode: both;
}

/* Stagger animation based on index */
.departure-row:nth-child(1) { animation-delay: 0ms; }
.departure-row:nth-child(2) { animation-delay: 50ms; }
.departure-row:nth-child(3) { animation-delay: 100ms; }
.departure-row:nth-child(4) { animation-delay: 150ms; }
.departure-row:nth-child(5) { animation-delay: 200ms; }
/* Cap at 250ms delay for remaining rows */
.departure-row:nth-child(n+6) { animation-delay: 250ms; }
```

**Implementation**: Add to row div with index-based delay
- Duration: 400ms per row
- Stagger: 50ms between rows
- Max delay: 250ms (rows 6+ animate together)

### 3. Direction Toggle Button

**Location**: `components/DepartureBoard.tsx` - Direction toggle button (line ~330)

**Animation**: Icon rotation on click
```css
.direction-toggle-icon {
  transition: transform 0.3s ease-in-out;
}

.direction-toggle-icon.rotating {
  transform: rotate(180deg);
}
```

**Implementation**: Add rotation class on click
- Duration: 300ms
- Easing: ease-in-out
- Property: transform (rotate)

### 4. Status Color Transitions

**Location**: `components/DepartureBoard.tsx` - Status colors (line ~660)

**Animation**: Smooth color transitions
```css
.status-color-transition {
  transition: color 0.3s ease-out, background-color 0.3s ease-out;
}
```

**Implementation**: Already partially implemented with `transition-colors`
- Duration: 300ms
- Properties: color, background-color
- Note: Already using Tailwind's `transition-colors` - ensure it's applied consistently

### 5. Service Notice Panel

**Location**: `components/DepartureBoard.tsx` - Service notice panel (line ~396)

**Animation**: Slide in from right with fade
```css
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.service-notice-panel {
  animation: slideInRight 0.4s ease-out;
}
```

**Implementation**: Add when `selectedNotice` becomes truthy
- Duration: 400ms
- Easing: ease-out
- Properties: opacity, transform (translateX)

### 6. Wait Time Card Updates

**Location**: `components/DepartureBoard.tsx` - Wait time display (line ~384)

**Animation**: Subtle pulse when minutes change
```css
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

.wait-time-value {
  transition: transform 0.2s ease-out;
}

.wait-time-value.updating {
  animation: pulse 0.4s ease-out;
}
```

**Implementation**: Trigger on minutes value change
- Duration: 400ms
- Scale: 1.02 (very subtle)
- Only trigger when value actually changes

### 7. Warning/Alert Items

**Location**: `components/DepartureBoard.tsx` - Warning list items (line ~462)

**Animation**: Fade in with slight slide
```css
@keyframes fadeInSlide {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.warning-item {
  animation: fadeInSlide 0.3s ease-out;
  animation-fill-mode: both;
}

.warning-item:nth-child(1) { animation-delay: 0ms; }
.warning-item:nth-child(2) { animation-delay: 100ms; }
.warning-item:nth-child(3) { animation-delay: 200ms; }
.warning-item:nth-child(n+4) { animation-delay: 300ms; }
```

**Implementation**: Add to warning list items
- Duration: 300ms per item
- Stagger: 100ms between items
- Max delay: 300ms

### 8. Refresh Button Spinner

**Location**: `components/DepartureBoard.tsx` - Refresh button (line ~361)

**Animation**: Already implemented with `animate-spin`
- Current: Uses Tailwind's `animate-spin` class
- Status: Already working correctly
- No changes needed

### 9. Row Selection Highlight

**Location**: `components/DepartureBoard.tsx` - Selected row state (line ~650)

**Animation**: Smooth ring appearance
```css
.selected-row-ring {
  transition: ring-width 0.2s ease-out, ring-color 0.2s ease-out;
}
```

**Implementation**: Enhance existing ring transition
- Duration: 200ms
- Properties: ring-width, ring-color
- Note: Tailwind's ring utilities already handle this, but can be enhanced

### 10. Empty State

**Location**: `components/DepartureBoard.tsx` - Empty state message (line ~513)

**Animation**: Fade in
```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.empty-state {
  animation: fadeIn 0.5s ease-out;
}
```

**Implementation**: Add to empty state div
- Duration: 500ms
- Easing: ease-out
- Property: opacity

## Implementation Notes

### CSS Custom Properties for Consistency

Add to `app/globals.css`:

```css
:root {
  --animation-fast: 200ms;
  --animation-normal: 300ms;
  --animation-slow: 400ms;
  --animation-slower: 500ms;
  --easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-ease-out: cubic-bezier(0, 0, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Tailwind Configuration

Add custom animations to `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-scale': 'fadeInScale 0.3s ease-out',
        'slide-up': 'slideUpFade 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'pulse-subtle': 'pulse 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUpFade: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
      },
    },
  },
}
```

### Performance Considerations

1. **Use `transform` and `opacity`**: These properties are GPU-accelerated and don't trigger layout reflows
2. **Avoid animating**: `width`, `height`, `top`, `left`, `margin`, `padding` (these trigger reflows)
3. **Use `will-change` sparingly**: Only on elements that will definitely animate
4. **Limit simultaneous animations**: Cap stagger delays to prevent too many animations at once
5. **Test on lower-end devices**: Ensure animations remain smooth on mobile devices

### Accessibility

- All animations respect `prefers-reduced-motion`
- Animations are subtle and don't cause motion sickness
- No animations on critical UI elements that need immediate attention
- Animations enhance rather than replace visual feedback

## Priority Implementation Order

1. **High Priority** (Immediate UX improvement):
   - Loading state fade-in (#1)
   - Table row appearances (#2)
   - Service notice panel (#5)

2. **Medium Priority** (Polish):
   - Direction toggle rotation (#3)
   - Warning items (#7)
   - Empty state (#10)

3. **Low Priority** (Nice to have):
   - Wait time pulse (#6)
   - Status color transitions (#4) - mostly already implemented
   - Row selection highlight (#9) - mostly already implemented

## Testing Checklist

- [ ] Test animations on Chrome, Firefox, Safari
- [ ] Test on mobile devices (iOS Safari, Chrome Mobile)
- [ ] Test with `prefers-reduced-motion` enabled
- [ ] Verify no layout shifts during animations
- [ ] Check performance with DevTools Performance tab
- [ ] Ensure animations don't block user interactions
- [ ] Test with slow 3G connection (animations should still work)


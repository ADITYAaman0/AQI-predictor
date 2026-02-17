# Image Optimization Guide

This guide documents image optimization strategies for Task 22.2 - Performance Optimization.

## Current State

The dashboard currently uses SVG images exclusively (in `public/`):
- `file.svg`
- `globe.svg`
- `next.svg`
- `vercel.svg`
- `window.svg`

SVG files are already optimized (vector format, small file size, scalable).

## Next.js Image Optimization

The project is configured to use Next.js `next/image` component with the following optimizations:

### Configuration (next.config.ts)

```typescript
images: {
  // Modern formats (WebP, AVIF) automatically served when supported
  formats: ['image/avif', 'image/webp'],
  
  // Responsive breakpoints
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  
  // Cache optimization
  minimumCacheTTL: 60,
}
```

### Benefits

1. **Automatic WebP/AVIF conversion**: Next.js automatically serves modern formats to browsers that support them
2. **Lazy loading**: Images load only when entering viewport
3. **Responsive images**: Automatically serves correctly-sized images for each device
4. **Built-in CDN**: When deployed to Vercel, uses their global CDN

## Usage Guidelines

### For future image additions:

#### 1. Use next/image for raster images

```tsx
import Image from 'next/image';

// Local images (in public/ or imported)
<Image
  src="/images/hero-background.jpg"
  alt="Hero background"
  width={1920}
  height={1080}
  priority={true} // For above-the-fold images
  placeholder="blur" // Shows blur while loading
/>

// Remote images
<Image
  src="https://api.example.com/image.jpg"
  alt="Dynamic image"
  width={800}
  height={600}
  loading="lazy" // Default behavior
/>
```

#### 2. Image format recommendations

- **Icons**: Use SVG (already optimal)
- **Photographs**: Use AVIF/WebP (Next.js handles conversion)
- **Backgrounds**: Consider CSS gradients instead (better performance)
- **Charts/Graphs**: Generate dynamically with libraries (Recharts)

#### 3. Optimization checklist

Before adding images:

- [ ] Is SVG appropriate? (logos, icons) → Use SVG
- [ ] Can it be CSS? (gradients, patterns) → Use CSS
- [ ] Does it need responsive sizes? → Use next/image with srcSet
- [ ] Is it above the fold? → Set `priority={true}`
- [ ] Is it decorative? → Set `alt=""` and `aria-hidden="true"`

#### 4. Background images

Current implementation uses CSS gradients:

```css
/* From globals.css */
.bg-gradient-to-br {
  background-image: linear-gradient(
    to bottom right,
    var(--tw-gradient-stops)
  );
}
```

**Benefits over image backgrounds:**
- Zero file size
- Perfect scalability
- Smooth animations
- No loading time

If you need image backgrounds in the future, use CSS with next/image:

```tsx
<div className="relative h-screen">
  <Image
    src="/bg.jpg"
    alt=""
    fill
    style={{ objectFit: 'cover' }}
    priority
  />
  <div className="relative z-10">
    {/* Content */}
  </div>
</div>
```

## Performance Metrics

### Current (SVG only)
- Image load time: < 50ms
- Total image weight: < 10KB
- LCP impact: Minimal (no images in critical path)

### Targets (if raster images added)
- Image load time: < 200ms (with lazy loading)
- Modern format adoption: > 90%
- Cumulative Layout Shift (CLS): < 0.1

## Testing

To verify image optimization:

```bash
# Run Lighthouse audit
npm run lighthouse

# Check for unused images
npm run analyze-bundle
```

## Future Enhancements

When adding user-uploaded content or dynamic images:

1. **Server-side optimization**: Use Sharp or similar for pre-processing
2. **CDN**: Use Cloudinary, Imgix, or Vercel's built-in optimization
3. **Placeholder generation**: Generate blur placeholders at build time
4. **Responsive images**: Use srcSet for art direction

## Resources

- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Web.dev Image Optimization Guide](https://web.dev/fast/#optimize-your-images)
- [SVG Optimization (SVGO)](https://github.com/svg/svgo)

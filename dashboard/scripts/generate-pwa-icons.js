/**
 * Generate PWA icons from SVG source
 * 
 * This script generates PNG icons in multiple sizes for PWA support.
 * For production, consider using a tool like @svgr/cli or sharp for better quality.
 */

const fs = require('fs');
const path = require('path');

// Icon sizes to generate
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// For now, we'll create placeholder instructions
// In a real production environment, you would use a tool like:
// - sharp: npm install sharp
// - Inkscape CLI
// - ImageMagick
// - Online services

console.log('📱 PWA Icon Generation Instructions');
console.log('=====================================\n');

console.log('Icon sizes needed:');
ICON_SIZES.forEach(size => {
  console.log(`  ✓ icon-${size}x${size}.png`);
});

console.log('\n📝 To generate icons, use one of these methods:\n');

console.log('Method 1: Using an online tool');
console.log('  1. Visit https://realfavicongenerator.net/ or similar');
console.log('  2. Upload public/icons/icon.svg');
console.log('  3. Download and extract to public/icons/\n');

console.log('Method 2: Using ImageMagick (if installed)');
ICON_SIZES.forEach(size => {
  console.log(`  magick convert -background none -resize ${size}x${size} public/icons/icon.svg public/icons/icon-${size}x${size}.png`);
});

console.log('\nMethod 3: Using Inkscape (if installed)');
ICON_SIZES.forEach(size => {
  console.log(`  inkscape -w ${size} -h ${size} public/icons/icon.svg -o public/icons/icon-${size}x${size}.png`);
});

console.log('\nMethod 4: Install sharp and use Node.js');
console.log('  npm install --save-dev sharp');
console.log('  Then run: node scripts/generate-icons-with-sharp.js\n');

// Create a simple placeholder HTML file that displays the SVG
const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>AQI Predictor Icon</title>
  <style>
    body { 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      min-height: 100vh; 
      background: #1e293b;
      margin: 0;
      font-family: system-ui;
    }
    .container {
      text-align: center;
      color: white;
    }
    img {
      max-width: 512px;
      width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>AQI Predictor App Icon</h1>
    <img src="icon.svg" alt="AQI Predictor Icon">
    <p>Use this SVG to generate PNG icons in various sizes</p>
  </div>
</body>
</html>`;

fs.writeFileSync(
  path.join(__dirname, '../public/icons/preview.html'),
  htmlContent
);

console.log('✅ Created preview.html - Open public/icons/preview.html to view the icon\n');

// Create placeholder PNGs with instructions
const placeholderSVG = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#3b82f6" rx="96"/>
  <rect x="32" y="32" width="448" height="448" fill="rgba(255, 255, 255, 0.1)" rx="80" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2"/>
  <text x="256" y="200" font-family="system-ui" font-size="120" font-weight="bold" fill="white" text-anchor="middle">AQI</text>
  <g fill="none" stroke="white" stroke-width="16" stroke-linecap="round">
    <path d="M 128 280 Q 160 260, 192 280"/>
    <path d="M 192 280 Q 224 260, 256 280"/>
    <path d="M 256 280 Q 288 260, 320 280"/>
    <path d="M 320 280 Q 352 260, 384 280"/>
    <path d="M 128 340 Q 160 320, 192 340"/>
    <path d="M 192 340 Q 224 320, 256 340"/>
    <path d="M 256 340 Q 288 320, 320 340"/>
    <path d="M 320 340 Q 352 320, 384 340"/>
  </g>
  <circle cx="256" cy="400" r="12" fill="#10b981"/>
</svg>`;

// Create SVG versions for each size (browsers can display these)
ICON_SIZES.forEach(size => {
  const filename = path.join(__dirname, `../public/icons/icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, placeholderSVG(size));
  console.log(`✓ Created icon-${size}x${size}.svg`);
});

console.log('\n✅ Placeholder SVG icons created');
console.log('⚠️  For production, convert these to PNG using one of the methods above\n');

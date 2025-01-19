const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const MOCKELLO_PINK = '#BE185D';

async function generateFavicons() {
  try {
    // Read the SVG file
    const svgBuffer = await fs.readFile(path.join(__dirname, '../public/safari-pinned-tab.svg'));
    
    // Create the public directory if it doesn't exist
    await fs.mkdir(path.join(__dirname, '../public'), { recursive: true });

    // Generate PNG favicons
    const sizes = {
      'favicon-16x16.png': 16,
      'favicon-32x32.png': 32,
      'favicon-48x48.png': 48,
      'android-chrome-192x192.png': 192,
      'android-chrome-512x512.png': 512,
      'apple-touch-icon.png': 180,
      'mstile-70x70.png': 70,
      'mstile-150x150.png': 150,
      'mstile-310x310.png': 310,
    };

    // Generate square icons with circular mask
    for (const [filename, size] of Object.entries(sizes)) {
      // Create a circular mask
      const mask = Buffer.from(`
        <svg width="${size}" height="${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/>
        </svg>
      `);

      await sharp(svgBuffer)
        .resize(size, size)
        .composite([{
          input: mask,
          blend: 'dest-in'
        }])
        .png()
        .toFile(path.join(__dirname, '../public', filename));
    }

    // Generate wide tile with circular design
    await sharp(svgBuffer)
      .resize(310, 150)
      .extend({
        top: 0,
        bottom: 0,
        left: 80,
        right: 80,
        background: { r: 190, g: 24, b: 93 } // #BE185D
      })
      .png()
      .toFile(path.join(__dirname, '../public/mstile-310x150.png'));

    // Generate social media images with centered circular design
    const socialSizes = {
      'og-image.png': { width: 1200, height: 630 },
      'twitter-card.png': { width: 1200, height: 600 }
    };

    for (const [filename, dimensions] of Object.entries(socialSizes)) {
      const iconSize = Math.min(dimensions.width, dimensions.height) * 0.6;
      
      await sharp(svgBuffer)
        .resize(Math.round(iconSize), Math.round(iconSize))
        .extend({
          top: Math.round((dimensions.height - iconSize) / 2),
          bottom: Math.round((dimensions.height - iconSize) / 2),
          left: Math.round((dimensions.width - iconSize) / 2),
          right: Math.round((dimensions.width - iconSize) / 2),
          background: { r: 0, g: 0, b: 0 }
        })
        .png()
        .toFile(path.join(__dirname, '../public', filename));
    }

    // Generate ICO file
    const icoBuffer = await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toBuffer();

    await fs.writeFile(
      path.join(__dirname, '../public/favicon.ico'),
      icoBuffer
    );

    console.log('Successfully generated all favicons and social media images!');
  } catch (error) {
    console.error('Error generating favicons:', error);
  }
}

generateFavicons(); 
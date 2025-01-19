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

    // Generate square icons
    for (const [filename, size] of Object.entries(sizes)) {
      await sharp(svgBuffer)
        .resize(size, size)
        .composite([{
          input: Buffer.from(`<svg><rect width="${size}" height="${size}" fill="${MOCKELLO_PINK}"/></svg>`),
          blend: 'multiply'
        }])
        .png()
        .toFile(path.join(__dirname, '../public', filename));
    }

    // Generate wide tile
    await sharp(svgBuffer)
      .resize(310, 150)
      .composite([{
        input: Buffer.from(`<svg><rect width="310" height="150" fill="${MOCKELLO_PINK}"/></svg>`),
        blend: 'multiply'
      }])
      .png()
      .toFile(path.join(__dirname, '../public/mstile-310x150.png'));

    // Generate social media images
    const socialSizes = {
      'og-image.png': { width: 1200, height: 630 },
      'twitter-card.png': { width: 1200, height: 600 }
    };

    for (const [filename, dimensions] of Object.entries(socialSizes)) {
      await sharp(svgBuffer)
        .resize(Math.floor(dimensions.height * 0.8), Math.floor(dimensions.height * 0.8))
        .composite([{
          input: Buffer.from(`<svg><rect width="${dimensions.height * 0.8}" height="${dimensions.height * 0.8}" fill="${MOCKELLO_PINK}"/></svg>`),
          blend: 'multiply'
        }])
        .extend({
          top: Math.floor((dimensions.height - dimensions.height * 0.8) / 2),
          bottom: Math.floor((dimensions.height - dimensions.height * 0.8) / 2),
          left: Math.floor((dimensions.width - dimensions.height * 0.8) / 2),
          right: Math.floor((dimensions.width - dimensions.height * 0.8) / 2),
          background: { r: 0, g: 0, b: 0 }
        })
        .png()
        .toFile(path.join(__dirname, '../public', filename));
    }

    // Generate ICO file with multiple sizes
    const icoSizes = [16, 32, 48];
    const icoBuffers = await Promise.all(
      icoSizes.map(size =>
        sharp(svgBuffer)
          .resize(size, size)
          .composite([{
            input: Buffer.from(`<svg><rect width="${size}" height="${size}" fill="${MOCKELLO_PINK}"/></svg>`),
            blend: 'multiply'
          }])
          .png()
          .toBuffer()
      )
    );

    // Use the first size as the favicon.ico
    await fs.writeFile(
      path.join(__dirname, '../public/favicon.ico'),
      icoBuffers[0]
    );

    console.log('Successfully generated all favicons and social media images!');
  } catch (error) {
    console.error('Error generating favicons:', error);
  }
}

generateFavicons(); 
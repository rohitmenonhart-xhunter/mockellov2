#!/bin/bash

# Check if rsvg-convert is installed
if ! command -v rsvg-convert &> /dev/null; then
    echo "rsvg-convert is not installed. Please install librsvg."
    exit 1
fi

# Convert SVG to PNG at different sizes
rsvg-convert -w 16 -h 16 public/favicon.svg > favicon-16.png
rsvg-convert -w 32 -h 32 public/favicon.svg > favicon-32.png
rsvg-convert -w 48 -h 48 public/favicon.svg > favicon-48.png

# Combine PNGs into ICO
convert favicon-16.png favicon-32.png favicon-48.png public/favicon.ico

# Clean up temporary files
rm favicon-16.png favicon-32.png favicon-48.png

echo "Favicon generated successfully!" 
#!/bin/bash

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed. Please install it first."
    exit 1
fi

# Source SVG file
SOURCE="public/favicon.svg"

# Check if source file exists
if [ ! -f "$SOURCE" ]; then
    echo "Source file $SOURCE not found!"
    exit 1
fi

# Create various sizes
convert "$SOURCE" -resize 16x16 "public/favicon-16x16.png"
convert "$SOURCE" -resize 32x32 "public/favicon-32x32.png"
convert "$SOURCE" -resize 48x48 "public/favicon.ico"
convert "$SOURCE" -resize 180x180 "public/apple-touch-icon.png"
convert "$SOURCE" -resize 192x192 "public/android-chrome-192x192.png"
convert "$SOURCE" -resize 512x512 "public/android-chrome-512x512.png"
convert "$SOURCE" -resize 150x150 "public/mstile-150x150.png"

echo "Favicon generation complete!" 
#!/bin/bash
# Script to start the Snap & Cook app with proper configuration

# Change to the absolute path
cd /Users/thomaschauvel/Documents/Tenex/snap-and-cook

# Clear any Metro cache
rm -rf node_modules/.cache

# Clear terminal
clear

echo "========== STARTING SNAP & COOK APP =========="
echo "Current directory: $(pwd)"
echo "Checking for package.json..."

if [ -f "package.json" ]; then
  echo "✅ Found package.json"
else
  echo "❌ package.json not found! Current directory isn't the snap-and-cook directory."
  echo "Current directory: $(pwd)"
  exit 1
fi

# Kill any running Metro instances
echo "Stopping any running Metro instances..."
pkill -f "expo start" || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:8082 | xargs kill -9 2>/dev/null || true
lsof -ti:8083 | xargs kill -9 2>/dev/null || true

# Perform cleanup
echo "Cleaning up Metro bundler cache..."
rm -rf node_modules/.expo
rm -rf /tmp/metro-*
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*

echo ""
echo "Starting Expo in LAN mode for better local connectivity..."
echo "========== APP STARTING =========="
echo ""

# Start directly in LAN mode which is more reliable
npx expo start --lan

# If LAN fails, try with local mode
if [ $? -ne 0 ]; then
  echo ""
  echo "LAN mode failed. Trying with local mode..."
  npx expo start --localhost
fi 
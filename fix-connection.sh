#!/bin/bash
# Script to build a development client that can better handle connectivity issues

# Make sure we're in the correct directory
cd /Users/thomaschauvel/Documents/Tenex/snap-and-cook

echo "========== FIXING CONNECTION ISSUES =========="
echo "Current directory: $(pwd)"

# Kill any previous Metro processes
echo "Stopping any running Metro processes..."
pkill -f "metro" || true
pkill -f "expo start" || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:8082 | xargs kill -9 2>/dev/null || true
lsof -ti:8083 | xargs kill -9 2>/dev/null || true
lsof -ti:8092 | xargs kill -9 2>/dev/null || true

# Deep clean cache and node_modules
echo "Performing deep clean of cache files..."
rm -rf node_modules/.cache
rm -rf node_modules/.expo
rm -rf .expo
rm -rf ios/Pods
rm -rf ios/build
rm -rf android/build
rm -rf /tmp/metro-*
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*

# Create a simple Express server to check network connectivity
echo "
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Network connectivity test successful!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(\`Network test server running at http://0.0.0.0:\${port}\`);
  console.log('If you can access this from your device, your network is properly configured');
});
" > network-test.js

# Install dependencies for the test server if needed
if ! command -v express &> /dev/null; then
    npm install express --no-save
fi

# Start the test server in the background
node network-test.js &
TEST_SERVER_PID=$!

# Get network information
echo ""
echo "Your network information:"
echo "========================="
ifconfig | grep "inet " | grep -v 127.0.0.1
echo ""
echo "Please try accessing http://YOUR_IP_ADDRESS:3000 from your mobile device's browser"
echo "If that works, your network is configured correctly."
echo ""

# Wait for user to test connectivity
read -p "Press Enter once you've tested network connectivity..."

# Kill the test server
kill $TEST_SERVER_PID

# Now start Expo with specific host
echo ""
echo "Starting Expo with explicit host configuration..."
echo ""

# Determine IP address
IP_ADDRESS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

# Export environment variables for React Native
export REACT_NATIVE_PACKAGER_HOSTNAME="$IP_ADDRESS"

# Start Expo with explicit host configuration using lan mode
npx expo start --lan --port=8082 --clear 
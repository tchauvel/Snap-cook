#!/bin/bash
# Script to run the app in development client mode for better connectivity

# Make sure we're in the correct directory
cd /Users/thomaschauvel/Documents/Tenex/snap-and-cook

echo "========== STARTING IN DEV CLIENT MODE =========="
echo "Current directory: $(pwd)"

# Install dev client if not already installed
if ! grep -q "expo-dev-client" package.json; then
  echo "Installing expo-dev-client..."
  npx expo install expo-dev-client
fi

# Kill any previous Metro processes
echo "Stopping any running Metro processes..."
pkill -f "metro" || true
pkill -f "expo start" || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:8082 | xargs kill -9 2>/dev/null || true
lsof -ti:8083 | xargs kill -9 2>/dev/null || true
lsof -ti:8092 | xargs kill -9 2>/dev/null || true

# Clear cache
echo "Clearing cache..."
rm -rf node_modules/.cache
rm -rf node_modules/.expo
rm -rf .expo

# Get IP address for explicit configuration
IP_ADDRESS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
echo "Using IP address: $IP_ADDRESS"

# Set environment variable for the packager hostname
export REACT_NATIVE_PACKAGER_HOSTNAME="$IP_ADDRESS"

# Start in development client mode
echo "Starting in development client mode..."
npx expo start --dev-client --lan --port=8082 
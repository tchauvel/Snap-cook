#!/bin/bash

# Script to run the app in test mode
# This will:
# 1. Generate test ingredients
# 2. Start the app with the test screen

echo "🧪 Starting Snap & Cook in TEST MODE"
echo "===================================="

# Make sure we're in the project root
cd "$(dirname "$0")/.."
echo "📂 Working directory: $(pwd)"

# Kill any existing Metro processes
echo "🧹 Cleaning up previous Metro processes..."
pkill -f "metro" || true
pkill -f "expo start" || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:8083 | xargs kill -9 2>/dev/null || true
lsof -ti:19000 | xargs kill -9 2>/dev/null || true

# Generate test ingredients
echo "🍅 Generating test ingredients..."
node test-ingredients.js

# Start the app in dev mode on a specific port
echo "🚀 Starting app in test mode..."
echo "📱 When the QR code appears, scan it with your device's camera"
echo "📱 Or press 'i' to open in iOS simulator if available"
echo "===================================="

# Use a specific port to avoid conflicts
export PORT=19001
npx expo start --clear 
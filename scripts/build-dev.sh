#!/bin/bash

# Script to build and run the development client for Snap & Cook
# Created by Claude assistant

echo "🍳 Setting up Snap & Cook development environment..."
echo "----------------------------------------------------"

# Check if Expo CLI is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js"
    exit 1
fi

# Navigate to the project directory
cd "$(dirname "$0")/.."
echo "📂 Working directory: $(pwd)"

# Make sure expo-dev-client is installed
echo "🔍 Checking dependencies..."
if ! grep -q "expo-dev-client" package.json; then
    echo "⚙️ Installing expo-dev-client..."
    npm install expo-dev-client
fi

# Build the development client
echo "🔨 Building development client..."
npx expo prebuild

# Start the development server with tunnel
echo "🚀 Starting development server with tunnel..."
echo "----------------------------------------------------"
echo "📱 When the QR code appears, scan it with your device's camera"
echo "⚠️ Important: Make sure your device is on the same network as this computer"
echo "----------------------------------------------------"
npx expo start --tunnel 
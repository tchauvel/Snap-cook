#!/bin/bash
# Script to run the app in web mode to avoid Metro connection issues

# Make sure we're in the correct directory
cd /Users/thomaschauvel/Documents/Tenex/snap-and-cook

echo "========== STARTING IN WEB MODE =========="
echo "Current directory: $(pwd)"

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

# Create a temporary debug log helper
echo "Adding debug logging to ingredient scanner..."
cat > debug-helper.js << 'EOF'
const fs = require('fs');
const path = require('path');

// The path to the ingredient scanner file
const scannerPath = path.join(__dirname, 'app', 'ai-assistance', 'ingredient-scanner.tsx');

// Read the file content
let content = fs.readFileSync(scannerPath, 'utf8');

// Check if the debug log function is already added
if (content.indexOf('showDebugAlert') === -1) {
  // Add the debug function at the beginning of the component
  const functionCode = `
  // Debug helper function
  const showDebugAlert = (title, message) => {
    Alert.alert(
      title,
      typeof message === 'object' ? JSON.stringify(message, null, 2) : message,
      [{ text: "OK" }],
      { cancelable: false }
    );
  };`;

  // Find the beginning of the component
  const componentStart = content.indexOf('export default function IngredientScanner()');
  const openBrace = content.indexOf('{', componentStart);
  
  // Insert the function after the opening brace
  content = content.slice(0, openBrace + 1) + functionCode + content.slice(openBrace + 1);
  
  // Add debug alerts at key points
  content = content.replace(
    /console\.log\('========== DETECTED INGREDIENTS =========='\);/g,
    "console.log('========== DETECTED INGREDIENTS ==========');\n      showDebugAlert('Detected Ingredients', result.data.detectedIngredients);"
  );
  
  content = content.replace(
    /console\.log\('API ERROR:'/g,
    "console.log('API ERROR:');\n        showDebugAlert('API Error', result?.error || 'Unknown error');"
  );
  
  // Save the modified file
  fs.writeFileSync(scannerPath, content, 'utf8');
  console.log('Debug alerts added to ingredient scanner');
}
EOF

# Run the debug helper to add the alert
node debug-helper.js

# Set environment variable for the packager hostname
export REACT_NATIVE_PACKAGER_HOSTNAME="$IP_ADDRESS"

# Start in web mode
echo "Starting in web mode..."
echo "This will open the app in your web browser, where you can test ingredient scanning"
echo "The detected ingredients will show as alerts directly in the app"
echo ""
echo "Press Ctrl+C to stop the server when done"
echo ""

npx expo start --web --port=8080 
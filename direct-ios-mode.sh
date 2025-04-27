#!/bin/bash
# Script to run the app directly on iOS on the default Metro port

# Make sure we're in the correct directory
cd /Users/thomaschauvel/Documents/Tenex/snap-and-cook

echo "========== STARTING IN DIRECT iOS MODE =========="
echo "Current directory: $(pwd)"

# Kill any previous Metro processes
echo "Stopping any running Metro processes..."
pkill -f "metro" || true
pkill -f "expo start" || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:8082 | xargs kill -9 2>/dev/null || true
lsof -ti:8083 | xargs kill -9 2>/dev/null || true
lsof -ti:8092 | xargs kill -9 2>/dev/null || true

# Deep clean cache
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

# Create a simple test file to verify if the app is working
echo "Adding enhanced debug alert to ingredient scanner..."
cat > add-debug-alerts.js << 'EOF'
const fs = require('fs');
const path = require('path');

// The path to the ingredient scanner file
const scannerPath = path.join(__dirname, 'app', 'ai-assistance', 'ingredient-scanner.tsx');

// Read the file content
let content = fs.readFileSync(scannerPath, 'utf8');

// Add or update logToDevice function
if (content.indexOf('logToDevice') !== -1) {
  console.log('Debug alerts already exist in the file');
} else {
  console.log('Adding debug alerts to ingredient scanner...');
  
  // Add verbose logToDevice function at the top of the file
  const logFunctionCode = `
// Enhanced debug logging function
const logToDevice = (message: string, data: any): void => {
  const logMsg = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
  console.log(\`[DEBUG] \${message}: \${logMsg}\`);
  
  // Show alert for important messages
  Alert.alert(
    "Debug: " + message,
    logMsg.substring(0, 500) + (logMsg.length > 500 ? "..." : ""),
    [{ text: "OK" }],
    { cancelable: false }
  );
};
`;

  // Find the end of imports and add the function
  const lastImportPos = content.lastIndexOf('import');
  const afterLastImport = content.indexOf(';', lastImportPos) + 1;
  
  content = content.slice(0, afterLastImport) + "\n" + logFunctionCode + content.slice(afterLastImport);
  
  // Add debug call for detected ingredients
  content = content.replace(
    /console\.log\('========== DETECTED INGREDIENTS =========='\);/g,
    "console.log('========== DETECTED INGREDIENTS ==========');\n      logToDevice('Detected Ingredients', result.data.detectedIngredients);"
  );
  
  // Add debug call when setting scan results
  content = content.replace(
    /console\.log\('State updated with scan results'\);/g, 
    "console.log('State updated with scan results');\n      logToDevice('Scan Results Set', scanResultsData);"
  );
  
  // Add debug call for API errors
  content = content.replace(
    /console\.error\('API ERROR:'/g,
    "console.error('API ERROR:');\n        logToDevice('API Error', result?.error || 'Unknown error');"
  );
  
  // Save the modified file
  fs.writeFileSync(scannerPath, content, 'utf8');
  console.log('Debug alerts added to ingredient scanner successfully');
}
EOF

# Run the debug modification script
node add-debug-alerts.js

# Set environment variables
export REACT_NATIVE_PACKAGER_HOSTNAME="localhost"

# Start Expo on default port 8081 with localhost
echo "Starting with localhost on default port 8081..."
echo "This should be more compatible with iOS devices"
echo "Scan the QR code with your device"
echo ""

npx expo start --port=8081 --localhost 
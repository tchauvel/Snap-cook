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

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

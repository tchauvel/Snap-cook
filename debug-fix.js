const fs = require('fs');
const path = require('path');

// Fix the ingredient scanner
const scannerPath = path.join(__dirname, 'app', 'ai-assistance', 'ingredient-scanner.tsx');
if (fs.existsSync(scannerPath)) {
  console.log('Modifying ingredient scanner...');
  let content = fs.readFileSync(scannerPath, 'utf8');
  
  // Replace the analyzeImage function to show results directly
  if (content.indexOf('// STANDALONE BUILD') === -1) {
    console.log('Adding standalone mode to analyzeImage function...');
    
    // Add a marker to indicate we've modified the file
    content = "// STANDALONE BUILD\n" + content;
    
    // Make sure we extract data properly
    const analyzeImageStart = content.indexOf('const analyzeImage = async');
    if (analyzeImageStart !== -1) {
      // Find the section where we handle successful results
      const successSection = content.indexOf('if (result.success)', analyzeImageStart);
      if (successSection !== -1) {
        // Find where we process the detected ingredients
        const detectedIngredientsSection = content.indexOf('result.data.detectedIngredients', successSection);
        if (detectedIngredientsSection !== -1) {
          // Add an Alert.alert call right after setting scan results
          const setScanResultsLine = content.indexOf('setScanResults(', detectedIngredientsSection);
          if (setScanResultsLine !== -1) {
            const endOfSetScanResults = content.indexOf(';', setScanResultsLine);
            if (endOfSetScanResults !== -1) {
              // Add an alert immediately after setting scan results
              const alertCode = `
      // Explicitly show the results in an alert
      const ingredients = result.data.detectedIngredients.join(', ');
      Alert.alert(
        'Detected Ingredients',
        'Found: ' + ingredients,
        [{ text: 'OK' }],
        { cancelable: false }
      );`;
              
              content = content.slice(0, endOfSetScanResults + 1) + alertCode + content.slice(endOfSetScanResults + 1);
              fs.writeFileSync(scannerPath, content, 'utf8');
              console.log('Successfully modified ingredient scanner for standalone mode');
            }
          }
        }
      }
    }
  } else {
    console.log('Ingredient scanner already modified for standalone mode');
  }
} else {
  console.error('Could not find ingredient scanner file');
}

// Fix app.json for standalone build
const appJsonPath = path.join(__dirname, 'app.json');
if (fs.existsSync(appJsonPath)) {
  console.log('Checking app.json configuration...');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  // Make sure the app has the right settings for standalone build
  if (!appJson.expo.plugins || !appJson.expo.plugins.includes('expo-camera')) {
    console.log('Adding camera plugin to app.json...');
    if (!appJson.expo.plugins) {
      appJson.expo.plugins = [];
    }
    
    // Add the camera plugin if it's not already there
    if (!appJson.expo.plugins.includes('expo-camera')) {
      appJson.expo.plugins.push('expo-camera');
    }
    
    // Write the updated app.json
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
    console.log('Successfully updated app.json with camera plugin');
  } else {
    console.log('Camera plugin already configured in app.json');
  }
} else {
  console.error('Could not find app.json file');
}

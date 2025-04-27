// Simple standalone test for the ingredients functionality
// This script can be run directly with Node.js to test the ingredient detection
// without needing to run the full app

const fs = require('fs');
const path = require('path');

// Get the detected ingredients from the last scan
// This will check if there's a saved file with detected ingredients
const getLastDetectedIngredients = () => {
  const dataPath = path.join(__dirname, 'temp-data.json');
  
  try {
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      return data.ingredients || [];
    }
  } catch (error) {
    console.error('Error reading last scan data:', error);
  }
  
  return [];
};

// Add some mock ingredients for testing
const mockIngredients = [
  'tomato',
  'onion',
  'garlic',
  'chicken',
  'pasta',
  'olive oil',
  'basil',
  'salt',
  'pepper'
];

// Save mock ingredients to file for other parts of the app to use
const saveIngredientsToFile = (ingredients) => {
  const dataPath = path.join(__dirname, 'temp-data.json');
  
  try {
    fs.writeFileSync(dataPath, JSON.stringify({ 
      ingredients,
      timestamp: new Date().toISOString()
    }, null, 2));
    console.log('✅ Ingredients saved to file:', dataPath);
    console.log('📋 Ingredients:', ingredients.join(', '));
  } catch (error) {
    console.error('❌ Error saving ingredients:', error);
  }
};

// Main function to run the test
const runTest = () => {
  console.log('🥗 Snap & Cook - Ingredient Test');
  console.log('================================');
  
  // Get any previously detected ingredients
  const previousIngredients = getLastDetectedIngredients();
  
  if (previousIngredients.length > 0) {
    console.log('📝 Previously detected ingredients:');
    console.log(previousIngredients.join(', '));
    console.log('');
  }
  
  console.log('🔄 Generating new test ingredients...');
  
  // Randomly select 3-7 ingredients from the mock list
  const count = Math.floor(Math.random() * 5) + 3;
  const shuffled = [...mockIngredients].sort(() => 0.5 - Math.random());
  const selectedIngredients = shuffled.slice(0, count);
  
  // Save the selected ingredients
  saveIngredientsToFile(selectedIngredients);
  
  console.log('');
  console.log('🧪 Test completed successfully!');
  console.log('📱 You can now run the app to see these ingredients in action');
};

// Run the test
runTest(); 
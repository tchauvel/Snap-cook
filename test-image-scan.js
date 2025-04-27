// This is a standalone script to test the image-to-ingredients functionality
// It uses a test image and simulates the AI detection process

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Configuration
const TEST_IMAGE_URL = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1000';
const OUTPUT_FILE = path.join(__dirname, 'test-image.jpg');
// Added more ingredients based on what's visible in the actual salad photo
const DETECTED_INGREDIENTS = [
  'tomato',
  'cucumber', 
  'lettuce', 
  'onion', 
  'bell pepper',
  'radish',
  'avocado',
  'kale',
  'carrots',
  'broccoli',
  'spinach',
  'lemon',
  'olive oil'
];

// Mock AI response (similar to what the actual service would return)
const mockAIResponse = {
  success: true,
  data: {
    detectedIngredients: DETECTED_INGREDIENTS,
    confidence: {
      tomato: 0.95,
      cucumber: 0.9,
      lettuce: 0.85,
      onion: 0.8,
      'bell pepper': 0.75,
      radish: 0.92,
      avocado: 0.88,
      kale: 0.83,
      carrots: 0.91,
      broccoli: 0.79,
      spinach: 0.86,
      lemon: 0.78,
      'olive oil': 0.7
    },
    possibleDishes: [
      'Garden Salad',
      'Greek Salad',
      'Cucumber Tomato Salad',
      'Avocado Kale Salad',
      'Rainbow Vegetable Bowl',
      'Superfood Salad',
      'Mediterranean Veggie Mix'
    ]
  }
};

// Download a test image
const downloadImage = () => {
  return new Promise((resolve, reject) => {
    console.log(`Downloading test image from ${TEST_IMAGE_URL}...`);
    
    // If the file already exists, skip download
    if (fs.existsSync(OUTPUT_FILE)) {
      console.log('Test image already exists, skipping download');
      return resolve(OUTPUT_FILE);
    }
    
    const file = fs.createWriteStream(OUTPUT_FILE);
    https.get(TEST_IMAGE_URL, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Image downloaded to ${OUTPUT_FILE}`);
        resolve(OUTPUT_FILE);
      });
    }).on('error', (err) => {
      fs.unlink(OUTPUT_FILE, () => {}); // Delete the file on error
      reject(err);
    });
  });
};

// Save ingredient data to the temp-data.json file
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

// Main function
const testImageToIngredients = async () => {
  console.log('🧪 Testing image-to-ingredients flow with expanded ingredients');
  console.log('==========================================================');
  
  try {
    // Step 1: Get a test image
    await downloadImage();
    console.log('✅ Image ready');
    
    // Step 2: Simulate AI processing
    console.log('🤖 Simulating AI ingredient detection...');
    console.log('Detected ingredients:');
    DETECTED_INGREDIENTS.forEach((ingredient, index) => {
      const confidence = mockAIResponse.data.confidence[ingredient];
      console.log(`  - ${ingredient}: ${Math.round(confidence * 100)}% confidence`);
    });
    
    // Step 3: Save ingredients to temp-data.json
    saveIngredientsToFile(DETECTED_INGREDIENTS);
    
    // Step 4: Provide instructions for testing in the app
    console.log('');
    console.log('✅ Test completed successfully!');
    console.log('');
    console.log('To complete the test in the app:');
    console.log('1. Close and reopen the app to refresh the data');
    console.log('2. Go to the manual-test screen to view the expanded ingredients');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
};

// Run the test
testImageToIngredients(); 
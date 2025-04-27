// Test script for ingredient analysis with Claude
const recipeAIService = require('../services/recipeAIService').default;

// Sample ingredients to analyze
const ingredients = [
  'chicken breast',
  'garlic',
  'olive oil',
  'tomatoes',
  'basil',
  'mozzarella cheese'
];

async function testIngredientAnalysis() {
  console.log('🔄 Testing ingredient analysis with Claude...');
  console.log(`Ingredients to analyze: ${ingredients.join(', ')}`);
  
  try {
    const result = await recipeAIService.analyzeIngredients(ingredients);
    
    console.log('\n✅ Analysis results:');
    console.log('\nPossible cuisines:');
    console.log(result.possibleCuisines.join(', '));
    
    console.log('\nCooking techniques:');
    console.log(result.cookingTechniques.join(', '));
    
    console.log('\nMeal types:');
    console.log(result.mealTypes.join(', '));
    
    console.log('\nDietary preferences:');
    console.log(result.dietaryPreferences.join(', '));
    
  } catch (error) {
    console.error('❌ Error testing ingredient analysis:', error);
  }
}

testIngredientAnalysis(); 
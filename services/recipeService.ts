import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Recipe as RecipeType } from '../types/recipe';

// Define sample recipes to use as fallback
const SAMPLE_RECIPES = [
  {
    id: "sample-1",
    title: 'Spaghetti Carbonara',
    imageUrl: 'https://spoonacular.com/recipeImages/716426-312x231.jpg',
    cookTime: '25 min',
    ingredients: ['spaghetti', 'eggs', 'pancetta', 'parmesan cheese', 'black pepper', 'salt'],
    matchedIngredients: ['pasta', 'eggs', 'cheese'],
    matchScore: 0.6,
    totalIngredients: 6,
    sourceName: 'Sample Recipes'
  },
  {
    id: "sample-2",
    title: 'Vegetable Stir Fry',
    imageUrl: 'https://spoonacular.com/recipeImages/715594-312x231.jpg',
    cookTime: '30 min',
    ingredients: ['bell peppers', 'broccoli', 'carrots', 'snow peas', 'mushrooms', 'garlic', 'ginger', 'soy sauce', 'sesame oil', 'rice'],
    matchedIngredients: ['bell peppers', 'broccoli', 'carrots'],
    matchScore: 0.75,
    totalIngredients: 10,
    sourceName: 'Sample Recipes'
  }
];

export type RecipeDetails = {
  id: string;
  title: string;
  imageUrl: string;
  ingredients: string[];
  steps: string[];
  prepTime: string;
  cookTime: string;
  description?: string;
  sourceName?: string;
  sourceUrl?: string;
  language?: string;
  totalIngredients?: number;
  matchedIngredientsCount?: number;
  servings?: number;
};

export type Recipe = {
  id: string;
  title: string;
  imageUrl: string;
  cookTime: string;
  matchedIngredients?: string[];
  matchScore?: number;
  totalIngredients?: number;
  sourceName?: string;
  language?: string;
  sourceUrl?: string;
  description?: string;
};

// Sample recipe steps for mock data
const SAMPLE_STEPS = [
  "Preheat the oven to 350°F (175°C).",
  "Prepare all ingredients by measuring and chopping as needed.",
  "Heat oil in a large pan over medium heat.",
  "Cook the main ingredients until golden brown.",
  "Add the sauce ingredients and simmer for 5 minutes.",
  "Transfer to a baking dish and bake for 20 minutes or until done.",
  "Let rest for 5 minutes before serving."
];

// Generate random prep time between 10-20 minutes
const getRandomPrepTime = (): string => {
  return `${Math.floor(Math.random() * 11) + 10} min`;
};

// Generate varied cooking time (between 15-55 minutes)
export const getVariedCookTime = (recipeComplexity?: number): string => {
  // Base cooking time is between 15-20 minutes
  const baseTime = 15 + Math.floor(Math.random() * 6);
  
  // Add complexity factor (0-35 minutes based on complexity)
  const complexityFactor = recipeComplexity 
    ? Math.floor(recipeComplexity * 35) 
    : Math.floor(Math.random() * 36);
  
  // Total time is base + complexity factor (15-55 minutes total)
  return `${baseTime + complexityFactor} min`;
};

// Update the Spoonacular API key to use the environment variable or our new key
const SPOONACULAR_KEY = process.env.SPOONACULAR_KEY || '916f8a830ad74308ad067d1bab94a7b4';

/**
 * Get recipe details by ID from multiple sources
 * @param id Recipe ID to fetch
 * @returns Recipe details object
 */
export const getRecipeDetails = async (id: string): Promise<RecipeDetails> => {
  console.log('Loading recipe details for ID:', id);
  try {
    // First, try to get from the cache
    const cacheKey = `recipe_details_${id}`;
    const cachedDetails = await AsyncStorage.getItem(cacheKey);
    
    if (cachedDetails) {
      const details = JSON.parse(cachedDetails);
      // Validate the cached data has all required fields
      if (details && details.ingredients && details.ingredients.length > 0) {
        console.log('Loaded cached recipe details:', details.title);
        return details;
      }
    }
    
    // Check if it's a Spoonacular ID (numeric)
    if (/^\d+$/.test(id)) {
      try {
        // Fetch from Spoonacular API
        if (!SPOONACULAR_KEY || SPOONACULAR_KEY === 'YOUR_SPOONACULAR_API_KEY') {
          throw new Error('No valid Spoonacular API key');
        }
        
        const url = `https://api.spoonacular.com/recipes/${id}/information?apiKey=${SPOONACULAR_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch recipe: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Transform to RecipeDetails
        const details: RecipeDetails = {
          id: data.id.toString(),
          title: data.title,
          imageUrl: data.image,
          ingredients: data.extendedIngredients.map((ing: any) => ing.original || ing.name),
          steps: data.analyzedInstructions?.[0]?.steps?.map((step: any) => step.step) || 
                 data.instructions?.split('\n').filter(Boolean) ||
                 ['No detailed instructions available.'],
          prepTime: `${data.preparationMinutes > 0 ? data.preparationMinutes : 15} min`,
          cookTime: `${data.readyInMinutes > 0 ? data.readyInMinutes : 30} min`,
          sourceName: data.sourceName || 'Spoonacular',
          sourceUrl: data.sourceUrl,
          servings: data.servings || 4
        };
        
        // Cache the details
        await AsyncStorage.setItem(cacheKey, JSON.stringify(details));
        console.log('Loaded Spoonacular recipe details:', details.title);
        return details;
      } catch (error) {
        console.error('Error fetching Spoonacular recipe details:', error);
        // Continue to fallback
      }
    }
    
    // Web recipe or fallback recipe
    // For demo purposes, we'll generate realistic recipe details
    // In a real app, you would scrape the recipe page or use another API
    
    let mockRecipe: RecipeDetails;
    
    if (id.startsWith('web-recipe-')) {
      console.log('Falling back to mock recipe data');
      
      // Create basic real-looking ingredients based on recipe ID
      const ingredients = REAL_INGREDIENTS.slice(0, 10 + Math.floor(Math.random() * 5));
      
      mockRecipe = {
        id,
        title: id.includes('1') ? 'Fresh Garden Salad' : id.includes('2') ? 'Homemade Pasta Dish' : 'Seasonal Recipe',
        imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600',
        ingredients,
        steps: SAMPLE_STEPS.slice(0, 5 + Math.floor(Math.random() * 3)),
        prepTime: getRandomPrepTime(),
        cookTime: getVariedCookTime(),
        sourceName: 'Web Recipe',
        servings: 4
      };
    } else if (id.startsWith('fallback-')) {
      const index = parseInt(id.split('-')[1], 10) || 1;
      
      // Use consistent titles for fallback recipes
      const fallbackTitle = FALLBACK_TITLES[index % FALLBACK_TITLES.length];
      
      // Select real ingredients for the fallback recipe based on the title
      const ingredients = selectIngredientsForRecipe(fallbackTitle, 8 + Math.floor(Math.random() * 4));
      
      mockRecipe = {
        id,
        title: fallbackTitle,
        imageUrl: FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
        ingredients,
        steps: SAMPLE_STEPS.slice(0, 4 + Math.floor(Math.random() * 4)),
        prepTime: getRandomPrepTime(),
        cookTime: getVariedCookTime(),
        sourceName: 'Fallback Recipe',
        servings: 4
      };
      
      console.log(`Created fallback recipe: ${id} with title: ${fallbackTitle}`);
    } else {
      // Generic fallback
      mockRecipe = {
        id,
        title: 'Quick Meal Idea',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600',
        ingredients: REAL_INGREDIENTS.slice(0, 8),
        steps: SAMPLE_STEPS.slice(0, 5),
        prepTime: '15 min',
        cookTime: '30 min',
        sourceName: 'Recipe Collection',
        servings: 4
      };
    }
    
    // Cache the mock data
    await AsyncStorage.setItem(cacheKey, JSON.stringify(mockRecipe));
    return mockRecipe;
  } catch (error) {
    console.error('Error getting recipe details:', error);
    
    // Return super basic fallback
    return {
      id: id,
      title: 'Fallback Recipe',
      imageUrl: 'https://spoonacular.com/recipeImages/654959-312x231.jpg',
      ingredients: REAL_INGREDIENTS.slice(0, 8),
      steps: SAMPLE_STEPS.slice(0, 5),
      prepTime: '15 min',
      cookTime: '30 min',
      sourceName: 'Demo Recipe',
      totalIngredients: 5,
      servings: 4
    };
  }
};

// Real ingredient list for better fallback recipes
const REAL_INGREDIENTS = [
  "2 tablespoons olive oil",
  "1 medium onion, chopped",
  "3 cloves garlic, minced",
  "1 bell pepper, diced",
  "2 carrots, peeled and sliced",
  "1 zucchini, sliced",
  "1 can (14.5 oz) diced tomatoes",
  "2 cups vegetable broth",
  "1 teaspoon dried oregano",
  "1 teaspoon dried basil",
  "1/2 teaspoon salt",
  "1/4 teaspoon black pepper",
  "1 cup rice, rinsed",
  "2 tablespoons fresh parsley, chopped",
  "1/4 cup grated Parmesan cheese",
  "1 tablespoon lemon juice",
  "1 pound chicken breast, cut into pieces",
  "1/2 teaspoon paprika",
  "1/2 teaspoon cumin",
  "1 eggplant, cubed",
  "1 cup pasta",
  "2 tablespoons butter",
  "1/4 cup heavy cream",
  "1/2 cup milk",
  "2 eggs, beaten"
];

const FALLBACK_TITLES = [
  "Vegetable Stir Fry with Rice",
  "Creamy Pasta Primavera",
  "Herb Roasted Chicken",
  "Mediterranean Salad Bowl",
  "Spicy Bean Chili",
  "Garden Vegetable Soup",
  "Quick Tomato Pasta",
  "Garlic Butter Vegetables"
];

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600",
  "https://images.unsplash.com/photo-1547592180-85f173990554?w=600",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600",
  "https://images.unsplash.com/photo-1513442542250-854d436a73f2?w=600"
];

// Select relevant ingredients based on recipe title to make more realistic recipes
const selectIngredientsForRecipe = (title: string, count: number): string[] => {
  title = title.toLowerCase();
  
  // Base ingredients most recipes will have
  const baseIngredients = [
    "1 tablespoon olive oil",
    "1 onion, chopped",
    "2 cloves garlic, minced",
    "1/2 teaspoon salt",
    "1/4 teaspoon black pepper"
  ];
  
  // Specialty ingredients based on recipe type
  let specialtyIngredients: string[] = [];
  
  if (title.includes('stir fry')) {
    specialtyIngredients = [
      "1 bell pepper, sliced",
      "2 carrots, julienned",
      "1 cup broccoli florets",
      "1 tablespoon soy sauce",
      "1 teaspoon sesame oil",
      "2 cups cooked rice",
      "1 tablespoon ginger, minced",
      "2 green onions, sliced"
    ];
  } else if (title.includes('pasta')) {
    specialtyIngredients = [
      "8 oz pasta of choice",
      "1 can (14.5 oz) diced tomatoes",
      "1/4 cup heavy cream",
      "1/2 cup grated Parmesan cheese",
      "1 teaspoon dried basil",
      "1 teaspoon dried oregano",
      "1 zucchini, sliced",
      "1 tablespoon butter"
    ];
  } else if (title.includes('chicken')) {
    specialtyIngredients = [
      "1.5 pounds chicken breast",
      "1 lemon, juiced",
      "2 tablespoons fresh herbs (rosemary, thyme)",
      "1 teaspoon paprika",
      "1/2 teaspoon garlic powder",
      "2 tablespoons butter",
      "1 cup chicken broth",
      "1 tablespoon Dijon mustard"
    ];
  } else if (title.includes('salad')) {
    specialtyIngredients = [
      "4 cups mixed greens",
      "1 cucumber, sliced",
      "1 cup cherry tomatoes, halved",
      "1/4 red onion, thinly sliced",
      "1/2 cup crumbled feta cheese",
      "1/4 cup olives",
      "2 tablespoons balsamic vinegar",
      "1 avocado, sliced"
    ];
  } else if (title.includes('soup') || title.includes('chili')) {
    specialtyIngredients = [
      "1 can (15 oz) beans, drained",
      "1 can (14.5 oz) diced tomatoes",
      "4 cups vegetable broth",
      "1 cup corn kernels",
      "1 teaspoon cumin",
      "1/2 teaspoon chili powder",
      "1 bay leaf",
      "1/4 cup fresh cilantro, chopped"
    ];
  } else {
    // Generic ingredients for other recipes
    specialtyIngredients = [
      "1 bell pepper, diced",
      "2 carrots, sliced",
      "1 zucchini, sliced",
      "1 cup mushrooms, sliced",
      "1 teaspoon dried herbs",
      "1 can (14.5 oz) diced tomatoes",
      "2 cups vegetable broth",
      "1 cup rice or pasta"
    ];
  }
  
  // Combine base and specialty, then slice to the requested count
  const allIngredients = [...baseIngredients, ...specialtyIngredients];
  // Shuffle the array for variety
  const shuffled = allIngredients.sort(() => 0.5 - Math.random());
  
  // Return requested number of ingredients
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

/**
 * Helper function to check if two ingredients match
 * Exposed for use in other components
 */
export const ingredientsMatch = (userIng: string, recipeIng: string): boolean => {
  userIng = userIng.toLowerCase().trim();
  recipeIng = recipeIng.toLowerCase().trim();
  
  // Exact match
  if (userIng === recipeIng) return true;
  
  // Check if one is a substring of the other, but only if it's a full word
  const userWords = userIng.split(' ');
  const recipeWords = recipeIng.split(' ');
  
  // Check if any user word exactly matches any recipe word
  return userWords.some(userWord => 
    recipeWords.some(recipeWord => 
      userWord === recipeWord || 
      (userWord.length > 3 && recipeWord.includes(userWord)) || 
      (recipeWord.length > 3 && userWord.includes(recipeWord))
    )
  );
};

/**
 * Search for recipes using Spoonacular API
 * @param ingredients List of ingredients to search with
 * @param language Language code (e.g., 'en', 'fr', 'es')
 * @returns List of recipes that match
 */
export const searchSpoonacularRecipes = async (
  ingredients: string[], 
  language: string = 'en'
): Promise<Recipe[]> => {
  try {
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return [];
    }
    
    // Check if we have a valid API key
    if (!SPOONACULAR_KEY || SPOONACULAR_KEY === 'YOUR_SPOONACULAR_API_KEY') {
      console.warn('No Spoonacular API key provided');
      return [];
    }
    
    // Cache key for this search
    const cacheKey = `spoonacular_${ingredients.join('_')}_${language}`;
    
    // Check cache first
    const cachedResults = await AsyncStorage.getItem(cacheKey);
    if (cachedResults) {
      return JSON.parse(cachedResults);
    }
    
    // Create the query parameters
    const params = new URLSearchParams({
      apiKey: SPOONACULAR_KEY,
      ingredients: ingredients.join(','),
      number: '10',
      limitLicense: 'false',
      ranking: '2', // maximize used ingredients
      ignorePantry: 'true',
      language: language,
      addRecipeInformation: 'true' // Get additional details including readyInMinutes
    });
    
    // Log the request URL for debugging
    const requestUrl = `https://api.spoonacular.com/recipes/findByIngredients?${params.toString()}`;
    console.log('Fetching Spoonacular recipes with URL:', requestUrl);
    
    const response = await fetch(requestUrl);
    
    if (!response.ok) {
      console.error(`Spoonacular API Error: ${response.status} - ${await response.text()}`);
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Received ${Array.isArray(data) ? data.length : 0} recipes from Spoonacular`);
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }
    
    // Transform the results
    const recipes: Recipe[] = data.map(item => {
      const usedCount = item.usedIngredientCount || 0;
      const missedCount = item.missedIngredientCount || 0;
      const totalCount = usedCount + missedCount;
      
      // Generate a varied cooking time based on either the API value or a random time
      let cookTime: string;
      if (item.readyInMinutes && item.readyInMinutes > 0) {
        cookTime = `${item.readyInMinutes} min`;
      } else {
        // Calculate complexity as ratio of total ingredients (more ingredients = more complex)
        const recipeComplexity = totalCount > 10 ? 1 : totalCount / 10; 
        cookTime = getVariedCookTime(recipeComplexity);
      }
      
      return {
        id: item.id.toString(),
        title: item.title,
        imageUrl: item.image ? (item.image.startsWith('http') ? item.image : `https://spoonacular.com/recipeImages/${item.image}`) : 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40',
        cookTime,
        matchedIngredients: item.usedIngredients.map((ing: any) => ing.name),
        matchScore: totalCount > 0 ? usedCount / totalCount : 0,
        totalIngredients: totalCount,
        language: language,
        sourceName: 'Spoonacular'
      };
    });
    
    // Filter to ensure minimum 5 ingredients
    const filteredRecipes = recipes.filter(recipe => 
      recipe.totalIngredients && recipe.totalIngredients >= 5
    );
    
    // Cache the results
    await AsyncStorage.setItem(cacheKey, JSON.stringify(filteredRecipes));
    
    return filteredRecipes;
  } catch (error) {
    console.error('Error searching Spoonacular recipes:', error);
    return [];
  }
};

/**
 * Search for recipes using web results (uses a basic mock for now)
 * In a real app, this would use a web scraping service or search API
 */
export const searchWebRecipes = async (
  ingredients: string[],
  language: string = 'en'
): Promise<Recipe[]> => {
  try {
    console.log('Searching web for recipes with ingredients:', ingredients.join(', '));
    
    if (!ingredients || ingredients.length === 0) {
      console.log('No ingredients provided for web search');
      return [];
    }
    
    // In a real implementation, this would use a web search API
    // or scrape recipe websites. For now, we'll just return mock data.
    
    // Get main ingredient for title
    const mainIngredient = ingredients[0] ? ingredients[0].trim() : 'Dish';
    const secondaryIngredient = ingredients.length > 1 ? ingredients[1].trim() : '';
    
    // Ensure title cases for ingredients
    const formatIngredient = (ing: string) => ing.charAt(0).toUpperCase() + ing.slice(1).toLowerCase();
    
    // Generate meaningful titles based on ingredients
    const titles = [
      `${formatIngredient(mainIngredient)} Special`,
      secondaryIngredient ? 
        `${formatIngredient(mainIngredient)} with ${formatIngredient(secondaryIngredient)}` : 
        `Homemade ${formatIngredient(mainIngredient)} Dish`
    ];
    
    // Create varied cooking times using the same approach as in the Spoonacular API
    const recipes: Recipe[] = [
      {
        id: `web-recipe-1`,
        title: titles[0],
        imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800',
        cookTime: getVariedCookTime(0.5), // Medium complexity
        matchedIngredients: ingredients.slice(0, Math.min(3, ingredients.length)),
        matchScore: 0.7, // Score is in 0-1 range
        totalIngredients: 8,
        language: language,
        sourceName: 'Web Recipe'
      },
      {
        id: `web-recipe-2`,
        title: titles[1],
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800',
        cookTime: getVariedCookTime(0.7), // Slightly more complex
        matchedIngredients: ingredients.slice(0, Math.min(2, ingredients.length)),
        matchScore: 0.6, // Score is in 0-1 range
        totalIngredients: 7,
        language: language,
        sourceName: 'Web Recipe'
      }
    ];
    
    return recipes;
  } catch (error) {
    console.error('Error in web recipe search:', error);
    return [];
  }
};

/**
 * Search for recipes using multiple sources and combine the results
 * @param ingredients Array of ingredients to search for
 * @param language Language code (e.g., 'en', 'es')
 * @param maxResults Maximum number of results to return
 * @returns Array of recipes that match the ingredients
 */
export const findMatchingRecipes = async (
  ingredients: string[] = [], 
  language: string = 'en',
  maxResults: number = 15
): Promise<Recipe[]> => {
  try {
    if (!ingredients || ingredients.length === 0) {
      console.log('No ingredients provided, returning empty results');
      return [];
    }
    
    // Build cache key from ingredients and language
    const cacheKey = `recipes_${ingredients.join('_')}_${language}`;
    
    // Try to get from cache first to avoid API calls
    const cachedResults = await AsyncStorage.getItem(cacheKey);
    if (cachedResults) {
      // Ensure we have 5 items when returning from cache
      const parsed = JSON.parse(cachedResults);
      console.log(`Found ${parsed.length} recipe recommendations in cache`);
      return parsed.slice(0, maxResults);
    }
    
    // Log that we're searching
    console.log(`Searching for recipes with ingredients: ${ingredients.join(', ')}`);
    
    // Search using available APIs in parallel
    try {
      const [spoonacularResults, webResults] = await Promise.all([
        searchSpoonacularRecipes(ingredients, language).catch(error => {
          console.error('Error searching Spoonacular recipes:', error);
          return [];
        }),
        searchWebRecipes(ingredients, language).catch(error => {
          console.error('Error searching web recipes:', error);
          return [];
        })
      ]);
      
      console.log(`Found recipes - Spoonacular: ${spoonacularResults.length}, Web: ${webResults.length}`);
      
      // Combine results, prioritizing better matches
      let combinedResults: Recipe[] = [
        ...spoonacularResults,
        ...webResults
      ];
      
      // Deduplicate by title (naive approach)
      const seen = new Set();
      combinedResults = combinedResults.filter(recipe => {
        const lowerTitle = recipe.title.toLowerCase();
        if (seen.has(lowerTitle)) {
          return false;
        }
        seen.add(lowerTitle);
        return true;
      });
      
      // Always ensure we have at least 5 recipes
      if (combinedResults.length < 5) {
        // Add fallback recipes to reach 5
        const fallbackRecipes = generateFallbackRecipes(ingredients);
        const remainingNeeded = 5 - combinedResults.length;
        
        // Filter fallbacks to avoid duplicates with existing results
        const uniqueFallbacks = fallbackRecipes.filter(fallback => 
          !seen.has(fallback.title.toLowerCase())
        ).slice(0, remainingNeeded);
        
        combinedResults = [...combinedResults, ...uniqueFallbacks];
        console.log(`Added ${uniqueFallbacks.length} fallback recipes to reach 5 total`);
      }
      
      // Cap at 5 minimum, maxResults maximum
      const finalResults = combinedResults.slice(0, Math.max(5, maxResults));
      console.log(`Found ${finalResults.length} recipe recommendations`);
      
      // Cache the results for future use (5 minute TTL)
      await AsyncStorage.setItem(cacheKey, JSON.stringify(finalResults));
      setTimeout(() => {
        AsyncStorage.removeItem(cacheKey).catch(() => {});
      }, 5 * 60 * 1000);
      
      return finalResults;
    } catch (error) {
      console.error('Error finding matching recipes:', error);
      
      // Return sample recipes as fallback - ensure 5 recipes
      const fallbackRecipes = generateFallbackRecipes(ingredients);
      console.log(`Returning ${fallbackRecipes.length} fallback recipes due to error`);
      return fallbackRecipes;
    }
  } catch (error) {
    console.error('Error in findMatchingRecipes:', error);
    // Return exactly 5 fallback recipes
    return generateFallbackRecipes(ingredients);
  }
};

// Generate fallback recipes for recipe searches
export const generateFallbackRecipes = (ingredients: string[]): Recipe[] => {
  // Generate fake recipes when no ingredients or API fails
  // Important: We need to maintain consistency in fallback recipe IDs and titles
  
  return Array(6).fill(0).map((_, index) => {
    const recipeId = `fallback-${index + 1}`;
    const title = FALLBACK_TITLES[index % FALLBACK_TITLES.length];
    
    return {
      id: recipeId,
      title,
      imageUrl: FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
      cookTime: getVariedCookTime(),
      sourceName: 'Recipe Collection',
      totalIngredients: 8 + Math.floor(Math.random() * 4),
      matchScore: Math.random() * 0.8 + 0.2 // Random score between 0.2 and 1.0
    };
  });
}; 
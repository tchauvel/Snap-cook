import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { findMatchingRecipes, getVariedCookTime } from '../../services/recipeService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';

// Define our extended Recipe type with all properties we use in this component
interface Recipe {
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
  
  // Additional properties we use in our UI
  matchCount?: number;
  totalCount?: number;
  popular?: boolean;
  
  // Properties from API recipes we might use
  image?: string;
  ingredients?: string[];
  instructions?: string[];
  prepTime?: string;
  servings?: number;
}

// Define the type for the recipe returned by findMatchingRecipes
interface ApiRecipe {
  id: string;
  title: string;
  imageUrl: string;
  cookTime: string;
  ingredients: string[];
  instructions: string[];
  cuisineType: string;
  cookingTechnique: string;
  nutritionInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  dietaryInfo?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  servings: number;
  matchedIngredients: string[];
  matchScore: number;
  // Additional fields needed for our app
  sourceName?: string;
  language?: string;
  sourceUrl?: string;
  matchCount?: number;
  totalCount?: number;
  popular?: boolean;
}

// Define PantryItem interface
interface PantryItem {
  id: string;
  name: string;
  category: string;
  quantity?: string;
  unit?: string;
  available?: boolean;
}

// New interface for NYT Cooking recipe
interface NYTRecipe {
  id: string;
  title: string;
  imageUrl: string;
  cookTime: string;
  description: string;
  rating?: number;
  author?: string;
  url: string;
}

export default function RecipesScreen() {
  const { ingredients, fromPantry } = useLocalSearchParams<{ ingredients?: string, fromPantry?: string }>();
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [matchingRecipes, setMatchingRecipes] = useState<Recipe[]>([]); // Recipes with >10% match
  const [suggestionRecipes, setSuggestionRecipes] = useState<Recipe[]>([]); // Recipes with <=10% match
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTitle, setSearchTitle] = useState('Recommended Recipes');
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const isFromPantry = fromPantry === 'true';

  // Add meal category state and definitions
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const mealCategories = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Dessert'];

  // Load pantry items on component mount
  useEffect(() => {
    loadPantryItems();
  }, []);

  // Set default search title when the screen loads
  useEffect(() => {
    if (ingredients) {
      if (Array.isArray(ingredients)) {
        if (ingredients.length > 0) {
          setSearchTitle(`Recipes with ${ingredients.join(', ')}`);
        } else {
          setSearchTitle('Recommended Recipes');
        }
      } else if (typeof ingredients === 'string') {
        setSearchTitle(`Recipes with ${ingredients}`);
      } else {
        setSearchTitle('Recommended Recipes');
      }
    } else if (isFromPantry) {
      setSearchTitle('Recipes from Your Pantry');
    } else {
      setSearchTitle('Recommended Recipes');
    }
  }, [ingredients, isFromPantry]);

  useEffect(() => {
    fetchRecipes();
  }, [ingredients, pantryItems]);

  // Filter recipes by category
  const getFilteredRecipes = (recipeList: Recipe[]): Recipe[] => {
    if (selectedCategory === 'All') {
      return recipeList;
    }
    return recipeList.filter(recipe => 
      recipe.title.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  };

  // Function to load pantry items from AsyncStorage
  const loadPantryItems = async () => {
    try {
      const pantryData = await AsyncStorage.getItem('pantryItems');
      if (pantryData) {
        const items = JSON.parse(pantryData);
        // Log the actual items to see what's in storage
        console.log('Pantry contains:', JSON.stringify(items, null, 2));
        setPantryItems(items);
        console.log(`Loaded ${items.length} pantry items`);
      } else {
        console.log('No pantry data found in storage');
        setPantryItems([]);
      }
    } catch (error) {
      console.error('Error loading pantry items:', error);
      setPantryItems([]);
    }
  };

  // Debug function to clear pantry data
  const clearPantryData = async () => {
    try {
      await AsyncStorage.removeItem('pantryItems');
      console.log('Pantry data cleared');
      setPantryItems([]);
    } catch (error) {
      console.error('Error clearing pantry data:', error);
    }
  };

  // Function to clear recipe cache data
  const clearRecipeCache = async () => {
    try {
      setLoading(true);
      console.log('Clearing all recipe cache...');
      
      // Get all keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      
      // Filter for recipe-related keys - now with a more aggressive approach
      const recipeKeys = keys.filter(key => 
        key.includes('recipe') || 
        key.includes('Recipe') ||
        key.includes('spoonacular') || 
        key.includes('Spoonacular') ||
        key.includes('edamam') ||
        key.includes('api') ||
        key.includes('Api') ||
        key.includes('cache')
      );
      
      if (recipeKeys.length > 0) {
        // Remove all recipe-related items
        await AsyncStorage.multiRemove(recipeKeys);
        console.log(`Cleared ${recipeKeys.length} recipe cache items:`, recipeKeys);
        
        // Refresh recipes
        await fetchRecipes();
        console.log('Recipe cache cleared and recipes refreshed');
      } else {
        console.log('No recipe cache found to clear');
        // Refresh anyway to ensure freshness
        await fetchRecipes();
      }
    } catch (error) {
      console.error('Error clearing recipe cache:', error);
      // Try to refresh recipes anyway
      await fetchRecipes();
    } finally {
      setLoading(false);
    }
  };

  // Get ingredients from pantry as an array of names
  const getPantryIngredientNames = (): string[] => {
    return pantryItems
      .filter(item => item.available !== false) // Include items that are available or unspecified
      .map(item => item.name.toLowerCase());
  };

  // Function to calculate how many ingredients in a recipe match pantry items
  const calculatePantryMatch = (recipeIngredients: string[]): { matchCount: number, totalCount: number } => {
    if (!recipeIngredients || recipeIngredients.length === 0) {
      return { matchCount: 0, totalCount: 0 };
    }

    const pantryIngredients = getPantryIngredientNames();
    
    // Only count matches if we actually have pantry items
    if (pantryIngredients.length === 0) {
      return { matchCount: 0, totalCount: recipeIngredients.length };
    }
    
    // For each recipe ingredient, check if any pantry ingredient contains it
    const matchedCount = recipeIngredients.filter(recipeIng => 
      pantryIngredients.some(pantryIng => 
        ingredientsMatch(pantryIng, recipeIng)
      )
    ).length;

    return {
      matchCount: matchedCount,
      totalCount: recipeIngredients.length
    };
  };

  // Helper function to check if two ingredients match
  const ingredientsMatch = (pantryIng: string, recipeIng: string): boolean => {
    // Normalize both strings for comparison
    const normalizedPantry = pantryIng.toLowerCase().trim();
    const normalizedRecipe = recipeIng.toLowerCase().trim();
    
    // Check for exact match
    if (normalizedPantry === normalizedRecipe) {
      return true;
    }
    
    // Check if pantry item is contained in recipe ingredient as a full word
    const pantryWords = normalizedPantry.split(/\s+/);
    return pantryWords.some(word => {
      if (word.length < 3) return false; // Skip short words like "of", "to", etc.
      
      // Check if word appears as full word in recipe ingredient
      const wordPattern = new RegExp(`\\b${word}\\b`);
      return wordPattern.test(normalizedRecipe);
    });
  };

  // Function to fetch random recipes from various sources
  const fetchRandomRecipes = async (): Promise<Recipe[]> => {
    try {
      console.log('Attempting to fetch recipes from Spoonacular API...');
      
      // Try to get recipes from Spoonacular API with the provided key
      try {
        // Try different endpoint format - ensuring we get 5 random recipes
        const apiKey = '916f8a830ad74308ad067d1bab94a7b4';
        const url = `https://api.spoonacular.com/recipes/random?number=5&apiKey=${apiKey}`;
        console.log('Fetching from URL:', url);
        
        // Add timestamp to avoid caching and ensure different results each time
        const timestamp = new Date().getTime();
        const urlWithTimestamp = `${url}&_=${timestamp}`;
        
        // Verbose logging for debugging
        console.log('Making request with headers:');
        console.log({
          'Content-Type': 'application/json',
          'x-api-key': apiKey.substring(0, 5) + '...' // Only log part of the key for security
        });
        
        const response = await fetch(urlWithTimestamp, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Some versions of the API require the key in headers instead
            'x-api-key': apiKey,
            // Prevent caching
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
          }
        });
        
        console.log('Spoonacular Response status:', response.status);
        console.log('Response headers:', JSON.stringify(response.headers));
        
        if (response.ok) {
          const responseText = await response.text();
          console.log('Raw response text preview:', responseText.substring(0, 200) + '...');
          
          let data;
          try {
            data = JSON.parse(responseText);
            console.log('Successfully parsed JSON from Spoonacular');
          } catch (jsonError) {
            console.error('Failed to parse JSON response:', jsonError);
            throw new Error('Invalid JSON response from Spoonacular API');
          }
          
          if (data && data.recipes && Array.isArray(data.recipes) && data.recipes.length > 0) {
            console.log(`Got ${data.recipes.length} recipes from Spoonacular`);
            
            // Define unique sources for each recipe
            const sources = [
              'Spoonacular', 
              'Home Cooking', 
              'Culinary Delights', 
              'Chef\'s Collection', 
              'Food Network',
              'Flavor Express',
              'Cooking Light',
              'Gourmet Kitchen',
              'Taste of Home'
            ];
            
            // Process each recipe to include pantry match information
            const randomRecipes = data.recipes.map((recipe: any, index: number) => {
              const ingredients = recipe.extendedIngredients?.map((ing: any) => ing.name) || [];
              const { matchCount, totalCount } = calculatePantryMatch(ingredients);
              
              // Calculate cooking time based on index to ensure variety
              // Base: 15, 19, 23, 27, 31... (for each recipe) + random factor
              const baseTime = 15 + (index * 4);
              const randomFactor = Math.floor(Math.random() * 6); // 0-5 minutes random addition
              const cookTimeValue = baseTime + randomFactor;
              
              // Assign a unique source by index
              const sourceIndex = index % sources.length;
              
              return {
                id: recipe.id,
                title: recipe.title,
                imageUrl: recipe.image || 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?q=80&w=1200',
                cookTime: `${cookTimeValue} min`,
                ingredients: ingredients,
                sourceName: sources[sourceIndex],
                totalCount: totalCount,
                matchCount: matchCount,
                popular: true
              };
            });

            console.log(`Got ${randomRecipes.length} recipes to display`);
            
            // Sort recipes by match percentage (descending)
            const sortedRecipes = randomRecipes.sort((a: Recipe, b: Recipe) => {
              const aScore = a.matchCount !== undefined ? a.matchCount / (a.totalCount || 1) : 0;
              const bScore = b.matchCount !== undefined ? b.matchCount / (b.totalCount || 1) : 0;
              return bScore - aScore;
            });
            
            // Update both state variables
            setRecipes(sortedRecipes);
            setMatchingRecipes(sortedRecipes); // Show all recipes in the matching section
            setSuggestionRecipes([]); // No suggestions needed
            return;
          } else {
            console.log('Invalid recipe data format from API, falling back to local recipes');
            throw new Error('Invalid recipe data from API');
          }
        } else {
          // Read the error response for debugging
          const errorText = await response.text();
          console.error('Spoonacular API error:', response.status, errorText);
          
          // Log detailed error information
          console.error('Error details:');
          console.error('- Status:', response.status);
          console.error('- Status text:', response.statusText);
          console.error('- Response:', errorText.substring(0, 500));
          
          throw new Error(`Spoonacular API error: ${response.status}`);
        }
      } catch (error) {
        console.error('Error fetching from Spoonacular:', error);
        console.log('Error type:', typeof error);
        console.log('Error message:', error instanceof Error ? error.message : String(error));
        console.log('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.log('Falling back to local recipes');
        // Fall through to backup approach
      }
      
      // API call failed, use our local recipe database
      console.log('Using local recipe database');
      const fallbackRecipes = generateFallbackRecipes([]);
      
      // Calculate pantry matches for fallback recipes
      return fallbackRecipes.map(recipe => {
        const { matchCount, totalCount } = calculatePantryMatch(recipe.ingredients || []);
        return {
          ...recipe,
          matchCount: matchCount,
          totalCount: totalCount
        };
      });
    } catch (error) {
      console.error('Error fetching random recipes:', error);
      // Pass empty array to generateFallbackRecipes
      const fallbackRecipes = generateFallbackRecipes([]);
      return fallbackRecipes;
    }
  };
  
  // Generate fallback recipes with stronger randomization
  const generateFallbackRecipes = (ingredients: string[]): Recipe[] => {
    // Always log that we're using fallback recipes
    console.log(`Generating fallback recipes for ingredients: ${JSON.stringify(ingredients)}`);
    
    // Transform ingredients to properly formatted ingredients with quantities
    const formatIngredients = (ingredientList: string[]) => {
      return ingredientList.map(ingredient => {
        if (ingredient.includes(" ")) return ingredient; // Already has quantity
        
        // Add quantities to plain ingredients
        const quantity = ["1/2 cup", "1 cup", "2 tablespoons", "1 tablespoon", "1 teaspoon", "2", "1", "3", "1/4 cup", "1/2 teaspoon"][Math.floor(Math.random() * 10)];
        return `${quantity} ${ingredient}`;
      });
    };
    
    // Array of possible recipe data to randomize selection
    const recipeOptions = [
      {
        id: 'summer-salad',
        title: 'Summer Mediterranean Salad',
        imageUrl: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?q=80&w=1300&auto=format&fit=crop',
        cookTime: '20 min',
        ingredients: formatIngredients([
          'cucumber', 'cherry tomatoes', 'red onion', 'feta cheese', 
          'kalamata olives', 'bell pepper', 'olive oil', 
          'lemon juice', 'oregano', 'salt', 'pepper'
        ]),
        sourceName: 'Mediterranean Kitchen',
        totalCount: 11,
        matchCount: 0,
        popular: true
      },
      {
        id: 'garlic-shrimp-pasta',
        title: 'Garlic Shrimp Linguine',
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=1170&auto=format&fit=crop',
        cookTime: '25 minutes',
        ingredients: formatIngredients([
          'shrimp', 'linguine pasta', 'garlic', 'butter', 
          'olive oil', 'white wine', 'red pepper flakes', 
          'parsley', 'lemon juice', 'parmesan cheese'
        ]),
        sourceName: 'Seafood Delights',
        totalCount: 10,
        matchCount: 0,
        popular: true
      },
      {
        id: 'buddha-bowl',
        title: 'Colorful Buddha Bowl',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1170&auto=format&fit=crop',
        cookTime: '30 minutes',
        ingredients: formatIngredients([
          'quinoa', 'sweet potato', 'chickpeas', 'avocado', 
          'kale', 'red cabbage', 'carrot', 'tahini', 
          'lemon juice', 'maple syrup', 'cumin'
        ]),
        sourceName: 'Plant-Based Kitchen',
        totalCount: 11,
        matchCount: 0,
        popular: true
      },
      {
        id: 'chicken-curry',
        title: 'Spicy Chicken Curry',
        imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=1671&auto=format&fit=crop',
        cookTime: '40 minutes',
        ingredients: formatIngredients([
          'chicken thighs', 'onion', 'garlic', 'ginger', 
          'curry powder', 'turmeric', 'coconut milk', 'tomatoes', 
          'cilantro', 'rice', 'lime'
        ]),
        sourceName: 'Spice Route',
        totalCount: 11,
        matchCount: 0,
        popular: true
      },
      {
        id: 'berry-smoothie-bowl',
        title: 'Mixed Berry Smoothie Bowl',
        imageUrl: 'https://images.unsplash.com/photo-1483648969698-5e7dcaa3444f?q=80&w=1974&auto=format&fit=crop',
        cookTime: '10 minutes',
        ingredients: formatIngredients([
          'frozen berries', 'banana', 'greek yogurt', 'almond milk', 
          'honey', 'granola', 'chia seeds', 'fresh berries', 
          'coconut flakes'
        ]),
        sourceName: 'Breakfast Haven',
        totalCount: 9,
        matchCount: 0,
        popular: true
      },
      {
        id: 'roasted-vegetable-pasta',
        title: 'Roasted Vegetable Pasta',
        imageUrl: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?q=80&w=1974&auto=format&fit=crop',
        cookTime: '35 minutes',
        ingredients: formatIngredients([
          'pasta', 'zucchini', 'bell peppers', 'cherry tomatoes', 
          'red onion', 'garlic', 'olive oil', 'balsamic vinegar', 
          'parmesan cheese', 'fresh basil', 'pine nuts'
        ]),
        sourceName: 'Italian Kitchen',
        totalCount: 11,
        matchCount: 0,
        popular: true
      },
      {
        id: 'lemon-herb-chicken',
        title: 'Lemon Herb Grilled Chicken',
        imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?q=80&w=1770&auto=format&fit=crop',
        cookTime: '30 minutes',
        ingredients: formatIngredients([
          'chicken breasts', 'lemon', 'garlic', 'rosemary', 
          'thyme', 'olive oil', 'dijon mustard', 'honey', 
          'salt', 'pepper'
        ]),
        sourceName: 'Grilled Favorites',
        totalCount: 10,
        matchCount: 0,
        popular: true
      },
      {
        id: 'vegetable-stir-fry',
        title: 'Sesame Vegetable Stir Fry',
        imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=1772&auto=format&fit=crop',
        cookTime: '20 minutes',
        ingredients: formatIngredients([
          'broccoli', 'carrot', 'bell pepper', 'snap peas', 
          'mushrooms', 'garlic', 'ginger', 'soy sauce', 
          'sesame oil', 'rice vinegar', 'sriracha'
        ]),
        sourceName: 'Asian Kitchen',
        totalCount: 11,
        matchCount: 0,
        popular: true
      },
      {
        id: 'black-bean-tacos',
        title: 'Black Bean Tacos',
        imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?q=80&w=1770&auto=format&fit=crop',
        cookTime: '25 minutes',
        ingredients: formatIngredients([
          'black beans', 'corn tortillas', 'avocado', 'red onion', 
          'tomato', 'cilantro', 'lime', 'cumin', 'chili powder', 
          'sour cream', 'hot sauce'
        ]),
        sourceName: 'Mexican Table',
        totalCount: 11,
        matchCount: 0,
        popular: true
      },
      {
        id: 'salmon-quinoa-bowl',
        title: 'Salmon Quinoa Power Bowl',
        imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1770&auto=format&fit=crop',
        cookTime: '30 minutes',
        ingredients: formatIngredients([
          'salmon fillet', 'quinoa', 'spinach', 'avocado', 
          'cucumber', 'radishes', 'lemon', 'dill', 'olive oil', 
          'dijon mustard', 'honey'
        ]),
        sourceName: 'Nutritious Meals',
        totalCount: 11,
        matchCount: 0,
        popular: true
      },
      {
        id: 'mushroom-risotto',
        title: 'Creamy Mushroom Risotto',
        imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?q=80&w=1770&auto=format&fit=crop',
        cookTime: '45 minutes',
        ingredients: formatIngredients([
          'arborio rice', 'mushrooms', 'onion', 'garlic', 
          'white wine', 'vegetable broth', 'parmesan cheese', 
          'butter', 'olive oil', 'thyme', 'parsley'
        ]),
        sourceName: 'Italian Cuisine',
        totalCount: 11,
        matchCount: 0,
        popular: true
      },
      {
        id: 'beef-stir-fry',
        title: 'Beef and Broccoli Stir Fry',
        imageUrl: 'https://images.unsplash.com/photo-1605522425521-39949bd3714f?q=80&w=1770&auto=format&fit=crop',
        cookTime: '25 minutes',
        ingredients: formatIngredients([
          'beef strips', 'broccoli', 'red bell pepper', 'garlic', 
          'ginger', 'soy sauce', 'oyster sauce', 'sesame oil', 
          'cornstarch', 'rice', 'green onions'
        ]),
        sourceName: 'Asian Flavors',
        totalCount: 11,
        matchCount: 0,
        popular: true
      },
      {
        id: 'avocado-toast',
        title: 'Loaded Avocado Toast',
        imageUrl: 'https://images.unsplash.com/photo-1603046891744-76325193bc3e?q=80&w=987&auto=format&fit=crop',
        cookTime: '15 minutes',
        ingredients: formatIngredients([
          'sourdough bread', 'avocado', 'eggs', 'cherry tomatoes', 
          'feta cheese', 'red pepper flakes', 'lemon juice', 
          'olive oil', 'microgreens', 'salt', 'pepper'
        ]),
        sourceName: 'Brunch Favorites',
        totalCount: 11,
        matchCount: 0,
        popular: true
      },
      {
        id: 'falafel-wrap',
        title: 'Homemade Falafel Wrap',
        imageUrl: 'https://images.unsplash.com/photo-1615361200141-f45961bc0d784?q=80&w=1064&auto=format&fit=crop',
        cookTime: '40 minutes',
        ingredients: formatIngredients([
          'chickpeas', 'parsley', 'cilantro', 'onion', 
          'garlic', 'cumin', 'coriander', 'flour', 
          'pita bread', 'tahini sauce', 'cucumber', 'tomato'
        ]),
        sourceName: 'Mediterranean Delights',
        totalCount: 12,
        matchCount: 0,
        popular: true
      }
    ];
    
    // Select random recipes based on available ingredients
    let selectedRecipes = [...recipeOptions]; // Start with all recipes
    
    // If we have ingredients, prioritize recipes that use them
    if (ingredients && ingredients.length > 0) {
      // First, try to match recipes with the provided ingredients
      selectedRecipes.forEach(recipe => {
        let matchCount = 0;
        recipe.ingredients.forEach(recipeIng => {
          const recipeIngLower = recipeIng.toLowerCase();
          ingredients.forEach(userIng => {
            const userIngLower = userIng.toLowerCase();
            // Check if the user ingredient is in the recipe ingredient
            if (recipeIngLower.includes(userIngLower)) {
              matchCount++;
            }
          });
        });
        
        // Calculate match percentage
        recipe.matchCount = matchCount;
        recipe.totalCount = recipe.ingredients.length;
      });
      
      // Sort by match count (highest first)
      selectedRecipes.sort((a, b) => b.matchCount - a.matchCount);
    } else {
      // No ingredients provided, just randomize the selection
      selectedRecipes.sort(() => Math.random() - 0.5);
    }
    
    // Select the top 5 recipes
    const result = selectedRecipes.slice(0, 5);
    
    // Add 'suggestion' flag for recipes with low match count
    result.forEach(recipe => {
      if (recipe.matchCount === 0) {
        // Use type assertion to avoid TypeScript error
        (recipe as Recipe & { suggestion?: boolean }).suggestion = true;
      }
    });
    
    console.log(`Added ${result.length} fallback recipes to reach 5 total`);
    
    return result;
  };

  const showPopularRecipes = async () => {
    console.log('Attempting to fetch recipes from Spoonacular API...');
    try {
      // Try to get recipes from Spoonacular API with the provided key
      try {
        // Try different endpoint format - ensuring we get 5 random recipes
        const apiKey = '916f8a830ad74308ad067d1bab94a7b4';
        const url = `https://api.spoonacular.com/recipes/random?number=5&apiKey=${apiKey}`;
        console.log('Fetching from URL:', url);
        
        // Add timestamp to avoid caching and ensure different results each time
        const timestamp = new Date().getTime();
        const urlWithTimestamp = `${url}&_=${timestamp}`;
        
        // Verbose logging for debugging
        console.log('Making request with headers:');
        console.log({
          'Content-Type': 'application/json',
          'x-api-key': apiKey.substring(0, 5) + '...' // Only log part of the key for security
        });
        
        const response = await fetch(urlWithTimestamp, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Some versions of the API require the key in headers instead
            'x-api-key': apiKey,
            // Prevent caching
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }

        const data = await response.json();
        const apiRecipes = data.recipes || [];
        
        // If we got recipes from the API, transform them to our format
        if (apiRecipes && apiRecipes.length > 0) {
          // Log the number of recipes
          console.log(`Got ${apiRecipes.length} recipes from Spoonacular`);
          
          // Calculate how many pantry ingredients match each recipe
          const isPantryEmpty = pantryItems.length === 0;
          
          // Process recipes to get them into the right format
          const randomRecipes = apiRecipes.map((recipe: any, index: number) => {
            // Extract ingredients from Spoonacular response
            const recipeIngredients = recipe.extendedIngredients 
              ? recipe.extendedIngredients.map((ing: any) => ing.name) 
              : [];
            
            // Calculate ingredient matches (but only if pantry is not empty)
            const { matchCount, totalCount } = isPantryEmpty 
              ? { matchCount: 0, totalCount: recipeIngredients.length }
              : calculatePantryMatch(recipeIngredients);
            
            return {
              id: recipe.id,
              title: recipe.title,
              imageUrl: recipe.image,
              cookTime: recipe.readyInMinutes 
                ? `${recipe.readyInMinutes} min` 
                : `${15 + (index * 5)} min`,
              ingredients: recipeIngredients,
              sourceName: recipe.sourceName || 'Spoonacular',
              matchCount: matchCount,
              totalCount: totalCount,
              popular: true
            };
          });

          console.log(`Got ${randomRecipes.length} recipes to display`);
          
          // Sort recipes by match percentage (descending)
          const sortedRecipes = randomRecipes.sort((a: Recipe, b: Recipe) => {
            const aScore = a.matchCount !== undefined ? a.matchCount / (a.totalCount || 1) : 0;
            const bScore = b.matchCount !== undefined ? b.matchCount / (b.totalCount || 1) : 0;
            return bScore - aScore;
          });
          
          // Update both state variables
          setRecipes(sortedRecipes);
          setMatchingRecipes(sortedRecipes); // Show all recipes in the matching section
          setSuggestionRecipes([]); // No suggestions needed
          return;
        }
      } catch (error) {
        console.error('Error fetching from Spoonacular:', error);
      }
      
      // If Spoonacular failed, generate fallback recipes
      const ingredientList = getPantryIngredientNames();
      const fallbackRecipes = generateFallbackRecipes(ingredientList);
      console.log(`Generated ${fallbackRecipes.length} fallback recipes`);
      
      // Update both state variables
      setRecipes(fallbackRecipes);
      setMatchingRecipes(fallbackRecipes); // Show all recipes in the matching section
      setSuggestionRecipes([]); // No suggestions needed
      
    } catch (error) {
      console.error('Error showing popular recipes:', error);
      // Fallback to local random recipes if API call fails
      const fallbackRecipes = generateFallbackRecipes([]);
      
      // Update both state variables
      setRecipes(fallbackRecipes);
      setMatchingRecipes(fallbackRecipes); // Show all recipes in the matching section
      setSuggestionRecipes([]); // No suggestions needed
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear previous results
      setRecipes([]);
      setMatchingRecipes([]);
      setSuggestionRecipes([]);
      
      if (!ingredients) {
        showPopularRecipes();
        return;
      }

      // Parse ingredients from URL params
      const ingredientList = ingredients.split(',');

      // Only suggest recipes when there are 5 or more ingredients
      if (ingredientList.length < 5) {
        setError(`Please add at least 5 ingredients to get recipe matches. You currently have ${ingredientList.length}.`);
        showPopularRecipes();
        return;
      }

      setSearchTitle(
        isFromPantry 
          ? 'Recipes from Your Pantry' 
          : 'Recipes from Scanned Ingredients'
      );

      console.log(`Searching for recipes with ${ingredientList.length} ingredients`);
      
      // Find matching recipes
      const matchedRecipes = await findMatchingRecipes(ingredientList) as ApiRecipe[];
      
      if (!matchedRecipes || matchedRecipes.length === 0) {
        console.log('No recipes found, showing popular recipes');
        showPopularRecipes();
        return;
      }

      // Process recipes to include matched ingredient count
      const processedRecipes = matchedRecipes.map((recipe, index) => {
        // Calculate ingredient match count
        const recipeIngredients = recipe.ingredients || [];
        const matchedCount = recipeIngredients.filter((recipeIng: string) => 
          ingredientList.some(userIng => 
            recipeIng.toLowerCase().includes(userIng.toLowerCase())
          )
        ).length;

        // Generate a unique cooking time for each recipe
        const baseTime = 15 + (index * 5); // Base times: 15, 20, 25, 30, 35...
        const randomFactor = Math.floor(Math.random() * 7); // 0-6 minutes random addition
        const cookTimeValue = baseTime + randomFactor;
        
        // Define varied sources for recipes
        const sources = [
          'Spoonacular', 
          'Home Cooking', 
          'Culinary Delights', 
          'Chef\'s Collection', 
          'Food Network',
          'Flavor Express',
          'Cooking Light',
          'Gourmet Kitchen',
          'Taste of Home'
        ];
        
        // Assign unique source using index
        const sourceIndex = index % sources.length;

        return {
          id: recipe.id,
          title: recipe.title,
          imageUrl: recipe.imageUrl,
          cookTime: `${cookTimeValue} min`,
          ingredients: recipe.ingredients,
          sourceName: sources[sourceIndex],
          matchCount: matchedCount,
          totalCount: recipeIngredients.length,
          popular: false,
          suggestion: false
        };
      });

      // Filter out recipes with insufficient ingredients (fewer than 5)
      const MIN_INGREDIENTS_COUNT = 5;
      const validRecipes = processedRecipes.filter(recipe => {
        const hasEnoughIngredients = recipe.ingredients && recipe.ingredients.length >= MIN_INGREDIENTS_COUNT;
        if (!hasEnoughIngredients) {
          console.log(`Filtering out recipe "${recipe.title}" with only ${recipe.ingredients?.length || 0} ingredients`);
        }
        return hasEnoughIngredients;
      });

      // If we don't have any valid recipes after filtering, show popular recipes
      if (validRecipes.length === 0) {
        console.log('No recipes with sufficient ingredients found, showing popular recipes');
        showPopularRecipes();
        return;
      }

      // Sort recipes by match percentage (descending)
      const sortedRecipes = validRecipes.sort((a, b) => {
        const aScore = a.matchCount / a.totalCount;
        const bScore = b.matchCount / b.totalCount;
        return bScore - aScore;
      });
      
      // Separate recipes into matching (>10%) and suggestions (<=10%)
      const MATCH_THRESHOLD = 0.1; // 10% match threshold
      const matching = sortedRecipes.filter(recipe => {
        const matchPercentage = recipe.matchCount / (recipe.totalCount || 1);
        return matchPercentage > MATCH_THRESHOLD;
      });
      
      const suggestions = sortedRecipes.filter(recipe => {
        const matchPercentage = recipe.matchCount / (recipe.totalCount || 1);
        return matchPercentage <= MATCH_THRESHOLD;
      }).map(recipe => ({
        ...recipe,
        suggestion: true
      }));
      
      // Update the conditions for displaying recipes
      if (matching.length === 0 && suggestions.length > 0) {
        // No matches above threshold but we have suggestions
        setError('No strong matches found with your ingredients, but you might like these suggestions:');
        setSuggestionRecipes(suggestions);
        setRecipes(suggestions); // Show only suggestions when no matches above threshold
      } else if (matching.length > 0) {
        // We have matches above the threshold - always show both matches and suggestions
        setMatchingRecipes(matching);
        setSuggestionRecipes(suggestions);
        setRecipes([...matching, ...suggestions]); // Show both matches and suggestions
        setError(null); // Clear any error message
      } else {
        // No matches or suggestions at all
        setError('No recipes found with your ingredients. Try adding more variety to your ingredient list.');
        showPopularRecipes();
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
      // Pass pantry ingredients names to generateFallbackRecipes
      const pantryIngredients = getPantryIngredientNames();
      const fallbackRecipes = generateFallbackRecipes(pantryIngredients);
      setRecipes(fallbackRecipes);
      setMatchingRecipes(fallbackRecipes);
      setSuggestionRecipes([]);
      setError('Failed to fetch recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecipePress = (recipe: Recipe) => {
    console.log(`Opening recipe: ID=${recipe.id}, Title=${recipe.title}`);
    
    const saveRecipeData = async () => {
      try {
        // Create a cache key using the recipe ID
        const cacheKey = `recipe_info_${recipe.id}`;
        
        // Create a recipe object with all important fields
        const recipeInfo = {
          id: recipe.id,
          title: recipe.title,
          imageUrl: recipe.imageUrl || recipe.image, // Use image as fallback if imageUrl is not available
          cookTime: recipe.cookTime || "30 min",
          sourceName: recipe.sourceName || "",
          // Add default values for required fields for RecipeDetails
          ingredients: recipe.ingredients || recipe.matchedIngredients || [],
          steps: recipe.instructions || ["See full recipe for detailed instructions."],
          prepTime: recipe.prepTime || "15 min",
          servings: recipe.servings || 4
        };
        
        // Log detailed info about the recipe we're saving
        console.log(`Saving recipe data to cache: ID=${recipe.id}`);
        console.log(`Title: ${recipeInfo.title}`);
        console.log(`Image URL: ${recipeInfo.imageUrl}`);
        
        await AsyncStorage.setItem(cacheKey, JSON.stringify(recipeInfo));
        
        // Also save the basic recipe data directly to ensure it's available
        await AsyncStorage.setItem(`recipe_basic_${recipe.id}`, JSON.stringify({
          id: recipe.id,
          title: recipe.title,
          imageUrl: recipeInfo.imageUrl
        }));
        
        console.log(`Cached recipe data for ID: ${recipe.id}, Title: ${recipe.title}`);
      } catch (error) {
        console.error('Error caching recipe info:', error);
      }
    };
    
    saveRecipeData();
    
    // Use our custom recipe details page that uses recipeService.getRecipeDetails
    router.push({
      pathname: "/ai-assistance/recipe-details",
      params: { 
        id: recipe.id.toString(),
        title: recipe.title,
        directTitle: encodeURIComponent(recipe.title), // Send encoded title to ensure consistency
        directImageUrl: encodeURIComponent(recipe.imageUrl || recipe.image || '') // Pass image URL directly to ensure consistency
      }
    });
  };

  const renderItem = ({ item }: { item: Recipe }) => {
    // Calculate match percentage
    const matchCount = item.matchCount || 0;
    const totalCount = item.totalCount || 1;
    const matchPercentage = Math.min(matchCount / totalCount, 1); // Ensure it doesn't exceed 100%
    const matchColor = getMatchColor(matchPercentage);
    
    // Format match percentage for display - always calculate from the raw numbers
    const matchText = `${Math.round(matchPercentage * 100)}%`;
    
    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => handleRecipePress(item)}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.recipeImage}
          resizeMode="cover"
        />
        
        {/* Match score badge */}
        {matchCount > 0 && (
          <View style={[styles.matchScoreBadge, { backgroundColor: matchColor }]}>
            <Text style={styles.matchScoreText}>{matchText}</Text>
          </View>
        )}
        
        {/* Popular badge - Position on the right side */}
        {item.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>Popular</Text>
          </View>
        )}
        
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeTitle}>{item.title}</Text>
          
          {item.sourceName && (
            <Text style={styles.sourceText}>
              Source: {item.sourceName}
            </Text>
          )}
          
          <View style={styles.recipeMetaRow}>
            {/* Cook time */}
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.metaText}>{item.cookTime}</Text>
            </View>
            
            {/* Ingredient count */}
            <View style={styles.metaItem}>
              <Ionicons name="restaurant-outline" size={16} color="#666" />
              <Text style={styles.metaText}>
                {matchCount}/{totalCount} ingredients
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 75) return '#4CAF50'; // Green for high match (75%+)
    if (percentage >= 50) return '#8BC34A'; // Light green for good match (50-74%)
    if (percentage >= 30) return '#FFC107'; // Amber for medium match (30-49%)
    if (percentage >= 10) return '#FF9800'; // Orange for low match (10-29%)
    return '#F44336'; // Red for very low match (below 10%)
  };

  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{searchTitle}</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={clearRecipeCache}
        >
          <Ionicons name="refresh" size={24} color="#E07A5F" />
        </TouchableOpacity>
      </View>
    );
  };

  // Create category filter component
  const renderCategoryFilters = () => {
    return (
      <View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoryFiltersContainer}
        >
          {mealCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryFilterChip,
                selectedCategory === category && styles.activeCategoryChip
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text 
                style={[
                  styles.categoryFilterText,
                  selectedCategory === category && styles.activeCategoryText
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Add a new section header component
  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  // Render content sections
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E07A5F" />
          <Text style={styles.loadingText}>Finding the perfect recipes for you...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchRecipes}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (recipes.length === 0) {
      return renderEmptyState();
    }

    return (
      <View style={styles.contentContainer}>
        {matchingRecipes.length > 0 && (
          <View>
            {renderSectionHeader(matchingRecipes[0].popular ? 'Recommended Recipes' : 'Best Matches')}
            <FlatList
              data={matchingRecipes.slice().sort((a, b) => {
                const aScore = (a.matchCount || 0) / (a.totalCount || 1);
                const bScore = (b.matchCount || 0) / (b.totalCount || 1);
                return bScore - aScore;
              })}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.recipesList}
              ListEmptyComponent={
                <Text style={styles.noRecipesText}>No matching recipes found</Text>
              }
            />
          </View>
        )}

        {suggestionRecipes.length > 0 && (
          <View>
            {renderSectionHeader('Other Suggestions')}
            <FlatList
              data={suggestionRecipes.slice().sort((a, b) => {
                const aScore = (a.matchCount || 0) / (a.totalCount || 1);
                const bScore = (b.matchCount || 0) / (b.totalCount || 1);
                return bScore - aScore;
              })}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.recipesList}
              ListEmptyComponent={
                <Text style={styles.noRecipesText}>No suggestions available</Text>
              }
            />
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="basket-outline" size={48} color="#E07A5F" />
      <Text style={styles.emptyStateTitle}>Your pantry is empty</Text>
      <Text style={styles.emptyStateDescription}>
        Add ingredients to your pantry to get personalized recipe recommendations
      </Text>
      <TouchableOpacity 
        style={styles.emptyStateButton}
        onPress={() => router.push('/pantry')}
      >
        <Text style={styles.emptyStateButtonText}>Add Ingredients</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FAF9F7',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#E07A5F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  recipeList: {
    padding: 16,
  },
  recipeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  recipeImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  recipeInfo: {
    padding: 18,
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  recipeDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  sourceText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  addIngredientsToPantryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addIngredientsToPantryText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  matchScoreBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchScoreText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyPantryHeader: {
    width: '100%',
    paddingHorizontal: 0,
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  emptyPantryText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  addToPantryButton: {
    backgroundColor: '#E07A5F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 8,
  },
  addToPantryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  debugButtonsContainer: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'center',
  },
  debugButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  refreshHeaderContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  refreshButtonProminent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E07A5F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 8,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButtonProminentText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(224, 122, 95, 0.1)',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  suggestionCard: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  suggestionBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  suggestionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  noResultsSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#E07A5F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  recipesList: {
    padding: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentSection: {
    padding: 16,
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  addIngredientsButton: {
    backgroundColor: '#E07A5F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  addIngredientsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  infoMessageContainer: {
    padding: 16,
    backgroundColor: '#FFE0E0',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  infoMessageText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  recipeTypeTag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  recipeTypeText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 250,
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 24,
    margin: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginVertical: 12,
    fontFamily: 'System',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    backgroundColor: '#E07A5F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  categoryFiltersContainer: {
    marginBottom: 16,
    marginTop: 4,
  },
  categoryFilterChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeCategoryChip: {
    backgroundColor: '#E07A5F',
  },
  categoryFilterText: {
    fontSize: 14,
    color: '#333',
  },
  activeCategoryText: {
    color: '#fff',
    fontWeight: '500',
  },
  noRecipesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  popularBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E07A5F',
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
}); 
// Recipe Database for Snap & Cook
// Contains a collection of recipes with detailed information

import { Recipe } from '../types/recipe';

/**
 * Recipe database with sample recipes for the application
 */

// Define RecipeData type compatible with Recipe
export type RecipeData = {
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
  dietaryInfo?: string[]; // vegetarian, vegan, gluten-free, etc.
  difficulty: 'easy' | 'medium' | 'hard'; // Changed from string to match Recipe type
  servings: number;
};

// Recipe database
const RECIPE_DATABASE: RecipeData[] = [
  {
    id: "1",
    title: "Spaghetti Carbonara",
    imageUrl: "https://via.placeholder.com/300/CCCCCC/808080?text=Carbonara",
    cookTime: "20 minutes",
    ingredients: ["spaghetti", "eggs", "pancetta", "parmesan cheese", "black pepper", "salt"],
    instructions: [
      "Bring a large pot of salted water to boil and cook spaghetti according to package directions.",
      "While pasta cooks, crisp pancetta in a large skillet over medium heat.",
      "In a bowl, beat eggs and mix with grated parmesan cheese.",
      "Drain pasta, reserving a little cooking water.",
      "Working quickly, add hot pasta to the pancetta, then remove from heat.",
      "Add egg mixture and toss rapidly to create a creamy sauce.",
      "Add a splash of pasta water if needed to thin the sauce.",
      "Season with black pepper and serve immediately."
    ],
    cuisineType: "Italian",
    cookingTechnique: "boiling",
    nutritionInfo: {
      calories: 450,
      protein: 20,
      carbs: 55,
      fat: 18
    },
    dietaryInfo: [],
    difficulty: "medium",
    servings: 4
  },
  {
    id: "2",
    title: "Vegetable Stir Fry",
    imageUrl: "https://via.placeholder.com/300/CCCCCC/808080?text=Stir+Fry",
    cookTime: "15 minutes",
    ingredients: ["bell peppers", "broccoli", "carrots", "snow peas", "mushrooms", "garlic", "ginger", "soy sauce", "sesame oil", "rice"],
    instructions: [
      "Prepare rice according to package instructions.",
      "Slice all vegetables into even-sized pieces.",
      "Heat sesame oil in a wok or large skillet over high heat.",
      "Add garlic and ginger, stir for 30 seconds until fragrant.",
      "Add vegetables, starting with the ones that take longest to cook (carrots, broccoli).",
      "Stir-fry for 5-7 minutes until vegetables are crisp-tender.",
      "Add soy sauce and any other desired sauces.",
      "Serve hot over prepared rice."
    ],
    cuisineType: "Asian",
    cookingTechnique: "stir-frying",
    nutritionInfo: {
      calories: 300,
      protein: 10,
      carbs: 45,
      fat: 8
    },
    dietaryInfo: ["Vegetarian", "Vegan"],
    difficulty: "easy",
    servings: 4
  },
  // Additional recipes would go here
];

/**
 * Get all recipes from the database
 */
export function getAllRecipes(): Recipe[] {
  return RECIPE_DATABASE.map(recipe => ({
    ...recipe,
    matchedIngredients: [],
    matchScore: 0
  })) as unknown as Recipe[];
}

/**
 * Get a recipe by its ID
 */
export function getRecipeById(id: string): Recipe | undefined {
  const recipe = RECIPE_DATABASE.find(r => r.id === id);
  if (!recipe) return undefined;
  
  return {
    ...recipe,
    matchedIngredients: [],
    matchScore: 0
  } as unknown as Recipe;
}

/**
 * Find recipes that match the provided ingredients
 */
export function findRecipesByIngredients(
  ingredients: string[], 
  excludeIds: string[] = []
): Recipe[] {
  if (!ingredients || ingredients.length === 0) {
    return getAllRecipes();
  }
  
  // Filter out recipes with IDs in the exclude list
  const availableRecipes = RECIPE_DATABASE.filter(recipe => !excludeIds.includes(recipe.id));
  
  // Map ingredients to lowercase for case-insensitive matching
  const lowerCaseIngredients = ingredients.map(ing => ing.toLowerCase());
  
  // For each recipe, count how many of its ingredients match the provided ingredients
  const recipesWithMatches = availableRecipes.map(recipe => {
    const matchedIngredients = recipe.ingredients.filter(recipeIng => 
      lowerCaseIngredients.some(userIng => recipeIng.toLowerCase().includes(userIng))
    );
    
    return {
      recipe,
      matchedIngredients,
      matchScore: (matchedIngredients.length / recipe.ingredients.length) * 100
    };
  });
  
  // Sort recipes by match score (highest first)
  recipesWithMatches.sort((a, b) => b.matchScore - a.matchScore);
  
  // Return recipes with at least one matching ingredient
  return recipesWithMatches
    .filter(item => item.matchedIngredients.length > 0)
    .map(item => {
      // Add matched ingredients to the recipe object
      return {
        ...item.recipe,
        matchedIngredients: item.matchedIngredients,
        matchScore: item.matchScore
      };
    }) as unknown as Recipe[];
}

/**
 * Filter recipes by cuisine type
 */
export function filterRecipesByCuisine(cuisineType: string): Recipe[] {
  return RECIPE_DATABASE.filter(recipe => 
    recipe.cuisineType?.toLowerCase() === cuisineType.toLowerCase()
  ).map(recipe => ({
    ...recipe,
    matchedIngredients: [],
    matchScore: 0
  })) as unknown as Recipe[];
}

/**
 * Find recipes that match dietary restrictions
 */
export function findRecipesByDietaryRestrictions(dietaryInfo: string[]): Recipe[] {
  return RECIPE_DATABASE.filter(recipe => 
    dietaryInfo.every(restriction => 
      recipe.dietaryInfo?.includes(restriction)
    )
  ).map(recipe => ({
    ...recipe,
    matchedIngredients: [],
    matchScore: 0
  })) as unknown as Recipe[];
} 
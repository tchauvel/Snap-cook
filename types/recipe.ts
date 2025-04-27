/**
 * Recipe type definition
 */
export type Recipe = {
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
  difficulty: 'easy' | 'medium' | 'hard';
  servings: number;
  matchedIngredients: string[];
  matchScore: number;
  description?: string;
  totalIngredients?: number;
  totalCount?: number;
  matchCount?: number;
  sourceName?: string;
};

/**
 * Recipe recommendation type
 */
export interface RecipeRecommendation {
  recipe: Recipe;
  matchScore: number;
  matchedIngredients: string[];
  suggestedModifications?: string[];
}

/**
 * Ingredient with additional processing information
 */
export interface ProcessedIngredient {
  name: string;
  quantity?: string;
  unit?: string;
  preparation?: string;
  substitutes?: string[];
}

/**
 * Ingredient substitution recommendation
 */
export interface IngredientSubstitution {
  original: string;
  substitutes: {
    name: string;
    howToUse: string;
    expectedImpact: string;
  }[];
}

/**
 * Recipe filter options
 */
export interface RecipeFilters {
  cuisineType?: string[];
  dietaryInfo?: string[];
  maxCookTime?: number;
  difficulty?: ('easy' | 'medium' | 'hard')[];
} 
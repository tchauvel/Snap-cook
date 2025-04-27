import { ProcessedIngredient, IngredientContext } from '../ingredients/ingredientAgent';
import { RECIPE_DATABASE, RecipeData, getAllRecipes, findRecipesByIngredients } from '../../services/recipeDatabase';

// Types
export type RecipeMatch = {
  recipe: RecipeData;
  matchedIngredients: string[];
  matchScore: number;
  freshness: number; // 0-1 score for how "fresh" this recipe is (not shown recently)
};

export type RecipeRecommendation = {
  recipes: RecipeMatch[];
  message: string;
  contextMessage?: string; // Optional message based on context
};

/**
 * The RecipeAgent provides intelligent recipe matching that goes beyond
 * simple ingredient matching to consider flavor profiles, cuisine contexts,
 * cooking techniques, and user patterns.
 */
export class RecipeAgent {
  private seenRecipeIds: Set<string> = new Set();
  private userPreferences: Map<string, number> = new Map(); // cuisine -> preference score
  private lastQuery: string[] = [];
  private lastRecommendation: RecipeMatch[] = [];
  
  constructor() {
    // Initialize with default preferences if needed
  }
  
  /**
   * Get recipe recommendations based on ingredients and context
   */
  public getRecommendations(
    ingredients: string[],
    context?: {
      timeOfDay?: string;
      mealType?: string;
      dietaryRestrictions?: string[];
      cookingTime?: 'quick' | 'medium' | 'long';
    }
  ): RecipeRecommendation {
    this.lastQuery = [...ingredients];
    
    if (!ingredients || ingredients.length === 0) {
      return {
        recipes: [],
        message: "Please provide some ingredients to get recipe recommendations."
      };
    }
    
    // Step 1: Find all potential recipes that use any of the ingredients
    const allRecipes = getAllRecipes();
    
    // Step 2: Score and rank the recipes
    const matchedRecipes = this.scoreRecipes(allRecipes, ingredients, context);
    
    // Step 3: Apply diversity to avoid showing all same cuisine
    const diverseRecipes = this.applyDiversity(matchedRecipes);
    
    // Step 4: Generate appropriate message
    const message = this.generateRecommendationMessage(diverseRecipes, ingredients);
    
    // Step 5: Generate contextual message if appropriate
    const contextMessage = this.generateContextMessage(diverseRecipes, context);
    
    // Track these recommendations for future reference
    this.lastRecommendation = diverseRecipes;
    
    return {
      recipes: diverseRecipes,
      message,
      contextMessage
    };
  }
  
  /**
   * Refresh recommendations to get new recipes not seen before
   */
  public refreshRecommendations(): RecipeRecommendation {
    // Add current recommendations to seen recipes
    this.lastRecommendation.forEach(match => {
      this.seenRecipeIds.add(match.recipe.id);
    });
    
    // Get new recommendations with the same ingredients
    return this.getRecommendations(this.lastQuery);
  }
  
  /**
   * Reset seen recipes to start fresh
   */
  public resetSeenRecipes(): void {
    this.seenRecipeIds.clear();
  }
  
  /**
   * Update user preferences based on selected recipe
   */
  public updatePreferences(recipe: RecipeData, interaction: 'liked' | 'disliked' | 'viewed'): void {
    const cuisineType = recipe.cuisineType;
    const currentScore = this.userPreferences.get(cuisineType) || 0;
    
    let adjustment = 0;
    switch (interaction) {
      case 'liked':
        adjustment = 0.2;
        break;
      case 'disliked':
        adjustment = -0.3;
        break;
      case 'viewed':
        adjustment = 0.1;
        break;
    }
    
    this.userPreferences.set(cuisineType, currentScore + adjustment);
  }
  
  /**
   * Score recipes based on ingredients match, context, and user preferences
   */
  private scoreRecipes(
    recipes: RecipeData[], 
    ingredients: string[],
    context?: any
  ): RecipeMatch[] {
    const scoreResults: RecipeMatch[] = [];
    const normalizedUserIngredients = ingredients.map(ing => ing.toLowerCase());
    
    for (const recipe of recipes) {
      // Ingredient matching score (0-1)
      let matchedIngredients: string[] = [];
      let ingredientMatchScore = 0;
      
      recipe.ingredients.forEach(recipeIngredient => {
        const normalizedRecipeIng = recipeIngredient.toLowerCase();
        
        for (const userIng of normalizedUserIngredients) {
          if (normalizedRecipeIng.includes(userIng) || userIng.includes(normalizedRecipeIng)) {
            matchedIngredients.push(recipeIngredient);
            break;
          }
        }
      });
      
      // Calculate ingredient score
      ingredientMatchScore = matchedIngredients.length / recipe.ingredients.length;
      
      // Context-based adjustment
      let contextScore = 0;
      if (context) {
        // Adjust for meal type
        if (context.mealType) {
          // Logic for meal type matching (e.g., breakfast foods in morning)
          contextScore += 0.1; // Simple placeholder adjustment
        }
        
        // Adjust for cooking time
        if (context.cookingTime) {
          const estimatedTime = this.estimateCookingTime(recipe.cookTime);
          if (
            (context.cookingTime === 'quick' && estimatedTime <= 20) ||
            (context.cookingTime === 'medium' && estimatedTime > 20 && estimatedTime <= 40) ||
            (context.cookingTime === 'long' && estimatedTime > 40)
          ) {
            contextScore += 0.15;
          }
        }
        
        // Adjust for dietary restrictions
        if (context.dietaryRestrictions && recipe.dietaryInfo) {
          const matchingRestrictions = context.dietaryRestrictions.filter(
            (restriction: string) => recipe.dietaryInfo!.includes(restriction)
          );
          if (matchingRestrictions.length > 0) {
            contextScore += 0.2 * (matchingRestrictions.length / context.dietaryRestrictions.length);
          }
        }
      }
      
      // User preference adjustment
      const preferenceScore = this.userPreferences.get(recipe.cuisineType) || 0;
      
      // Freshness factor - reduce score for recipes seen recently
      const freshness = this.seenRecipeIds.has(recipe.id) ? 0.3 : 1;
      
      // Final score calculation - weighted combination of all factors
      const finalScore = (
        (ingredientMatchScore * 0.6) + 
        (contextScore * 0.2) + 
        (preferenceScore * 0.1)
      ) * freshness;
      
      // Only include recipes with some ingredient match
      if (matchedIngredients.length > 0 || ingredients.length === 0) {
        scoreResults.push({
          recipe,
          matchedIngredients: Array.from(new Set(matchedIngredients)),
          matchScore: finalScore,
          freshness
        });
      }
    }
    
    // Sort by score and return top results
    return scoreResults
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
  }
  
  /**
   * Apply diversity to avoid showing all recipes of same cuisine or difficulty
   */
  private applyDiversity(recipes: RecipeMatch[]): RecipeMatch[] {
    if (recipes.length <= 1) return recipes;
    
    // Calculate cuisine and difficulty distribution
    const cuisineDistribution = this.calculateDistribution(recipes, 'cuisineType');
    const difficultyDistribution = this.calculateDistribution(recipes, 'difficulty');
    
    // If we have a dominant cuisine (>60% of results), replace some with other cuisines
    const cuisines = Object.keys(cuisineDistribution);
    if (cuisines.length >= 2) {
      const dominantCuisine = cuisines.reduce((a, b) => 
        cuisineDistribution[a] > cuisineDistribution[b] ? a : b
      );
      
      if (cuisineDistribution[dominantCuisine] > 0.6) {
        const allRecipes = getAllRecipes();
        const otherCuisineRecipes = allRecipes.filter(r => 
          r.cuisineType !== dominantCuisine && !this.seenRecipeIds.has(r.id)
        );
        
        // Replace one of the lower-scoring similar cuisine recipes
        if (otherCuisineRecipes.length > 0) {
          const dominantRecipes = recipes.filter(r => r.recipe.cuisineType === dominantCuisine);
          if (dominantRecipes.length > 1) {
            // Find the lowest scoring dominant cuisine recipe
            const lowestScoringIdx = recipes.findIndex(r => 
              r.recipe.cuisineType === dominantCuisine
            );
            
            if (lowestScoringIdx >= 0) {
              // Replace with a different cuisine
              const replacement = otherCuisineRecipes[Math.floor(Math.random() * otherCuisineRecipes.length)];
              recipes[lowestScoringIdx] = {
                recipe: replacement,
                matchedIngredients: [],  // The replacement might not match ingredients well
                matchScore: recipes[lowestScoringIdx].matchScore * 0.8,  // Slightly reduce score
                freshness: 1
              };
            }
          }
        }
      }
    }
    
    return recipes;
  }
  
  /**
   * Helper to calculate distribution of a property across recipes
   */
  private calculateDistribution(recipes: RecipeMatch[], property: keyof RecipeData): Record<string, number> {
    const distribution: Record<string, number> = {};
    const total = recipes.length;
    
    recipes.forEach(match => {
      const value = match.recipe[property] as string;
      distribution[value] = (distribution[value] || 0) + 1;
    });
    
    // Convert to percentages
    Object.keys(distribution).forEach(key => {
      distribution[key] = distribution[key] / total;
    });
    
    return distribution;
  }
  
  /**
   * Parse cooking time string to minutes
   */
  private estimateCookingTime(timeString: string): number {
    const minutesMatch = timeString.match(/(\d+)\s*minutes/i);
    const hoursMatch = timeString.match(/(\d+)\s*hours?/i);
    
    let totalMinutes = 0;
    if (minutesMatch) totalMinutes += parseInt(minutesMatch[1]);
    if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60;
    
    return totalMinutes || 30; // Default to 30 if parsing fails
  }
  
  /**
   * Generate a helpful message based on recipe recommendations
   */
  private generateRecommendationMessage(recipes: RecipeMatch[], ingredients: string[]): string {
    if (recipes.length === 0) {
      return `I couldn't find any recipes matching your ingredients: ${ingredients.join(', ')}. Try adding more ingredients or using more common ingredients.`;
    }
    
    const topScore = recipes[0].matchScore;
    
    if (topScore > 0.7) {
      return `Found ${recipes.length} great recipes using your ingredients!`;
    } else if (topScore > 0.4) {
      return `Here are some recipes that use some of your ingredients. You might need a few extra items.`;
    } else {
      return `I found some recipes that use a few of your ingredients. You'll need additional ingredients to complete these recipes.`;
    }
  }
  
  /**
   * Generate contextual message based on time of day, preferences, etc.
   */
  private generateContextMessage(recipes: RecipeMatch[], context?: any): string | undefined {
    if (!context) return undefined;
    
    if (context.timeOfDay === 'morning' && recipes.some(r => r.recipe.cuisineType === 'American')) {
      return 'I included some breakfast-friendly options for your morning.';
    }
    
    if (context.cookingTime === 'quick' && recipes.some(r => this.estimateCookingTime(r.recipe.cookTime) <= 20)) {
      return 'I prioritized quick recipes that take less than 20 minutes to prepare.';
    }
    
    return undefined;
  }
  
  /**
   * Estimate the cooking difficulty based on recipe attributes
   */
  private estimateDifficulty(recipe: RecipeData): 'easy' | 'medium' | 'hard' {
    // Count the number of ingredients and steps
    const ingredientCount = recipe.ingredients.length;
    const instructionCount = recipe.instructions.length;
    
    // Use cooking technique as a factor
    const complexTechniques = ['Sous vide', 'Fermenting', 'Baking', 'Roasting'];
    const techniqueComplexity = complexTechniques.includes(recipe.cookingTechnique) ? 1 : 0;
    
    // Calculate a difficulty score
    const difficultyScore = 
      (ingredientCount * 0.2) + 
      (instructionCount * 0.3) + 
      (techniqueComplexity * 0.5);
    
    // Map to difficulty levels
    if (difficultyScore > 8) return 'hard';
    if (difficultyScore > 5) return 'medium';
    return 'easy';
  }
}

export default new RecipeAgent(); 
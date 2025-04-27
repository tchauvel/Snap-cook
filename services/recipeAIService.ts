import claudeAIService from './claudeAIService';
import { getAllRecipes } from './recipeDatabase';
import { Recipe, RecipeRecommendation, ProcessedIngredient } from '../types/recipe';

/**
 * Service to handle AI-powered recipe functionality
 */
export class RecipeAIService {
  /**
   * Get recipe recommendations based on available ingredients
   */
  async getRecipeRecommendations(
    userIngredients: string[],
    limit: number = 5
  ): Promise<RecipeRecommendation[]> {
    try {
      // Validate inputs
      if (!userIngredients || !Array.isArray(userIngredients)) {
        console.error('Invalid user ingredients:', userIngredients);
        return [];
      }

      // Get all available recipes and ensure they match the Recipe type
      const allRecipes = getAllRecipes() as unknown as Recipe[];
      
      // Validate recipes
      if (!allRecipes || !Array.isArray(allRecipes) || allRecipes.length === 0) {
        console.error('No recipes available');
        return [];
      }

      // Use Claude AI to rank and recommend recipes
      const response = await claudeAIService.getRecipeRecommendations(
        userIngredients,
        allRecipes
      );

      if (!response || !response.success || !response.data) {
        console.error('Failed to get recipe recommendations:', response?.error || 'Unknown error');
        return this.getFallbackRecommendations(userIngredients, allRecipes, limit);
      }

      // Process the AI response
      const { rankedRecipeIds, explanations, suggestedModifications } = response.data;
      
      // Validate response data
      if (!rankedRecipeIds || !Array.isArray(rankedRecipeIds)) {
        console.error('Invalid ranked recipe IDs from AI response');
        return this.getFallbackRecommendations(userIngredients, allRecipes, limit);
      }

      // Create recipe recommendations from the ranked IDs
      const recommendations: RecipeRecommendation[] = [];
      
      for (const recipeId of rankedRecipeIds) {
        const recipe = allRecipes.find(r => r.id === recipeId);
        
        if (recipe) {
          // Count matched ingredients - add null checks to prevent filter of undefined
          const matchedIngredients = userIngredients.filter(ing => 
            recipe.ingredients && Array.isArray(recipe.ingredients) && 
            recipe.ingredients.some(recipeIng => 
              recipeIng && typeof recipeIng === 'string' &&
              ing && typeof ing === 'string' &&
              recipeIng.toLowerCase().includes(ing.toLowerCase())
            )
          );
          
          // Calculate match score with null check
          const totalIngredients = (recipe.ingredients && Array.isArray(recipe.ingredients)) 
            ? recipe.ingredients.length 
            : 1;
          const matchScore = (matchedIngredients.length / totalIngredients) * 100;
          
          recommendations.push({
            recipe,
            matchScore,
            matchedIngredients,
            suggestedModifications: suggestedModifications && recipeId && suggestedModifications[recipeId] 
              ? suggestedModifications[recipeId] 
              : []
          });
        }
      }
      
      // Return top N recommendations
      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Error getting AI recipe recommendations:', error);
      return [];
    }
  }

  /**
   * Get recipe cooking instructions with tips
   */
  async getCookingInstructions(recipe: Recipe, userSkillLevel: string = 'intermediate') {
    try {
      // Validate skill level
      const skillLevel = ['beginner', 'intermediate', 'advanced'].includes(userSkillLevel) 
        ? userSkillLevel as 'beginner' | 'intermediate' | 'advanced'
        : 'intermediate';

      // Get enhanced cooking instructions from Claude
      const response = await claudeAIService.getCookingInstructions(
        recipe.title,
        recipe.ingredients,
        [], // No equipment information for now
        skillLevel
      );

      if (!response.success || !response.data) {
        console.error('Failed to get cooking instructions:', response.error);
        return { instructions: recipe.instructions.map((instr, i) => ({ 
          step: i + 1, 
          action: instr,
          tip: '',
          timeEstimate: 'Unknown'
        })) };
      }

      return response.data;
    } catch (error) {
      console.error('Error getting AI cooking instructions:', error);
      return { instructions: recipe.instructions.map((instr, i) => ({ 
        step: i + 1, 
        action: instr,
        tip: '',
        timeEstimate: 'Unknown'
      })) };
    }
  }

  /**
   * Analyze ingredients to determine possible cuisine types and dishes
   */
  async analyzeIngredients(ingredients: string[]) {
    try {
      const response = await claudeAIService.analyzeIngredientContext(ingredients);

      if (!response.success || !response.data) {
        console.error('Failed to analyze ingredients:', response.error);
        return {
          possibleCuisines: [],
          cookingTechniques: [],
          mealTypes: [],
          dietaryPreferences: []
        };
      }

      return {
        possibleCuisines: response.data.possibleCuisines || [],
        cookingTechniques: response.data.possibleTechniques || [],
        mealTypes: response.data.possibleMealTypes || [],
        dietaryPreferences: response.data.dietaryPreferences || []
      };
    } catch (error) {
      console.error('Error analyzing ingredients:', error);
      return {
        possibleCuisines: [],
        cookingTechniques: [],
        mealTypes: [],
        dietaryPreferences: []
      };
    }
  }

  /**
   * Detect ingredients from an image
   */
  async detectIngredientsFromImage(
    imageBase64: string
  ): Promise<{
    success: boolean;
    data?: {
      detectedIngredients: string[];
      confidence: Record<string, number>;
      possibleDishes: string[];
    };
    error?: string;
  }> {
    try {
      console.log('Detecting ingredients from image...');
      console.log('Image data length:', imageBase64 ? imageBase64.length : 0);
      
      // Call Claude AI service to detect ingredients
      console.log('Calling claudeAIService.detectIngredientsFromImage...');
      const result = await claudeAIService.detectIngredientsFromImage(imageBase64);
      
      console.log('Response success:', result.success);
      if (result.success && result.detectedIngredients && result.detectedIngredients.length > 0) {
        console.log(`Retrieved ${result.detectedIngredients.length} ingredients`);
        console.log('Ingredients list:', result.detectedIngredients.join(', '));
        
        const responseData = {
          success: true,
          data: {
            detectedIngredients: result.detectedIngredients,
            confidence: result.confidence || {},
            possibleDishes: result.possibleDishes || []
          }
        };
        
        return responseData;
      } else {
        console.log('Failed to detect ingredients:', result.error);
        return {
          success: false,
          error: result.error || 'No ingredients detected'
        };
      }
    } catch (error) {
      console.error('Error detecting ingredients:', error);
      return {
        success: false,
        error: `Error detecting ingredients: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get ingredient substitution suggestions
   */
  async getIngredientSubstitutions(
    missingIngredient: string,
    availableIngredients: string[],
    recipeContext: string = ''
  ) {
    try {
      const response = await claudeAIService.suggestIngredientSubstitutions(
        missingIngredient,
        availableIngredients,
        recipeContext
      );

      if (!response.success || !response.data) {
        console.error('Failed to get ingredient substitutions:', response.error);
        return { substitutions: [] };
      }

      return { substitutions: response.data.substitutes || [] };
    } catch (error) {
      console.error('Error getting ingredient substitutions:', error);
      return { substitutions: [] };
    }
  }

  /**
   * Fallback method for recipe recommendations when AI fails
   * Uses a simple ingredient matching algorithm
   */
  private getFallbackRecommendations(
    userIngredients: string[],
    recipes: Recipe[],
    limit: number
  ): RecipeRecommendation[] {
    try {
      // Validate inputs
      if (!userIngredients || !Array.isArray(userIngredients) || 
          !recipes || !Array.isArray(recipes) || recipes.length === 0) {
        console.error('Invalid inputs for fallback recommendations');
        return [];
      }

      const recommendations: RecipeRecommendation[] = [];

      // Simple matching algorithm
      for (const recipe of recipes) {
        if (!recipe || !recipe.ingredients || !Array.isArray(recipe.ingredients)) {
          continue; // Skip invalid recipes
        }
        
        // Find matched ingredients with null checks
        const matchedIngredients = userIngredients.filter(ing => 
          ing && typeof ing === 'string' && 
          recipe.ingredients.some(recipeIng => 
            recipeIng && typeof recipeIng === 'string' &&
            recipeIng.toLowerCase().includes(ing.toLowerCase())
          )
        );

        // Calculate match score with null check
        const totalIngredients = recipe.ingredients.length || 1;
        const matchScore = (matchedIngredients.length / totalIngredients) * 100;

        recommendations.push({
          recipe,
          matchScore,
          matchedIngredients,
          suggestedModifications: []
        });
      }

      // Sort by match score (highest first)
      recommendations.sort((a, b) => b.matchScore - a.matchScore);

      // Return top N recommendations
      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Error in fallback recommendations:', error);
      return [];
    }
  }
}

export default new RecipeAIService(); 
import { IngredientAgent, ProcessedIngredient, IngredientContext } from '../agents/ingredients/ingredientAgent';
import { RecipeAgent, RecipeMatch, RecipeRecommendation } from '../agents/recipes/recipeAgent';
import { RecipeData, getAllRecipes } from './recipeDatabase';
import claudeAIService from './claudeAIService';
import { APP_CONFIG } from '../config';

/**
 * Intelligence service that coordinates between ingredient detection and recipe recommendations,
 * with enhanced AI capabilities when Claude is configured
 */
export class IntelligenceService {
  private ingredientAgent: IngredientAgent;
  private recipeAgent: RecipeAgent;
  private useClaudeAI: boolean;
  
  constructor() {
    this.ingredientAgent = new IngredientAgent();
    this.recipeAgent = new RecipeAgent();
    // Check if Claude AI is configured
    this.useClaudeAI = claudeAIService.isConfigured();
    console.log(`Claude AI integration is ${this.useClaudeAI ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Process ingredients from vision API detection
   */
  public async processDetectedIngredients(
    detectedItems: Array<{ name: string; confidence: number }>,
    options: { analyzeContext?: boolean; inferMissingItems?: boolean } = {}
  ): Promise<ProcessedIngredient[]> {
    let processedIngredients = this.ingredientAgent.processDetectedIngredients(
      detectedItems, 
      { ...options, analyzeContext: false } // We'll handle context analysis separately if using Claude
    );
    
    // If we're using Claude and context analysis is requested, enhance with AI
    if (this.useClaudeAI && options.analyzeContext) {
      try {
        const ingredientNames = processedIngredients.map(ing => ing.name);
        const aiContext = await claudeAIService.analyzeIngredientContext(ingredientNames);
        
        // Create a compatible context object for our system
        const enhancedContext: IngredientContext = {
          possibleCuisines: aiContext.possibleCuisines || [],
          cookingTechniques: aiContext.cookingTechniques || [],
          mealType: aiContext.mealType,
          dietaryPreferences: aiContext.dietaryPreferences,
          timeOfDay: this.ingredientAgent.getContext().timeOfDay // Keep the original time of day
        };
        
        // Set the enhanced context in our ingredient agent
        // This is a bit of a hack since we don't have a public method to set context
        // In a real implementation, you'd add a setContext method to the IngredientAgent class
        (this.ingredientAgent as any).context = enhancedContext;
      } catch (error) {
        console.error('Error enhancing ingredient context with Claude:', error);
      }
    }
    
    return processedIngredients;
  }
  
  /**
   * Process ingredients directly from an image using Claude Vision
   */
  public async processIngredientsFromImage(
    base64Image: string,
    options: { analyzeContext?: boolean; inferMissingItems?: boolean } = {}
  ): Promise<ProcessedIngredient[]> {
    if (!this.useClaudeAI) {
      throw new Error('Claude AI is not configured for image processing');
    }
    
    try {
      const detectedIngredients = await claudeAIService.detectIngredientsFromImage(base64Image);
      return this.processDetectedIngredients(detectedIngredients, options);
    } catch (error) {
      console.error('Error processing ingredients from image with Claude:', error);
      return [];
    }
  }
  
  /**
   * Process a natural language query to extract ingredients and context
   */
  public async processNaturalLanguageQuery(
    query: string
  ): Promise<{
    ingredients: ProcessedIngredient[];
    context: {
      timeOfDay?: string;
      mealType?: string;
      dietaryRestrictions?: string[];
      cookingTime?: 'quick' | 'medium' | 'long';
    }
  }> {
    if (!this.useClaudeAI) {
      throw new Error('Claude AI is not configured for natural language processing');
    }
    
    try {
      const queryAnalysis = await claudeAIService.processNaturalLanguageQuery(query);
      
      // Convert extracted ingredients to ProcessedIngredient format
      const ingredients = this.ingredientAgent.addManualIngredients(
        queryAnalysis.extractedIngredients || []
      );
      
      // Return both ingredients and context
      return {
        ingredients,
        context: {
          mealType: queryAnalysis.mealType,
          dietaryRestrictions: queryAnalysis.dietaryRestrictions,
          cookingTime: queryAnalysis.cookingTime,
          // Default to current time of day if not specified
          timeOfDay: this.ingredientAgent.getContext().timeOfDay
        }
      };
    } catch (error) {
      console.error('Error processing natural language query with Claude:', error);
      return {
        ingredients: [],
        context: {}
      };
    }
  }
  
  /**
   * Get recipe recommendations based on detected ingredients
   */
  public async getRecipeRecommendations(
    options?: {
      timeOfDay?: string;
      mealType?: string;
      dietaryRestrictions?: string[];
      cookingTime?: 'quick' | 'medium' | 'long';
    }
  ): Promise<RecipeRecommendation> {
    const ingredients = this.ingredientAgent.getIngredients();
    const context = this.ingredientAgent.getContext();
    
    // Extract ingredient names to pass to recipe agent
    const ingredientNames = ingredients.map(ing => ing.name);
    
    // Merge context info
    const combinedContext = {
      timeOfDay: options?.timeOfDay || context.timeOfDay,
      mealType: options?.mealType || context.mealType,
      dietaryRestrictions: options?.dietaryRestrictions || context.dietaryPreferences,
      cookingTime: options?.cookingTime
    };
    
    // If Claude AI is available and configured, enhance recommendations
    if (this.useClaudeAI) {
      try {
        // Get base recommendations from our rule-based system
        const baseRecommendation = this.recipeAgent.getRecommendations(ingredientNames, combinedContext);
        
        // Get all available recipes to pass to Claude
        const allRecipes = getAllRecipes();
        
        // Get AI-enhanced recommendations
        const aiRecommendations = await claudeAIService.getRecipeRecommendations(
          ingredientNames,
          allRecipes
        );
        
        // Blend rule-based and AI recommendations
        return this.mergeRecommendations(baseRecommendation, aiRecommendations, allRecipes);
      } catch (error) {
        console.error('Error getting AI-enhanced recommendations:', error);
        // Fall back to rule-based recommendations
        return this.recipeAgent.getRecommendations(ingredientNames, combinedContext);
      }
    }
    
    // Use standard recipe recommendations if Claude is not available
    return this.recipeAgent.getRecommendations(ingredientNames, combinedContext);
  }
  
  /**
   * Merge rule-based and AI-based recommendations
   */
  private mergeRecommendations(
    baseRecommendation: RecipeRecommendation,
    aiRecommendations: {
      rankedRecipeIds: string[];
      explanations: Record<string, string>;
      suggestedModifications: Record<string, string[]>;
    },
    allRecipes: RecipeData[]
  ): RecipeRecommendation {
    // Start with the base recommendations
    const result = { ...baseRecommendation };
    
    // If AI didn't provide any recommendations, return the base ones
    if (!aiRecommendations.rankedRecipeIds || aiRecommendations.rankedRecipeIds.length === 0) {
      return result;
    }
    
    // Get the recipes corresponding to the AI-ranked IDs
    const aiRankedRecipes = aiRecommendations.rankedRecipeIds
      .map(id => {
        const recipe = allRecipes.find(r => r.id === id);
        if (!recipe) return null;
        
        return {
          recipe,
          matchedIngredients: [], // We'll fill this in
          matchScore: 0, // Start with zero score
          freshness: 1 // Assume fresh
        };
      })
      .filter(Boolean) as RecipeMatch[];
    
    // For each AI recipe, try to find it in the base recommendations to get match info
    aiRankedRecipes.forEach((aiMatch, index) => {
      const baseMatch = baseRecommendation.recipes.find(
        r => r.recipe.id === aiMatch.recipe.id
      );
      
      if (baseMatch) {
        // Use the match data from the base recommendation
        aiMatch.matchedIngredients = baseMatch.matchedIngredients;
        aiMatch.matchScore = baseMatch.matchScore;
        aiMatch.freshness = baseMatch.freshness;
      } else {
        // If not in base recommendations, estimate match score based on position
        // Higher ranked items by AI get higher scores
        aiMatch.matchScore = 0.9 - (index * 0.1);
        
        // Try to determine matched ingredients from AI explanation
        const explanation = aiRecommendations.explanations[aiMatch.recipe.id];
        if (explanation) {
          // Extract ingredient mentions from explanation
          const ingredientMatches = aiMatch.recipe.ingredients
            .filter(ing => explanation.toLowerCase().includes(ing.toLowerCase()));
          
          aiMatch.matchedIngredients = ingredientMatches;
        }
      }
    });
    
    // Combine and deduplicate recipes from both sources, prioritizing AI rankings
    const seenIds = new Set<string>();
    const combinedRecipes: RecipeMatch[] = [];
    
    // First add AI-ranked recipes
    aiRankedRecipes.forEach(match => {
      combinedRecipes.push(match);
      seenIds.add(match.recipe.id);
    });
    
    // Then add any remaining recipes from the base recommendations
    baseRecommendation.recipes.forEach(match => {
      if (!seenIds.has(match.recipe.id)) {
        combinedRecipes.push(match);
        seenIds.add(match.recipe.id);
      }
    });
    
    // Limit to 5 recipes
    const finalRecipes = combinedRecipes.slice(0, 5);
    
    // Create a context message based on AI explanations if available
    let contextMessage = baseRecommendation.contextMessage;
    if (Object.keys(aiRecommendations.explanations).length > 0) {
      // Get explanation for the top recipe
      const topRecipeId = finalRecipes[0]?.recipe.id;
      if (topRecipeId && aiRecommendations.explanations[topRecipeId]) {
        contextMessage = aiRecommendations.explanations[topRecipeId];
      }
    }
    
    return {
      recipes: finalRecipes,
      message: baseRecommendation.message,
      contextMessage
    };
  }
  
  /**
   * Refresh recipe recommendations without repeating recipes
   */
  public async refreshRecipeRecommendations(): Promise<RecipeRecommendation> {
    // Update seen recipes first
    this.recipeAgent.refreshRecommendations();
    
    // Then get new recommendations
    return this.getRecipeRecommendations();
  }
  
  /**
   * Suggest substitutions for a missing ingredient
   */
  public async suggestSubstitutionsForIngredient(
    missingIngredient: string
  ): Promise<{ 
    substitutes: string[];
    explanations: string[];
  }> {
    if (!this.useClaudeAI) {
      // Return basic suggestions if Claude is not available
      return {
        substitutes: [],
        explanations: []
      };
    }
    
    // Get current ingredients to use as possible substitutes
    const currentIngredients = this.ingredientAgent.getIngredients().map(ing => ing.name);
    
    try {
      return await claudeAIService.suggestIngredientSubstitutions(
        missingIngredient,
        currentIngredients
      );
    } catch (error) {
      console.error('Error suggesting substitutions with Claude:', error);
      return {
        substitutes: [],
        explanations: []
      };
    }
  }
  
  /**
   * Add manually entered ingredients
   */
  public addManualIngredients(ingredients: string[]): ProcessedIngredient[] {
    return this.ingredientAgent.addManualIngredients(ingredients);
  }
  
  /**
   * Remove ingredients from the current set
   */
  public removeIngredients(ingredientNames: string[]): ProcessedIngredient[] {
    return this.ingredientAgent.removeIngredients(ingredientNames);
  }
  
  /**
   * Get recommended missing ingredients based on current set
   */
  public async getSuggestedIngredients(): Promise<string[]> {
    // Use the built-in method for simplicity
    return this.ingredientAgent.inferMissingIngredients();
  }
  
  /**
   * Clear all ingredients and reset state
   */
  public clearAllIngredients(): void {
    this.ingredientAgent.clearIngredients();
    this.recipeAgent.resetSeenRecipes();
  }
  
  /**
   * Update user preferences based on recipe interaction
   */
  public updatePreferences(recipe: RecipeData, interaction: 'liked' | 'disliked' | 'viewed'): void {
    this.recipeAgent.updatePreferences(recipe, interaction);
  }
  
  /**
   * Get current detected ingredients
   */
  public getCurrentIngredients(): ProcessedIngredient[] {
    return this.ingredientAgent.getIngredients();
  }
  
  /**
   * Get current ingredient context (cuisines, techniques, etc.)
   */
  public getIngredientContext(): IngredientContext {
    return this.ingredientAgent.getContext();
  }
  
  /**
   * Check if Claude AI enhancement is enabled
   */
  public isClaudeAIEnabled(): boolean {
    return this.useClaudeAI;
  }
} 
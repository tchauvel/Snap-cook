import { Recipe, ProcessedIngredient, IngredientSubstitution } from '../types/recipe';
import { CLAUDE_API_KEY, CLAUDE_API_CONSTANTS, APP_CONFIG } from '../config';

// API configuration
const CLAUDE_API_URL = CLAUDE_API_CONSTANTS.API_URL + '/messages';

// Define Claude models directly to avoid type issues
export const CLAUDE_MODELS = {
  HAIKU: 'claude-3-haiku-20240307',
  SONNET: 'claude-3-5-sonnet-20240620',
  OPUS: 'claude-3-opus-20240229',
  VISION: 'claude-3-haiku-20240307',
  SONNET_3_5: 'claude-3-5-sonnet-20240620'
};

// Claude AI Service interface
interface ClaudeAIService {
  isConfigured: () => boolean;
  processQuery: (query: string) => Promise<string>;
  getRecipeRecommendations: (ingredients: string[], availableRecipes: Recipe[]) => Promise<{
    success: boolean;
    data?: {
      rankedRecipeIds: string[];
      explanations: Record<string, string>;
      suggestedModifications: Record<string, string[]>;
    };
    error?: string;
  }>;
  analyzeIngredientContext: (ingredients: string[]) => Promise<{
    success: boolean;
    data?: {
      possibleCuisines: string[];
      possibleTechniques: string[];
      possibleMealTypes: string[];
      dietaryPreferences: string[];
    };
    error?: string;
  }>;
  detectIngredientsFromImage: (imageBase64: string) => Promise<{
    success: boolean;
    detectedIngredients: string[];
    confidence: Record<string, number>;
    possibleDishes: string[];
    error?: string;
  }>;
  suggestIngredientSubstitutions: (
    missingIngredient: string,
    availableIngredients: string[],
    recipeContext?: string
  ) => Promise<{
    success: boolean;
    data?: IngredientSubstitution;
    error?: string;
  }>;
  getCookingInstructions: (
    recipeTitle: string,
    ingredients: string[],
    equipment: string[],
    skillLevel: 'beginner' | 'intermediate' | 'advanced'
  ) => Promise<{
    success: boolean;
    data?: {
      instructions: {
        step: number;
        action: string;
        tip: string;
        timeEstimate: string;
      }[];
    };
    error?: string;
  }>;
}

/**
 * Claude AI Service implementation
 */
class ClaudeAIServiceImpl implements ClaudeAIService {
  /**
   * Check if the API is configured with a valid API key
   */
  isConfigured(): boolean {
    return !!CLAUDE_API_KEY && CLAUDE_API_KEY.length > 10;
  }

  /**
   * Make a request to the Claude API
   */
  private async makeClaudeAPIRequest(
    prompt: string,
    model: string = CLAUDE_MODELS.SONNET,
    maxTokens: number = 2000,
    systemPrompt?: string,
    imageData?: string
  ) {
    try {
      if (!this.isConfigured()) {
        console.warn('Claude API is not configured. Set your API key in config.ts');
        return { success: false, error: 'API key not configured' };
      }

      // Create the request body
      const body: any = {
        model: model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }]
          }
        ]
      };

      // Add system prompt if provided
      if (systemPrompt) {
        body.system = systemPrompt;
      }

      // Add image if provided
      if (imageData && typeof imageData === 'string') {
        // Add image to the user message content
        body.messages[0].content.unshift({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imageData
          }
        });
      }

      // Make the API request
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API Error:', errorText);
        return { 
          success: false, 
          error: `API error: ${response.status} ${response.statusText}` 
        };
      }

      const data = await response.json();
      return { 
        success: true, 
        content: data.content[0].text 
      };
    } catch (error) {
      console.error('Error making Claude API request:', error);
      return { 
        success: false, 
        error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Process a natural language query using Claude
   */
  async processQuery(query: string): Promise<string> {
    // Fall back to mock data if not configured
    if (!this.isConfigured() || APP_CONFIG.useMockData) {
      console.log('MOCK MODE: Bypassing Claude API call');
      return "This is a mock response from Claude AI. API calls are disabled.";
    }

    try {
      const result = await this.makeClaudeAPIRequest(query);
      
      if (result.success && result.content) {
        return result.content;
      } else {
        return `Error: ${result.error || 'Unknown error occurred'}`;
      }
    } catch (error) {
      console.error('Error processing query:', error);
      return `Error processing your query: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Get recipe recommendations based on available ingredients
   */
  async getRecipeRecommendations(
    ingredients: string[],
    availableRecipes: Recipe[]
  ): Promise<{
    success: boolean;
    data?: {
      rankedRecipeIds: string[];
      explanations: Record<string, string>;
      suggestedModifications: Record<string, string[]>;
    };
    error?: string;
  }> {
    // Fall back to mock data if not configured
    if (!this.isConfigured() || APP_CONFIG.useMockData) {
      console.log('MOCK MODE: Bypassing Claude API call for recipe recommendations');
      return this.getMockRecipeRecommendations(ingredients, availableRecipes);
    }

    try {
      console.log('Getting recipe recommendations for ingredients:', ingredients.join(', '));
      
      // Prepare recipe data in a simplified format for the prompt
      const simplifiedRecipes = availableRecipes.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        ingredients: recipe.ingredients,
        cuisineType: recipe.cuisineType,
        dietaryInfo: recipe.dietaryInfo || []
      }));
      
      // Create a structured prompt for Claude
      const prompt = `
I need help finding the best recipes based on these ingredients: ${ingredients.join(', ')}.

Here are the available recipes:
${JSON.stringify(simplifiedRecipes, null, 2)}

Please analyze which recipes would be the best matches for the available ingredients.
For each recipe, consider:
1. How many of the user's ingredients match the recipe
2. How essential the missing ingredients are
3. Possible substitutions for missing ingredients

Respond with a JSON object in this exact format:
{
  "rankedRecipeIds": ["id1", "id2", "id3", "id4", "id5"],
  "explanations": {
    "id1": "Explanation for why this recipe is a good match",
    "id2": "Explanation for why this recipe is a good match",
    ...
  },
  "suggestedModifications": {
    "id1": ["Suggestion 1", "Suggestion 2"],
    "id2": ["Suggestion 1", "Suggestion 2"],
    ...
  }
}

Include the top 5 recipe IDs in ranked order of best match. For each recipe, provide an explanation about why it's a good match and suggest modifications for missing ingredients.
Your response must be ONLY the valid JSON with no additional text, markdown formatting, or code blocks.`;

      const systemPrompt = `You are a helpful culinary assistant that specializes in matching recipes to available ingredients. Your task is to analyze recipes and user ingredients to find the best matches and provide helpful suggestions. Always respond with valid JSON.`;
      
      // Make the API call
      const result = await this.makeClaudeAPIRequest(
        prompt,
        CLAUDE_MODELS.SONNET,
        2000,
        systemPrompt
      );
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      try {
        // Parse the JSON response
        const jsonResponse = JSON.parse(result.content);
        
        // Validate the response structure
        if (!jsonResponse.rankedRecipeIds || !Array.isArray(jsonResponse.rankedRecipeIds)) {
          throw new Error('Invalid response format: missing or invalid rankedRecipeIds');
        }
        
        return {
          success: true,
          data: {
            rankedRecipeIds: jsonResponse.rankedRecipeIds,
            explanations: jsonResponse.explanations || {},
            suggestedModifications: jsonResponse.suggestedModifications || {}
          }
        };
      } catch (parseError) {
        console.error('Error parsing Claude response:', parseError, 'Response:', result.content);
        return { 
          success: false, 
          error: `Failed to parse API response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}` 
        };
      }
    } catch (error) {
      console.error('Error getting recipe recommendations:', error);
      return { 
        success: false, 
        error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  /**
   * Mock implementation for recipe recommendations
   */
  private getMockRecipeRecommendations(
    ingredients: string[],
    availableRecipes: Recipe[]
  ) {
    console.log('Using mock recipe recommendations for ingredients:', ingredients.join(', '));
    
    // Rank recipes based on ingredient matches (simple algorithm)
    const recipeMatches = availableRecipes.map(recipe => {
      const matchCount = ingredients.filter(ing => 
        recipe.ingredients.some(recipeIng => 
          recipeIng.toLowerCase().includes(ing.toLowerCase())
        )
      ).length;
      
      return {
        id: recipe.id,
        matchCount,
        matchScore: matchCount / recipe.ingredients.length
      };
    });
    
    // Sort by match score
    recipeMatches.sort((a, b) => b.matchScore - a.matchScore);
    
    // Get top 5 recipe IDs
    const rankedRecipeIds = recipeMatches.slice(0, 5).map(match => match.id);
    
    // Create mock explanations and modifications
    const explanations: Record<string, string> = {};
    const suggestedModifications: Record<string, string[]> = {};
    
    rankedRecipeIds.forEach(id => {
      const recipe = availableRecipes.find(r => r.id === id);
      if (recipe) {
        explanations[id] = `This recipe uses ${recipeMatches.find(m => m.id === id)?.matchCount || 0} of your ingredients.`;
        
        // Add mock modifications for missing ingredients
        const missingIngredients = recipe.ingredients.filter(ing => 
          !ingredients.some(userIng => ing.toLowerCase().includes(userIng.toLowerCase()))
        );
        
        if (missingIngredients.length > 0) {
          suggestedModifications[id] = [
            `You can substitute ${missingIngredients[0]} with something similar you have.`,
            `This recipe is flexible - feel free to omit or substitute ingredients.`
          ];
        }
      }
    });
    
    return {
      success: true,
      data: {
        rankedRecipeIds,
        explanations,
        suggestedModifications
      }
    };
  }

  /**
   * Analyze ingredients to determine possible cuisines, techniques, meal types, and dietary preferences
   */
  async analyzeIngredientContext(ingredients: string[]): Promise<{
    success: boolean;
    data?: {
      possibleCuisines: string[];
      possibleTechniques: string[];
      possibleMealTypes: string[];
      dietaryPreferences: string[];
    };
    error?: string;
  }> {
    // Fall back to mock data if not configured
    if (!this.isConfigured() || APP_CONFIG.useMockData) {
      console.log('MOCK MODE: Bypassing Claude API call for ingredient context analysis');
      return {
        success: true,
        data: {
          possibleCuisines: ['Mediterranean', 'Mexican', 'Italian'],
          possibleTechniques: ['Grilling', 'Sautéing', 'Baking'],
          possibleMealTypes: ['Lunch', 'Dinner', 'Snack'],
          dietaryPreferences: ['Vegetarian', 'Gluten-free']
        }
      };
    }
    
    try {
      console.log('Analyzing ingredients:', ingredients.join(', '));
      
      // Create a structured prompt for Claude
      const prompt = `
Analyze these ingredients and identify possible:
1. Cuisines they're common in
2. Cooking techniques that would work well with them
3. Meal types they're suitable for
4. Dietary preferences they align with

Ingredients: ${ingredients.join(', ')}

Respond with a JSON object in this exact format:
{
  "possibleCuisines": ["Cuisine1", "Cuisine2", "Cuisine3"],
  "possibleTechniques": ["Technique1", "Technique2", "Technique3"],
  "possibleMealTypes": ["MealType1", "MealType2", "MealType3"],
  "dietaryPreferences": ["DietaryPref1", "DietaryPref2", "DietaryPref3"]
}

Limit each category to 3-5 relevant items. Your response must be ONLY the valid JSON with no additional text, markdown formatting, or code blocks.`;

      const systemPrompt = `You are a culinary expert specializing in ingredient analysis. Your task is to analyze ingredients and determine what cuisines, cooking techniques, meal types, and dietary preferences they align with. Always respond with valid JSON.`;
      
      // Make the API call
      const result = await this.makeClaudeAPIRequest(
        prompt,
        CLAUDE_MODELS.HAIKU,
        1000,
        systemPrompt
      );
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      try {
        // Parse the JSON response
        const jsonResponse = JSON.parse(result.content);
        
        // Validate the response structure
        if (!jsonResponse.possibleCuisines || !Array.isArray(jsonResponse.possibleCuisines)) {
          throw new Error('Invalid response format: missing or invalid possibleCuisines');
        }
        
        return {
          success: true,
          data: {
            possibleCuisines: jsonResponse.possibleCuisines || [],
            possibleTechniques: jsonResponse.possibleTechniques || [],
            possibleMealTypes: jsonResponse.possibleMealTypes || [],
            dietaryPreferences: jsonResponse.dietaryPreferences || []
          }
        };
      } catch (parseError) {
        console.error('Error parsing Claude response:', parseError, 'Response:', result.content);
        return { 
          success: false, 
          error: `Failed to parse API response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}` 
        };
      }
    } catch (error) {
      console.error('Error analyzing ingredients:', error);
      return { 
        success: false, 
        error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Detect ingredients from an image
   */
  async detectIngredientsFromImage(imageBase64: string): Promise<{
    success: boolean;
    detectedIngredients: string[];
    confidence: Record<string, number>;
    possibleDishes: string[];
    error?: string;
  }> {
    // Fall back to mock data if not configured or in mock mode
    if (!this.isConfigured() || APP_CONFIG.useMockData) {
      console.log('MOCK MODE: Using mock data for ingredient detection');
      const mockIngredients = [
        'tomato', 'onion', 'garlic', 'bell pepper', 'cucumber'
      ];
      
      // Simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return mock data
      const confidenceMap: Record<string, number> = {};
      mockIngredients.forEach(ing => {
        confidenceMap[ing] = Math.random() * 0.3 + 0.7; // Between 0.7 and 1.0
      });
      
      return {
        success: true,
        detectedIngredients: mockIngredients,
        confidence: confidenceMap,
        possibleDishes: ['Salad', 'Pasta Sauce', 'Vegetable Stir Fry']
      };
    }

    try {
      console.log('Detecting ingredients from image with Claude Vision...');
      console.log('Image data length:', imageBase64.length);
      
      // Prepare the system prompt for ingredient detection
      const systemPrompt = `
You are a culinary computer vision expert specializing in high-precision ingredient identification.
Your expertise includes identifying:
1. Small ingredients (nuts, seeds, spices, herbs)
2. Different varieties of similar ingredients (types of cheese, nuts, flours, oils)
3. Subtleties in ingredient appearance (ripeness, freshness, preparation state)
4. Color-based identification of spices and herbs

Analyze the image thoroughly and identify ALL visible food ingredients with high precision.
Focus only on raw ingredients visible in the image, not on prepared dishes.
Be specific with ingredient types (e.g., "red onion" not just "onion", "cashews" not just "nuts").
When responding, provide ONLY a JSON object with no additional text.
      `;
      
      // Prepare the instruction prompt
      const prompt = `
Perform a detailed analysis of this image to identify ALL food ingredients visible, including small or less obvious items.

Take your time - precision is more important than speed. Scan the entire image carefully, looking for:
1. All visible main ingredients (vegetables, fruits, meats, dairy, etc.)
2. Small ingredients that might be overlooked (nuts, seeds, herbs, spices)
3. Different varieties within categories (types of cheese, specific nuts, etc.)
4. Condiments, oils, and other cooking ingredients in containers
5. Identify ingredients based on color, texture, and shape (especially for spices)

For each ingredient, assign a confidence score between 0 and 1.

Return ONLY a valid JSON object in this format:
{
  "detectedIngredients": ["ingredient1", "ingredient2", "ingredient3", ...],
  "confidence": {
    "ingredient1": 0.95,
    "ingredient2": 0.87,
    "ingredient3": 0.76,
    ...
  },
  "possibleDishes": ["dish1", "dish2", "dish3"]
}

Be extremely specific with ingredient names:
- Instead of "nuts" → specify "almonds", "walnuts", "cashews", etc.
- Instead of "cheese" → specify "cheddar", "mozzarella", "blue cheese", etc.
- Instead of "spice" → specify "paprika", "cumin", "oregano", etc.
- For produce, note varieties: "red onion" vs "yellow onion", "roma tomato" vs "cherry tomato"

For spices, use color to identify: red (paprika, cayenne), yellow (turmeric, curry), brown (cumin, cinnamon).

The "possibleDishes" field should contain 3-5 dishes that could be made with these ingredients.
Do not include any explanations or text outside of this JSON object.
      `;
      
      // API Call using Vision model
      console.log('Making API request with image...');
      const result = await this.makeClaudeAPIRequest(
        prompt,
        CLAUDE_MODELS.VISION,
        1000,
        systemPrompt,
        imageBase64
      );
      
      console.log('API response received:', result.success);
      
      if (result.success && result.content) {
        try {
          // Clean up the response to ensure we have valid JSON
          let jsonContent = result.content.trim();
          
          // Try to extract JSON if there's extra text
          const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonContent = jsonMatch[0];
          }
          
          console.log('Extracted JSON content:', jsonContent.substring(0, 100) + '...');
          
          // Parse the JSON content
          const parsedResponse = JSON.parse(jsonContent);
          
          // Validate the response format
          if (!parsedResponse.detectedIngredients || !Array.isArray(parsedResponse.detectedIngredients)) {
            throw new Error('Invalid response format: missing or invalid detectedIngredients');
          }
          
          if (!parsedResponse.confidence || typeof parsedResponse.confidence !== 'object') {
            // Create a default confidence object if missing
            parsedResponse.confidence = {};
            parsedResponse.detectedIngredients.forEach((ing: string) => {
              parsedResponse.confidence[ing] = 0.8; // Default confidence
            });
          }
          
          if (!parsedResponse.possibleDishes || !Array.isArray(parsedResponse.possibleDishes)) {
            // Create default dishes if missing
            parsedResponse.possibleDishes = ['Salad', 'Stir Fry', 'Pasta'];
          }
          
          console.log('Successfully detected ingredients:', parsedResponse.detectedIngredients);
          return {
            success: true,
            detectedIngredients: parsedResponse.detectedIngredients,
            confidence: parsedResponse.confidence,
            possibleDishes: parsedResponse.possibleDishes
          };
        } catch (parseError) {
          console.error('Error parsing Claude response:', parseError);
          console.log('Raw response content:', result.content);
          
          return {
            success: false,
            detectedIngredients: [],
            confidence: {},
            possibleDishes: [],
            error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
          };
        }
      } else {
        console.error('Claude API call failed:', result.error);
        return {
          success: false,
          detectedIngredients: [],
          confidence: {},
          possibleDishes: [],
          error: result.error || 'Failed to get a response from Claude'
        };
      }
    } catch (error) {
      console.error('Error detecting ingredients:', error);
      return {
        success: false,
        detectedIngredients: [],
        confidence: {},
        possibleDishes: [],
        error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Suggest substitutions for a missing ingredient
   */
  async suggestIngredientSubstitutions(
    missingIngredient: string,
    availableIngredients: string[],
    recipeContext: string = ''
  ): Promise<{
    success: boolean;
    data?: IngredientSubstitution;
    error?: string;
  }> {
    // Fall back to mock data if not configured
    if (!this.isConfigured() || APP_CONFIG.useMockData) {
      console.log('MOCK MODE: Bypassing Claude API call for ingredient substitutions');
      
      // Generate mock substitutions based on the missing ingredient
      let substitutes = [];
      
      if (missingIngredient.includes('oil')) {
        substitutes = [
          { name: 'butter', howToUse: 'Melt and use equal amount', expectedImpact: 'Richer flavor' },
          { name: 'applesauce', howToUse: 'Use in baking only', expectedImpact: 'Reduced fat, slight sweetness' }
        ];
      } else if (missingIngredient.includes('milk')) {
        substitutes = [
          { name: 'yogurt', howToUse: 'Use equal amount', expectedImpact: 'Tangier taste, thicker texture' },
          { name: 'water', howToUse: 'Use equal amount, add a bit of butter for richness', expectedImpact: 'Less creamy' }
        ];
      } else {
        substitutes = [
          { name: availableIngredients[0] || 'salt', howToUse: 'Use sparingly', expectedImpact: 'Different flavor profile' }
        ];
      }
      
      return {
        success: true,
        data: {
          original: missingIngredient,
          substitutes
        }
      };
    }
    
    try {
      console.log(`Finding substitutes for: ${missingIngredient}`);
      console.log(`Available ingredients: ${availableIngredients.join(', ')}`);
      
      // Create a structured prompt for Claude
      const prompt = `
I need suggestions for substituting ${missingIngredient} in ${recipeContext ? 'a ' + recipeContext : 'a recipe'}.

Available ingredients I could use: ${availableIngredients.join(', ')}

Please suggest possible substitutes, how to use them, and what impact they'll have on the dish.

Respond with a JSON object in this exact format:
{
  "original": "${missingIngredient}",
  "substitutes": [
    {
      "name": "substitute1",
      "howToUse": "Instructions for using this substitute",
      "expectedImpact": "How this will affect the dish"
    },
    {
      "name": "substitute2",
      "howToUse": "Instructions for using this substitute",
      "expectedImpact": "How this will affect the dish"
    }
  ]
}

Prioritize substitutes from my available ingredients list. Your response must be ONLY the valid JSON with no additional text, markdown formatting, or code blocks.`;

      const systemPrompt = `You are a culinary expert specializing in ingredient substitutions. Your task is to suggest appropriate substitutes for missing ingredients, taking into account the available ingredients and the context of the recipe. Always respond with valid JSON.`;
      
      // Make the API call
      const result = await this.makeClaudeAPIRequest(
        prompt,
        CLAUDE_MODELS.HAIKU,
        1000,
        systemPrompt
      );
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      try {
        // Parse the JSON response
        const jsonResponse = JSON.parse(result.content);
        
        // Validate the response structure
        if (!jsonResponse.substitutes || !Array.isArray(jsonResponse.substitutes)) {
          throw new Error('Invalid response format: missing or invalid substitutes array');
        }
        
        return {
          success: true,
          data: {
            original: jsonResponse.original || missingIngredient,
            substitutes: jsonResponse.substitutes || []
          }
        };
      } catch (parseError) {
        console.error('Error parsing Claude response:', parseError, 'Response:', result.content);
        return { 
          success: false, 
          error: `Failed to parse API response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}` 
        };
      }
    } catch (error) {
      console.error('Error getting ingredient substitutions:', error);
      return { 
        success: false, 
        error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Get detailed cooking instructions for a recipe
   */
  async getCookingInstructions(
    recipeTitle: string,
    ingredients: string[],
    equipment: string[],
    skillLevel: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<{
    success: boolean;
    data?: {
      instructions: {
        step: number;
        action: string;
        tip: string;
        timeEstimate: string;
      }[];
    };
    error?: string;
  }> {
    // Fall back to mock data if not configured
    if (!this.isConfigured() || APP_CONFIG.useMockData) {
      console.log('MOCK MODE: Bypassing Claude API call for cooking instructions');
      
      // Create mock detailed instructions
      const mockInstructions = [
        { 
          step: 1, 
          action: 'Gather all ingredients and measure them out.', 
          tip: 'Preparing your mise en place makes cooking smoother.',
          timeEstimate: '5 minutes'
        },
        { 
          step: 2, 
          action: 'Prepare vegetables by washing and chopping them.', 
          tip: 'Keep vegetable pieces consistent in size for even cooking.',
          timeEstimate: '10 minutes'
        },
        { 
          step: 3, 
          action: 'Heat your cooking surface to the appropriate temperature.', 
          tip: 'Wait until the pan is properly heated before adding ingredients.',
          timeEstimate: '3 minutes'
        },
        { 
          step: 4, 
          action: 'Cook ingredients in the proper order, starting with those that take longest.', 
          tip: 'Add delicate herbs at the end to preserve their flavor.',
          timeEstimate: '15-20 minutes'
        },
        { 
          step: 5, 
          action: 'Taste and adjust seasonings before serving.', 
          tip: 'Remember, you can always add more salt, but you can\'t take it away.',
          timeEstimate: '2 minutes'
        }
      ];
      
      return {
        success: true,
        data: {
          instructions: mockInstructions
        }
      };
    }
    
    try {
      console.log(`Getting cooking instructions for: ${recipeTitle}`);
      
      // Create a structured prompt for Claude
      const prompt = `
I need detailed cooking instructions for ${recipeTitle}.

Ingredients:
${ingredients.join('\n')}

Available Equipment:
${equipment.length > 0 ? equipment.join('\n') : 'Standard kitchen equipment'}

Skill Level:
${skillLevel}

Please provide step-by-step instructions with helpful tips and time estimates for each step.

Respond with a JSON object in this exact format:
{
  "instructions": [
    {
      "step": 1,
      "action": "Detailed instruction for step 1",
      "tip": "Helpful tip for this step",
      "timeEstimate": "Time estimate for this step"
    },
    {
      "step": 2,
      "action": "Detailed instruction for step 2",
      "tip": "Helpful tip for this step",
      "timeEstimate": "Time estimate for this step"
    },
    ...
  ]
}

Tailor the instructions to the ${skillLevel} skill level. For beginners, be more detailed and explain techniques. For advanced cooks, focus on precision and efficiency.
Your response must be ONLY the valid JSON with no additional text, markdown formatting, or code blocks.`;

      const systemPrompt = `You are a professional chef specializing in creating clear, detailed cooking instructions. Your task is to provide step-by-step cooking instructions with helpful tips and time estimates, tailored to the user's skill level. Always respond with valid JSON.`;
      
      // Make the API call
      const result = await this.makeClaudeAPIRequest(
        prompt,
        CLAUDE_MODELS.SONNET,
        2000,
        systemPrompt
      );
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      try {
        // Parse the JSON response
        const jsonResponse = JSON.parse(result.content);
        
        // Validate the response structure
        if (!jsonResponse.instructions || !Array.isArray(jsonResponse.instructions)) {
          throw new Error('Invalid response format: missing or invalid instructions array');
        }
        
        return {
          success: true,
          data: {
            instructions: jsonResponse.instructions || []
          }
        };
      } catch (parseError) {
        console.error('Error parsing Claude response:', parseError, 'Response:', result.content);
        return { 
          success: false, 
          error: `Failed to parse API response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}` 
        };
      }
    } catch (error) {
      console.error('Error getting cooking instructions:', error);
      return { 
        success: false, 
        error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

// Create and export a singleton instance
const claudeAIService = new ClaudeAIServiceImpl();
export default claudeAIService; 
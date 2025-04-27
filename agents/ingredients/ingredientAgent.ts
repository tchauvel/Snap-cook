import { getStoredIngredients, saveIngredients } from '../../storage/ingredientStorage';

// Types
export type ProcessedIngredient = {
  name: string;
  confidence: number; // 0-1 confidence score from vision recognition
  freshness?: number; // 0-1 freshness score (if available)
  quantity?: string; // e.g., "2 cups" (if available)
  state?: string; // e.g., "chopped", "whole", "ground" (if available)
};

export type IngredientContext = {
  possibleCuisines: string[];
  cookingTechniques: string[];
  mealType?: string; // breakfast, lunch, dinner, snack
  dietaryPreferences?: string[]; // vegan, vegetarian, gluten-free, etc.
  timeOfDay?: string;
};

export class IngredientAgent {
  private detectedIngredients: ProcessedIngredient[] = [];
  private savedIngredients: ProcessedIngredient[] = [];
  private context: IngredientContext = {
    possibleCuisines: [],
    cookingTechniques: []
  };
  
  constructor() {
    this.loadSavedIngredients();
  }
  
  /**
   * Load saved ingredients from storage
   */
  private async loadSavedIngredients(): Promise<void> {
    try {
      const storedIngredients = await getStoredIngredients();
      this.savedIngredients = storedIngredients || [];
    } catch (error) {
      console.error('Failed to load ingredients:', error);
      this.savedIngredients = [];
    }
  }
  
  /**
   * Process ingredients from vision detection with NLP enhancements
   */
  public processDetectedIngredients(
    detectedItems: Array<{ name: string; confidence: number }>,
    options: { analyzeContext?: boolean; inferMissingItems?: boolean } = {}
  ): ProcessedIngredient[] {
    // Clean and normalize ingredient names
    const normalizedItems = detectedItems.map(item => ({
      name: this.normalizeIngredientName(item.name),
      confidence: item.confidence
    }));
    
    // Filter out non-food items and duplicates
    const filteredItems = this.filterIngredients(normalizedItems);
    
    // Infer states and quantities where possible
    const enrichedItems = this.enrichIngredients(filteredItems);
    
    // Store the processed ingredients
    this.detectedIngredients = enrichedItems;
    
    // Save to storage for future reference
    this.saveIngredientsToStorage(enrichedItems);
    
    // Analyze context if requested
    if (options.analyzeContext) {
      this.analyzeIngredientContext();
    }
    
    // Infer missing ingredients based on current set if requested
    if (options.inferMissingItems) {
      this.inferMissingIngredients();
    }
    
    return this.detectedIngredients;
  }
  
  /**
   * Get a list of likely associated ingredients not detected
   */
  public inferMissingIngredients(): string[] {
    const currentIngredients = this.detectedIngredients.map(i => i.name.toLowerCase());
    const suggestedIngredients: string[] = [];
    
    // Common ingredient associations
    const associations: Record<string, string[]> = {
      'tomato': ['garlic', 'onion', 'basil', 'olive oil'],
      'pasta': ['garlic', 'tomato', 'olive oil', 'parmesan'],
      'chicken': ['garlic', 'onion', 'salt', 'pepper', 'olive oil'],
      'rice': ['salt', 'butter', 'onion'],
      'beef': ['garlic', 'onion', 'salt', 'pepper'],
      'flour': ['sugar', 'eggs', 'butter', 'baking powder', 'salt'],
      'potato': ['butter', 'salt', 'pepper', 'garlic'],
      'cheese': ['garlic', 'butter', 'pepper'],
      'milk': ['sugar', 'vanilla', 'eggs'],
      'fish': ['lemon', 'salt', 'pepper', 'olive oil', 'garlic'],
      // Add more common associations
    };
    
    // Check for associations
    for (const ingredient of this.detectedIngredients) {
      const associatedIngredients = associations[ingredient.name.toLowerCase()] || [];
      
      for (const associated of associatedIngredients) {
        if (
          !currentIngredients.includes(associated) && 
          !suggestedIngredients.includes(associated)
        ) {
          suggestedIngredients.push(associated);
        }
      }
    }
    
    // Also infer based on possible cuisine
    if (this.context.possibleCuisines.includes('Italian')) {
      ['basil', 'parmesan', 'olive oil', 'garlic'].forEach(item => {
        if (
          !currentIngredients.includes(item) && 
          !suggestedIngredients.includes(item)
        ) {
          suggestedIngredients.push(item);
        }
      });
    } else if (this.context.possibleCuisines.includes('Asian')) {
      ['soy sauce', 'ginger', 'sesame oil', 'green onion'].forEach(item => {
        if (
          !currentIngredients.includes(item) && 
          !suggestedIngredients.includes(item)
        ) {
          suggestedIngredients.push(item);
        }
      });
    }
    
    return suggestedIngredients.slice(0, 5); // Limit to top 5 suggestions
  }
  
  /**
   * Get all processed ingredients
   */
  public getIngredients(): ProcessedIngredient[] {
    return this.detectedIngredients;
  }
  
  /**
   * Get ingredient context (cuisine, techniques, etc.)
   */
  public getContext(): IngredientContext {
    return this.context;
  }
  
  /**
   * Merge manually added ingredients with detected ones
   */
  public addManualIngredients(ingredients: string[]): ProcessedIngredient[] {
    const newIngredients = ingredients
      .map(name => this.normalizeIngredientName(name))
      .filter(name => !this.detectedIngredients.some(i => i.name.toLowerCase() === name.toLowerCase()))
      .map(name => ({ name, confidence: 1 }));
    
    if (newIngredients.length > 0) {
      this.detectedIngredients = [
        ...this.detectedIngredients,
        ...newIngredients
      ];
      
      // Re-analyze context with the new ingredients
      this.analyzeIngredientContext();
      
      // Save to storage
      this.saveIngredientsToStorage(this.detectedIngredients);
    }
    
    return this.detectedIngredients;
  }
  
  /**
   * Remove ingredients from the current set
   */
  public removeIngredients(ingredientNames: string[]): ProcessedIngredient[] {
    const normalizedNames = ingredientNames.map(name => 
      this.normalizeIngredientName(name).toLowerCase()
    );
    
    this.detectedIngredients = this.detectedIngredients.filter(
      ingredient => !normalizedNames.includes(ingredient.name.toLowerCase())
    );
    
    // Re-analyze context with the updated ingredients
    this.analyzeIngredientContext();
    
    // Save to storage
    this.saveIngredientsToStorage(this.detectedIngredients);
    
    return this.detectedIngredients;
  }
  
  /**
   * Clear all detected ingredients
   */
  public clearIngredients(): void {
    this.detectedIngredients = [];
    this.context = {
      possibleCuisines: [],
      cookingTechniques: []
    };
    
    // Clear from storage
    this.saveIngredientsToStorage([]);
  }
  
  /**
   * Normalize ingredient names (remove quantities, states, etc.)
   */
  private normalizeIngredientName(name: string): string {
    // Remove quantities like "2 cups of" or "1 lb"
    let normalized = name.replace(/^\d+(\.\d+)?\s*(cups?|lbs?|ounces?|oz|tbsp|tsp|tablespoons?|teaspoons?|pounds?|grams?|kilos?|kg|ml|liters?|l)\s*(of)?\s*/i, '');
    
    // Remove states like "chopped", "sliced", etc.
    normalized = normalized.replace(/\b(chopped|diced|sliced|minced|grated|ground|shredded|crushed|peeled)\b/i, '');
    
    // Trim whitespace and convert to title case
    normalized = normalized.trim();
    normalized = normalized.replace(/\b\w/g, match => match.toUpperCase());
    
    return normalized;
  }
  
  /**
   * Filter out non-food items and duplicates
   */
  private filterIngredients(items: ProcessedIngredient[]): ProcessedIngredient[] {
    const nonFoodKeywords = [
      'table', 'chair', 'plate', 'spoon', 'fork', 'knife', 'cup', 'glass', 'bowl',
      'napkin', 'container', 'package', 'wrapper', 'box', 'jar', 'can', 'bottle'
    ];
    
    // Filter out non-food items
    const foodItems = items.filter(item => {
      const normalizedName = item.name.toLowerCase();
      return !nonFoodKeywords.some(keyword => normalizedName.includes(keyword));
    });
    
    // Remove duplicates
    const uniqueItems: ProcessedIngredient[] = [];
    const seenNames = new Set<string>();
    
    for (const item of foodItems) {
      const normalizedName = item.name.toLowerCase();
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        uniqueItems.push(item);
      }
    }
    
    return uniqueItems;
  }
  
  /**
   * Enrich ingredients with additional information
   */
  private enrichIngredients(items: ProcessedIngredient[]): ProcessedIngredient[] {
    return items.map(item => {
      const enriched: ProcessedIngredient = { ...item };
      
      // Try to extract state from original name
      const stateMatches = [
        { regex: /chopped/i, state: 'chopped' },
        { regex: /diced/i, state: 'diced' },
        { regex: /sliced/i, state: 'sliced' },
        { regex: /minced/i, state: 'minced' },
        { regex: /grated/i, state: 'grated' },
        { regex: /ground/i, state: 'ground' },
        { regex: /shredded/i, state: 'shredded' },
        { regex: /crushed/i, state: 'crushed' },
        { regex: /peeled/i, state: 'peeled' },
      ];
      
      for (const { regex, state } of stateMatches) {
        if (regex.test(item.name)) {
          enriched.state = state;
          break;
        }
      }
      
      // Set default freshness for common ingredients
      if (
        item.name.toLowerCase().includes('tomato') ||
        item.name.toLowerCase().includes('lettuce') ||
        item.name.toLowerCase().includes('cucumber') ||
        item.name.toLowerCase().includes('pepper') ||
        item.name.toLowerCase().includes('carrot')
      ) {
        enriched.freshness = 0.9; // Assume fresh for common vegetables
      }
      
      return enriched;
    });
  }
  
  /**
   * Analyze ingredient context to determine possible cuisines and techniques
   */
  private analyzeIngredientContext(): void {
    const ingredientNames = this.detectedIngredients.map(i => i.name.toLowerCase());
    
    // Analyze possible cuisines
    const cuisineSignatures: Record<string, string[]> = {
      'Italian': ['pasta', 'tomato', 'basil', 'oregano', 'parmesan', 'olive oil', 'garlic', 'mozzarella'],
      'Mexican': ['tortilla', 'avocado', 'cilantro', 'lime', 'jalapeño', 'cumin', 'chili', 'beans', 'corn'],
      'Asian': ['soy sauce', 'ginger', 'sesame oil', 'rice', 'tofu', 'green onion', 'bok choy', 'noodles'],
      'Indian': ['curry', 'cumin', 'coriander', 'turmeric', 'garam masala', 'chickpea', 'lentil', 'chili'],
      'Mediterranean': ['olive oil', 'feta', 'cucumber', 'yogurt', 'eggplant', 'hummus', 'tahini', 'mint'],
      'American': ['beef', 'potato', 'corn', 'butter', 'bread', 'cheese', 'mayo', 'ketchup', 'mustard'],
      'French': ['butter', 'cream', 'wine', 'thyme', 'rosemary', 'shallot', 'tarragon', 'dijon'],
    };
    
    const possibleCuisines: string[] = [];
    let maxMatchCount = 0;
    
    for (const [cuisine, signatures] of Object.entries(cuisineSignatures)) {
      const matchCount = signatures.filter(sig => 
        ingredientNames.some(ing => ing.includes(sig) || sig.includes(ing))
      ).length;
      
      if (matchCount > 0) {
        possibleCuisines.push(cuisine);
        maxMatchCount = Math.max(maxMatchCount, matchCount);
      }
    }
    
    // Analyze possible cooking techniques
    const techniqueSuggestions: Record<string, string[]> = {
      'Baking': ['flour', 'sugar', 'egg', 'butter', 'vanilla', 'baking powder', 'baking soda'],
      'Roasting': ['potato', 'beef', 'chicken', 'carrot', 'onion', 'garlic', 'thyme', 'rosemary'],
      'Stir-frying': ['soy sauce', 'ginger', 'garlic', 'sesame oil', 'green onion', 'bok choy'],
      'Sautéing': ['olive oil', 'butter', 'garlic', 'onion', 'mushroom', 'bell pepper'],
      'Boiling': ['pasta', 'potato', 'rice', 'beans', 'lentil', 'egg'],
      'Grilling': ['beef', 'chicken', 'lamb', 'fish', 'pepper', 'zucchini', 'eggplant'],
    };
    
    const cookingTechniques: string[] = [];
    
    for (const [technique, ingredients] of Object.entries(techniqueSuggestions)) {
      const matchCount = ingredients.filter(ing => 
        ingredientNames.some(item => item.includes(ing) || ing.includes(item))
      ).length;
      
      if (matchCount >= 2) {
        cookingTechniques.push(technique);
      }
    }
    
    // Determine meal type
    let mealType: string | undefined;
    
    const breakfastIngredients = ['egg', 'bacon', 'sausage', 'toast', 'cereal', 'yogurt', 'pancake', 'waffle', 'oat'];
    const dinnerIngredients = ['beef', 'chicken', 'pork', 'fish', 'lamb', 'pasta', 'rice', 'potato'];
    
    const breakfastMatches = breakfastIngredients.filter(ing => 
      ingredientNames.some(item => item.includes(ing) || ing.includes(item))
    ).length;
    
    const dinnerMatches = dinnerIngredients.filter(ing => 
      ingredientNames.some(item => item.includes(ing) || ing.includes(item))
    ).length;
    
    if (breakfastMatches > dinnerMatches) {
      mealType = 'breakfast';
    } else if (dinnerMatches > 0) {
      mealType = 'dinner';
    }
    
    // Set the context
    this.context = {
      possibleCuisines,
      cookingTechniques,
      mealType,
      // Use time of day to guide meal type guesses
      timeOfDay: this.getTimeOfDay()
    };
  }
  
  /**
   * Get the time of day (morning, afternoon, evening)
   */
  private getTimeOfDay(): string {
    const hours = new Date().getHours();
    
    if (hours >= 5 && hours < 12) {
      return 'morning';
    } else if (hours >= 12 && hours < 17) {
      return 'afternoon';
    } else {
      return 'evening';
    }
  }
  
  /**
   * Save ingredients to local storage
   */
  private saveIngredientsToStorage(ingredients: ProcessedIngredient[]): void {
    try {
      saveIngredients(ingredients);
    } catch (error) {
      console.error('Failed to save ingredients:', error);
    }
  }
} 
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const INGREDIENTS_STORAGE_KEY = 'snap_and_cook_ingredients';

// Types
export interface StoredIngredient {
  name: string;
  quantity?: string;
  unit?: string;
  preparation?: string;
  substitutes?: string[];
  dateAdded: number; // timestamp
}

/**
 * Save ingredients to local storage
 */
export async function saveIngredients(ingredients: StoredIngredient[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(
      INGREDIENTS_STORAGE_KEY,
      JSON.stringify(ingredients)
    );
    console.log('Saved ingredients:', ingredients.length);
    return true;
  } catch (error) {
    console.error('Error saving ingredients:', error);
    return false;
  }
}

/**
 * Get stored ingredients from local storage
 */
export async function getStoredIngredients(): Promise<StoredIngredient[]> {
  try {
    const value = await AsyncStorage.getItem(INGREDIENTS_STORAGE_KEY);
    if (value !== null) {
      const parsedIngredients = JSON.parse(value);
      console.log('Retrieved ingredients:', parsedIngredients.length);
      return parsedIngredients;
    }
    return [];
  } catch (error) {
    console.error('Error getting stored ingredients:', error);
    return [];
  }
}

/**
 * Clear all stored ingredients
 */
export async function clearStoredIngredients(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(INGREDIENTS_STORAGE_KEY);
    console.log('Cleared all stored ingredients');
    return true;
  } catch (error) {
    console.error('Error clearing stored ingredients:', error);
    return false;
  }
}

/**
 * Add a single ingredient to storage
 */
export async function addIngredientToStorage(ingredient: StoredIngredient): Promise<boolean> {
  try {
    const existing = await getStoredIngredients();
    const updated = [...existing, ingredient];
    return saveIngredients(updated);
  } catch (error) {
    console.error('Error adding ingredient to storage:', error);
    return false;
  }
}

/**
 * Remove an ingredient from storage by name
 */
export async function removeIngredientFromStorage(ingredientName: string): Promise<boolean> {
  try {
    const existing = await getStoredIngredients();
    const updated = existing.filter(ing => ing.name.toLowerCase() !== ingredientName.toLowerCase());
    return saveIngredients(updated);
  } catch (error) {
    console.error('Error removing ingredient from storage:', error);
    return false;
  }
} 
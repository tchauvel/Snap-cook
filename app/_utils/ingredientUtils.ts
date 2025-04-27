import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

// Define PantryItem interface
export interface PantryItem {
  id: string;
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  available: boolean;
  dateAdded?: string;
  addedOn?: string;
  isScanned?: boolean;
}

// Ingredient categories
export const CATEGORIES = {
  VEGETABLES: 'Vegetables',
  FRUITS: 'Fruits',
  MEAT: 'Meat',
  SEAFOOD: 'Seafood',
  POULTRY: 'Poultry',
  DAIRY: 'Dairy & Eggs',
  CHEESE: 'Cheese',
  GRAINS: 'Grains & Rice',
  PASTA: 'Pasta & Noodles',
  BREAD: 'Bread & Bakery',
  NUTS: 'Nuts & Seeds',
  HERBS: 'Fresh Herbs',
  SPICES: 'Dried Spices',
  OILS: 'Oils & Vinegars',
  CONDIMENTS: 'Condiments & Sauces',
  BAKING: 'Baking Essentials',
  SWEETENERS: 'Sweeteners & Honey',
  BEANS: 'Beans & Legumes',
  CANNED: 'Canned & Jarred Goods',
  FROZEN: 'Frozen Foods',
  BEVERAGES: 'Beverages',
  ALCOHOL: 'Alcoholic Beverages',
  SNACKS: 'Snacks',
  OTHER: 'Other'
};

// Common ingredients with categories (expanded with more detailed categorization)
export const COMMON_INGREDIENTS = {
  // Vegetables
  'tomato': CATEGORIES.VEGETABLES,
  'cherry tomato': CATEGORIES.VEGETABLES,
  'roma tomato': CATEGORIES.VEGETABLES,
  'grape tomato': CATEGORIES.VEGETABLES,
  'onion': CATEGORIES.VEGETABLES,
  'red onion': CATEGORIES.VEGETABLES,
  'yellow onion': CATEGORIES.VEGETABLES,
  'white onion': CATEGORIES.VEGETABLES,
  'green onion': CATEGORIES.VEGETABLES,
  'scallion': CATEGORIES.VEGETABLES,
  'shallot': CATEGORIES.VEGETABLES,
  'garlic': CATEGORIES.VEGETABLES,
  'carrot': CATEGORIES.VEGETABLES,
  'bell pepper': CATEGORIES.VEGETABLES,
  'red bell pepper': CATEGORIES.VEGETABLES,
  'green bell pepper': CATEGORIES.VEGETABLES,
  'yellow bell pepper': CATEGORIES.VEGETABLES,
  'jalapeno': CATEGORIES.VEGETABLES,
  'potato': CATEGORIES.VEGETABLES,
  'sweet potato': CATEGORIES.VEGETABLES,
  'russet potato': CATEGORIES.VEGETABLES,
  'spinach': CATEGORIES.VEGETABLES,
  'kale': CATEGORIES.VEGETABLES,
  'arugula': CATEGORIES.VEGETABLES,
  'mushroom': CATEGORIES.VEGETABLES,
  'shiitake mushroom': CATEGORIES.VEGETABLES,
  'portobello mushroom': CATEGORIES.VEGETABLES,
  'cremini mushroom': CATEGORIES.VEGETABLES,
  'button mushroom': CATEGORIES.VEGETABLES,
  'broccoli': CATEGORIES.VEGETABLES,
  'cauliflower': CATEGORIES.VEGETABLES,
  'asparagus': CATEGORIES.VEGETABLES,
  'cucumber': CATEGORIES.VEGETABLES,
  'zucchini': CATEGORIES.VEGETABLES,
  'squash': CATEGORIES.VEGETABLES,
  'butternut squash': CATEGORIES.VEGETABLES,
  'acorn squash': CATEGORIES.VEGETABLES,
  'spaghetti squash': CATEGORIES.VEGETABLES,
  'lettuce': CATEGORIES.VEGETABLES,
  'romaine lettuce': CATEGORIES.VEGETABLES,
  'iceberg lettuce': CATEGORIES.VEGETABLES,
  'cabbage': CATEGORIES.VEGETABLES,
  'red cabbage': CATEGORIES.VEGETABLES,
  'brussels sprouts': CATEGORIES.VEGETABLES,
  'corn': CATEGORIES.VEGETABLES,
  'eggplant': CATEGORIES.VEGETABLES,
  'celery': CATEGORIES.VEGETABLES,
  'artichoke': CATEGORIES.VEGETABLES,
  'beet': CATEGORIES.VEGETABLES,
  'radish': CATEGORIES.VEGETABLES,
  'turnip': CATEGORIES.VEGETABLES,
  'leek': CATEGORIES.VEGETABLES,
  'fennel': CATEGORIES.VEGETABLES,
  'bok choy': CATEGORIES.VEGETABLES,
  
  // Fruits
  'apple': CATEGORIES.FRUITS,
  'green apple': CATEGORIES.FRUITS,
  'red apple': CATEGORIES.FRUITS,
  'granny smith apple': CATEGORIES.FRUITS,
  'banana': CATEGORIES.FRUITS,
  'orange': CATEGORIES.FRUITS,
  'mandarin orange': CATEGORIES.FRUITS,
  'clementine': CATEGORIES.FRUITS,
  'lemon': CATEGORIES.FRUITS,
  'lime': CATEGORIES.FRUITS,
  'strawberry': CATEGORIES.FRUITS,
  'blueberry': CATEGORIES.FRUITS,
  'raspberry': CATEGORIES.FRUITS,
  'blackberry': CATEGORIES.FRUITS,
  'cranberry': CATEGORIES.FRUITS,
  'grape': CATEGORIES.FRUITS,
  'red grape': CATEGORIES.FRUITS,
  'green grape': CATEGORIES.FRUITS,
  'mango': CATEGORIES.FRUITS,
  'pineapple': CATEGORIES.FRUITS,
  'watermelon': CATEGORIES.FRUITS,
  'avocado': CATEGORIES.FRUITS,
  'kiwi': CATEGORIES.FRUITS,
  'peach': CATEGORIES.FRUITS,
  'plum': CATEGORIES.FRUITS,
  'pear': CATEGORIES.FRUITS,
  'apricot': CATEGORIES.FRUITS,
  'cherry': CATEGORIES.FRUITS,
  'fig': CATEGORIES.FRUITS,
  'grapefruit': CATEGORIES.FRUITS,
  'pomegranate': CATEGORIES.FRUITS,
  'persimmon': CATEGORIES.FRUITS,
  'papaya': CATEGORIES.FRUITS,
  'coconut': CATEGORIES.FRUITS,
  
  // Meats
  'beef': CATEGORIES.MEAT,
  'ground beef': CATEGORIES.MEAT,
  'steak': CATEGORIES.MEAT,
  'sirloin': CATEGORIES.MEAT,
  'ribeye': CATEGORIES.MEAT,
  'pork': CATEGORIES.MEAT,
  'bacon': CATEGORIES.MEAT,
  'ham': CATEGORIES.MEAT,
  'pork chop': CATEGORIES.MEAT,
  'pork tenderloin': CATEGORIES.MEAT,
  'lamb': CATEGORIES.MEAT,
  'lamb chop': CATEGORIES.MEAT,
  'veal': CATEGORIES.MEAT,
  'bison': CATEGORIES.MEAT,
  'venison': CATEGORIES.MEAT,
  
  // Poultry
  'chicken': CATEGORIES.POULTRY,
  'chicken breast': CATEGORIES.POULTRY,
  'chicken thigh': CATEGORIES.POULTRY,
  'chicken wing': CATEGORIES.POULTRY,
  'chicken leg': CATEGORIES.POULTRY,
  'ground chicken': CATEGORIES.POULTRY,
  'turkey': CATEGORIES.POULTRY,
  'ground turkey': CATEGORIES.POULTRY,
  'turkey breast': CATEGORIES.POULTRY,
  'duck': CATEGORIES.POULTRY,
  'quail': CATEGORIES.POULTRY,
  
  // Seafood
  'salmon': CATEGORIES.SEAFOOD,
  'tuna': CATEGORIES.SEAFOOD,
  'cod': CATEGORIES.SEAFOOD,
  'tilapia': CATEGORIES.SEAFOOD,
  'halibut': CATEGORIES.SEAFOOD,
  'mahi mahi': CATEGORIES.SEAFOOD,
  'sea bass': CATEGORIES.SEAFOOD,
  'trout': CATEGORIES.SEAFOOD,
  'shrimp': CATEGORIES.SEAFOOD,
  'lobster': CATEGORIES.SEAFOOD,
  'crab': CATEGORIES.SEAFOOD,
  'scallop': CATEGORIES.SEAFOOD,
  'clam': CATEGORIES.SEAFOOD,
  'mussel': CATEGORIES.SEAFOOD,
  'oyster': CATEGORIES.SEAFOOD,
  'squid': CATEGORIES.SEAFOOD,
  'octopus': CATEGORIES.SEAFOOD,
  'anchovy': CATEGORIES.SEAFOOD,
  'sardine': CATEGORIES.SEAFOOD,
  
  // Dairy & Eggs
  'milk': CATEGORIES.DAIRY,
  'whole milk': CATEGORIES.DAIRY,
  'skim milk': CATEGORIES.DAIRY,
  'almond milk': CATEGORIES.DAIRY,
  'oat milk': CATEGORIES.DAIRY,
  'soy milk': CATEGORIES.DAIRY,
  'coconut milk': CATEGORIES.DAIRY,
  'butter': CATEGORIES.DAIRY,
  'yogurt': CATEGORIES.DAIRY,
  'greek yogurt': CATEGORIES.DAIRY,
  'cream': CATEGORIES.DAIRY,
  'heavy cream': CATEGORIES.DAIRY,
  'sour cream': CATEGORIES.DAIRY,
  'cream cheese': CATEGORIES.DAIRY,
  'egg': CATEGORIES.DAIRY,
  'egg white': CATEGORIES.DAIRY,
  'egg yolk': CATEGORIES.DAIRY,
  
  // Cheese
  'cheese': CATEGORIES.CHEESE,
  'cheddar': CATEGORIES.CHEESE,
  'cheddar cheese': CATEGORIES.CHEESE,
  'mozzarella': CATEGORIES.CHEESE,
  'mozzarella cheese': CATEGORIES.CHEESE,
  'parmesan': CATEGORIES.CHEESE,
  'parmesan cheese': CATEGORIES.CHEESE,
  'blue cheese': CATEGORIES.CHEESE,
  'gouda': CATEGORIES.CHEESE,
  'feta': CATEGORIES.CHEESE,
  'feta cheese': CATEGORIES.CHEESE,
  'swiss cheese': CATEGORIES.CHEESE,
  'brie': CATEGORIES.CHEESE,
  'goat cheese': CATEGORIES.CHEESE,
  'ricotta': CATEGORIES.CHEESE,
  'ricotta cheese': CATEGORIES.CHEESE,
  'cottage cheese': CATEGORIES.CHEESE,
  'mascarpone': CATEGORIES.CHEESE,
  'provolone': CATEGORIES.CHEESE,
  'american cheese': CATEGORIES.CHEESE,
  'gruyere': CATEGORIES.CHEESE,
  
  // Grains & Rice
  'rice': CATEGORIES.GRAINS,
  'white rice': CATEGORIES.GRAINS,
  'brown rice': CATEGORIES.GRAINS,
  'jasmine rice': CATEGORIES.GRAINS,
  'basmati rice': CATEGORIES.GRAINS,
  'arborio rice': CATEGORIES.GRAINS,
  'wild rice': CATEGORIES.GRAINS,
  'quinoa': CATEGORIES.GRAINS,
  'barley': CATEGORIES.GRAINS,
  'farro': CATEGORIES.GRAINS,
  'bulgur': CATEGORIES.GRAINS,
  'couscous': CATEGORIES.GRAINS,
  'cornmeal': CATEGORIES.GRAINS,
  'polenta': CATEGORIES.GRAINS,
  'oats': CATEGORIES.GRAINS,
  'rolled oats': CATEGORIES.GRAINS,
  'steel-cut oats': CATEGORIES.GRAINS,
  
  // Pasta & Noodles
  'pasta': CATEGORIES.PASTA,
  'spaghetti': CATEGORIES.PASTA,
  'penne': CATEGORIES.PASTA,
  'fettuccine': CATEGORIES.PASTA,
  'linguine': CATEGORIES.PASTA,
  'angel hair pasta': CATEGORIES.PASTA,
  'macaroni': CATEGORIES.PASTA,
  'lasagna': CATEGORIES.PASTA,
  'ravioli': CATEGORIES.PASTA,
  'tortellini': CATEGORIES.PASTA,
  'egg noodle': CATEGORIES.PASTA,
  'ramen': CATEGORIES.PASTA,
  'udon': CATEGORIES.PASTA,
  'rice noodle': CATEGORIES.PASTA,
  'glass noodle': CATEGORIES.PASTA,
  'soba': CATEGORIES.PASTA,
  
  // Bread & Bakery
  'bread': CATEGORIES.BREAD,
  'white bread': CATEGORIES.BREAD,
  'whole wheat bread': CATEGORIES.BREAD,
  'sourdough': CATEGORIES.BREAD,
  'baguette': CATEGORIES.BREAD,
  'pita': CATEGORIES.BREAD,
  'naan': CATEGORIES.BREAD,
  'tortilla': CATEGORIES.BREAD,
  'corn tortilla': CATEGORIES.BREAD,
  'flour tortilla': CATEGORIES.BREAD,
  'croissant': CATEGORIES.BREAD,
  'roll': CATEGORIES.BREAD,
  'bagel': CATEGORIES.BREAD,
  'english muffin': CATEGORIES.BREAD,
  'brioche': CATEGORIES.BREAD,
  'flatbread': CATEGORIES.BREAD,
  
  // Nuts & Seeds
  'almond': CATEGORIES.NUTS,
  'walnut': CATEGORIES.NUTS,
  'pecan': CATEGORIES.NUTS,
  'cashew': CATEGORIES.NUTS,
  'pistachio': CATEGORIES.NUTS,
  'peanut': CATEGORIES.NUTS,
  'pine nut': CATEGORIES.NUTS,
  'brazil nut': CATEGORIES.NUTS,
  'macadamia nut': CATEGORIES.NUTS,
  'hazelnut': CATEGORIES.NUTS,
  'chestnut': CATEGORIES.NUTS,
  'sunflower seed': CATEGORIES.NUTS,
  'pumpkin seed': CATEGORIES.NUTS,
  'sesame seed': CATEGORIES.NUTS,
  'flax seed': CATEGORIES.NUTS,
  'chia seed': CATEGORIES.NUTS,
  'hemp seed': CATEGORIES.NUTS,
  'poppy seed': CATEGORIES.NUTS,
  
  // Fresh Herbs
  'basil': CATEGORIES.HERBS,
  'parsley': CATEGORIES.HERBS,
  'cilantro': CATEGORIES.HERBS,
  'mint': CATEGORIES.HERBS,
  'rosemary': CATEGORIES.HERBS,
  'thyme': CATEGORIES.HERBS,
  'oregano': CATEGORIES.HERBS,
  'sage': CATEGORIES.HERBS,
  'dill': CATEGORIES.HERBS,
  'chive': CATEGORIES.HERBS,
  'tarragon': CATEGORIES.HERBS,
  'marjoram': CATEGORIES.HERBS,
  'bay leaf': CATEGORIES.HERBS,
  'lemongrass': CATEGORIES.HERBS,
  
  // Dried Spices
  'salt': CATEGORIES.SPICES,
  'pepper': CATEGORIES.SPICES,
  'black pepper': CATEGORIES.SPICES,
  'white pepper': CATEGORIES.SPICES,
  'cumin': CATEGORIES.SPICES,
  'coriander': CATEGORIES.SPICES,
  'paprika': CATEGORIES.SPICES,
  'smoked paprika': CATEGORIES.SPICES,
  'chili powder': CATEGORIES.SPICES,
  'cayenne pepper': CATEGORIES.SPICES,
  'red pepper flake': CATEGORIES.SPICES,
  'cinnamon': CATEGORIES.SPICES,
  'nutmeg': CATEGORIES.SPICES,
  'clove': CATEGORIES.SPICES,
  'allspice': CATEGORIES.SPICES,
  'ginger': CATEGORIES.SPICES,
  'turmeric': CATEGORIES.SPICES,
  'cardamom': CATEGORIES.SPICES,
  'curry powder': CATEGORIES.SPICES,
  'garlic powder': CATEGORIES.SPICES,
  'onion powder': CATEGORIES.SPICES,
  'mustard seed': CATEGORIES.SPICES,
  'fennel seed': CATEGORIES.SPICES,
  'caraway seed': CATEGORIES.SPICES,
  'star anise': CATEGORIES.SPICES,
  'saffron': CATEGORIES.SPICES,
  'vanilla extract': CATEGORIES.SPICES,
  'almond extract': CATEGORIES.SPICES,
  
  // Oils & Vinegars
  'olive oil': CATEGORIES.OILS,
  'extra virgin olive oil': CATEGORIES.OILS,
  'vegetable oil': CATEGORIES.OILS,
  'canola oil': CATEGORIES.OILS,
  'coconut oil': CATEGORIES.OILS,
  'sesame oil': CATEGORIES.OILS,
  'avocado oil': CATEGORIES.OILS,
  'peanut oil': CATEGORIES.OILS,
  'walnut oil': CATEGORIES.OILS,
  'flaxseed oil': CATEGORIES.OILS,
  'grapeseed oil': CATEGORIES.OILS,
  'vinegar': CATEGORIES.OILS,
  'balsamic vinegar': CATEGORIES.OILS,
  'red wine vinegar': CATEGORIES.OILS,
  'white wine vinegar': CATEGORIES.OILS,
  'apple cider vinegar': CATEGORIES.OILS,
  'rice vinegar': CATEGORIES.OILS,
  'sherry vinegar': CATEGORIES.OILS,
  'champagne vinegar': CATEGORIES.OILS,
  
  // Condiments & Sauces
  'mayonnaise': CATEGORIES.CONDIMENTS,
  'ketchup': CATEGORIES.CONDIMENTS,
  'mustard': CATEGORIES.CONDIMENTS,
  'dijon mustard': CATEGORIES.CONDIMENTS,
  'whole grain mustard': CATEGORIES.CONDIMENTS,
  'soy sauce': CATEGORIES.CONDIMENTS,
  'hot sauce': CATEGORIES.CONDIMENTS,
  'salsa': CATEGORIES.CONDIMENTS,
  'bbq sauce': CATEGORIES.CONDIMENTS,
  'worcestershire sauce': CATEGORIES.CONDIMENTS,
  'fish sauce': CATEGORIES.CONDIMENTS,
  'oyster sauce': CATEGORIES.CONDIMENTS,
  'hoisin sauce': CATEGORIES.CONDIMENTS,
  'teriyaki sauce': CATEGORIES.CONDIMENTS,
  'sriracha': CATEGORIES.CONDIMENTS,
  'tabasco': CATEGORIES.CONDIMENTS,
  'pesto': CATEGORIES.CONDIMENTS,
  'hummus': CATEGORIES.CONDIMENTS,
  'tahini': CATEGORIES.CONDIMENTS,
  'relish': CATEGORIES.CONDIMENTS,
  
  // Sweeteners
  'honey': CATEGORIES.SWEETENERS,
  'maple syrup': CATEGORIES.SWEETENERS,
  'agave nectar': CATEGORIES.SWEETENERS,
  'molasses': CATEGORIES.SWEETENERS,
  'stevia': CATEGORIES.SWEETENERS,
  'monk fruit sweetener': CATEGORIES.SWEETENERS,
  'date syrup': CATEGORIES.SWEETENERS,
  'coconut sugar': CATEGORIES.SWEETENERS,
  
  // Baking
  'sugar': CATEGORIES.BAKING,
  'white sugar': CATEGORIES.BAKING,
  'granulated sugar': CATEGORIES.BAKING,
  'brown sugar': CATEGORIES.BAKING,
  'powdered sugar': CATEGORIES.BAKING,
  'confectioners sugar': CATEGORIES.BAKING,
  'flour': CATEGORIES.BAKING,
  'all-purpose flour': CATEGORIES.BAKING,
  'wheat flour': CATEGORIES.BAKING,
  'bread flour': CATEGORIES.BAKING,
  'cake flour': CATEGORIES.BAKING,
  'pastry flour': CATEGORIES.BAKING,
  'almond flour': CATEGORIES.BAKING,
  'coconut flour': CATEGORIES.BAKING,
  'baking powder': CATEGORIES.BAKING,
  'baking soda': CATEGORIES.BAKING,
  'yeast': CATEGORIES.BAKING,
  'chocolate': CATEGORIES.BAKING,
  'chocolate chip': CATEGORIES.BAKING,
  'cocoa powder': CATEGORIES.BAKING,
  'dark chocolate': CATEGORIES.BAKING,
  'milk chocolate': CATEGORIES.BAKING,
  'white chocolate': CATEGORIES.BAKING,
  'shortening': CATEGORIES.BAKING,
  'corn starch': CATEGORIES.BAKING,
  
  // Beans & Legumes
  'bean': CATEGORIES.BEANS,
  'black bean': CATEGORIES.BEANS,
  'kidney bean': CATEGORIES.BEANS,
  'pinto bean': CATEGORIES.BEANS,
  'chickpea': CATEGORIES.BEANS,
  'garbanzo bean': CATEGORIES.BEANS,
  'navy bean': CATEGORIES.BEANS,
  'cannellini bean': CATEGORIES.BEANS,
  'great northern bean': CATEGORIES.BEANS,
  'lima bean': CATEGORIES.BEANS,
  'lentil': CATEGORIES.BEANS,
  'split pea': CATEGORIES.BEANS,
  'edamame': CATEGORIES.BEANS,
  'black-eyed pea': CATEGORIES.BEANS,
  
  // Canned & Jarred Goods
  'canned tomato': CATEGORIES.CANNED,
  'tomato sauce': CATEGORIES.CANNED,
  'tomato paste': CATEGORIES.CANNED,
  'diced tomato': CATEGORIES.CANNED,
  'crushed tomato': CATEGORIES.CANNED,
  'tomato puree': CATEGORIES.CANNED,
  'canned tuna': CATEGORIES.CANNED,
  'canned salmon': CATEGORIES.CANNED,
  'canned sardine': CATEGORIES.CANNED,
  'canned corn': CATEGORIES.CANNED,
  'canned bean': CATEGORIES.CANNED,
  'canned pea': CATEGORIES.CANNED,
  'canned soup': CATEGORIES.CANNED,
  'broth': CATEGORIES.CANNED,
  'chicken broth': CATEGORIES.CANNED,
  'beef broth': CATEGORIES.CANNED,
  'vegetable broth': CATEGORIES.CANNED,
  'stock': CATEGORIES.CANNED,
  'olives': CATEGORIES.CANNED,
  'pickles': CATEGORIES.CANNED,
  'capers': CATEGORIES.CANNED,
  'jam': CATEGORIES.CANNED,
  'jelly': CATEGORIES.CANNED,
  'preserves': CATEGORIES.CANNED,
  
  // Frozen Foods
  'frozen pea': CATEGORIES.FROZEN,
  'frozen corn': CATEGORIES.FROZEN,
  'frozen spinach': CATEGORIES.FROZEN,
  'frozen broccoli': CATEGORIES.FROZEN,
  'frozen mixed vegetables': CATEGORIES.FROZEN,
  'frozen berry': CATEGORIES.FROZEN,
  'frozen strawberry': CATEGORIES.FROZEN,
  'frozen blueberry': CATEGORIES.FROZEN,
  'frozen pizza': CATEGORIES.FROZEN,
  'ice cream': CATEGORIES.FROZEN,
  
  // Beverages
  'water': CATEGORIES.BEVERAGES,
  'sparkling water': CATEGORIES.BEVERAGES,
  'coffee': CATEGORIES.BEVERAGES,
  'tea': CATEGORIES.BEVERAGES,
  'green tea': CATEGORIES.BEVERAGES,
  'black tea': CATEGORIES.BEVERAGES,
  'herbal tea': CATEGORIES.BEVERAGES,
  'juice': CATEGORIES.BEVERAGES,
  'orange juice': CATEGORIES.BEVERAGES,
  'apple juice': CATEGORIES.BEVERAGES,
  'cranberry juice': CATEGORIES.BEVERAGES,
  'lemonade': CATEGORIES.BEVERAGES,
  'soda': CATEGORIES.BEVERAGES,
  
  // Alcoholic Beverages
  'wine': CATEGORIES.ALCOHOL,
  'red wine': CATEGORIES.ALCOHOL,
  'white wine': CATEGORIES.ALCOHOL,
  'beer': CATEGORIES.ALCOHOL,
  'vodka': CATEGORIES.ALCOHOL,
  'rum': CATEGORIES.ALCOHOL,
  'whiskey': CATEGORIES.ALCOHOL,
  'tequila': CATEGORIES.ALCOHOL,
  'gin': CATEGORIES.ALCOHOL,
  'brandy': CATEGORIES.ALCOHOL,
  'bourbon': CATEGORIES.ALCOHOL,
  'champagne': CATEGORIES.ALCOHOL,
  'sake': CATEGORIES.ALCOHOL,
  
  // Snacks
  'chip': CATEGORIES.SNACKS,
  'potato chip': CATEGORIES.SNACKS,
  'tortilla chip': CATEGORIES.SNACKS,
  'popcorn': CATEGORIES.SNACKS,
  'pretzel': CATEGORIES.SNACKS,
  'cracker': CATEGORIES.SNACKS,
  'cookie': CATEGORIES.SNACKS,
  'chocolate bar': CATEGORIES.SNACKS,
  'granola bar': CATEGORIES.SNACKS,
  'dried fruit': CATEGORIES.SNACKS,
  'trail mix': CATEGORIES.SNACKS,
};

/**
 * Classifies an ingredient into its appropriate category
 * @param ingredient The ingredient name to classify
 * @returns The category for the ingredient
 */
export const classifyIngredient = (ingredient: string): string => {
  const normalizedIngredient = ingredient.toLowerCase().trim();
  
  // Check for exact matches first
  if (normalizedIngredient in COMMON_INGREDIENTS) {
    return COMMON_INGREDIENTS[normalizedIngredient as keyof typeof COMMON_INGREDIENTS];
  }
  
  // Check for partial matches
  for (const [key, category] of Object.entries(COMMON_INGREDIENTS)) {
    if (normalizedIngredient.includes(key) || key.includes(normalizedIngredient)) {
      return category;
    }
  }
  
  // Use some heuristics for common ingredient types
  if (/\b(pepper|tomato|carrot|onion|potato|bean|cabbage|celery)\b/.test(normalizedIngredient)) {
    return CATEGORIES.VEGETABLES;
  }
  
  if (/\b(apple|berry|fruit|banana|orange|grape|melon)\b/.test(normalizedIngredient)) {
    return CATEGORIES.FRUITS;
  }
  
  if (/\b(chicken|beef|pork|fish|meat|steak|seafood|shrimp)\b/.test(normalizedIngredient)) {
    return CATEGORIES.MEAT;
  }
  
  if (/\b(milk|cheese|yogurt|cream|butter|egg)\b/.test(normalizedIngredient)) {
    return CATEGORIES.DAIRY;
  }
  
  if (/\b(flour|rice|pasta|bread|oat|grain|wheat|cereal)\b/.test(normalizedIngredient)) {
    return CATEGORIES.GRAINS;
  }
  
  if (/\b(spice|herb|salt|pepper|seasoning|oregano|basil)\b/.test(normalizedIngredient)) {
    return CATEGORIES.SPICES;
  }
  
  if (/\b(oil|vinegar)\b/.test(normalizedIngredient)) {
    return CATEGORIES.OILS;
  }
  
  if (/\b(sauce|condiment|ketchup|mustard|dressing)\b/.test(normalizedIngredient)) {
    return CATEGORIES.CONDIMENTS;
  }
  
  if (/\b(sugar|baking|sweetener|cocoa|chocolate|vanilla)\b/.test(normalizedIngredient)) {
    return CATEGORIES.BAKING;
  }
  
  if (/\b(water|juice|tea|coffee|drink|beverage)\b/.test(normalizedIngredient)) {
    return CATEGORIES.BEVERAGES;
  }
  
  return CATEGORIES.OTHER;
};

/**
 * Adds scanned ingredients to the pantry with proper categorization
 * @param ingredients Array of ingredient names to add to pantry
 * @returns Promise that resolves when ingredients are added
 */
export const addScannedIngredientsToPantry = async (
  scannedIngredients: string[],
  existingPantryItems: PantryItem[] = []
): Promise<void> => {
  try {
    // Filter out any duplicates from the scanned ingredients list itself
    const uniqueScannedIngredients = [...new Set(scannedIngredients)];
    
    // Create a set of existing ingredient names (lowercase for case-insensitive comparison)
    const existingIngredientNames = new Set(
      existingPantryItems.map(item => item.name.toLowerCase())
    );
    
    // Filter out ingredients that already exist in the pantry
    const newIngredients = uniqueScannedIngredients.filter(
      ingredient => !existingIngredientNames.has(ingredient.toLowerCase())
    );
    
    // If no new ingredients after filtering duplicates, return early
    if (newIngredients.length === 0) {
      console.log('No new ingredients to add to pantry');
      return;
    }
    
    // Process the new ingredients
    const newPantryItems: PantryItem[] = newIngredients.map(ingredient => {
      const category = classifyIngredient(ingredient);
      return {
        id: uuidv4(),
        name: ingredient,
        category,
        quantity: 1,
        unit: 'item',
        available: true,
        addedOn: new Date().toISOString(),
      };
    });
    
    // Combine existing and new pantry items
    const updatedPantryItems = [...existingPantryItems, ...newPantryItems];
    
    // Save to AsyncStorage
    await AsyncStorage.setItem(
      'pantry_ingredients',
      JSON.stringify(updatedPantryItems)
    );
    
    console.log(`Added ${newPantryItems.length} new ingredients to pantry`);
  } catch (error) {
    console.error('Error adding scanned ingredients to pantry:', error);
    throw error;
  }
};

// Export utility functions
export default {
  classifyIngredient,
  addScannedIngredientsToPantry
}; 
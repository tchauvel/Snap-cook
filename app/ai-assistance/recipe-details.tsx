import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRecipeDetails, RecipeDetails, ingredientsMatch } from '../../services/recipeService';
import { SwipeListView } from 'react-native-swipe-list-view';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define ingredient type to handle both string and object formats
type Ingredient = string | {
  name: string;
  quantity: string;
  unit: string;
};

// Define PantryItem interface
interface PantryItem {
  id: string;
  name: string;
  category: string;
  quantity?: string;
  unit?: string;
  available?: boolean;
}

// Unit conversion data
const unitConversions = {
  cup: { toGrams: 240, toMl: 240 },
  cups: { toGrams: 240, toMl: 240 },
  tbsp: { toGrams: 15, toMl: 15 },
  tablespoon: { toGrams: 15, toMl: 15 },
  tablespoons: { toGrams: 15, toMl: 15 },
  tsp: { toGrams: 5, toMl: 5 },
  teaspoon: { toGrams: 5, toMl: 5 },
  teaspoons: { toGrams: 5, toMl: 5 },
  oz: { toGrams: 28.35, toMl: 30 },
  ounce: { toGrams: 28.35, toMl: 30 },
  ounces: { toGrams: 28.35, toMl: 30 },
  pound: { toGrams: 453.59, toMl: 0 },
  pounds: { toGrams: 453.59, toMl: 0 },
  // Add more conversions as needed
};

// Extend RecipeDetails to fix the type issue
interface ExtendedRecipeDetails extends Omit<RecipeDetails, 'ingredients'> {
  ingredients: Ingredient[];
  servings?: number;
}

export default function AIRecipeDetailScreen() {
  const { id, title, directTitle, directImageUrl } = useLocalSearchParams<{ 
    id?: string, 
    title?: string,
    directTitle?: string,
    directImageUrl?: string
  }>();
  
  const [recipe, setRecipe] = useState<ExtendedRecipeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [servings, setServings] = useState(4);
  const [originalServings, setOriginalServings] = useState(4);
  const [metricUnits, setMetricUnits] = useState(false);
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    // Load pantry items from AsyncStorage
    const loadPantryItems = async () => {
      try {
        const pantryData = await AsyncStorage.getItem('pantryItems');
        if (pantryData) {
          const items = JSON.parse(pantryData);
          console.log(`Loaded ${items.length} pantry items`);
          setPantryItems(items);
        } else {
          console.log('No pantry data found');
          setPantryItems([]);
        }
      } catch (error) {
        console.error('Error loading pantry items:', error);
        setPantryItems([]);
      }
    };

    loadPantryItems();
  }, []);

  // Check if recipe is in favorites
  useEffect(() => {
    const checkFavorites = async () => {
      try {
        const favoritesData = await AsyncStorage.getItem('favoriteRecipes');
        if (favoritesData) {
          const favorites = JSON.parse(favoritesData);
          const isCurrentFavorite = favorites.some((fav: any) => 
            fav.id.toString() === id.toString()
          );
          setIsFavorite(isCurrentFavorite);
        }
      } catch (error) {
        console.error('Error checking favorites:', error);
      }
    };

    if (id) {
      checkFavorites();
    }
  }, [id]);

  // Get the header title - use directTitle if available, fall back to params.title, and finally to recipe.title
  const getHeaderTitle = () => {
    if (directTitle) {
      return directTitle;
    }
    if (title) {
      return title as string;
    }
    return recipe?.title || 'Recipe Details';
  };

  // Get the display title (for the page content) - prefer recipe.title if loaded
  const getDisplayTitle = () => {
    return recipe?.title || getHeaderTitle();
  };

  useEffect(() => {
    const loadRecipeDetails = async () => {
      setIsLoading(true);
      
      try {
        const recipeId = id?.toString();
        const recipeTitle = directTitle || title;
        
        console.log(`Loading recipe details for ID: ${recipeId}, Title: ${recipeTitle}`);
        
        if (!recipeId) {
          setError('Recipe ID is missing');
          setIsLoading(false);
          return;
        }
        
        // First check if we have cached recipe data from the recipe list
        const cachedBasicRecipeKey = `recipe_basic_${recipeId}`;
        const cachedInfoRecipeKey = `recipe_info_${recipeId}`;
        
        try {
          // Try to get the direct cached data first
          const cachedBasicData = await AsyncStorage.getItem(cachedBasicRecipeKey);
          const cachedInfoData = await AsyncStorage.getItem(cachedInfoRecipeKey);
          
          // If we have cached info with full recipe details, use it
          if (cachedInfoData) {
            const parsedRecipe = JSON.parse(cachedInfoData);
            console.log(`Found cached recipe info: ${parsedRecipe.title}`);
            
            // Set servings from cache
            const recipeServings = parsedRecipe.servings || 4;
            setServings(recipeServings);
            setOriginalServings(recipeServings);
            
            // Set description or generate one if missing
            const recipeDescription = parsedRecipe.description || 
              `A delicious ${parsedRecipe.title} recipe with ${parsedRecipe.ingredients?.length || 'various'} ingredients. ` +
              `Ready in about ${parsedRecipe.cookTime || 'a short time'}.`;
            setDescription(recipeDescription);
            
            // Create a typed copy of the recipe data
            const typedRecipeData: ExtendedRecipeDetails = {
              ...parsedRecipe,
              servings: recipeServings,
              // Override with direct title if available
              title: directTitle || parsedRecipe.title,
              // Override with direct image URL if available
              imageUrl: directImageUrl || parsedRecipe.imageUrl,
              ingredients: Array.isArray(parsedRecipe.ingredients) 
                ? parsedRecipe.ingredients.map((ing: any) => {
                    if (typeof ing === 'string') {
                      return cleanIngredientText(ing);
                    } else {
                      return {
                        name: ing.name || '',
                        quantity: ing.quantity || '',
                        unit: ing.unit || ''
                      };
                    }
                  })
                : [],
              // Clean instruction steps and ensure they're more informative
              steps: Array.isArray(parsedRecipe.steps)
                ? parsedRecipe.steps.map((step: string) => cleanInstructionText(step))
                : ["Prepare all ingredients according to the ingredient list.",
                   "Follow cooking instructions provided with the recipe source.",
                   "Cook until done and serve immediately while hot.",
                   "See full recipe on the original source for more detailed instructions."]
            };
            
            setRecipe(typedRecipeData);
            setIsLoading(false);
            return;
          }
          // If we have basic cache data with just ID and title, use it as fallback if needed
          else if (cachedBasicData) {
            console.log('Found cached basic recipe data');
          }
        } catch (cacheError) {
          console.log('Error reading cached recipe data:', cacheError);
          // Continue to fetch from API
        }
        
        // Get recipe details from the service
        const recipeData = await getRecipeDetails(recipeId);
        
        if (recipeData) {
          console.log('Recipe details loaded successfully');
          console.log('Ingredients:', recipeData.ingredients);
          
          // Set default servings from recipe or fallback to 4
          const recipeServings = recipeData.servings || 4;
          setServings(recipeServings);
          setOriginalServings(recipeServings);
          
          // Generate a description if missing
          const recipeDescription = recipeData.description || 
            `A delicious ${recipeData.title} recipe with ${recipeData.ingredients?.length || 'various'} ingredients. ` +
            `Ready in about ${recipeData.cookTime || 'a short time'}.`;
          setDescription(recipeDescription);
          
          // Create a typed copy of the recipe data
          const typedRecipeData: ExtendedRecipeDetails = {
            ...recipeData,
            // Override with direct title if available
            title: directTitle || recipeData.title,
            // Override with direct image URL if available
            imageUrl: directImageUrl || recipeData.imageUrl,
            servings: recipeServings,
            ingredients: recipeData.ingredients.map((ing: any) => {
              if (typeof ing === 'string') {
                return cleanIngredientText(ing);
              } else {
                return {
                  name: ing.name || '',
                  quantity: ing.quantity || '',
                  unit: ing.unit || ''
                };
              }
            }),
            // Clean instruction steps and ensure they're more informative
            steps: recipeData.steps && recipeData.steps.length > 0
              ? recipeData.steps.map((step: string) => cleanInstructionText(step))
              : ["Prepare all ingredients according to the ingredient list.",
                 "Follow cooking instructions provided with the recipe source.",
                 "Cook until done and serve immediately while hot.",
                 "See full recipe on the original source for more detailed instructions."]
          };
          
          setRecipe(typedRecipeData);
        } else {
          console.error('Recipe not found from service');
          setError('Recipe details could not be loaded');
        }
      } catch (err) {
        console.error('Error loading recipe details:', err);
        setError('Failed to load recipe. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecipeDetails();
  }, [id, directTitle, directImageUrl]);

  // Toggle favorite status for this recipe
  const toggleFavorite = async () => {
    if (!recipe || !id) return;
    
    try {
      // Get current favorites
      const favoritesData = await AsyncStorage.getItem('favoriteRecipes');
      let favorites = favoritesData ? JSON.parse(favoritesData) : [];
      
      if (isFavorite) {
        // Remove from favorites
        favorites = favorites.filter((fav: any) => fav.id.toString() !== id.toString());
        console.log(`Removed recipe ${id} from favorites`);
      } else {
        // Add to favorites - save full recipe to be consistent with index.tsx
        const favoriteRecipe: any = {
          id: id,
          title: recipe.title,
          imageUrl: recipe.imageUrl,
          cookTime: recipe.cookTime,
          // Include ingredients 
          matchedIngredientsCount: recipe.matchedIngredientsCount || 0,
          totalIngredients: recipe.ingredients.length
        };
        
        // Add match score if exists
        if ('matchScore' in recipe) {
          favoriteRecipe.matchScore = (recipe as any).matchScore;
        }
        
        favorites.push(favoriteRecipe);
        console.log(`Added recipe ${id} to favorites`);
      }
      
      // Save updated favorites
      await AsyncStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
      // Update UI state
      setIsFavorite(!isFavorite);
      
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
  };

  // Check if an ingredient matches any pantry item
  const isIngredientInPantry = (ingredientName: string): boolean => {
    if (!pantryItems || pantryItems.length === 0) return false;
    
    // Get the ingredient name in lowercase for comparison
    const lowerIngName = ingredientName.toLowerCase();
    
    return pantryItems.some(item => {
      // Only check available items
      if (item.available === false) return false;
      
      // Use the ingredientsMatch helper from recipeService
      return ingredientsMatch(item.name.toLowerCase(), lowerIngName);
    });
  };

  // Clean up ingredient text by removing unnecessary dashes and placeholders
  const cleanIngredientText = (text: string): string => {
    // Remove leading dashes with spaces
    let cleaned = text.replace(/^\s*-\s*/, '');
    
    // Check if it's a placeholder-like ingredient 
    if (/^ingredient\s+\d+$/i.test(cleaned)) {
      return ''; // Return empty string for placeholder ingredients
    }
    
    // Add indicator if the text was cleaned (had a dash removed)
    if (cleaned !== text) {
      console.log(`Cleaned text from: "${text}" to: "${cleaned}"`);
    }
    
    return cleaned;
  };

  // Clean instruction text of unnecessary formatting
  const cleanInstructionText = (text: string): string => {
    // Remove leading numbers and periods (e.g., "1. ", "2. ")
    let cleaned = text.replace(/^\s*\d+\.\s*/, '');
    
    // Remove leading dashes
    cleaned = cleaned.replace(/^\s*-\s*/, '');
    
    // Capitalize first letter if it's not already
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    
    return cleaned;
  };

  // Parse quantity from ingredient string
  const parseQuantity = (ingredientText: string): { quantity: string, rest: string } => {
    // Match common fraction patterns and numbers at start of string
    const match = ingredientText.match(/^\s*([\d¼½¾⅓⅔⅛⅜⅝⅞]+\s*\/?\s*[\d¼½¾⅓⅔⅛⅜⅝⅞]*|\d+(\.\d+)?)\s*(.*)/);
    
    if (match) {
      return {
        quantity: match[1].trim(),
        rest: match[3].trim()
      };
    }
    
    return { quantity: '', rest: ingredientText.trim() };
  };

  // Adjust quantity based on servings
  const adjustQuantity = (quantity: string, factor: number): string => {
    // Handle fractions
    if (quantity.includes('/')) {
      const [numerator, denominator] = quantity.split('/').map(part => parseFloat(part.trim()));
      const decimal = numerator / denominator;
      const adjusted = decimal * factor;
      
      // Format back to fraction if close to common fractions
      return formatFraction(adjusted);
    }
    
    // Handle special unicode fractions
    const fractionMap: {[key: string]: number} = {
      '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1/3, '⅔': 2/3,
      '⅛': 1/8, '⅜': 3/8, '⅝': 5/8, '⅞': 7/8
    };
    
    for (const [symbol, value] of Object.entries(fractionMap)) {
      if (quantity.includes(symbol)) {
        const parts = quantity.replace(symbol, '').trim();
        const whole = parts ? parseFloat(parts) : 0;
        const total = whole + value;
        const adjusted = total * factor;
        return formatFraction(adjusted);
      }
    }
    
    // Regular numeric value
    const numeric = parseFloat(quantity);
    if (isNaN(numeric)) return quantity; // Return original if not a number
    
    const adjusted = numeric * factor;
    return adjusted % 1 === 0 ? adjusted.toString() : adjusted.toFixed(1);
  };
  
  // Format decimal to fraction if close to common fractions
  const formatFraction = (value: number): string => {
    const whole = Math.floor(value);
    const decimal = value - whole;
    
    // Map of common fractions
    const fractions: {[key: string]: number} = {
      '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1/3, '⅔': 2/3,
      '⅛': 1/8, '⅜': 3/8, '⅝': 5/8, '⅞': 7/8
    };
    
    // Find closest fraction
    let closestDiff = 1;
    let closestFraction = '';
    
    for (const [fraction, value] of Object.entries(fractions)) {
      const diff = Math.abs(decimal - value);
      if (diff < closestDiff && diff < 0.05) { // Within 5% tolerance
        closestDiff = diff;
        closestFraction = fraction;
      }
    }
    
    if (closestFraction) {
      return whole > 0 ? `${whole} ${closestFraction}` : closestFraction;
    }
    
    // If no close fraction, return decimal
    return value.toFixed(1);
  };
  
  // Convert units between imperial and metric
  const convertUnit = (quantity: string, unit: string): { quantity: string, unit: string } => {
    if (!metricUnits) return { quantity, unit }; // Don't convert if metric mode is off
    
    const lowercaseUnit = unit.toLowerCase();
    const numeric = parseFloat(quantity);
    
    if (isNaN(numeric)) return { quantity, unit };
    
    // Convert to metric
    const normalizedUnit = lowercaseUnit.replace(/s$/, ''); // Remove trailing 's' for plurals
    
    if (lowercaseUnit in unitConversions) {
      const conversion = unitConversions[lowercaseUnit as keyof typeof unitConversions];
      
      // Convert cups, tbsp, tsp, tablespoon(s), teaspoon(s) to ml
      if (lowercaseUnit === 'cup' || lowercaseUnit === 'cups' || 
          lowercaseUnit === 'tbsp' || lowercaseUnit === 'tsp' ||
          lowercaseUnit === 'tablespoon' || lowercaseUnit === 'tablespoons' ||
          lowercaseUnit === 'teaspoon' || lowercaseUnit === 'teaspoons') {
        return { 
          quantity: (numeric * conversion.toMl).toFixed(0), 
          unit: 'ml' 
        };
      }
      
      // Convert oz, pound to grams
      if (lowercaseUnit === 'oz' || lowercaseUnit === 'ounce' || lowercaseUnit === 'ounces' || 
          lowercaseUnit === 'pound' || lowercaseUnit === 'pounds') {
        return { 
          quantity: (numeric * conversion.toGrams).toFixed(0), 
          unit: 'g' 
        };
      }
    } else if (normalizedUnit in unitConversions) {
      // Try with normalized unit (without plural 's')
      const conversion = unitConversions[normalizedUnit as keyof typeof unitConversions];
      
      // Convert cups, tbsp, tsp, tablespoon, teaspoon to ml
      if (normalizedUnit === 'cup' || normalizedUnit === 'tbsp' || normalizedUnit === 'tsp' ||
          normalizedUnit === 'tablespoon' || normalizedUnit === 'teaspoon') {
        return { 
          quantity: (numeric * conversion.toMl).toFixed(0), 
          unit: 'ml' 
        };
      }
      
      // Convert oz, pound to grams
      if (normalizedUnit === 'oz' || normalizedUnit === 'ounce' || normalizedUnit === 'pound') {
        return { 
          quantity: (numeric * conversion.toGrams).toFixed(0), 
          unit: 'g' 
        };
      }
    }
    
    return { quantity, unit };
  };
  
  // Process ingredient for display, including quantity adjustment and unit conversion
  const processIngredient = (ingredient: Ingredient): { displayText: string, quantity: string, unit: string, name: string, inPantry: boolean } => {
    let ingredientName = '';
    
    if (typeof ingredient === 'string') {
      // Handle string format ingredients
      if (!ingredient.trim()) {
        console.log(`Filtering out empty ingredient: "${ingredient}"`);
        return { displayText: '', quantity: '', unit: '', name: '', inPantry: false };
      }
      
      const { quantity, rest } = parseQuantity(ingredient);
      
      if (!quantity) {
        const inPantry = isIngredientInPantry(ingredient);
        return { 
          displayText: ingredient, 
          quantity: '', 
          unit: '', 
          name: ingredient,
          inPantry
        };
      }
      
      // Try to identify unit in the rest of the text
      const unitMatch = rest.match(/^(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|oz|ounce|ounces|pound|pounds|g|ml|l|kg)\s+(of\s+)?(.*)$/i);
      
      if (unitMatch) {
        const originalUnit = unitMatch[1];
        const name = unitMatch[3]; // The ingredient name is now in capture group 3 because of the optional "of"
        ingredientName = name;
        
        // Calculate adjusted quantity
        const servingFactor = servings / originalServings;
        const adjustedQuantity = adjustQuantity(quantity, servingFactor);
        
        // Convert units if needed
        const { quantity: convertedQuantity, unit: convertedUnit } = 
          convertUnit(adjustedQuantity, originalUnit);
        
        // Check if this ingredient is in the pantry
        const inPantry = isIngredientInPantry(name);
        
        return {
          displayText: `${convertedQuantity} ${convertedUnit} ${name}`,
          quantity: convertedQuantity,
          unit: convertedUnit,
          name,
          inPantry
        };
      }
      
      // No unit identified, just adjust quantity
      const servingFactor = servings / originalServings;
      const adjustedQuantity = adjustQuantity(quantity, servingFactor);
      ingredientName = rest;
      
      // Check if this ingredient is in the pantry
      const inPantry = isIngredientInPantry(rest);
      
      return {
        displayText: `${adjustedQuantity} ${rest}`,
        quantity: adjustedQuantity,
        unit: '',
        name: rest,
        inPantry
      };
    } else {
      // Handle object format ingredients
      const servingFactor = servings / originalServings;
      let adjustedQuantity = ingredient.quantity;
      let displayUnit = ingredient.unit;
      ingredientName = ingredient.name;
      
      if (ingredient.quantity) {
        adjustedQuantity = adjustQuantity(ingredient.quantity, servingFactor);
      }
      
      if (ingredient.unit) {
        const converted = convertUnit(adjustedQuantity, ingredient.unit);
        adjustedQuantity = converted.quantity;
        displayUnit = converted.unit;
      }
      
      // Check if this ingredient is in the pantry
      const inPantry = isIngredientInPantry(ingredient.name);
      
      return {
        displayText: `${adjustedQuantity} ${displayUnit} ${ingredient.name}`.trim(),
        quantity: adjustedQuantity,
        unit: displayUnit,
        name: ingredient.name,
        inPantry
      };
    }
  };

  const increaseServings = () => {
    setServings(prev => Math.min(prev + 1, 20)); // Cap at 20 servings
  };

  const decreaseServings = () => {
    setServings(prev => Math.max(prev - 1, 1)); // Minimum 1 serving
  };

  const toggleUnitSystem = () => {
    setMetricUnits(prev => !prev);
  };

  // Back button navigation
  const goBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading Recipe...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E07A5F" />
          <Text style={styles.loadingText}>Loading recipe details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recipe Not Found</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Recipe not found'}</Text>
          <TouchableOpacity 
            style={styles.backToRecipesButton}
            onPress={goBack}
          >
            <Text style={styles.backToRecipesText}>Back to Recipes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {getHeaderTitle()}
        </Text>
        {recipe && (
          <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? "#E07A5F" : "#666"} 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E07A5F" />
          <Text style={styles.loadingText}>Loading recipe details...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.backToRecipesButton}
            onPress={goBack}
          >
            <Text style={styles.backToRecipesText}>Back to Recipes</Text>
          </TouchableOpacity>
        </View>
      ) : !recipe ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Recipe not found</Text>
          <TouchableOpacity 
            style={styles.backToRecipesButton}
            onPress={goBack}
          >
            <Text style={styles.backToRecipesText}>Back to Recipes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <Image 
            source={{ uri: recipe.imageUrl }} 
            style={styles.recipeImage} 
            resizeMode="cover"
          />
          
          <View style={styles.recipeContent}>
            <View style={styles.titleRow}>
              <Text style={styles.recipeTitle}>{getDisplayTitle()}</Text>
              <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
                <Ionicons 
                  name={isFavorite ? "heart" : "heart-outline"} 
                  size={28} 
                  color={isFavorite ? "#E07A5F" : "#666"} 
                />
              </TouchableOpacity>
            </View>
            
            {/* Description */}
            {description ? (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionText}>{description}</Text>
              </View>
            ) : null}
            
            {/* Time Information */}
            <View style={styles.timeInfo}>
              <View style={styles.timeItem}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.timeLabel}>Prep:</Text>
                <Text style={styles.timeValue}>{recipe.prepTime}</Text>
              </View>
              <View style={styles.timeItem}>
                <Ionicons name="flame-outline" size={20} color="#666" />
                <Text style={styles.timeLabel}>Cook:</Text>
                <Text style={styles.timeValue}>{recipe.cookTime}</Text>
              </View>
            </View>
            
            {/* Source Information */}
            {recipe.sourceName && (
              <View style={styles.sourceContainer}>
                <Text style={styles.sourceText}>Source: {recipe.sourceName}</Text>
              </View>
            )}
            
            {/* Servings Control */}
            <View style={styles.servingsContainer}>
              <Text style={styles.servingsLabel}>Servings:</Text>
              <View style={styles.servingsControls}>
                <TouchableOpacity 
                  style={styles.servingsButton}
                  onPress={decreaseServings}
                  disabled={servings <= 1}
                >
                  <Ionicons name="remove" size={20} color="#E07A5F" />
                </TouchableOpacity>
                <Text style={styles.servingsCount}>{servings}</Text>
                <TouchableOpacity 
                  style={styles.servingsButton}
                  onPress={increaseServings}
                  disabled={servings >= 20}
                >
                  <Ionicons name="add" size={20} color="#E07A5F" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Unit Conversion Toggle */}
            <TouchableOpacity 
              style={styles.unitToggleContainer}
              onPress={toggleUnitSystem}
            >
              <Text style={styles.unitToggleText}>
                {metricUnits ? 'Switch to Imperial Units' : 'Switch to Metric Units'}
              </Text>
              <Ionicons 
                name={metricUnits ? "swap-horizontal" : "swap-horizontal"} 
                size={18} 
                color="#E07A5F" 
              />
            </TouchableOpacity>
            
            {/* Pantry Match Legend */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.legendText}>In Pantry</Text>
              </View>
              <View style={styles.legendItem}>
                <Ionicons name="ellipse" size={16} color="#999" />
                <Text style={styles.legendText}>Not in Pantry</Text>
              </View>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                <View>
                  {recipe.ingredients
                    .map(processIngredient)
                    .filter(ing => ing.displayText.trim()) // Filter out empty ingredients
                    .map((processedIng, index) => (
                      <View key={index} style={styles.ingredientRow}>
                        <View style={styles.ingredientBullet}>
                          <Ionicons 
                            name={processedIng.inPantry ? "checkmark-circle" : "ellipse"} 
                            size={16} 
                            color={processedIng.inPantry ? "#4CAF50" : "#999"} 
                          />
                        </View>
                        <Text style={styles.ingredientText}>
                          {processedIng.displayText}
                        </Text>
                      </View>
                    ))
                  }
                </View>
              ) : (
                <Text style={styles.noIngredientsText}>No ingredients available</Text>
              )}
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              {recipe.steps && recipe.steps.length > 0 ? (
                recipe.steps.map((step, index) => (
                  <View key={index} style={styles.stepContainer}>
                    <View style={styles.stepNumberContainer}>
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noInstructionsText}>
                  No detailed instructions available. Please refer to the original recipe source.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      )}
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
    paddingVertical: 12,
    backgroundColor: '#FAF9F7',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginLeft: 16,
  },
  backButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backToRecipesButton: {
    backgroundColor: '#E07A5F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backToRecipesText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  recipeImage: {
    width: '100%',
    height: 250,
  },
  recipeContent: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    marginRight: 16,
  },
  favoriteButton: {
    padding: 8,
  },
  timeInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  timeLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  timeValue: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  sourceContainer: {
    marginBottom: 16,
  },
  sourceText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    alignItems: 'center',
  },
  ingredientBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  ingredientQuantity: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  noIngredientsText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E07A5F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumber: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  servingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  servingsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  servingsControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  servingsCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    width: 30,
    textAlign: 'center',
  },
  unitToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  unitToggleText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  descriptionContainer: {
    marginBottom: 16,
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E07A5F',
  },
  descriptionText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  noInstructionsText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 16,
    lineHeight: 22,
  },
}); 
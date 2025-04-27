import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Image, ActivityIndicator, FlatList, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { findMatchingRecipes } from '../services/recipeService';
import { LogBox } from 'react-native';

// Temporarily ignore the nesting warning while we fix the underlying issue
LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

// Import the Recipe type from the service instead of redefining it
import type { Recipe } from '../services/recipeService';

// Placeholder image URL for recipes without images
const PLACEHOLDER_IMAGE_URL = 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600';

// Function to get color for the current season
const getSeasonColor = () => {
  const now = new Date();
  const month = now.getMonth();
  
  // Winter (December, January, February)
  if (month === 11 || month === 0 || month === 1) {
    return '#A8D1E7'; // Light blue
  }
  // Spring (March, April, May)
  else if (month >= 2 && month <= 4) {
    return '#B5EAD7'; // Light green
  }
  // Summer (June, July, August)
  else if (month >= 5 && month <= 7) {
    return '#FFD166'; // Yellow
  }
  // Fall (September, October, November)
  else {
    return '#E07A5F'; // Orange
  }
};

export default function HomeScreen() {
  const [pantryIngredients, setPantryIngredients] = useState<string[]>([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [seasonalRecipes, setSeasonalRecipes] = useState<Recipe[]>([]);
  
  // Get current season
  const getSeasonName = () => {
    const date = new Date();
    const month = date.getMonth();
    
    if (month >= 2 && month <= 4) {
      return "Spring";
    } else if (month >= 5 && month <= 7) {
      return "Summer";
    } else if (month >= 8 && month <= 10) {
      return "Fall";
    } else {
      return "Winter";
    }
  };
  
  const season = getSeasonName();

  useEffect(() => {
    // Load pantry ingredients and get recipe recommendations
    loadPantryIngredients();
    loadRecentSearches();
    loadFavoriteRecipes();
    loadSeasonalRecipes();
  }, []);

  const loadPantryIngredients = async () => {
    try {
      setIsLoading(true);
      // Try to get pantry items first
      const pantryItemsJson = await AsyncStorage.getItem('pantryItems');
      let ingredients: string[] = [];
      
      if (pantryItemsJson) {
        const pantryItems = JSON.parse(pantryItemsJson);
        ingredients = pantryItems.map((item: any) => item.name);
      } else {
        // Try legacy format if needed
        const legacyPantryJson = await AsyncStorage.getItem('pantry_ingredients');
        if (legacyPantryJson) {
          const legacyPantry = JSON.parse(legacyPantryJson);
          ingredients = Object.keys(legacyPantry).filter(ing => legacyPantry[ing]);
        }
      }
      
      setPantryIngredients(ingredients);
      
      // Call getRecipeRecommendations and await its result
      await getRecipeRecommendations(ingredients);
    } catch (error) {
      console.error('Error loading pantry ingredients:', error);
      setIsLoading(false);
    }
  };

  const loadRecentSearches = async () => {
    try {
      const searches = await AsyncStorage.getItem('recent_searches');
      if (searches) {
        setRecentSearches(JSON.parse(searches));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };
  
  const loadFavoriteRecipes = async () => {
    try {
      const favorites = await AsyncStorage.getItem('favoriteRecipes');
      if (favorites) {
        setFavoriteRecipes(JSON.parse(favorites));
      }
    } catch (error) {
      console.error('Error loading favorite recipes:', error);
    }
  };

  const loadSeasonalRecipes = async () => {
    try {
      // Use actual seasonal ingredients instead of the season name
      const seasonalIngredients = {
        'Spring': ['asparagus', 'peas', 'strawberries', 'artichoke'],
        'Summer': ['tomato', 'zucchini', 'corn', 'berries'],
        'Fall': ['pumpkin', 'apple', 'mushrooms', 'squash'],
        'Winter': ['potato', 'citrus', 'kale', 'sweet potato']
      };
      
      // Get ingredients for current season
      const ingredients = seasonalIngredients[season as keyof typeof seasonalIngredients];
      
      // Pick one random ingredient from the season
      const randomIndex = Math.floor(Math.random() * ingredients.length);
      const randomIngredient = ingredients[randomIndex];
      
      // Search with the seasonal ingredient
      const recipes = await findMatchingRecipes([randomIngredient], 'en', 5);
      
      // Sort recipes by match score (descending)
      const sortedRecipes = [...recipes].sort((a, b) => {
        // Get match scores, defaulting to 0 if not available
        const scoreA = a.matchScore !== undefined ? a.matchScore : 0;
        const scoreB = b.matchScore !== undefined ? b.matchScore : 0;
        
        // Sort in descending order (higher scores first)
        return scoreB - scoreA;
      });
      
      setSeasonalRecipes(sortedRecipes);
    } catch (error) {
      console.error('Error loading seasonal recipes:', error);
    }
  };

  const saveRecentSearch = async (query: string) => {
    try {
      // Normalize the query
      const normalizedQuery = query.trim().toLowerCase();
      
      // Don't save empty queries
      if (!normalizedQuery) return;
      
      // Get current searches
      let searches = [...recentSearches];
      
      // Remove if already exists (to move it to the top)
      searches = searches.filter(s => s.toLowerCase() !== normalizedQuery);
      
      // Add to beginning
      searches.unshift(normalizedQuery);
      
      // Limit to 5 recent searches
      searches = searches.slice(0, 5);
      
      // Update state
      setRecentSearches(searches);
      
      // Save to storage
      await AsyncStorage.setItem('recent_searches', JSON.stringify(searches));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };
  
  const toggleFavorite = async (recipe: Recipe) => {
    try {
      // Check if recipe is already in favorites
      const isAlreadyFavorite = favoriteRecipes.some(fav => fav.id === recipe.id);
      
      let updatedFavorites: Recipe[];
      
      if (isAlreadyFavorite) {
        // If already a favorite, remove it
        updatedFavorites = favoriteRecipes.filter(fav => fav.id !== recipe.id);
      } else {
        // If not a favorite, add it
        updatedFavorites = [...favoriteRecipes, recipe];
      }
      
      // Update state
      setFavoriteRecipes(updatedFavorites);
      
      // Save to storage
      await AsyncStorage.setItem('favoriteRecipes', JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('Error updating favorite recipes:', error);
    }
  };
  
  const isFavorite = (recipeId: string | number): boolean => {
    return favoriteRecipes.some(fav => fav.id.toString() === recipeId.toString());
  };

  // Function to clear recipe cache data
  const clearRecipeCache = async () => {
    try {
      console.log('Clearing recipe cache and ingredient data...');
      // Get all keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      
      // Filter for recipe-related and ingredient-related keys
      const cacheKeys = keys.filter(key => 
        key.startsWith('recipe_') || 
        key.startsWith('recipes_') || 
        key.startsWith('spoonacular_') || 
        key.startsWith('edamam_') ||
        key.includes('ingredients') ||
        key.includes('pantry')
      );
      
      if (cacheKeys.length > 0) {
        // Remove all cache items
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`Cleared ${cacheKeys.length} cache items`);
        
        // Reset ingredient state
        setPantryIngredients([]);
        
        // Show "random popular recipes" instead of ingredient-based ones
        setRecommendedRecipes([]);
      } else {
        console.log('No cache found to clear');
      }
      
      // Force a complete refresh
      setIsLoading(true);
      
      // Force reload with empty ingredients to get truly random recommendations
      const recipes = await findMatchingRecipes([], 'en', 5);
      setRecommendedRecipes(recipes);
      console.log('Loaded fresh random recipes');
      
      // Then reload pantry data after showing random recipes
      loadPantryIngredients();
    } catch (error) {
      console.error('Error clearing cache:', error);
      setIsLoading(false);
    }
  };

  const getRecipeRecommendations = async (ingredients: string[]) => {
    try {
      setIsLoading(true);
      
      // Validate inputs first
      if (!ingredients) {
        console.warn('No ingredients provided to getRecipeRecommendations');
        ingredients = [];
      }
      
      // Make sure ingredients is an array
      if (!Array.isArray(ingredients)) {
        console.warn('Ingredients is not an array:', ingredients);
        ingredients = [];
      }
      
      // If there are pantry ingredients, find matching recipes with proper language
      // Default to English but you can also detect user language
      const userLanguage = 'en'; // You can get this from device settings
      
      // Now properly await the async function
      const recipes = await findMatchingRecipes(ingredients, userLanguage);
      
      // Validate recipes 
      if (!recipes || !Array.isArray(recipes)) {
        console.warn('Invalid recipes returned from findMatchingRecipes');
        setRecommendedRecipes([]);
      } else {
        console.log(`Found ${recipes.length} recipe recommendations`);
        
        // Sort recipes by match score (descending)
        const sortedRecipes = [...recipes].sort((a, b) => {
          // Get match scores, defaulting to 0 if not available
          const scoreA = a.matchScore !== undefined ? a.matchScore : 0;
          const scoreB = b.matchScore !== undefined ? b.matchScore : 0;
          
          // Sort in descending order (higher scores first)
          return scoreB - scoreA;
        });
        
        console.log(`Sorted recipes by match score, top recipe score: ${sortedRecipes.length > 0 ? 
          sortedRecipes[0].matchScore || 'N/A' : 'no recipes'}`);
        
        setRecommendedRecipes(sortedRecipes);
      }
    } catch (error) {
      console.error('Error getting recipe recommendations:', error);
      // Set empty array as fallback
      setRecommendedRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateTo = (screen: string) => {
    router.push(screen as any);
  };

  const searchRecipes = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    
    try {
      // Save to recent searches
      await saveRecentSearch(query);
      
      // Navigate to recipes screen with search param
      router.push({
        pathname: '/ai-assistance/recipes',
        params: { search: query }
      });
    } catch (error) {
      console.error('Error searching recipes:', error);
    } finally {
      setIsSearching(false);
      // Close search UI
      setShowSearch(false);
    }
  };

  const handleSearchPress = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      loadRecentSearches();
    }
  };
  
  const toggleFavoritesView = () => {
    // Navigate to favorites screen instead of showing inline
    router.push('/favorites');
  };

  const renderSearchUI = () => {
    if (!showSearch) return null;
    
    return (
      <View style={styles.searchUIContainer}>
        <TouchableWithoutFeedback onPress={() => {
          if (!searchText.trim()) {
            setShowSearch(false);
          }
          Keyboard.dismiss();
        }}>
          <View style={styles.searchUIOverlay} />
        </TouchableWithoutFeedback>
        
        <View style={styles.searchUI}>
          <View style={styles.searchInputWrapper}>
            <TextInput
              style={styles.searchInputExpanded}
              placeholder="Search for a recipe..."
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => searchRecipes(searchText)}
            />
            {searchText ? (
              <TouchableOpacity 
                style={styles.clearSearch} 
                onPress={() => setSearchText('')}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
          
          {recentSearches.length > 0 && (
            <View style={styles.recentSearches}>
              <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recentSearchItem}
                  onPress={() => searchRecipes(search)}
                >
                  <Ionicons name="time-outline" size={16} color="#999" style={styles.recentSearchIcon} />
                  <Text style={styles.recentSearchText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          <View style={styles.searchSuggestions}>
            <Text style={styles.searchSuggestionsTitle}>Popular Searches</Text>
            {['Pasta', 'Chicken', 'Vegetarian', 'Quick meals', 'Desserts'].map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.searchSuggestionItem}
                onPress={() => searchRecipes(suggestion)}
              >
                <Ionicons name="trending-up-outline" size={16} color="#E07A5F" style={styles.suggestionIcon} />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };
  
  // Filter recipes by category
  const getFilteredRecipes = () => {
    return recommendedRecipes;
  };

  const renderRecipeCard = (recipe: Recipe, compact: boolean = false, isSeasonal: boolean = false) => {
    // Extract the cooking time value without "min" if it's already included
    const cookTimeValue = recipe.cookTime ? 
      (recipe.cookTime.includes('min') ? 
        recipe.cookTime : 
        `${recipe.cookTime} min`) : 
      '30 min';
      
    // Make sure we have a valid match score percentage (between 0-100%)
    const matchScorePercentage = recipe.matchScore !== undefined 
      ? Math.min(Math.round(recipe.matchScore * 100), 100)
      : recipe.matchedIngredients && recipe.totalIngredients
        ? Math.min(Math.round((recipe.matchedIngredients.length / recipe.totalIngredients) * 100), 100)
        : undefined;
        
    // Get color based on match percentage
    const getMatchColor = (percentage: number) => {
      if (percentage >= 75) return '#4CAF50'; // Green for high match (75%+)
      if (percentage >= 50) return '#8BC34A'; // Light green for good match (50-74%)
      if (percentage >= 30) return '#FFC107'; // Amber for medium match (30-49%)
      if (percentage >= 10) return '#FF9800'; // Orange for low match (10-29%)
      return '#F44336'; // Red for very low match (below 10%)
    };
    
    const matchColor = matchScorePercentage !== undefined ? getMatchColor(matchScorePercentage) : undefined;

    const handleRecipePress = async () => {
      try {
        // Save recipe data to cache before navigation
        const basicCacheKey = `recipe_basic_${recipe.id}`;
        
        // Create a complete cache record with all necessary data
        const recipeData = {
          ...recipe,
          // Make sure we have these properties
          id: recipe.id,
          title: recipe.title,
          imageUrl: recipe.imageUrl || PLACEHOLDER_IMAGE_URL,
          cookTime: recipe.cookTime || '30 min',
        };
        
        // Store the recipe data in cache
        await AsyncStorage.setItem(basicCacheKey, JSON.stringify(recipeData));
        console.log(`Cached recipe data for ${recipe.id}: ${recipe.title}`);
        
        // Now navigate to recipe details with proper params
        router.push({
          pathname: '/ai-assistance/recipe-details',
          params: { 
            id: recipe.id.toString(),
            title: recipe.title,
            directTitle: encodeURIComponent(recipe.title)
          }
        });
      } catch (error) {
        console.error('Error caching recipe data:', error);
        // Navigate anyway as fallback
        router.push({
          pathname: '/ai-assistance/recipe-details',
          params: { 
            id: recipe.id.toString(),
            title: recipe.title,
            directTitle: encodeURIComponent(recipe.title)
          }
        });
      }
    };
      
    return (
      <TouchableOpacity 
        style={[
          styles.recipeCard, 
          compact && styles.compactRecipeCard,
          isSeasonal && { marginBottom: 24 },
          { borderRadius: 12, overflow: 'hidden' }
        ]}
        onPress={handleRecipePress}
        activeOpacity={0.9}
      >
        {/* Recipe image */}
        <Image 
          source={{ uri: recipe.imageUrl || PLACEHOLDER_IMAGE_URL }}
          style={[
            compact ? styles.compactRecipeImage : styles.recipeImage,
            { borderRadius: 12 }
          ]}
        />
        
        <View style={compact ? styles.compactRecipeInfo : styles.recipeInfo}>
          {/* Recipe title */}
          <Text 
            style={compact ? styles.compactRecipeTitle : styles.recipeTitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {recipe.title}
          </Text>
          
          {/* Recipe description if available */}
          {recipe.description && (
            <Text 
              style={compact ? styles.compactRecipeDescription : styles.recipeDescription}
              numberOfLines={compact ? 1 : 2}
              ellipsizeMode="tail"
            >
              {recipe.description}
            </Text>
          )}
          
          {/* Recipe metadata */}
          <View style={styles.recipeMetaInfo}>
            <View style={styles.cookTimeContainer}>
              <Ionicons name="time-outline" size={compact ? 14 : 16} color="#666" />
              <Text style={[styles.cookTime, compact && styles.compactText]}>
                {cookTimeValue}
              </Text>
            </View>
            
            {/* Match score badge - display for all recipes with a match score */}
            {matchScorePercentage !== undefined && matchScorePercentage > 0 && (
              <View 
                style={[
                  styles.matchScoreBadge,
                  compact && styles.compactMatchScoreBadge,
                  { backgroundColor: matchColor }
                ]}
              >
                <Text style={styles.matchScoreText}>
                  {matchScorePercentage}%
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.greeting}>Hello, Thomas</Text>
          <Text style={styles.subtext}>What's on your plate today?</Text>
        </View>
        
        {/* Search Bar */}
        <TouchableOpacity 
          style={styles.searchContainer} 
          onPress={handleSearchPress}
          activeOpacity={0.9}
        >
          <Ionicons name="search" size={24} color="#777" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Search for recipes</Text>
        </TouchableOpacity>
        
        {renderSearchUI()}
        
        {/* Main Action Button */}
        <TouchableOpacity
          style={styles.mainButton}
          onPress={() => navigateTo('/ai-assistance')}
        >
          <View style={styles.mainButtonLeftContent}>
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={24} color="#fff" />
            </View>
            <Text style={styles.mainButtonText}>Scan Ingredients</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
        
        {/* Secondary Actions */}
        <View style={styles.secondaryActionsContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigateTo('/pantry')}
          >
            <View style={styles.secondaryIconContainer}>
              <Ionicons name="basket-outline" size={24} color="#000" />
            </View>
            <Text style={styles.secondaryButtonText}>Browse Pantry</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={toggleFavoritesView}
          >
            <View style={styles.secondaryIconContainer}>
              <Ionicons name="heart-outline" size={24} color="#E07A5F" />
            </View>
            <Text style={styles.secondaryButtonText}>My Favorites</Text>
          </TouchableOpacity>
        </View>
        
        {/* Recipe Recommendations */}
        <View style={styles.recommendationsContainer}>
          <View style={styles.recommendationsHeader}>
            <Text style={styles.recommendationsTitle}>
              {pantryIngredients.length > 0 
                ? "Recipes from Your Pantry" 
                : "Recommended Recipes"}
            </Text>
            <View style={styles.recommendationsActions}>
              <TouchableOpacity onPress={() => router.push('/ai-assistance/recipes')}>
                <Ionicons name="chevron-forward" size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E07A5F" />
              <Text style={styles.loadingText}>Finding recipes for you...</Text>
            </View>
          ) : recommendedRecipes.length > 0 ? (
            <View style={{height: 280}}>
              <FlatList 
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recipesContainer}
                data={recommendedRecipes}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({item}) => renderRecipeCard(item)}
                nestedScrollEnabled={true}
              />
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="basket-outline" size={48} color="#E07A5F" />
              <Text style={styles.emptyStateTitle}>Your pantry is empty</Text>
              <Text style={styles.emptyStateDescription}>
                Add ingredients to your pantry to get personalized recipe recommendations
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => navigateTo('/pantry')}
              >
                <Text style={styles.emptyStateButtonText}>Add Ingredients</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Seasonal Recommendations */}
        <View style={styles.recommendationsContainer}>
          <View style={styles.recommendationsHeader}>
            <View style={styles.seasonTitleContainer}>
              <View style={[
                styles.seasonIcon, 
                { backgroundColor: getSeasonColor() }
              ]}>
                <Ionicons 
                  name={
                    season === 'Summer' ? 'sunny' : 
                    season === 'Fall' ? 'leaf' : 
                    season === 'Winter' ? 'snow' : 
                    'flower'
                  } 
                  size={18} 
                  color="#fff" 
                />
              </View>
              <Text style={styles.recommendationsTitle}>
                {season} Favorites
              </Text>
            </View>
          </View>
          
          {seasonalRecipes.length > 0 ? (
            <View style={{height: 280}}>
              <FlatList 
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recipesContainer}
                data={seasonalRecipes}
                keyExtractor={(item) => `seasonal-${item.id.toString()}`}
                renderItem={({item}) => renderRecipeCard(item, false, true)}
                nestedScrollEnabled={true}
              />
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#E07A5F" />
              <Text style={styles.loadingText}>Finding seasonal recipes...</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F7', // Warm neutral background
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    fontFamily: 'System',
  },
  subtext: {
    fontSize: 18,
    color: '#666',
    marginBottom: 15,
    fontFamily: 'System',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 18,
    marginBottom: 30,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: '#999',
    flex: 1,
  },
  searchUIContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  searchUIOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  searchUI: {
    margin: 20,
    marginTop: 120,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E07A5F',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInputExpanded: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    height: '100%',
  },
  clearSearch: {
    padding: 4,
  },
  recentSearches: {
    marginTop: 20,
  },
  recentSearchesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  recentSearchIcon: {
    marginRight: 10,
  },
  recentSearchText: {
    fontSize: 16,
    color: '#333',
  },
  searchSuggestions: {
    marginTop: 20,
  },
  searchSuggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  searchSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionIcon: {
    marginRight: 10,
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E07A5F',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  mainButtonLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cameraIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'System',
  },
  secondaryActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  secondaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F1DE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
  },
  recommendationsContainer: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seasonTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seasonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7AC74F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  recommendationsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'System',
  },
  recommendationsActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipesContainer: {
    paddingRight: 24,
  },
  recipeCard: {
    width: 220,
    marginRight: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  recipeInfo: {
    padding: 12,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'System',
  },
  
  // Updated recipe metadata styles
  cookTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  cookTime: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'System',
  },
  recipeMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  ingredientsMatchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ingredientsMatch: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  matchScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchScoreText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Compact recipe card styles
  compactRecipeCard: {
    height: 180,
    width: 220,
  },
  compactRecipeImage: {
    height: 100,
    borderRadius: 12,
  },
  compactRecipeInfo: {
    padding: 8,
    height: 80,
  },
  compactRecipeTitle: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '600',
    height: 40,
  },
  compactText: {
    fontSize: 12,
  },
  compactMatchScoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  compactRecipeDescription: {
    fontSize: 12,
    color: '#777',
    marginBottom: 4,
    height: 16,
  },
  
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontFamily: 'System',
  },
  noRecipesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 24,
  },
  noRecipesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    fontFamily: 'System',
  },
  noRecipesSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  noFavoritesHelp: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8
  },
  addIngredientsButton: {
    backgroundColor: '#E07A5F',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  addIngredientsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 250,
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginVertical: 12,
    fontFamily: 'System',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    backgroundColor: '#E07A5F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  recipeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
});

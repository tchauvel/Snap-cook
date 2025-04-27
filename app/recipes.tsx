import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import recipeAIService from '../services/recipeAIService';
import { getAllRecipes } from '../services/recipeDatabase';
import { Recipe } from '../types/recipe';

export default function RecipesScreen() {
  const params = useLocalSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewedRecipes, setViewedRecipes] = useState<string[]>([]);
  
  // Parse ingredients from params
  const ingredientsParam = params.ingredients ? String(params.ingredients) : '';
  const fromScanner = params.fromScanner === 'true';
  
  useEffect(() => {
    // Display a loading indicator when coming from scanner
    if (fromScanner) {
      setIsLoading(true);
      // Add a short delay to simulate processing
      setTimeout(() => {
        fetchRecipes();
      }, 1000);
    } else {
      fetchRecipes();
    }
  }, [ingredientsParam]);
  
  const fetchRecipes = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching recipes with ingredients:', ingredientsParam);
      
      // Parse ingredients
      const ingredients = ingredientsParam
        ? ingredientsParam.split(',').map(item => item.trim())
        : [];
      
      console.log('Parsed ingredients:', ingredients);
      
      if (ingredients.length === 0) {
        // If no ingredients provided, show all recipes
        const allRecipes = getAllRecipes();
        console.log(`Showing all ${allRecipes.length} recipes`);
        
        // Filter out previously viewed recipes for variety
        const filteredRecipes = allRecipes.filter(r => !viewedRecipes.includes(r.id));
        setRecipes(filteredRecipes.length > 0 ? filteredRecipes : allRecipes);
      } else {
        // Get recipe recommendations based on ingredients
        const recommendations = await recipeAIService.getRecipeRecommendations(ingredients);
        
        // Check if we got recommendations
        if (recommendations && recommendations.length > 0) {
          const matchedRecipes = recommendations.map(rec => rec.recipe);
          console.log(`Found ${matchedRecipes.length} matching recipes`);
          setRecipes(matchedRecipes);
        } else {
          // If no matches, show fallback recipes
          console.log('No matching recipes, showing fallback');
          const allRecipes = getAllRecipes();
          const filteredRecipes = allRecipes.filter(r => !viewedRecipes.includes(r.id));
          setRecipes(filteredRecipes.length > 0 ? filteredRecipes.slice(0, 5) : allRecipes.slice(0, 5));
        }
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setError('Failed to load recipes. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    // Update viewed recipes list
    if (recipes.length > 0) {
      const newViewedRecipes = [...viewedRecipes];
      recipes.forEach(recipe => {
        if (!newViewedRecipes.includes(recipe.id)) {
          newViewedRecipes.push(recipe.id);
        }
      });
      setViewedRecipes(newViewedRecipes);
    }
    fetchRecipes();
  };
  
  const handleRecipePress = (recipe: Recipe) => {
    router.push({
      pathname: "/recipe/[id]" as const,
      params: { 
        id: recipe.id,
        ingredients: ingredientsParam 
      }
    });
  };
  
  // Render function for recipe item
  const renderRecipeItem = ({ item }: { item: Recipe }) => {
    return (
      <TouchableOpacity 
        style={styles.recipeCard}
        onPress={() => handleRecipePress(item)}
      >
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.recipeImage}
          onError={() => console.log(`Failed to load image: ${item.imageUrl}`)}
        />
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeTitle}>{item.title}</Text>
          <View style={styles.recipeDetails}>
            <Text style={styles.cookTime}>🕓 {item.cookTime} min</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00cc66" />
        <Text style={styles.loadingText}>Finding the perfect recipes for you...</Text>
      </View>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRecipes}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recipes</Text>
      
      {ingredientsParam && (
        <View style={styles.ingredientsContainer}>
          <Text style={styles.ingredientsTitle}>Using ingredients:</Text>
          <Text style={styles.ingredientsList}>{ingredientsParam.replace(/,/g, ', ')}</Text>
        </View>
      )}
      
      {recipes.length === 0 ? (
        <View style={styles.noRecipesContainer}>
          <Text style={styles.noRecipesText}>No recipes found. Try different ingredients.</Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderRecipeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.recipeList}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#00cc66']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 40, // For spacing below the status bar
  },
  recipeList: {
    paddingBottom: 20,
  },
  recipeCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recipeImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  recipeInfo: {
    padding: 12,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recipeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cookTime: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#cc0000',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#00cc66',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noRecipesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noRecipesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  ingredientsContainer: {
    backgroundColor: '#f0f9f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  ingredientsTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ingredientsList: {
    color: '#00cc66',
    fontWeight: '500',
  },
}); 
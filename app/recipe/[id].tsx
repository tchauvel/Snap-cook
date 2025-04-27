import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { intelligenceService } from '../ingredients';
import { RecipeData, getAllRecipes } from '../../services/recipeDatabase';
import { ProcessedIngredient } from '../../agents/ingredients/ingredientAgent';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const [recipe, setRecipe] = useState<RecipeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userIngredients, setUserIngredients] = useState<ProcessedIngredient[]>([]);
  const [userLiked, setUserLiked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      if (id) {
        try {
          // Get all recipes from the database
          const allRecipes = getAllRecipes();
          
          // Find the specific recipe by ID
          const recipeData = allRecipes.find(r => r.id === id.toString());
          
          if (recipeData) {
            setRecipe(recipeData);
            
            // Get user ingredients from intelligence service
            const ingredients = intelligenceService.getCurrentIngredients();
            setUserIngredients(ingredients);
          }
        } catch (error) {
          console.error('Failed to fetch recipe:', error);
        }
      }
      
      setIsLoading(false);
    };

    fetchData();
  }, [id]);

  const handleLikeRecipe = () => {
    if (recipe) {
      // Update user preferences in the intelligence service
      intelligenceService.updatePreferences(recipe, userLiked ? 'disliked' : 'liked');
      setUserLiked(!userLiked);
    }
  };

  const goBackToRecipes = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b6b" />
        <Text style={styles.loadingText}>Loading recipe...</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Recipe not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={goBackToRecipes}
        >
          <Text style={styles.backButtonText}>Back to Recipes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Check which ingredients match
  const isIngredientMatched = (ingredient: string): boolean => {
    return userIngredients.some(userIng => 
      userIng.name.toLowerCase().includes(ingredient.toLowerCase()) ||
      ingredient.toLowerCase().includes(userIng.name.toLowerCase())
    );
  };

  // Format nutrition info as a string if it's an object
  const formatNutritionInfo = (info: any): string => {
    if (typeof info === 'string') return info;
    if (typeof info === 'object' && info !== null) {
      return Object.entries(info)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' | ');
    }
    return '';
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: recipe.title,
          headerBackTitle: "Recipes",
        }}
      />
      <ScrollView style={styles.container}>
        <Image
          source={{ uri: recipe.imageUrl }}
          style={styles.recipeImage}
          resizeMode="cover"
        />
        
        <View style={styles.recipeContent}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          
          <View style={styles.metaInfo}>
            <View style={styles.cuisineTag}>
              <Text style={styles.cuisineText}>{recipe.cuisineType}</Text>
            </View>
            <View style={styles.difficultyTag}>
              <Text style={styles.difficultyText}>{recipe.difficulty}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.likeButton, userLiked && styles.likedButton]} 
              onPress={handleLikeRecipe}
            >
              <Text style={[styles.likeButtonText, userLiked && styles.likedButtonText]}>
                {userLiked ? 'Liked ♥' : 'Like ♡'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.timeInfo}>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Prep Time</Text>
              <Text style={styles.timeValue}>{recipe.cookTime.includes('prep') ? recipe.cookTime : '15 minutes'}</Text>
            </View>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Cook Time</Text>
              <Text style={styles.timeValue}>{recipe.cookTime}</Text>
            </View>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Servings</Text>
              <Text style={styles.timeValue}>{recipe.servings || '4'}</Text>
            </View>
          </View>
          
          {recipe.nutritionInfo && (
            <View style={styles.nutritionContainer}>
              <Text style={styles.nutritionTitle}>Nutrition Information</Text>
              <Text style={styles.nutritionText}>
                {formatNutritionInfo(recipe.nutritionInfo)}
              </Text>
            </View>
          )}
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {recipe.ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientRow}>
                <Text style={[
                  styles.ingredientText,
                  isIngredientMatched(ingredient) && styles.matchedIngredientText
                ]}>
                  • {ingredient}
                </Text>
                {isIngredientMatched(ingredient) && (
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchText}>✓</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {recipe.instructions.map((step, index) => (
              <View key={index} style={styles.stepContainer}>
                <View style={styles.stepNumberContainer}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
          
          {recipe.dietaryInfo && recipe.dietaryInfo.length > 0 && (
            <View style={styles.tagsContainer}>
              <Text style={styles.tagsTitle}>Dietary Information</Text>
              <View style={styles.tagsRow}>
                {recipe.dietaryInfo.map((tag, index) => (
                  <View key={index} style={styles.tagChip}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          <View style={styles.cookingSection}>
            <Text style={styles.sectionTitle}>Cooking Technique</Text>
            <Text style={styles.cookingText}>{recipe.cookingTechnique}</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  recipeImage: {
    width: '100%',
    height: 240,
  },
  recipeContent: {
    padding: 16,
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metaInfo: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  cuisineTag: {
    backgroundColor: '#FFF0E8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  cuisineText: {
    color: '#FF8C42',
    fontWeight: 'bold',
  },
  difficultyTag: {
    backgroundColor: '#E8F4FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  difficultyText: {
    color: '#4285F4',
    fontWeight: 'bold',
  },
  likeButton: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  likedButton: {
    backgroundColor: '#ffebee',
  },
  likeButtonText: {
    color: '#888',
  },
  likedButtonText: {
    color: '#e91e63',
  },
  timeInfo: {
    flexDirection: 'row',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 16,
  },
  timeItem: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  nutritionContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  nutritionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  nutritionText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  ingredientText: {
    fontSize: 16,
    flex: 1,
    color: '#333',
  },
  matchedIngredientText: {
    color: '#2E7D32',
    fontWeight: '500',
  },
  matchBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  matchText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumber: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  tagsContainer: {
    marginBottom: 24,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#555',
  },
  cookingSection: {
    marginBottom: 32,
  },
  cookingText: {
    fontSize: 16,
    color: '#333',
  },
}); 
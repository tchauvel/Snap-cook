import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Platform,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import recipeAIService from '../services/recipeAIService';
import { classifyIngredient, CATEGORIES } from './_utils/ingredientUtils';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';

// Debug flag
const DEBUG = true;

// Debug logger
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log('[MultiIngredientScanner]', ...args);
  }
};

// Define types for the ingredients
interface Ingredient {
  name: string;
  confidence: number;
}

// Define props for the IngredientItemWithCategory component
interface IngredientItemProps {
  ingredient: string;
  onRemove: (ingredient: string) => void;
}

// Add a new component to display ingredient with category
const IngredientItemWithCategory = ({ ingredient, onRemove }: IngredientItemProps) => {
  const category = classifyIngredient(ingredient);
  
  // Get category color based on type
  const getCategoryColor = (categoryName: string): string => {
    switch(categoryName) {
      case CATEGORIES.VEGETABLES: return '#4CAF50'; // Green
      case CATEGORIES.FRUITS: return '#FF9800'; // Orange
      case CATEGORIES.MEAT: return '#F44336'; // Red
      case CATEGORIES.DAIRY: return '#2196F3'; // Blue
      case CATEGORIES.GRAINS: return '#FFC107'; // Amber
      case CATEGORIES.SPICES: return '#9C27B0'; // Purple
      case CATEGORIES.OILS: return '#FFEB3B'; // Yellow
      case CATEGORIES.CONDIMENTS: return '#795548'; // Brown
      case CATEGORIES.BAKING: return '#E91E63'; // Pink
      case CATEGORIES.BEVERAGES: return '#00BCD4'; // Cyan
      default: return '#9E9E9E'; // Gray
    }
  };

  return (
    <View style={styles.ingredientItem}>
      <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(category) }]} />
      <Text style={styles.ingredientName}>{ingredient}</Text>
      <Text style={styles.categoryLabel}>{category}</Text>
      <TouchableOpacity onPress={() => onRemove(ingredient)} style={styles.removeButton}>
        <Ionicons name="close-circle" size={24} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );
};

export default function MultiIngredientScanner() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [lastAddedIngredients, setLastAddedIngredients] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load existing ingredients on mount
  useEffect(() => {
    loadSavedIngredients();
  }, []);

  // Load any previously saved ingredients
  const loadSavedIngredients = async () => {
    try {
      const dataPath = FileSystem.documentDirectory + 'temp-data.json';
      const fileInfo = await FileSystem.getInfoAsync(dataPath);
      
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(dataPath);
        debugLog('Loading saved ingredients from:', dataPath);
        const data = JSON.parse(content);
        
        if (data.ingredients && Array.isArray(data.ingredients)) {
          // Convert simple string array to Ingredient objects if needed
          if (typeof data.ingredients[0] === 'string') {
            const ingredientsWithConfidence = data.ingredients.map((name: string) => ({
              name,
              confidence: 1.0 // Default confidence for previously saved items
            }));
            setIngredients(ingredientsWithConfidence);
          } else {
            // Already in the right format
            setIngredients(data.ingredients);
          }
          debugLog('Loaded ingredients:', data.ingredients);
        }
      }
    } catch (error) {
      console.error('Failed to load saved ingredients:', error);
    }
  };

  // Save the current ingredients list
  const saveIngredients = async (updatedIngredients: Ingredient[]) => {
    try {
      const dataPath = FileSystem.documentDirectory + 'temp-data.json';
      await FileSystem.writeAsStringAsync(
        dataPath,
        JSON.stringify({
          ingredients: updatedIngredients,
          timestamp: new Date().toISOString()
        })
      );
      debugLog('Saved ingredients:', updatedIngredients);
    } catch (error) {
      console.error('Failed to save ingredients:', error);
    }
  };

  // Take a photo with the camera
  const takePhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraPermission.status !== 'granted') {
          Alert.alert('Permission needed', 'Camera access is required to take photos');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedAsset = result.assets[0];
        setCurrentImage(selectedAsset.uri);
        
        if (selectedAsset.base64) {
          analyzeImage(selectedAsset.base64);
        } else {
          setError('Could not get image data. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      setError('Failed to take photo. Please try again.');
    }
  };

  // Pick an image from the gallery
  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (galleryPermission.status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library access is required to select images');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedAsset = result.assets[0];
        setCurrentImage(selectedAsset.uri);
        
        if (selectedAsset.base64) {
          analyzeImage(selectedAsset.base64);
        } else {
          setError('Could not get image data. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error picking image:', err);
      setError('Failed to pick image. Please try again.');
    }
  };

  // Analyze the image to detect ingredients
  const analyzeImage = async (imageBase64: string) => {
    setIsLoading(true);
    setError(null);
    
    debugLog('Starting image analysis');
    
    try {
      // Validate image data
      if (!imageBase64 || imageBase64.length < 100) {
        debugLog('Invalid image data', imageBase64 ? imageBase64.length : 'null');
        throw new Error('Invalid image data');
      }
      
      debugLog('Image size:', Math.round(imageBase64.length / 1024), 'KB');
      
      // Use Claude AI service to detect ingredients
      const result = await recipeAIService.detectIngredientsFromImage(imageBase64);
      debugLog('AI service result:', JSON.stringify(result).substring(0, 200) + '...');
      
      if (result.success && result.data) {
        const detectedNames = result.data.detectedIngredients || [];
        const confidenceMap = result.data.confidence || {};
        
        // Create array of Ingredient objects
        const newIngredients = detectedNames.map(name => ({
          name,
          confidence: confidenceMap[name] || 0.7 // Default confidence if not provided
        }));
        
        debugLog('Detected ingredients with confidence:', newIngredients);
        
        // Add only new ingredients to the list (avoiding duplicates)
        const existingNames = new Set(ingredients.map(ing => ing.name));
        const uniqueNewIngredients = newIngredients.filter(ing => !existingNames.has(ing.name));
        
        if (uniqueNewIngredients.length > 0) {
          const updatedIngredients = [...ingredients, ...uniqueNewIngredients];
          setIngredients(updatedIngredients);
          setLastAddedIngredients(uniqueNewIngredients.map(ing => ing.name));
          
          // Save to storage
          await saveIngredients(updatedIngredients);
          
          Alert.alert(
            'New Ingredients Added',
            `Added ${uniqueNewIngredients.length} new ingredients: ${uniqueNewIngredients.map(ing => ing.name).join(', ')}`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'No New Ingredients',
            'All detected ingredients are already in your list.',
            [{ text: 'OK' }]
          );
        }
      } else {
        debugLog('Analysis failed:', result.error);
        setError(result.error || 'Failed to analyze image');
      }
    } catch (error) {
      debugLog('Error during analysis:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear the ingredients list
  const clearIngredients = () => {
    Alert.alert(
      'Clear Ingredients',
      'Are you sure you want to clear all ingredients?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: async () => {
          setIngredients([]);
          setLastAddedIngredients([]);
          await saveIngredients([]);
        }}
      ]
    );
  };

  // Delete a single ingredient
  const deleteIngredient = (indexToDelete: number) => {
    const updatedIngredients = [...ingredients];
    updatedIngredients.splice(indexToDelete, 1);
    setIngredients(updatedIngredients);
    saveIngredients(updatedIngredients);
  };

  // Find recipes with the current ingredients
  const findRecipes = () => {
    if (ingredients.length === 0) {
      Alert.alert('No Ingredients', 'Please add some ingredients first');
      return;
    }

    // Extract just the ingredient names
    const ingredientNames = ingredients.map(ing => ing.name);
    
    // Navigate to recipes screen with ingredients
    router.push({
      pathname: '/ai-assistance/recipes',
      params: { 
        ingredients: ingredientNames.join(','),
        fromScanner: 'true'
      }
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Build Ingredient List' }} />

      <ScrollView style={styles.scrollContent}>
        <Text style={styles.title}>Your Ingredient Collection</Text>
        <Text style={styles.subtitle}>
          Take multiple photos to build your complete ingredient list
        </Text>

        <View style={styles.ingredientsContainer}>
          <View style={styles.ingredientsHeader}>
            <Text style={styles.ingredientsTitle}>
              Your Ingredients ({ingredients.length})
            </Text>
            {ingredients.length > 0 && (
              <TouchableOpacity onPress={clearIngredients}>
                <Text style={styles.clearButton}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {ingredients.length > 0 ? (
            <ScrollView style={styles.ingredientList}>
              {ingredients.map((ingredient, index) => (
                <IngredientItemWithCategory
                  key={index}
                  ingredient={ingredient.name}
                  onRemove={(ingredientName) => {
                    // Find the index of the ingredient with this name
                    const indexToDelete = ingredients.findIndex(item => item.name === ingredientName);
                    if (indexToDelete !== -1) {
                      deleteIngredient(indexToDelete);
                    }
                  }}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No ingredients yet. Take a photo to get started!
              </Text>
            </View>
          )}
        </View>

        <View style={styles.captureSection}>
          <Text style={styles.sectionTitle}>Add More Ingredients</Text>
          
          {currentImage && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: currentImage }} style={styles.imagePreview} />
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={takePhoto}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button}
              onPress={pickImage}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Choose Photo</Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066cc" />
              <Text style={styles.loadingText}>Analyzing image...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>How to use:</Text>
          <Text style={styles.helpText}>1. Take a photo of your ingredients</Text>
          <Text style={styles.helpText}>2. AI will detect ingredients in the photo</Text>
          <Text style={styles.helpText}>3. New ingredients will be added to your list</Text>
          <Text style={styles.helpText}>4. Tap × to remove any ingredient</Text>
          <Text style={styles.helpText}>5. Repeat with more photos as needed</Text>
        </View>
      </ScrollView>

      {ingredients.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.findRecipesButton}
            onPress={findRecipes}
          >
            <Text style={styles.findRecipesText}>
              Find Recipes with These Ingredients
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  captureSection: {
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#f8f8ff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    margin: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 5,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#ffeeee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#cc0000',
    fontSize: 16,
  },
  ingredientsContainer: {
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  ingredientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ingredientsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    color: '#cc0000',
    fontSize: 14,
    fontWeight: '500',
  },
  ingredientList: {
    marginBottom: 20,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  ingredientName: {
    color: '#333',
    fontSize: 14,
    marginRight: 8,
    flex: 1,
  },
  categoryIndicator: {
    width: 8,
    height: '100%',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    marginRight: 10,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 'auto',
    marginRight: 10,
  },
  removeButton: {
    marginLeft: 8,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  helpSection: {
    marginTop: 10,
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0e0ff',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0066cc',
  },
  helpText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  findRecipesButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  findRecipesText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { IntelligenceService } from '../services/intelligenceService';
import { ProcessedIngredient } from '../agents/ingredients/ingredientAgent';

// Create a global instance for the app to use
export const intelligenceService = new IntelligenceService();

export default function IngredientsScreen() {
  const params = useLocalSearchParams();
  const [ingredients, setIngredients] = useState<ProcessedIngredient[]>([]);
  const [suggestedIngredients, setSuggestedIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Process detected ingredients from URL params
  useEffect(() => {
    const initIngredients = async () => {
      // Reset ingredients list if reset parameter is true
      if (params.reset === 'true') {
        intelligenceService.clearAllIngredients();
        setIngredients([]);
      }
      
      if (params.detected && typeof params.detected === 'string') {
        const detectedNames = params.detected.split(',');
        
        // Convert detected names to ingredient objects for the agent
        const detectedObjects = detectedNames.map((name, index) => ({
          name: name.trim(),
          confidence: 0.8 // Default confidence for detected items
        }));
        
        // Process ingredients with context analysis and suggestions
        const processedIngredients = intelligenceService.processDetectedIngredients(
          detectedObjects, 
          { analyzeContext: true, inferMissingItems: true }
        );
        
        setIngredients(processedIngredients);
        
        // Get suggested ingredients
        setSuggestedIngredients(intelligenceService.getSuggestedIngredients());
      }
      
      setIsLoading(false);
    };
    
    initIngredients();
  }, [params.detected, params.reset]);

  const addIngredient = () => {
    if (newIngredient.trim() !== '') {
      // Use the intelligence service to add ingredients
      const updatedIngredients = intelligenceService.addManualIngredients([newIngredient.trim()]);
      setIngredients(updatedIngredients);
      
      // Update suggested ingredients
      setSuggestedIngredients(intelligenceService.getSuggestedIngredients());
      
      setNewIngredient('');
    }
  };

  const addSuggestedIngredient = (ingredient: string) => {
    // Add the suggested ingredient
    const updatedIngredients = intelligenceService.addManualIngredients([ingredient]);
    setIngredients(updatedIngredients);
    
    // Remove from suggestions
    setSuggestedIngredients(prev => prev.filter(item => item !== ingredient));
  };

  const removeIngredient = (name: string) => {
    // Use the intelligence service to remove the ingredient
    const updatedIngredients = intelligenceService.removeIngredients([name]);
    setIngredients(updatedIngredients);
    
    // Update suggested ingredients
    setSuggestedIngredients(intelligenceService.getSuggestedIngredients());
  };

  const goToRecipes = () => {
    // We don't need to pass ingredients in the URL anymore 
    // since they're stored in the intelligence service
    router.push('/ai-assistance/recipes');
  };

  // Add function to go back to camera screen
  const goBackToCameraScreen = () => {
    router.push("/");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b6b" />
        <Text style={styles.loadingText}>Processing ingredients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Ingredients</Text>
      
      {ingredients.length > 0 && (
        <Text style={styles.subtitle}>
          We detected {ingredients.length} ingredients. 
          Add more or remove any that aren't correct.
        </Text>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newIngredient}
          onChangeText={setNewIngredient}
          placeholder="Add ingredient..."
          onSubmitEditing={addIngredient}
        />
        <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={ingredients}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        renderItem={({ item }) => (
          <View style={styles.ingredientItem}>
            <Text style={styles.ingredientText}>{item.name}</Text>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => removeIngredient(item.name)}
            >
              <Text style={styles.removeButtonText}>X</Text>
            </TouchableOpacity>
          </View>
        )}
        style={styles.list}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>
            No ingredients detected. Add ingredients manually.
          </Text>
        )}
      />
      
      {suggestedIngredients.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Suggested ingredients:</Text>
          <View style={styles.suggestionsRow}>
            {suggestedIngredients.map((ingredient, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.suggestionChip}
                onPress={() => addSuggestedIngredient(ingredient)}
              >
                <Text style={styles.suggestionText}>{ingredient}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
      <TouchableOpacity 
        style={[
          styles.findButton, 
          ingredients.length < 2 && styles.disabledButton
        ]}
        onPress={goToRecipes}
        disabled={ingredients.length < 2}
      >
        <Text style={styles.findButtonText}>
          {ingredients.length < 2 
            ? `Add at least ${2 - ingredients.length} more ingredient${ingredients.length === 1 ? '' : 's'}` 
            : 'Find Recipes'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={goBackToCameraScreen}
      >
        <Text style={styles.backButtonText}>Take New Photo</Text>
      </TouchableOpacity>
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
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
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
  },
  removeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ff6b6b',
    borderRadius: 15,
  },
  removeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    marginTop: 5,
    marginBottom: 10,
  },
  suggestionsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  suggestionChip: {
    backgroundColor: '#eaf4ff',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: '#c2e0ff',
  },
  suggestionText: {
    fontSize: 14,
    color: '#0066cc',
  },
  findButton: {
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#ffb5b5',
  },
  findButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
}); 
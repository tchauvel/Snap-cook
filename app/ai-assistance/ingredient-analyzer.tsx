import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import recipeAIService from '../../services/recipeAIService';

/**
 * Component for analyzing ingredients using Claude AI
 */
export default function IngredientAnalyzer() {
  const [ingredients, setIngredients] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle ingredient analysis
   */
  const handleAnalyze = async () => {
    // Clear previous results
    setAnalysisResult(null);
    setError(null);

    // Validate input
    if (!ingredients.trim()) {
      setError('Please enter some ingredients to analyze');
      return;
    }

    // Parse ingredients
    const ingredientsList = ingredients
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    if (ingredientsList.length === 0) {
      setError('Please enter valid ingredients separated by commas');
      return;
    }

    setIsLoading(true);

    try {
      // Call AI service to analyze ingredients
      const result = await recipeAIService.analyzeIngredients(ingredientsList);
      setAnalysisResult(result);
    } catch (err) {
      setError('Failed to analyze ingredients. Please try again.');
      console.error('Error analyzing ingredients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Render section with heading and items
   */
  const renderSection = (title: string, items: string[]) => {
    if (!items || items.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.itemsContainer}>
          {items.map((item, index) => (
            <View key={index} style={styles.itemBadge}>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Ingredient Analyzer</Text>
      <Text style={styles.description}>
        Enter ingredients you have, separated by commas. Our AI will analyze what 
        cuisine types, cooking techniques, and meal types you can make with them.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g., chicken, rice, broccoli, soy sauce"
        value={ingredients}
        onChangeText={setIngredients}
        multiline
      />

      <TouchableOpacity 
        style={styles.analyzeButton} 
        onPress={handleAnalyze}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Analyzing...' : 'Analyze Ingredients'}
        </Text>
      </TouchableOpacity>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Analyzing your ingredients...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {analysisResult && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Analysis Results</Text>
          
          {renderSection('Possible Cuisines', analysisResult.possibleCuisines)}
          {renderSection('Cooking Techniques', analysisResult.cookingTechniques)}
          {renderSection('Meal Types', analysisResult.mealTypes)}
          {renderSection('Dietary Preferences', analysisResult.dietaryPreferences)}
          
          <Text style={styles.aiPowered}>Powered by Claude AI</Text>
        </View>
      )}
    </ScrollView>
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
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  analyzeButton: {
    backgroundColor: '#0066cc',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffeeee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#cc0000',
    fontSize: 16,
  },
  resultsContainer: {
    backgroundColor: '#f5f9ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  itemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemBadge: {
    backgroundColor: '#e0eaff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  itemText: {
    color: '#0066cc',
    fontSize: 14,
  },
  aiPowered: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
  },
}); 
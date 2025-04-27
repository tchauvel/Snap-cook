import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Button, Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Stack } from 'expo-router';

// Simple screen to display ingredients without needing camera
export default function ManualTestScreen() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load ingredients from the data file
  const loadIngredients = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      
      // Try to read from temp-data.json directly in the app's bundle
      if (Platform.OS === 'web') {
        // For web, use direct fetch
        try {
          const response = await fetch('/temp-data.json');
          if (response.ok) {
            const data = await response.json();
            setIngredients(data.ingredients || []);
            setLastUpdated(data.timestamp || new Date().toISOString());
            return;
          }
        } catch (err) {
          console.log('Web fetch error:', err);
        }
      }
      
      // For native, try to read from the app's document directory
      try {
        const tempPath = FileSystem.documentDirectory + 'temp-data.json';
        const fileInfo = await FileSystem.getInfoAsync(tempPath);
        
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(tempPath);
          console.log('Found file at:', tempPath);
          console.log('Content:', content.substring(0, 100) + '...');
          const data = JSON.parse(content);
          setIngredients(data.ingredients || []);
          setLastUpdated(data.timestamp || new Date().toISOString());
          return;
        } else {
          console.log('File not found at:', tempPath);
        }
      } catch (err) {
        console.error('Error reading from document directory:', err);
      }
      
      // As a fallback, try reading from asset
      try {
        // Use hardcoded values as last resort
        const defaultIngredients = ['tomato', 'chicken', 'onion', 'garlic', 'olive oil'];
        setIngredients(defaultIngredients);
        setLastUpdated(new Date().toISOString());
        
        // Copy the default data to the document directory for next time
        await FileSystem.writeAsStringAsync(
          FileSystem.documentDirectory + 'ingredients.json',
          JSON.stringify({
            ingredients: defaultIngredients,
            timestamp: new Date().toISOString()
          })
        );
        
        setErrorMessage('Using default ingredients - could not load from file');
      } catch (error) {
        console.error('Error setting default ingredients:', error);
        setErrorMessage('Failed to load ingredients: ' + (error instanceof Error ? error.message : String(error)));
      }
    } catch (error) {
      console.error('Error in loadIngredients:', error);
      setErrorMessage('Failed to load ingredients: ' + (error instanceof Error ? error.message : String(error)));
      setIngredients(['tomato', 'onion', 'garlic']); // Ultimate fallback
    } finally {
      setLoading(false);
    }
  };

  // Generate random ingredients for testing
  const generateRandomIngredients = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      
      const allIngredients = [
        'tomato', 'onion', 'garlic', 'chicken', 'beef', 
        'pasta', 'rice', 'potato', 'carrot', 'broccoli',
        'olive oil', 'butter', 'cheese', 'milk', 'egg',
        'flour', 'sugar', 'salt', 'pepper', 'basil',
        'oregano', 'thyme', 'rosemary', 'lemon', 'lime'
      ];
      
      // Randomly select 3-7 ingredients
      const count = Math.floor(Math.random() * 5) + 3;
      const shuffled = [...allIngredients].sort(() => 0.5 - Math.random());
      const selectedIngredients = shuffled.slice(0, count);
      
      // Save to document directory
      const timestamp = new Date().toISOString();
      
      await FileSystem.writeAsStringAsync(
        FileSystem.documentDirectory + 'temp-data.json',
        JSON.stringify({
          ingredients: selectedIngredients,
          timestamp
        })
      );
      
      console.log('Saved ingredients to:', FileSystem.documentDirectory + 'temp-data.json');
      
      // Update state
      setIngredients(selectedIngredients);
      setLastUpdated(timestamp);
      
      Alert.alert('Success', `Generated ${selectedIngredients.length} random ingredients`);
    } catch (error) {
      console.error('Error generating ingredients:', error);
      Alert.alert('Error', 'Failed to generate ingredients: ' + (error instanceof Error ? error.message : String(error)));
      setErrorMessage('Failed to generate ingredients');
    } finally {
      setLoading(false);
    }
  };

  // Load ingredients on component mount
  useEffect(() => {
    loadIngredients();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Ingredient Tester' }} />
      
      <ScrollView style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Ingredients</Text>
          {lastUpdated && (
            <Text style={styles.subtitle}>
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </Text>
          )}
        </View>

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading ingredients...</Text>
          </View>
        ) : (
          <>
            {ingredients.length > 0 ? (
              <View style={styles.ingredientsList}>
                {ingredients.map((ingredient, index) => (
                  <View key={index} style={styles.ingredientItem}>
                    <Text style={styles.ingredientText}>• {ingredient}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No ingredients found</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Generate Random Ingredients"
          onPress={generateRandomIngredients}
          disabled={loading}
        />
        <Button
          title="Refresh"
          onPress={loadIngredients}
          disabled={loading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  ingredientsList: {
    marginBottom: 24,
  },
  ingredientItem: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
  },
  ingredientText: {
    fontSize: 16,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
  },
  errorContainer: {
    padding: 10,
    marginBottom: 20,
    backgroundColor: '#ffe6e6',
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6666',
  },
  errorText: {
    color: '#cc0000',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
}); 
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { intelligenceService } from './ingredients';
import { isAIEnabled } from '../config';

/**
 * Natural Language Recipe Search using Claude AI
 */
export default function NLPSearchScreen() {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Check if Claude AI is enabled
  const aiEnabled = isAIEnabled() && intelligenceService.isClaudeAIEnabled();
  
  const handleSearch = async () => {
    if (!query.trim()) {
      setErrorMessage('Please enter a recipe query');
      return;
    }
    
    if (!aiEnabled) {
      Alert.alert(
        'AI Features Not Available',
        'To use natural language search, you need to configure Claude API key in the config.ts file.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setIsProcessing(true);
    setErrorMessage(null);
    
    try {
      // Process the natural language query with Claude
      const result = await intelligenceService.processNaturalLanguageQuery(query);
      
      if (result.ingredients.length === 0) {
        setErrorMessage('Could not detect any ingredients in your query. Please try again with specific ingredients.');
        setIsProcessing(false);
        return;
      }
      
      // Get recipe recommendations with the detected ingredients
      const recipes = await intelligenceService.getRecipeRecommendations(result.context);
      
      // Navigate to recipes screen
      router.push('/ai-assistance/recipes');
      
    } catch (error) {
      console.error('Error processing natural language query:', error);
      setErrorMessage('An error occurred while processing your query. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleGoBack = () => {
    router.back();
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Recipe Search</Text>
        
        <Text style={styles.subtitle}>
          Describe what you want to cook using natural language
        </Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="e.g., I want to make a quick Italian dinner with chicken and pasta"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!isProcessing}
          />
        </View>
        
        {errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}
        
        <View style={styles.examplesContainer}>
          <Text style={styles.examplesTitle}>Try these examples:</Text>
          <TouchableOpacity 
            style={styles.exampleChip}
            onPress={() => setQuery('I want to make a quick vegetarian meal with vegetables I have in my fridge')}
          >
            <Text style={styles.exampleText}>Quick vegetarian meal</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.exampleChip}
            onPress={() => setQuery('I need a pasta dish with tomatoes and garlic for dinner tonight')}
          >
            <Text style={styles.exampleText}>Pasta with tomatoes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.exampleChip}
            onPress={() => setQuery('Suggest a healthy breakfast with eggs and spinach')}
          >
            <Text style={styles.exampleText}>Healthy breakfast</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.searchButton, isProcessing && styles.disabledButton]}
          onPress={handleSearch}
          disabled={isProcessing || !query.trim()}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.searchButtonText}>Search Recipes</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        {!aiEnabled && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              AI features are disabled. To enable natural language search, 
              configure Claude API key in the config.ts file.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  errorText: {
    color: '#e53935',
    marginBottom: 16,
    textAlign: 'center',
  },
  examplesContainer: {
    marginBottom: 20,
  },
  examplesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#555',
  },
  exampleChip: {
    backgroundColor: '#f0f7ff',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d0e7ff',
  },
  exampleText: {
    fontSize: 14,
    color: '#3a86ff',
  },
  searchButton: {
    backgroundColor: '#ff6b6b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#ffb5b5',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 16,
  },
  warningContainer: {
    marginTop: 20,
    backgroundColor: '#fff9c4',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffeb3b',
  },
  warningText: {
    color: '#6d4c41',
    fontSize: 14,
    textAlign: 'center',
  }
}); 
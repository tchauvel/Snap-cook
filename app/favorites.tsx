import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types/recipe';
import { router } from 'expo-router';

// Use an icon that actually exists in the assets directory
const placeholderImage = require('../assets/images/icon.png');

export default function FavoritesScreen() {
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Load favorites on mount
  useEffect(() => {
    loadFavoriteRecipes();
  }, []);

  // Filter recipes when search changes
  useEffect(() => {
    filterRecipes();
  }, [searchQuery, favoriteRecipes]);

  const loadFavoriteRecipes = async () => {
    setIsLoading(true);
    try {
      const favoritesJson = await AsyncStorage.getItem('favoriteRecipes');
      if (favoritesJson) {
        const favorites = JSON.parse(favoritesJson);
        setFavoriteRecipes(favorites);
      }
    } catch (error) {
      console.error('Failed to load favorite recipes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (recipe: Recipe) => {
    try {
      const updatedFavorites = favoriteRecipes.filter(
        (item) => item.id.toString() !== recipe.id.toString()
      );
      setFavoriteRecipes(updatedFavorites);
      await AsyncStorage.setItem(
        'favoriteRecipes',
        JSON.stringify(updatedFavorites)
      );
    } catch (error) {
      console.error('Failed to update favorites:', error);
    }
  };

  const filterRecipes = () => {
    let filtered = [...favoriteRecipes];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((recipe) =>
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredRecipes(filtered);
  };

  const renderRecipeCard = ({ item }: { item: Recipe }) => {
    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => router.push({
          pathname: '/ai-assistance/recipe-details',
          params: { 
            id: item.id.toString(),
            title: item.title,
            directTitle: encodeURIComponent(item.title)
          }
        })}
      >
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item)}
        >
          <Ionicons name="heart" size={20} color="#E07A5F" />
        </TouchableOpacity>
        <Image
          source={item.imageUrl ? { uri: item.imageUrl } : placeholderImage}
          style={styles.recipeImage}
          resizeMode="cover"
        />
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeTitle} numberOfLines={2}>
            {item.title || 'Untitled Recipe'}
          </Text>
          <View style={styles.recipeMetaInfo}>
            <View style={styles.cookTimeContainer}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.cookTime}>{item.cookTime || '30'} min</Text>
            </View>
            {item.matchScore && (
              <View style={styles.matchScoreBadge}>
                <Text style={styles.matchScoreText}>{item.matchScore}% Match</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Favorites</Text>
        <View style={styles.rightPlaceholder} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search favorites..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E07A5F" />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      ) : filteredRecipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          {searchQuery ? (
            <>
              <Ionicons name="search" size={64} color="#E07A5F" />
              <Text style={styles.emptyTitle}>No matching favorites</Text>
              <Text style={styles.emptyDescription}>
                Try a different search term
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="heart-outline" size={64} color="#E07A5F" />
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptyDescription}>
                Tap the heart icon on recipes to save them as favorites
              </Text>
              <TouchableOpacity 
                style={styles.browseButton}
                onPress={() => router.push('/ai-assistance/recipes')}
              >
                <Text style={styles.browseButtonText}>Browse Recipes</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={renderRecipeCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.recipeList}
          numColumns={2}
          columnWrapperStyle={styles.recipeRow}
        />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  rightPlaceholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    margin: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#E07A5F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recipeList: {
    padding: 8,
  },
  recipeRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  recipeCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
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
    height: 120,
    resizeMode: 'cover',
  },
  recipeInfo: {
    padding: 12,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  recipeMetaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cookTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cookTime: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  matchScoreBadge: {
    backgroundColor: 'rgba(224, 122, 95, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchScoreText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 
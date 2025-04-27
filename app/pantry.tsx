import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SwipeListView } from 'react-native-swipe-list-view';
import { CATEGORIES, COMMON_INGREDIENTS, classifyIngredient, addScannedIngredientsToPantry } from './_utils/ingredientUtils';

// Define the PantryItem type
interface PantryItem {
  id: string;
  name: string;
  category: string;
  available?: boolean;
  dateAdded?: string;
  quantity?: string;
  expiryDate?: string;
  isScanned?: boolean;
}

// Helper function to capitalize the first letter of a string
const capitalizeFirstLetter = (string: string): string => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

// Get a color for the category
const getCategoryColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'vegetables': return '#4CAF50'; // Green
    case 'fruits': return '#FF9800';     // Orange
    case 'protein': return '#F44336';    // Red
    case 'dairy': return '#2196F3';      // Blue
    case 'grains': return '#FFEB3B';     // Yellow
    default: return '#9E9E9E';           // Grey
  }
};

const PantryScreen = () => {
  // State definitions
  const [ingredients, setIngredients] = useState<{[key: string]: boolean}>({});
  const [newIngredient, setNewIngredient] = useState('');
  const [searchText, setSearchText] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [currentItem, setCurrentItem] = useState<PantryItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newIngredientValue, setNewIngredientValue] = useState('');
  
  // Derived value for hasIngredients
  const hasIngredients = pantryItems.length > 0;
  
  // Create an array of all categories plus 'All'
  const categoryFilters = ['All', ...Object.values(CATEGORIES)];

  // Load saved ingredients on component mount
  useEffect(() => {
    loadIngredients();
  }, []);

  // Generate suggestions when typing new ingredient
  useEffect(() => {
    if (newIngredient.length > 1) {
      const filteredSuggestions = Object.keys(COMMON_INGREDIENTS).filter(
        ingredient => ingredient.toLowerCase().includes(newIngredient.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [newIngredient]);

  const loadIngredients = async () => {
    try {
      setLoading(true);
      
      // First try the new format (pantryItems)
      const savedPantryItems = await AsyncStorage.getItem('pantryItems');
      if (savedPantryItems) {
        const items = JSON.parse(savedPantryItems);
        setPantryItems(items);
        
        // Convert to the old format for backward compatibility
        const convertedIngredients: {[key: string]: boolean} = {};
        items.forEach((item: PantryItem) => {
          convertedIngredients[item.name.toLowerCase()] = item.available !== false;
        });
        setIngredients(convertedIngredients);
      } else {
        // Try the old format
        const savedIngredients = await AsyncStorage.getItem('pantry_ingredients');
        if (savedIngredients) {
          const parsedIngredients = JSON.parse(savedIngredients);
          setIngredients(parsedIngredients);
          
          // Convert to the new format
          const newPantryItems: PantryItem[] = Object.keys(parsedIngredients).map(name => ({
            id: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            name: capitalizeFirstLetter(name),
            category: classifyIngredient(name),
            available: parsedIngredients[name],
            dateAdded: new Date().toISOString()
          }));
          setPantryItems(newPantryItems);
          
          // Save in the new format
          await AsyncStorage.setItem('pantryItems', JSON.stringify(newPantryItems));
        }
      }
    } catch (error) {
      console.error('Error loading ingredients:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveIngredients = async (updatedItems: PantryItem[]) => {
    try {
      await AsyncStorage.setItem('pantryItems', JSON.stringify(updatedItems));
      
      // Also update the old format for backward compatibility
      const updatedIngredients: {[key: string]: boolean} = {};
      updatedItems.forEach(item => {
        updatedIngredients[item.name.toLowerCase()] = item.available !== false;
      });
      setIngredients(updatedIngredients);
      await AsyncStorage.setItem('pantry_ingredients', JSON.stringify(updatedIngredients));
    } catch (error) {
      console.error('Error saving ingredients:', error);
    }
  };

  const addOrUpdateIngredient = (ingredient: string, quantity?: string, expiryDate?: string) => {
    if (!ingredient.trim()) return;
    
    const normalizedIngredient = capitalizeFirstLetter(ingredient.trim());
    const category = classifyIngredient(normalizedIngredient);
    
    let updatedItems: PantryItem[];
    
    // If currentItem exists, we're editing
    if (currentItem) {
      updatedItems = pantryItems.map(item => 
        item.id === currentItem.id ? {
          ...item,
          name: normalizedIngredient,
          category,
          quantity: quantity || item.quantity,
          expiryDate: expiryDate || item.expiryDate,
          available: true
        } : item
      );
      setCurrentItem(null);
    } else {
      // Check if ingredient already exists
      const existingIndex = pantryItems.findIndex(
        item => item.name.toLowerCase() === normalizedIngredient.toLowerCase()
      );
      
      if (existingIndex >= 0) {
        // Update existing ingredient
        updatedItems = [...pantryItems];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: quantity || updatedItems[existingIndex].quantity,
          expiryDate: expiryDate || updatedItems[existingIndex].expiryDate,
          available: true
        };
      } else {
        // Add new ingredient
        const newItem: PantryItem = {
          id: `${normalizedIngredient.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          name: normalizedIngredient,
          category,
          quantity: quantity || '',
          expiryDate: expiryDate || '',
          available: true,
          dateAdded: new Date().toISOString()
        };
        updatedItems = [...pantryItems, newItem];
      }
    }
    
    setPantryItems(updatedItems);
    saveIngredients(updatedItems);
    setNewIngredient('');
    setSuggestions([]);
  };

  const toggleIngredient = (id: string) => {
    const updatedItems = pantryItems.map(item => 
      item.id === id ? { ...item, available: !item.available } : item
    );
    setPantryItems(updatedItems);
    saveIngredients(updatedItems);
  };

  const removeIngredient = (id: string) => {
    const updatedItems = pantryItems.filter(item => item.id !== id);
    setPantryItems(updatedItems);
    saveIngredients(updatedItems);
  };

  const getIngredientCategory = (ingredient: string): string => {
    return classifyIngredient(ingredient);
  };

  const filterItemsByCategory = (category: string) => {
    if (!searchText && category === 'All') {
      return pantryItems;
    }
    
    let filtered = pantryItems;
    
    if (searchText) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    if (category !== 'All') {
      filtered = filtered.filter(item => 
        item.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    return filtered;
  };

  const importFromScanner = async () => {
    try {
      router.push('/ai-assistance/ingredient-scanner');
    } catch (err) {
      console.error('Navigation error:', err);
      Alert.alert('Error', 'Failed to navigate to ingredient scanner');
    }
  };

  const renderEmptyPantry = () => {
    return (
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyImagePlaceholder}>
          <Ionicons name="basket-outline" size={60} color="#E07A5F" />
        </View>
        
        <Text style={styles.emptyStateTitle}>Your pantry is empty</Text>
        <Text style={styles.emptyStateText}>
          Add ingredients to keep track of what you have on hand and find matching recipes.
        </Text>
        
        <TouchableOpacity
          style={styles.addFirstIngredientButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addFirstIngredientButtonText}>Add Your First Ingredient</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.scanIngredientsButton}
          onPress={importFromScanner}
        >
          <Text style={styles.scanIngredientsButtonText}>Scan Ingredients with Camera</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHiddenItem = ({ item }: { item: PantryItem }) => (
    <View style={styles.rowBack}>
      <TouchableOpacity
        style={[styles.backRightBtn, styles.backRightBtnRight]}
        onPress={() => removeIngredient(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: PantryItem }) => {
    return (
      <TouchableOpacity 
        style={styles.ingredientRow}
        onPress={() => {
          Alert.alert(
            'Edit Ingredient',
            `What would you like to do with ${item.name}?`,
            [
              { 
                text: 'Toggle Available', 
                onPress: () => toggleIngredient(item.id) 
              },
              { 
                text: 'Delete', 
                onPress: () => removeIngredient(item.id),
                style: 'destructive'
              },
              { 
                text: 'Cancel', 
                style: 'cancel' 
              },
            ]
          );
        }}
      >
        <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(item.category) }]} />
        
        <View style={styles.ingredientNameContainer}>
          <Text 
            style={[
              styles.ingredientName,
              item.available === false && styles.unavailableIngredient
            ]}
          >
            {item.name}
          </Text>
          {item.available === false && (
            <Text style={styles.unavailableTag}>Out of stock</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSuggestion = (suggestion: string) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => {
        addOrUpdateIngredient(suggestion);
        setNewIngredient('');
        setAddModalVisible(false);
      }}
    >
      <Text style={styles.suggestionText}>{suggestion}</Text>
    </TouchableOpacity>
  );

  const renderAddIngredientModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%' }}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {currentItem ? 'Edit Ingredient' : 'Add Ingredient'}
            </Text>
            
            <TextInput
              style={[styles.input, styles.textInput]}
              placeholder="Ingredient name"
              value={newIngredientValue}
              onChangeText={setNewIngredientValue}
              autoCapitalize="words"
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setCurrentItem(null);
                  setNewIngredientValue('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addModalButton]}
                onPress={() => {
                  if (newIngredientValue.trim()) {
                    addOrUpdateIngredient(newIngredientValue);
                    setModalVisible(false);
                    setCurrentItem(null);
                    setNewIngredientValue('');
                  }
                }}
              >
                <Text style={styles.buttonText}>
                  {currentItem ? 'Update' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ingredients</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E07A5F" />
          <Text style={styles.loadingText}>Loading your pantry...</Text>
        </View>
      ) : (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={24} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search ingredients..."
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {hasIngredients ? (
            <>
              <View style={styles.categoryFilter}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {categoryFilters.map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryFilterChip,
                        categoryFilter === category && styles.activeCategoryChip
                      ]}
                      onPress={() => setCategoryFilter(category)}
                    >
                      <Text
                        style={[
                          styles.categoryFilterText,
                          categoryFilter === category && styles.activeCategoryText
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.listHeader}>
                <Text style={styles.listHeaderTitle}>Ingredients</Text>
                <Text style={styles.itemCount}>{pantryItems.length} items</Text>
              </View>

              <SwipeListView
                data={filterItemsByCategory(categoryFilter)}
                renderItem={renderItem}
                renderHiddenItem={renderHiddenItem}
                rightOpenValue={-75}
                disableRightSwipe
                keyExtractor={item => item.id}
                style={styles.list}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </>
          ) : (
            renderEmptyPantry()
          )}

          {hasIngredients && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.importButton}
                onPress={importFromScanner}
              >
                <Ionicons name="camera-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Scan More</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setModalVisible(true);
                }}
              >
                <Ionicons name="add" size={22} color="#fff" />
                <Text style={styles.buttonText}>Add Ingredient</Text>
              </TouchableOpacity>
            </View>
          )}

          {renderAddIngredientModal()}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  categoryFilter: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeCategoryChip: {
    backgroundColor: '#E07A5F',
  },
  categoryFilterText: {
    fontSize: 14,
    color: '#666',
  },
  activeCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  list: {
    flex: 1,
    backgroundColor: '#fff',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  categoryIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  ingredientNameContainer: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 17,
    color: '#333',
    fontWeight: '500',
    marginRight: 8,
  },
  unavailableIngredient: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  unavailableTag: {
    fontSize: 12,
    color: '#E07A5F',
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 16,
  },
  rowBack: {
    alignItems: 'center',
    backgroundColor: '#DDD',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 15,
  },
  backRightBtn: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: 75,
  },
  backRightBtnRight: {
    backgroundColor: '#E07A5F',
    right: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  importButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E07A5F',
    padding: 16,
    borderRadius: 12,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    opacity: 0.85,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E07A5F',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  input: {
    height: 50,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#666',
  },
  addModalButton: {
    backgroundColor: '#E07A5F',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyImagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  addFirstIngredientButton: {
    backgroundColor: '#E07A5F',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addFirstIngredientButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scanIngredientsButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E07A5F',
  },
  scanIngredientsButtonText: {
    color: '#E07A5F',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAF9F7',
    borderBottomWidth: 1,
    borderBottomColor: '#EEECE9',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // To center the title accounting for back button
  },
  headerRight: {
    width: 40, // Same width as back button for balanced centering
  },
  categoryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
  },
  suggestionContainer: {
    marginBottom: 20,
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
});

export default PantryScreen; 
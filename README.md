# 🍽️ Snap & Cook: Intelligent Recipe Assistant

Snap & Cook is an intelligent recipe recommendation app that uses computer vision and AI to help you discover recipes based on ingredients you already have at home.

## 🧠 Intelligence Features

### Ingredient Detection
- **Vision Analysis**: Take a photo of your ingredients, and our AI will identify them automatically
- **Smart Processing**: Normalizes ingredient names, filters out non-food items, and handles duplicates
- **Context Analysis**: Detects likely cuisine types and cooking techniques based on ingredient combinations

### Intelligent Recipe Matching
- **Advanced Matching Algorithm**: Scores recipes based on multiple factors:
  - Ingredient match percentage
  - Contextual relevance (time of day, cuisine type)
  - User preferences and history
  - Freshness (showing new recipes over time)
- **Partial Matching**: Recognizes similar ingredients even with different names or forms
- **Diversity Enforcement**: Ensures varied cuisine types and cooking techniques in recommendations

### User Adaptation
- **Preference Learning**: The app learns from your interactions:
  - Liked recipes boost similar cuisine types
  - Viewed recipe details update recommendations 
  - Previously seen recipes are tracked to avoid repetition
- **Ingredient Suggestions**: Intelligently suggests additional ingredients based on what you already have

## 🔍 How It Works

### Recipe Agent
The core of our intelligent system is the `RecipeAgent` class that:
1. Analyzes available ingredients
2. Scores recipes based on multiple factors
3. Applies diversity rules to avoid monotonous suggestions
4. Learns from user interactions to improve future recommendations

```typescript
// Example scoring algorithm (simplified)
const finalScore = (
  (ingredientMatchScore * 0.6) + 
  (contextScore * 0.2) + 
  (preferenceScore * 0.1)
) * freshness;
```

### Ingredient Agent
The `IngredientAgent` handles:
1. Processing detected ingredients from vision API
2. Normalizing ingredient names and states
3. Inferring potential missing ingredients
4. Analyzing ingredient combinations for context clues

```typescript
// Example of ingredient matching logic (simplified)
const matched = userIngredients.some(userIng => 
  recipeIngredient.toLowerCase().includes(userIng.toLowerCase()) || 
  userIng.toLowerCase().includes(recipeIngredient.toLowerCase())
);
```

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run start`

## 📸 Using the App

1. **Take a Photo**: Point your camera at ingredients to detect them automatically
2. **Edit Ingredients**: Add or remove ingredients manually if needed
3. **View Recipes**: See intelligent matches based on your ingredients
4. **Refresh**: Get new recipe suggestions without repeats
5. **Like Recipes**: Improve future suggestions by marking recipes you enjoy

## 🛠️ Technologies

- React Native & Expo
- TypeScript
- Custom-built intelligence agents
- Spoonacular API integration (optional)

## 👥 Contributing

Contributions are welcome! Feel free to submit pull requests or open issues to improve the application.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<div align="center">
  <p>Made with ❤️ by Snap & Cook Team -- Thomas Chauvel</p>
</div>

# 🍽️ Snap & Cook: Intelligent Recipe Assistant

Snap & Cook is an intelligent recipe recommendation app that uses computer vision and AI to help you discover recipes based on ingredients you already have at home.

## Features

- 📸 Ingredient detection from images (Claude Vision AI integration)
- 🥗 Recipe recommendations based on your pantry
- 🔍 Search for recipes by ingredient
- 📝 Save and manage your favorite recipes
- 🌐 Fetches recipes from Spoonacular and other sources
- 🛡️ No sensitive API keys or secrets in this repository

## Prerequisites

- **Node.js** (v16 or higher recommended)
- **npm** or **yarn**
- **Expo CLI** (install globally with `npm install -g expo-cli`)
- **Expo Go** app on your mobile device (for testing on real devices)

## Getting Started

1. **Clone the repository:**
   ```sh
   git clone https://github.com/tchauvel/Snap-cook.git
   cd Snap-cook
   ```

2. **Install dependencies:**
   ```sh
   npm install
   # or
   yarn install
   ```

3. **Set up your API keys:**
   - The app requires API keys for Claude (Anthropic) and Spoonacular.
   - You can provide them in a `.env` file at the root of the project or directly in the config files (not recommended for production).
   - Example `.env` file:
     ```env
     CLAUDE_API_KEY=your-claude-api-key-here
     SPOONACULAR_API_KEY=your-spoonacular-api-key-here
     ```
   - **Important:** Never commit your API keys to the repository.

4. **Configure the app:**
   - If using `.env`, make sure your config files load from environment variables (see config.ts for details).
   - You may need to restart the development server after adding or changing environment variables.

5. **Run the app:**
   ```sh
   npx expo start
   ```
   - Scan the QR code with the Expo Go app (iOS/Android) or run on a simulator/emulator.

## API Keys & Configuration

Snap & Cook requires API keys for:
- **Claude (Anthropic Vision API)**: For ingredient detection from images.
- **Spoonacular API**: For recipe search and recommendations.

### How to Obtain API Keys

- **Claude (Anthropic) API Key:**  
  1. Sign up at [Anthropic Console](https://console.anthropic.com/).
  2. Create a new API key in your account dashboard.

- **Spoonacular API Key:**  
  1. Sign up at [Spoonacular](https://spoonacular.com/food-api).
  2. Get your API key from your dashboard.

### How to Add API Keys

1. **Create a `.env` file in your project root:**
    ```env
    CLAUDE_API_KEY=your-claude-api-key-here
    SPOONACULAR_API_KEY=your-spoonacular-api-key-here
    ```
2. **(Optional) Directly edit `config.ts`**  
   For development only, you can paste your keys in `snap-and-cook/config.ts`:
    ```ts
    export const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
    export const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || '';
    ```
   **Never commit your real API keys to the repository!**
3. **Restart your development server** after adding or changing environment variables.

## Example API Usage

- **Claude Vision API**: Used for image-to-ingredient detection.
    - Endpoint: `https://api.anthropic.com/v1/messages`
    - Required header: `x-api-key: <your-claude-api-key>`
    - Request body: See [Anthropic API docs](https://docs.anthropic.com/claude/reference/messages_post)

- **Spoonacular API**: Used for recipe search.
    - Endpoint: `https://api.spoonacular.com/recipes/findByIngredients`
    - Required query param: `apiKey=<your-spoonacular-api-key>`
    - See [Spoonacular API docs](https://spoonacular.com/food-api/docs)

## Usage

- **Take a photo** of your pantry or fridge to detect ingredients automatically.
- **Edit the detected ingredients** if needed.
- **Get recipe recommendations** based on your available ingredients.
- **Tap a recipe** to view details, instructions, and ingredients.
- **Save your favorite recipes** for quick access later.

## How It Works (Intelligence Overview)

### Ingredient Detection
- Vision analysis: Take a photo of your ingredients, and our AI will identify them automatically
- Smart processing: Normalizes ingredient names, filters out non-food items, and handles duplicates
- Context analysis: Detects likely cuisine types and cooking techniques based on ingredient combinations

### Intelligent Recipe Matching
- Advanced matching algorithm: Scores recipes based on multiple factors (ingredient match, context, preferences, freshness)
- Partial matching: Recognizes similar ingredients even with different names or forms
- Diversity enforcement: Ensures varied cuisine types and cooking techniques in recommendations

### User Adaptation
- Preference learning: The app learns from your interactions (liked recipes, viewed details, etc.)
- Ingredient suggestions: Intelligently suggests additional ingredients based on what you already have

## Technologies

- React Native & Expo
- TypeScript
- Custom-built intelligence agents
- Spoonacular API integration (optional)

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)

---

**Note:**  
This repository has been cleaned of all secrets and API keys. Please ensure you keep your own keys secure and never commit them to the repository.

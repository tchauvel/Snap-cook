/**
 * Configuration for Snap & Cook app
 * 
 * In a production environment, you would store this information in environment
 * variables or a secure backend service. This is a simplified setup for development.
 */

// App-wide configuration settings
export const APP_CONFIG = {
  // Feature Flags
  useAI: true,                  // Enable/disable AI features
  useMockData: false,           // Use mock data when API is unavailable
  
  // API Configuration  
  apiTimeoutMs: 10000,          // API request timeout in milliseconds
  maxRetries: 2,                // Maximum API request retries
  
  // UI Settings
  minimumRecipesToShow: 5,      // Minimum number of recipes to display
  maxRecentRecipes: 10,         // Maximum number of recent recipes to track
  
  // Recipe Matching
  minMatchScore: 0.3,           // Minimum score for a recipe to be considered a match
  perfectMatchThreshold: 0.8,   // Score threshold for a "perfect" match
};

// API Keys - For production, these should be stored in a secure environment variable
// To use Claude API:
// 1. Create an account at https://console.anthropic.com/ 
// 2. Create an API key in the console
// 3. Replace 'your-claude-api-key' below with your actual API key
// 4. Set APP_CONFIG.useMockData to false to use the real API
export const CLAUDE_API_KEY = '';

// Claude API Constants
export const CLAUDE_API_CONSTANTS = {
  API_URL: 'https://api.anthropic.com/v1',
  MODELS: {
    HAIKU: 'claude-3-haiku-20240307',
    SONNET: 'claude-3-sonnet-20240229',
    OPUS: 'claude-3-opus-20240229'
  }
};

// Recipe database configuration
export const RECIPE_DB_CONFIG = {
  cacheDurationMinutes: 60,     // Duration to cache recipes
  maxCachedItems: 100           // Maximum number of cached items
};

// Spoonacular API key (optional)
export const SPOONACULAR_API_KEY = '';

/**
 * Helper to check if AI features are enabled and configured
 */
export function isAIEnabled(): boolean {
  return APP_CONFIG.useAI;
}

/**
 * Helper to get the appropriate API key for a service
 */
export function getApiKey(service: 'claude' | 'spoonacular'): string {
  switch (service) {
    case 'claude':
      return CLAUDE_API_KEY;
    case 'spoonacular':
      return SPOONACULAR_API_KEY;
    default:
      return '';
  }
} 
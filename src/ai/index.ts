// AI functionality - Client-compatible version for static export
// These functions replace the server-side Genkit flows with client-side implementations

// Default keywords for trending searches
const DEFAULT_KEYWORDS = ['Cyberpunk', 'Neon', 'Web3', 'Digital Art', 'Collectibles', 'NFT', 'Metaverse'];

/**
 * Get trending keywords - Client-compatible version
 * Returns mock data since we can't use server-side AI in static export
 */
export async function getTrendingKeywords(count: number = 5): Promise<{ keywords: string[] }> {
  // Simulate network delay for realistic behavior
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return shuffled subset of default keywords
  const shuffled = [...DEFAULT_KEYWORDS].sort(() => 0.5 - Math.random());
  return {
    keywords: shuffled.slice(0, Math.min(count, shuffled.length))
  };
}

/**
 * Analyze product image - Client-compatible version
 * Returns mock data since we can't use server-side AI in static export
 */
export async function analyzeProductImage(input: { imageDataUri: string }): Promise<{ title: string; description: string }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return {
    title: "精选商品",
    description: "这是一件独特的商品，具有高品质和独特的设计。适合收藏或使用。"
  };
}

/**
 * Smart search suggestions - Client-compatible version
 */
export async function smartSearchSuggestions(input: { searchTerm: string; searchHistory: string[] }): Promise<{ suggestions: string[] }> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const commonSuggestions = ['NFT', 'Crypto', 'Digital Art', 'Web3', 'Metaverse'];
  return { suggestions: commonSuggestions };
}

/**
 * Translate text - Client-compatible version
 * Returns original text (no actual translation in static export mode)
 */
export async function translateText(input: { text: string; targetLanguage: string }): Promise<{ translatedText: string }> {
  await new Promise(resolve => setTimeout(resolve, 200));

  // In static export mode, return original text without translation
  return { translatedText: input.text };
}

/**
 * Location-based recommendations - Client-compatible version
 */
export async function recommendProducts(input: {
  latitude: number;
  longitude: number;
  purchaseHistory: string;
  radius?: number;
  maxRecommendations?: number;
}): Promise<{ recommendations: string[] }> {
  await new Promise(resolve => setTimeout(resolve, 600));

  return {
    recommendations: ['NFT艺术品', '数字收藏品', 'Web3域名', '加密货币周边']
  };
}

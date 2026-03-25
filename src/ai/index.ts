'use server';

const DEFAULT_KEYWORDS = ['Cyberpunk', 'Neon', 'Web3', 'Digital Art', 'Collectibles', 'NFT', 'Metaverse'];

export async function getTrendingKeywords(count: number = 5): Promise<{ keywords: string[] }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const shuffled = [...DEFAULT_KEYWORDS].sort(() => 0.5 - Math.random());
  return { keywords: shuffled.slice(0, Math.min(count, shuffled.length)) };
}

/**
 * 🚀 真·視覺大模型圖像分析 (調用 Gemini 2.5 Pro)
 */
export async function analyzeProductImage(input: { imageDataUri: string }): Promise<{ title: string; description: string }> {
  // 1. 安全第一：嚴格從環境變量讀取 API Key，絕不在代碼中硬編碼
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("致命錯誤: 未找到 GEMINI_API_KEY 環境變量");
    throw new Error("系統配置錯誤，AI 服務暫不可用，請檢查環境變量");
  }

  try {
    // 解析前端傳來的 base64 圖片格式 (例如: "data:image/jpeg;base64,/9j/4AAQ...")
    const mimeTypeMatch = input.imageDataUri.match(/^data:(.*?);base64,/);
    if (!mimeTypeMatch) {
        throw new Error("圖片格式錯誤，無法解析");
    }
    const mimeType = mimeTypeMatch[1];
    const base64Data = input.imageDataUri.replace(/^data:.*?;base64,/, "");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "你是一個專業的二手商品鑑定與電商文案專家。請根據用戶上傳的商品圖片，識別出這是什麼商品，並生成吸引人的商品標題和詳細的商品描述。要求格式必須為嚴格的 JSON：{\"title\": \"商品簡短標題\", \"description\": \"商品詳細描述，包含可能的成色、規格等預測\"}" },
              {
                // 注意：Google REST API 這裡必須使用駝峰命名法 (inlineData, mimeType)
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json", // 強制要求 Gemini 吐出乾淨的 JSON
        }
      })
    });

    if (!response.ok) {
      // 嘗試獲取詳細的錯誤信息
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Gemini 接口請求失敗 (HTTP ${response.status})`);
    }

    const data = await response.json();
    const resultContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultContent) {
      throw new Error("Gemini 返回的數據結構異常，無法讀取內容");
    }

    // 解析返回的 JSON 數據
    const parsedResult = JSON.parse(resultContent);

    return {
      title: parsedResult.title || "未知商品",
      description: parsedResult.description || "未生成描述，請手動補充。"
    };
  } catch (error: any) {
    console.error("Gemini AI Analysis Failed:", error);
    throw new Error(error.message || "AI 識別服務暫時不可用");
  }
}

export async function smartSearchSuggestions(input: { searchTerm: string; searchHistory: string[] }): Promise<{ suggestions: string[] }> {
  await new Promise(resolve => setTimeout(resolve, 300));
  const commonSuggestions = ['NFT', 'Crypto', 'Digital Art', 'Web3', 'Metaverse'];
  return { suggestions: commonSuggestions };
}

export async function translateText(input: { text: string; targetLanguage: string }): Promise<{ translatedText: string }> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return { translatedText: input.text };
}

export async function recommendProducts(input: {
  latitude: number;
  longitude: number;
  purchaseHistory: string;
  radius?: number;
  maxRecommendations?: number;
}): Promise<{ recommendations: string[] }> {
  await new Promise(resolve => setTimeout(resolve, 600));
  return { recommendations: ['NFT藝術品', '數字收藏品', 'Web3域名', '加密貨幣周邊'] };
}
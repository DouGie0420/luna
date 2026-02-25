'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// 🚀 定义输出架构
const TrendingKeywordsOutputSchema = z.object({
  keywords: z
    .array(z.string())
    .describe('A list of trending search keywords.'),
});

export type TrendingKeywordsOutput = z.infer<
  typeof TrendingKeywordsOutputSchema
>;
export async function getTrendingKeywords(
  count: number = 5
): Promise<TrendingKeywordsOutput> {
  // 🛡️ 强制熔断保护：如果 AI 请求导致超时或挂起，这里会直接拦截
  try {
    // 增加一个超时的 Promise 竞速（可选，防止 AI 彻底死锁首页）
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI_TIMEOUT')), 3000)
    );

    const result = await Promise.race([
      trendingKeywordsFlow({ count }),
      timeoutPromise
    ]) as TrendingKeywordsOutput;

    return result;
  } catch (error) {
    console.error("LUNA_AI_CRITICAL_ERROR: 链路异常，启动默认词预案", error);
    // 返回备选词，确保首页 SearchBar 不会因为转圈而白屏
    return { keywords: ['Cyberpunk', 'Neon', 'Web3', 'Futuristic', 'Luna'] };
  }
}
const trendingPrompt = ai.definePrompt({
  name: 'trendingKeywordsPrompt',
  model: 'googleAI/gemini-2.0-flash', 
  input: { schema: z.object({ count: z.number() }) },
  output: { schema: TrendingKeywordsOutputSchema },
  prompt: `You are an e-commerce platform's AI assistant. Generate a list of {{count}} trending search keywords related to Cyberpunk, Futuristic technology, and Neon aesthetics. Respond with only a JSON formatted output.`,
});


const trendingKeywordsFlow = ai.defineFlow(
  {
    name: 'trendingKeywordsFlow',
    inputSchema: z.object({ count: z.number() }),
    outputSchema: TrendingKeywordsOutputSchema,
  },
  async ({ count }) => {
    try {
      const { output } = await trendingPrompt({ count });
      return output || { keywords: ['Cyberpunk', 'Neon', 'High-tech'] };
    } catch (error) {
      throw error;
    }
  }
);
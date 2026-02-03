'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
  return trendingKeywordsFlow({ count });
}

/**
 * 定义 Prompt
 */
const prompt = ai.definePrompt({
  name: 'trendingKeywordsPrompt',
  model: 'googleai/gemini-pro', 
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
      const { output } = await prompt({ count });
      return output || { keywords: ['Cyberpunk', 'Neon', 'High-tech'] };
    } catch (error) {
      // 增加容错：如果 AI 接口彻底挂了，返回硬编码数据保证首页不崩溃
      console.error("AI Flow Error:", error);
      return { keywords: ['Cyberpunk', 'Futuristic', 'Neon'] };
    }
  }
);

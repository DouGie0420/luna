'use server';

/**
 * @fileOverview Generates trending search keywords for the e-commerce platform.
 *
 * - getTrendingKeywords - Fetches a list of trending keywords.
 * - TrendingKeywordsOutput - The return type for the getTrendingKeywords function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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

const prompt = ai.definePrompt({
  name: 'trendingKeywordsPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: { schema: z.object({ count: z.number() }) },
  output: { schema: TrendingKeywordsOutputSchema },
  prompt: `You are an e-commerce platform's AI assistant. Generate a list of {{{count}}} trending search keywords.

The keywords should be related to the following themes:
- Cyberpunk
- Futuristic technology
- Retro-futuristic fashion
- Neon aesthetics
- Glitch art
- High-tech gadgets

The keywords should be in English.

Respond with only a JSON formatted output.`,
});

const trendingKeywordsFlow = ai.defineFlow(
  {
    name: 'trendingKeywordsFlow',
    inputSchema: z.object({ count: z.number() }),
    outputSchema: TrendingKeywordsOutputSchema,
  },
  async ({ count }) => {
    const {output} = await prompt({ count });
    return output!;
  }
);

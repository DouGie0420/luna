
'use server';

/**
 * @fileOverview Recommends products based on user location and purchase history.
 *
 * - recommendProducts - A function that recommends products based on location and purchase history.
 * - RecommendProductsInput - The input type for the recommendProducts function.
 * - RecommendProductsOutput - The return type for the recommendProducts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendProductsInputSchema = z.object({
  latitude: z.number().describe('The latitude of the user.'),
  longitude: z.number().describe('The longitude of the user.'),
  purchaseHistory: z
    .string()
    .describe(
      'A comma separated list of product names representing the users past purchases.'
    ),
  radius: z
    .number()
    .default(10)
    .describe(
      'The radius in kilometers to search for products within. Defaults to 10km.'
    ),
  maxRecommendations: z
    .number()
    .default(5)
    .describe(
      'The maximum number of product recommendations to return. Defaults to 5.'
    ),
});
export type RecommendProductsInput = z.infer<typeof RecommendProductsInputSchema>;

const RecommendProductsOutputSchema = z.object({
  recommendations: z.array(z.string()).describe('A list of recommended products.'),
});
export type RecommendProductsOutput = z.infer<typeof RecommendProductsOutputSchema>;

export async function recommendProducts(
  input: RecommendProductsInput
): Promise<RecommendProductsOutput> {
  return recommendProductsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendProductsPrompt',
  model: 'gemini-pro',
  input: {schema: RecommendProductsInputSchema},
  output: {schema: RecommendProductsOutputSchema},
  prompt: `You are a personal shopping assistant. A user is at latitude {{{latitude}}}, longitude {{{longitude}}}. They want you to recommend products available within {{{radius}}}km to them based on their purchase history.

Their purchase history is: {{{purchaseHistory}}}.

Recommend at most {{{maxRecommendations}}} products that are relevant to them. Only list the name of the products.

If you do not find any relevant products, you should return an empty array.

Respond with only a JSON formatted output.`,
});

const recommendProductsFlow = ai.defineFlow(
  {
    name: 'recommendProductsFlow',
    inputSchema: RecommendProductsInputSchema,
    outputSchema: RecommendProductsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

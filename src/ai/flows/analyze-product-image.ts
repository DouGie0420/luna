
'use server';
/**
 * @fileOverview Analyzes a product image and generates a title and description.
 *
 * - analyzeProductImage - A function that takes an image and returns a product title and description.
 * - AnalyzeProductImageInput - The input type for the analyzeProductImage function.
 * - AnalyzeProductImageOutput - The return type for the analyzeProductImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeProductImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of the product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeProductImageInput = z.infer<typeof AnalyzeProductImageInputSchema>;

const AnalyzeProductImageOutputSchema = z.object({
  title: z.string().describe('A catchy and descriptive title for the product listing.'),
  description: z.string().describe('A detailed and appealing description for the product, highlighting its key features and condition. Should be in Chinese.'),
});
export type AnalyzeProductImageOutput = z.infer<typeof AnalyzeProductImageOutputSchema>;

export async function analyzeProductImage(
  input: AnalyzeProductImageInput
): Promise<AnalyzeProductImageOutput> {
  return analyzeProductImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeProductImagePrompt',
  model: 'googleai/gemini-1.5-pro',
  input: {schema: AnalyzeProductImageInputSchema},
  output: {schema: AnalyzeProductImageOutputSchema},
  prompt: `You are an expert e-commerce copywriter. Analyze the product in the following image.

Image: {{media url=imageDataUri}}

Based on the image, generate a short, catchy, and descriptive title for the product listing.
Then, write a detailed and appealing description in Chinese. Mention what the item appears to be, its potential features, style, and condition. Be creative and engaging.

Respond with only a JSON formatted output.`,
});

const analyzeProductImageFlow = ai.defineFlow(
  {
    name: 'analyzeProductImageFlow',
    inputSchema: AnalyzeProductImageInputSchema,
    outputSchema: AnalyzeProductImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

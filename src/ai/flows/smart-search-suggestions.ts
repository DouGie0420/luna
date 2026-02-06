'use server';

/**
 * @fileOverview This file implements the smart search suggestions flow.
 *
 * The flow suggests relevant search terms as the user types and learns from the user's search history to improve future suggestions.
 *
 * @interface SmartSearchInput The input for the smartSearchSuggestions function.
 * @interface SmartSearchOutput The output of the smartSearchSuggestions function.
 * @function smartSearchSuggestions The main function that takes the input and returns search suggestions.
 */

import {ai} from '@/ai/genkit';
import { MODEL_NAME } from '@/ai/config';
import {z} from 'genkit';

const SmartSearchInputSchema = z.object({
  searchTerm: z.string().describe('The current search term entered by the user.'),
  searchHistory: z
    .array(z.string())
    .describe('The user search history, as an array of search terms.'),
});
export type SmartSearchInput = z.infer<typeof SmartSearchInputSchema>;

const SmartSearchOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('An array of suggested search terms based on the input and history.'),
});
export type SmartSearchOutput = z.infer<typeof SmartSearchOutputSchema>;

export async function smartSearchSuggestions(input: SmartSearchInput): Promise<SmartSearchOutput> {
  return smartSearchSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartSearchSuggestionsPrompt',
  model: MODEL_NAME,
  input: {schema: SmartSearchInputSchema},
  output: {schema: SmartSearchOutputSchema},
  prompt: `You are an AI assistant that suggests search terms to the user as they type.

  The current search term is: {{{searchTerm}}}
  The user's search history is: {{#if searchHistory}}{{#each searchHistory}}- {{{this}}}\n{{/each}}{{else}}No search history{{/if}}

  Based on this information, suggest some relevant search terms.
  Return an array of strings.  The suggestions should relate to the users search history.
  Prioritize suggestions that are related to recent searches.
  Be brief and do not return explanations.  Just return the suggestions.
`,
});

const smartSearchSuggestionsFlow = ai.defineFlow(
  {
    name: 'smartSearchSuggestionsFlow',
    inputSchema: SmartSearchInputSchema,
    outputSchema: SmartSearchOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

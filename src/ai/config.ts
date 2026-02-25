
/**
 * @fileoverview Centralized configuration for AI models used in Genkit flows.
 */

// This is the primary model used for most generative AI tasks in the application.
// By centralizing it here, we can easily swap it out for a different model in the future
// across all flows. For example, you could change this to 'googleai/gemini-2.0-flash'.
export const MODEL_NAME = 'googleai/gemini-2.0-flash';

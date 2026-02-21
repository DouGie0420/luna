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
  model: 'googleai/gemini-2.5-flash', 
  input: {schema: AnalyzeProductImageInputSchema},
  prompt: `You are an expert e-commerce copywriter. Analyze the product in the image and return the result in JSON format.
You MUST only output a pure JSON string, without \`\`\`json tags or any other extra explanations.
The format must be: {"title": "a short, catchy, and descriptive title", "description": "a detailed and appealing description in Chinese"}.

Image: {{media url=imageDataUri}}`,
});

const analyzeProductImageFlow = ai.defineFlow(
  {
    name: 'analyzeProductImageFlow',
    inputSchema: AnalyzeProductImageInputSchema,
    outputSchema: AnalyzeProductImageOutputSchema,
  },
  async input => {
    try {
      const response = await prompt(input);
      let jsonString = response.text;
      
      if (!jsonString) {
        throw new Error("AI 无法识别该图片内容，请重试。");
      }

      // 强制剥离 Gemini 偶尔输出的 Markdown 标签，防止 JSON.parse 崩溃
      jsonString = jsonString.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

      return JSON.parse(jsonString);
    } catch (e: any) {
      console.error("Failed to parse AI JSON response:", e);
      throw new Error(`AI 图片分析失败: ${e.message || "未知数据格式"}`);
    }
  }
);
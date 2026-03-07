import { useState, useCallback } from 'react';
import { analyzeProductImage } from '@/ai';

export function useProductAnalysis() {
  const [analysis, setAnalysis] = useState<{
    description: string;
    categories: string[];
    confidence: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const analyzeImage = useCallback(async (imageUrl: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await analyzeProductImage(imageUrl);
      setAnalysis(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to analyze image');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { analysis, loading, error, analyzeImage };
}

import { useState, useEffect } from 'react';
import { getTrendingKeywords } from '@/ai';

export function useTrendingKeywords() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchKeywords() {
      try {
        setLoading(true);
        const result = await getTrendingKeywords();
        setKeywords(result.keywords);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch trending keywords'));
      } finally {
        setLoading(false);
      }
    }

    fetchKeywords();
  }, []);

  return { keywords, loading, error };
}

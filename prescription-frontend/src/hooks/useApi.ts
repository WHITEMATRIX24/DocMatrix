import { useState, useEffect } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export const useApi = <T>(
  apiCall: () => Promise<T>,
  deps: any[] = []
): UseApiState<T> => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const result = await apiCall();
        
        if (mounted) {
          setState({
            data: result,
            loading: false,
            error: null,
          });
        }
      } catch (error: any) {
        if (mounted) {
          setState({
            data: null,
            loading: false,
            error: error.message || 'An error occurred',
          });
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, deps);

  return state;
};
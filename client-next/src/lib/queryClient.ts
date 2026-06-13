import { QueryClient } from '@tanstack/react-query';

// Sane defaults per the engineering charter — deliberately NOT gcTime:0 or
// staleTime:Infinity (the two cache anti-patterns from the old client).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

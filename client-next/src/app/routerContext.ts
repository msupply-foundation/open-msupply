import type { QueryClient } from '@tanstack/react-query';

// Context available to every route's loader/beforeLoad. Auth is read directly from
// the session store (race-free, synchronous), so it isn't threaded through here.
export interface RouterContext {
  queryClient: QueryClient;
}

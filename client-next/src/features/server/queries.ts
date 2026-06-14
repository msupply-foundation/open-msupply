import { queryOptions } from '@tanstack/react-query';
import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './serverInfo.generated';

const serverSdk = getSdk(gqlClient);

// apiVersion + isCentralServer are served without authentication, so this is
// safe to call from the login screen. Server info is effectively static for the
// life of the page.
export function serverInfoQueryOptions() {
  return queryOptions({
    queryKey: ['serverInfo'],
    queryFn: () => serverSdk.serverInfo(),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}

import { useQuery } from '@tanstack/react-query';
import { displaySettingsQueryOptions } from './queries';

/**
 * Mounted once in the authenticated shell: fetches server-distributed branding
 * and (via the query's side-effect) applies any change to the CSS variables.
 * Failures are non-fatal — the app keeps the cached/default theme.
 */
export function useBranding(): void {
  useQuery({ ...displaySettingsQueryOptions(), retry: false });
}

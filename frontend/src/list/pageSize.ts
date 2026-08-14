import { currentUserId } from '@/auth/authContext';
import { getPreferredPageSize, recordPreferredPageSize } from '@/appData';

// Rows-per-page as a remembered per-user preference
// (spec/ui-standards/conventions.md § View state; issue #680).
//
// The URL stays the home of an OPEN view's page size (kdd/url-structure) — a
// shared or reloaded link shows the size it was captured with, because a URL
// value merges over the default in useUrlQueryState. This module only decides
// what a FRESH visit starts at: the last size the user chose anywhere in the
// app, falling back to the app-wide default.
//
// Both sides are read per interaction/mount, never at module scope — a
// module-level read would freeze the preference at import time, so a change
// made on one list would not reach an already-imported one until reload.

export const DEFAULT_PAGE_SIZE = 50;

/**
 * The page size a fresh visit starts at. Call it where the view builds its
 * default state (inside the component, per mount) and hand the result to
 * `useUrlQueryState` as the default's `first` — the URL, when it carries one,
 * still wins.
 */
export const initialPageSize = (): number => {
  const userId = currentUserId();
  return (
    (userId ? getPreferredPageSize(userId) : undefined) ?? DEFAULT_PAGE_SIZE
  );
};

/**
 * Record a rows-per-page choice so the NEXT fresh visit — of any paginated
 * view — starts there. Call it from `onPageSizeChange`, alongside (not instead
 * of) the view's own setQuery/signal update. No user (shouldn't happen in-app)
 * means nowhere to persist; the change still applies to the open view.
 */
export const rememberPageSize = (pageSize: number): void => {
  const userId = currentUserId();
  if (userId) recordPreferredPageSize(userId, pageSize);
};

import type { NavBadge } from '../../ui/layout/AppShell/navModel';

// PLACEHOLDER — the sync-modal vertical is generated nightly from
// spec/sync-modal (the build wipes src/sections/ and rewrites it from spec).
// This stub only satisfies the host contract the shell imports
// (spec/sync-modal/contract.md § Substrate) so main compiles until the next
// generation run: the real factory derives the badge (display-threshold
// gating, the 99+ cap, staleness tones, the minutely tick) and the
// errored-run dim from the substrate store (src/api/syncStore.ts).
export const createSyncIndicator = (): {
  badge: () => NavBadge | undefined;
  dimmed: () => boolean;
} => ({
  badge: () => undefined,
  dimmed: () => false,
});

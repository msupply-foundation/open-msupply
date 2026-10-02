import type { LocaleKey } from '@/intl';

// The six functional statuses an asset can be in, and their names — the
// vocabulary the equipment register (status history, the status editor, the
// list filter) and the asset catalogue's log reasons (each filed under one
// status) share (kdd/domain-modules).

/**
 * The schema's AssetLogStatusNodeType. No shared generated enum exists (each
 * operation's type inlines the union), so it is spelled here, and each
 * vertical's generated union is checked against it in BOTH directions where
 * they meet (a status list typed as the generated union; a generated status
 * passed to statusLabelKey) — a status the server adds fails the build.
 */
export type AssetStatus =
  | 'DECOMMISSIONED'
  | 'FUNCTIONING'
  | 'FUNCTIONING_BUT_NEEDS_ATTENTION'
  | 'NOT_FUNCTIONING'
  | 'NOT_IN_USE'
  | 'UNSERVICEABLE';

/**
 * In the order every status picker offers them — the reference app's own
 * dropdown order, which is also the server's sort order for log reasons (it
 * orders by the enum's stored text).
 */
export const ASSET_STATUSES: readonly AssetStatus[] = [
  'DECOMMISSIONED',
  'FUNCTIONING',
  'FUNCTIONING_BUT_NEEDS_ATTENTION',
  'NOT_FUNCTIONING',
  'NOT_IN_USE',
  'UNSERVICEABLE',
] as const;

const STATUS_LABELS: Record<AssetStatus, LocaleKey> = {
  DECOMMISSIONED: 'status.decommissioned',
  FUNCTIONING: 'status.functioning',
  FUNCTIONING_BUT_NEEDS_ATTENTION: 'status.functioning-but-needs-attention',
  NOT_FUNCTIONING: 'status.not-functioning',
  NOT_IN_USE: 'status.not-in-use',
  UNSERVICEABLE: 'status.unserviceable',
};

export const statusLabelKey = (status: AssetStatus): LocaleKey =>
  STATUS_LABELS[status];

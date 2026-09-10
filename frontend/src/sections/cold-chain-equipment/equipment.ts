import type { LocaleKey } from '@/intl';
import type { AssetRowFragment } from './equipment.generated';

// Cold chain — Equipment (spec/cold-chain-equipment): the vertical's shared
// domain vocabulary — the class it is pinned to, the six functional statuses,
// and how each is labelled and toned. Framework-free so every mapping is
// unit-testable in node without a DOM.

export type AssetRow = AssetRowFragment;
// The status enum, non-null: `statusLog.status` is nullable on the wire
// (a historical row may carry none), but a status the app names is always one
// of the six.
export type AssetStatus = NonNullable<
  NonNullable<AssetRow['statusLog']>['status']
>;

/**
 * The cold-chain-equipment class. This register is pinned to it and MUST show
 * only assets of it — an asset of another class exists in the same store and is
 * invisible here (rules › what this register holds, OMS-REG-CCE-04.15).
 *
 * A migration constant, not a lookup: seeded by the reference-data migration
 * and hardcoded in the reference client too (contract › what this register
 * holds). There is no query that would resolve it by name.
 */
export const CCE_CLASS_ID = 'fad280b6-8384-41af-84cf-c7b6b4526ef0';

/**
 * The _Cold rooms and freezer rooms_ category — the same kind of migration
 * constant. Its members are the only assets that record a temperature mapping
 * (rules › temperature mapping, OMS-REG-CCE-06.31/.32).
 */
export const COLD_ROOM_CATEGORY_ID = '7db32eb6-5929-4dd1-a5e9-01e36baa73ad';

/** Whether this asset records temperature mappings (OMS-REG-CCE-06.31/.32). */
export const isColdRoom = (categoryId: string | null | undefined): boolean =>
  categoryId === COLD_ROOM_CATEGORY_ID;

/**
 * The six functional statuses, in the order the status pickers offer them —
 * the order the reference app's own dropdown uses (ui-surface S5).
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

/**
 * Each status's tone. Six statuses, three meanings: working, working-but-watch,
 * and out of service. The tone never carries the meaning alone — every surface
 * that shows a status shows its NAME beside the tone (ui-surface § cross-
 * cutting, ui-standards/accessibility).
 */
export type StatusTone = 'success' | 'warning' | 'error' | 'neutral';

const STATUS_TONES: Record<AssetStatus, StatusTone> = {
  FUNCTIONING: 'success',
  FUNCTIONING_BUT_NEEDS_ATTENTION: 'warning',
  NOT_FUNCTIONING: 'error',
  UNSERVICEABLE: 'error',
  NOT_IN_USE: 'neutral',
  DECOMMISSIONED: 'neutral',
};

export const statusTone = (status: AssetStatus): StatusTone =>
  STATUS_TONES[status];

/**
 * The theme token each tone wears on a status chip. Always a `var(--*)` token —
 * colour literals live only in the theme (StatusChip's contract, and the
 * repo's theme-token guard).
 *
 * The existing `--status-*` tokens name the invoice lifecycle, which these six
 * are not; the semantic four are the right vocabulary for "working / watch /
 * broken / out of service" and need no new token.
 */
const TONE_COLOURS: Record<StatusTone, string> = {
  success: 'var(--success-main)',
  warning: 'var(--warning-main)',
  error: 'var(--error-main)',
  neutral: 'var(--gray-main)',
};

export const statusColour = (status: AssetStatus): string =>
  TONE_COLOURS[statusTone(status)];

/**
 * The dash a value carries where blank would read as a failed load. Used on the
 * detail screen's read-only rows; the list's own absent cells are blank
 * (ui-standards/tables § absent values).
 */
export const ABSENT = '—';

/**
 * Whether an asset is a NON-catalogue asset — one with no catalogue item, so no
 * manufacturer, no model, and a specification wholly its own (rules › where an
 * asset comes from, OMS-REG-CCE-04.7).
 */
export const isNonCatalogue = (row: {
  catalogueItemId?: string | null;
}): boolean => !row.catalogueItemId;

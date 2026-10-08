import { localisedDateTime, t } from '@/intl';
import type { Column } from '@/ui/elements/table/DataTable';
import { getCellDefinition } from '@/ui/elements/table/tableHelpers';
import type { SiteSortKey } from './listState';
import type { SiteRow } from './siteEdit';

// The register's column set (spec/sites/ui-surface.md S1 § columns). A plain data
// array — the sanctioned exception to explicit composition (the DataTable's
// columns are config) — which is also what makes the spec's column contract
// directly testable: seven columns in this order, and only two of them sortable.
//
// Each column is still spelled out in full here rather than generated from a
// key list, so a reader sees its identity, header and cell treatment in one
// place.

/**
 * The two timestamp columns are server-local wall clock (`NaiveDateTime`, no
 * offset — contract.md § sync pairing state) and each shows date AND time in ONE
 * column, which is the spec's own column set. Absent renders blank, per
 * tables § absent values — never a placeholder.
 *
 * ⚠️ There is no date-and-time cell PRESET in the shared table helpers: the house
 * shape for a log/ledger table is a Date column beside a Time column, and
 * splitting these two would make nine columns with labels the spec doesn't name.
 * So the `datetime` preset supplies the width and only the renderer is
 * overridden (which is how getCellDefinition documents an override), using the
 * shared intl formatter — never a hand-rolled format. A `dateTime` preset is a
 * candidate registry addition; see BUILD_REPORT.
 */
export const dateTimeText = (value: string | null): string =>
  value ? localisedDateTime(value) : '';

/**
 * OMS-FUN-SYC-002.6 — Code, Name, Hardware ID, Sync Version, Version, Last
 * Connection, Last Sync.
 *
 * OMS-FUN-SYC-002.8 — only Code and Name carry a `sortKey`, because they are the
 * only two the server has a usable key for. The third declared key, `id`, errors
 * when used (COLLATE NOCASE against an integer column — contract.md ⚠️ wire trap)
 * and there is no id column to hang it on anyway: the site's id is displayed
 * nowhere (OMS-FUN-SYC-002.23).
 *
 * A function, not a const: the headers come from t(), which must be read in a
 * reactive scope so they re-translate on a language switch.
 */
export const siteColumns = (): Column<SiteRow, SiteSortKey>[] => [
  {
    c: { key: 'code' },
    sortKey: 'code',
    header: () => t('label.code'),
    ...getCellDefinition<SiteRow>('code', {
      headerPosition: 'primary',
      showLabel: true,
    }),
  },
  {
    c: { key: 'name' },
    sortKey: 'name',
    header: () => t('label.name'),
    ...getCellDefinition<SiteRow>('name'),
  },
  {
    c: { key: 'hardwareId' },
    // Blank until the site has paired to a device.
    header: () => t('label.hardware-id'),
    ...getCellDefinition<SiteRow>('code', { mono: true }),
    // A device fingerprint is a long identifier — wider than the code preset's
    // cap, and not draggable past it without this.
    size: 220,
    maxSize: undefined,
  },
  {
    c: { key: 'syncVersion' },
    // The RAW marker (V5V6 / V7), not a translated phrase.
    header: () => t('label.sync-version'),
    ...getCellDefinition<SiteRow>('reference'),
  },
  {
    c: { key: 'appVersion' },
    // The site's reported application version — blank until it has synced on the
    // current flow.
    header: () => t('label.version'),
    ...getCellDefinition<SiteRow>('reference'),
  },
  {
    c: { key: 'lastConnectionDatetime' },
    header: () => t('label.last-connection'),
    ...getCellDefinition<SiteRow>('datetime'),
    cell: info => dateTimeText(info.getValue<string | null>()),
  },
  {
    c: { key: 'lastSyncDatetime' },
    header: () => t('label.last-sync'),
    ...getCellDefinition<SiteRow>('datetime'),
    cell: info => dateTimeText(info.getValue<string | null>()),
  },
];

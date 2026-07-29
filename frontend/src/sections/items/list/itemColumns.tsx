import { t } from '../../../intl';
import { type Column } from '../../../ui/elements/table/DataTable';
import type { CardGroup } from '../../../ui/elements/table/columnTypes';
import {
  getCellDefinition,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import type { ItemsResult } from './items.generated';
import { monthsOfStockCell, unitsWithDoses, type StatCell } from './itemStats';

export type ItemRow = ItemsResult['items']['nodes'][number];

// Render a truncating statistics cell: the text, with the full-precision
// reading as the cell's hover title when digits were dropped (ui-surface S1 §
// numeric cells). A bare string when there is nothing to reveal, so the cell
// carries no empty title attribute.
const statCell = (cell: StatCell) =>
  cell.title === undefined ? (
    cell.text
  ) : (
    <span title={cell.title}>{cell.text}</span>
  );

// Only Code and Name are sortable — the sort surface matches the wire's sort
// keys (spec/items S1 › Columns). Clicking any other header does nothing.
export type SortKey = 'name' | 'code';

// Card body groups (spec/items S1 › card view). ONE column list renders as both
// the table and the card, each column declaring its card slot
// (docs/CARD_TABLE_MODEL.md). The card is: Name · Code in the header with stock
// on hand as a labelled badge; Unit · AMC · Months of stock then Master lists
// always shown; the custom fields collapsed below.
//
// `masterLists` is a group only to place Master lists LAST in the body. Card
// body order follows COLUMN order, and Master lists is table column 3 — but a
// chip list belongs after the three short statistics, not splitting the card's
// first line. A group with no labelKey, no icon and no disclosure renders as a
// bare field flow after the default group (CardView's GroupCaption emits
// nothing without a caption), at the same row gap — so it reads as one
// continuous field block, and its lone chip list gets the card's full width
// (auto-fit collapses the empty tracks). Cheaper than a second column def.
export type GroupKey = 'masterLists' | 'customFields';

export const CARD_GROUPS: CardGroup<ItemRow, GroupKey>[] = [
  { key: 'masterLists' }, // no caption, no panel, no disclosure — placement only
  {
    key: 'customFields',
    labelKey: 'label.custom-fields',
    disclosure: 'closed',
  },
];

// The fixed item columns (spec/items S1). Default sort name ascending; only
// Code + Name sortable. Master lists is a chip-list cell; MOS is blank (dash)
// at zero AMC (OMS-REG-CAT-04.34); stock-on-hand + AMC append the doses
// equivalent on vaccine rows under the preference (.35).
// Widths (rem) for the three statistics columns: each renders a bespoke cell
// (units + doses suffix, or the blank-at-zero-AMC dash), and an explicit cell
// carries no width of its own (docs/CELL_TYPES.md § Width model). All three are
// sized to their HEADER, which is wider than the figure — "Stock on hand",
// "AMC", "Months of stock" — with the doses suffix "(120 ds)" also in mind.
const STAT_WIDTH_REM = 8;
const AMC_WIDTH_REM = 6;

export const fixedColumns = (
  showDoses: () => boolean
): Column<ItemRow, SortKey, GroupKey>[] => [
  {
    // Code — TABLE face (spec column 1): sortable, hidden on the card. The card
    // header wants Name-then-Code while the table keeps the spec'd Code-first
    // order, and column visibility is one shared axis (issue #551) — so Code is
    // the one column with two faces (docs/CARD_TABLE_MODEL.md § one value, two
    // faces). Every other column is a single def serving both views.
    c: { key: 'code' },
    sortKey: 'code',
    header: () => t('label.code'),
    ...getCellDefinition('code', { hideOnCard: true }),
  },
  {
    // Name — the card title (first primary) as well as a table column.
    c: { key: 'name' },
    sortKey: 'name',
    header: () => t('label.name'),
    // The text preset makes Name the flex sink; wrapLines rides over its meta.
    ...getCellDefinition('name', {
      headerPosition: 'primary',
      wrapLines: 2,
    }),
  },
  {
    // Code — CARD face: the second primary, right after Name. Card-only, and
    // out of the Columns popover so the split never shows up as a duplicate
    // "Code" entry (the table face is the one the user hides).
    c: { accessor: row => row.code, id: 'codeCard' },
    header: () => t('label.code'),
    ...getCellDefinition('code', {
      headerPosition: 'primary',
      hideOnTable: true,
      hideFromColumnSettings: true,
    }),
  },
  {
    c: {
      accessor: row => row.masterLists?.map(m => m.name) ?? [],
      id: 'masterLists',
    },
    header: () => t('label.master-lists'),
    enableSorting: false,
    // Card: always shown, but LAST in the body — see CARD_GROUPS.
    cardGroup: 'masterLists',
    // The keyed preset = the same chip-list renderer, plus its width.
    ...getCellDefinition('masterLists'),
  },
  {
    c: { accessor: row => row.unitName ?? '', id: 'unit' },
    header: () => t('label.unit'),
    enableSorting: false,
    // 'unit' (not 'unitName' — a 2rem preset for a different context): the
    // same key/width the stock list's identical Unit column uses.
    // Card: no cardGroup ⇒ the always-shown default group.
    ...getCellDefinition('unit'),
  },
  {
    c: { accessor: row => row.stats.stockOnHand, id: 'stockOnHand' },
    header: () => t('label.stock-on-hand'),
    enableSorting: false,
    // getNumberCell for the right-align + tabular figures; the cell is then
    // overridden because the doses suffix is items-specific (ui-surface S1).
    // Card: the header badge, KEEPING its label — a bare figure inline-end of a
    // card header would read as an id or a quantity of anything.
    ...getNumberCell({ headerPosition: 'badge', showLabel: true }),
    size: remToPx(STAT_WIDTH_REM),
    cell: info =>
      statCell(
        unitsWithDoses(info.getValue<number>(), info.row.original, showDoses())
      ),
  },
  {
    // AMC and Months of stock (below) join Unit in the card's always-shown
    // default group — no cardGroup, no headerPosition.
    c: { accessor: row => row.stats.averageMonthlyConsumption, id: 'amc' },
    header: () => t('label.amc'),
    enableSorting: false,
    ...getNumberCell(),
    size: remToPx(AMC_WIDTH_REM),
    cell: info =>
      statCell(
        unitsWithDoses(info.getValue<number>(), info.row.original, showDoses())
      ),
  },
  {
    c: {
      accessor: row => row.stats.monthsOfStockOnHand,
      id: 'monthsOfStock',
    },
    header: () => t('label.months-of-stock'),
    enableSorting: false,
    ...getNumberCell(),
    size: remToPx(STAT_WIDTH_REM),
    cell: info => statCell(monthsOfStockCell(info.getValue<number | null>())),
  },
];

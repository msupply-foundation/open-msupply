import { t } from '../../../intl';
import { type Column } from '../../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import type { ItemsResult } from './items.generated';
import {
  formatMonthsOfStock,
  unitsWithDoses,
  type StatCell,
} from './itemStats';

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
): Column<ItemRow, SortKey>[] => [
  {
    c: { key: 'code' },
    sortKey: 'code',
    header: () => t('label.code'),
    ...getCellDefinition('code'),
  },
  {
    c: { key: 'name' },
    sortKey: 'name',
    header: () => t('label.name'),
    // The text preset makes Name the flex sink; wrapLines rides over its meta.
    ...getCellDefinition('name', { wrapLines: 2 }),
  },
  {
    c: {
      accessor: row => row.masterLists?.map(m => m.name) ?? [],
      id: 'masterLists',
    },
    header: () => t('label.master-lists'),
    enableSorting: false,
    // The keyed preset = the same chip-list renderer, plus its width.
    ...getCellDefinition('masterLists'),
  },
  {
    c: { accessor: row => row.unitName ?? '', id: 'unit' },
    header: () => t('label.unit'),
    enableSorting: false,
    // 'unit' (not 'unitName' — a 2rem preset for a different context): the
    // same key/width the stock list's identical Unit column uses.
    ...getCellDefinition('unit'),
  },
  {
    c: { accessor: row => row.stats.stockOnHand, id: 'stockOnHand' },
    header: () => t('label.stock-on-hand'),
    enableSorting: false,
    // getNumberCell for the right-align + tabular figures; the cell is then
    // overridden because the doses suffix is items-specific (ui-surface S1).
    ...getNumberCell(),
    size: remToPx(STAT_WIDTH_REM),
    cell: info =>
      statCell(
        unitsWithDoses(info.getValue<number>(), info.row.original, showDoses())
      ),
  },
  {
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
    cell: info => formatMonthsOfStock(info.getValue<number | null>()),
  },
];

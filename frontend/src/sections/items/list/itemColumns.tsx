import { t } from '../../../intl';
import { type Column } from '../../../ui/elements/table/DataTable';
import { getChipListCell } from '../../../ui/elements/table/ChipListCell';
import type { ItemsResult } from './items.generated';
import { formatMonthsOfStock, formatUnits, dosesEquivalent } from './itemStats';

export type ItemRow = ItemsResult['items']['nodes'][number];

// Only Code and Name are sortable — the sort surface matches the wire's sort
// keys (spec/items S1 › Columns). Clicking any other header does nothing.
export type SortKey = 'name' | 'code';

// A vaccine unit figure, with the doses equivalent appended (suffix "ds") when
// the manage-vaccines-in-doses preference is on (spec/items S1, AC-S3).
const unitsWithDoses = (
  units: number,
  row: ItemRow,
  showDoses: boolean
): string => {
  const base = formatUnits(units);
  if (!showDoses || !row.isVaccine) return base;
  return `${base} (${formatUnits(dosesEquivalent(units, row.doses))} ${t('label.doses-short')})`;
};

// The fixed item columns (spec/items S1). Default sort name ascending; only
// Code + Name sortable. Master lists is a chip-list cell; MOS is blank (dash)
// at zero AMC (AC-S2); stock-on-hand + AMC append the doses equivalent on
// vaccine rows under the preference (AC-S3).
export const fixedColumns = (
  showDoses: () => boolean
): Column<ItemRow, SortKey>[] => [
  { c: { key: 'code' }, sortKey: 'code', header: t('label.code') },
  {
    c: { key: 'name' },
    sortKey: 'name',
    header: t('label.name'),
    meta: { wrapLines: 2 },
  },
  {
    c: {
      accessor: row => row.masterLists?.map(m => m.name) ?? [],
      id: 'masterLists',
    },
    header: t('label.master-lists'),
    enableSorting: false,
    ...getChipListCell(),
  },
  {
    c: { accessor: row => row.unitName ?? '', id: 'unit' },
    header: t('label.unit'),
    enableSorting: false,
  },
  {
    c: { accessor: row => row.stats.stockOnHand, id: 'stockOnHand' },
    header: t('label.stock-on-hand'),
    enableSorting: false,
    meta: { align: 'right' },
    cell: info =>
      unitsWithDoses(info.getValue<number>(), info.row.original, showDoses()),
  },
  {
    c: { accessor: row => row.stats.averageMonthlyConsumption, id: 'amc' },
    header: t('label.amc'),
    enableSorting: false,
    meta: { align: 'right' },
    cell: info =>
      unitsWithDoses(info.getValue<number>(), info.row.original, showDoses()),
  },
  {
    c: {
      accessor: row => row.stats.monthsOfStockOnHand,
      id: 'monthsOfStock',
    },
    header: t('label.months-of-stock'),
    enableSorting: false,
    meta: { align: 'right' },
    cell: info => formatMonthsOfStock(info.getValue<number | null>()),
  },
];

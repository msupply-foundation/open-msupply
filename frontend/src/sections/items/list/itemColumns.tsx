import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { type Column } from '../../../ui/elements/table/DataTable';
import { getChipListCell } from '../../../ui/elements/table/ChipListCell';
import { getBooleanCell } from '../../../ui/elements/table/BooleanCell';
import type { ItemsResult } from './items.generated';
import type { ItemCustomFieldDefinitionsResult } from '../itemCustomFields.generated';
import { formatMonthsOfStock, formatUnits, dosesEquivalent } from './itemStats';

export type ItemRow = ItemsResult['items']['nodes'][number];
export type CustomFieldDef =
  ItemCustomFieldDefinitionsResult['customFields']['nodes'][number];

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

// Read one custom-field value out of the item's JSON blob (server already
// filtered to defined, non-hidden item-scope keys — AC-P1).
const readCustomField = (row: ItemRow, key: string): unknown =>
  (row.customFields as Record<string, unknown> | null | undefined)?.[key] ??
  undefined;

const optionName = (def: CustomFieldDef, value: unknown): string => {
  const match = def.options.find(o => o.id === value || o.key === value);
  return match?.name ?? (value == null ? '' : String(value));
};

// One column per (non-hidden) item-scope custom-field definition, labelled with
// its display NAME (data, not a locale key). Rendering follows the value type:
// option → the option name, boolean → a flag cell, date → localised, text /
// number → the raw value (spec/items S1 › Columns, AC-P2). Hidden definitions
// never reach the client, so callers pass only visible defs.
export const customFieldColumns = (
  defs: CustomFieldDef[]
): Column<ItemRow, SortKey>[] =>
  defs.map(def => {
    const base = {
      c: {
        accessor: (row: ItemRow) => readCustomField(row, def.key),
        id: `cf:${def.key}`,
      },
      header: def.name,
      enableSorting: false,
    };
    switch (def.valueType) {
      case 'BOOLEAN':
        return { ...base, ...getBooleanCell({ label: def.name }) };
      case 'OPTION':
        return { ...base, cell: info => optionName(def, info.getValue()) };
      case 'DATE':
        return {
          ...base,
          cell: info => {
            const v = info.getValue();
            return v ? localisedDate(v as string) : '';
          },
        };
      case 'INTEGER':
      case 'REAL':
        return {
          ...base,
          meta: { align: 'right' as const },
          cell: info => {
            const v = info.getValue();
            return typeof v === 'number'
              ? formatUnits(v, def.valueType === 'REAL' ? 2 : 0)
              : '';
          },
        };
      case 'TEXT':
      default:
        return {
          ...base,
          cell: info => {
            const v = info.getValue();
            return v == null ? '' : String(v);
          },
        };
    }
  });

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

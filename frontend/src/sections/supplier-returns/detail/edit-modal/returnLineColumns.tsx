import { t } from '../../../../intl';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { type Column } from '../../../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getNumberCell,
  getTextCell,
} from '../../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../../ui/utils/rem';
import { ReasonSelect } from '../../../../domain/reasonOptions';
import { clampQuantity, type DraftReturnLine } from './returnLineLogic';

// The two inline-editable grids of the return-items wizard
// (spec/supplier-returns/ui-surface.md S4): Select-quantity (step 1) and
// Select-reason (step 2). ONE definition backs both hosts — the per-item edit
// modal (ReturnItemsModal, on an existing return) and the from-shipment create
// modal (ReturnFromShipmentModal, over an inbound shipment) — so the columns
// can't drift between them.
//
// A supplier-return line is an EXISTING stock line: batch, expiry, pack size and
// the available figure are the stock line's own, shown read-only — only the
// returned quantity is editable (contrast customer returns' invented batches).

// Edit ONE field of ONE draft line (a fine-grained store write —
// kdd/state-management); each host owns the store, the column just calls back.
export type UpdateLine = <F extends keyof DraftReturnLine>(
  id: string,
  field: F,
  value: DraftReturnLine[F]
) => void;

// ---- Step 1: the quantity grid (ui-surface S4 § step 1) ----
export const quantityColumns = (
  update: UpdateLine
): Column<DraftReturnLine, never>[] => [
  {
    c: { key: 'itemCode' },
    header: () => t('label.code'),
    ...getCellDefinition('itemCode'),
  },
  {
    c: { key: 'itemName' },
    header: () => t('label.name'),
    ...getCellDefinition('itemName', {
      headerPosition: 'primary',
      wrapLines: 2,
    }),
  },
  {
    c: { key: 'batch' },
    header: () => t('label.batch'),
    ...getCellDefinition('batch'),
  },
  {
    c: { key: 'expiryDate' },
    header: () => t('label.expiry'),
    ...getCellDefinition('expiryDate'),
  },
  {
    c: { accessor: line => line.item.unitName ?? '', id: 'unitName' },
    header: () => t('label.unit'),
    // The `unit` preset — see the detail view's note (LIB-4): `unitName`'s 2rem
    // is narrower than the "Unit" header itself.
    ...getCellDefinition('unit'),
  },
  {
    // Pack size: fixed to the stock line (rules § line rules) — read-only.
    c: { key: 'packSize' },
    header: () => t('label.pack-size'),
    ...getCellDefinition('packSize'),
  },
  {
    // Quantity available for return: the stock line's available packs plus any
    // this return already holds (rules § line rules) — read-only. No CELL_DEF
    // key; the width carries its long header.
    c: { key: 'availableNumberOfPacks' },
    header: () => t('label.available-quantity-for-return'),
    ...getNumberCell(),
    size: remToPx(10),
  },
  {
    // On hold: flagged when the stock line or its location is on hold — shown,
    // never blocked from return (rules § line rules).
    c: {
      accessor: line => (line.onHold ? t('label.on-hold') : ''),
      id: 'onHold',
    },
    header: () => t('label.on-hold'),
    ...getTextCell(),
    size: remToPx(5),
  },
  {
    // Quantity to return: min 0; capped at the available figure — a UI-only cap
    // (rules § line rules).
    c: { key: 'numberOfPacksToReturn' },
    header: () => t('label.quantity-to-return'),
    ...getNumberCell(),
    size: remToPx(9),
    // NumberField (not a raw controlled input): it clamps to min/max and repairs
    // the DOM when a keystroke is rejected — the §13 pitfall a plain value=
    // binding would hit (kdd/solid-reactivity-pitfalls).
    cell: info => {
      const line = info.row.original;
      return (
        <NumberField
          label={t('label.quantity-to-return')}
          hideLabel
          size="small"
          min={0}
          max={line.availableNumberOfPacks}
          decimalLimit={2}
          value={line.numberOfPacksToReturn}
          onChange={value =>
            update(
              line.id,
              'numberOfPacksToReturn',
              clampQuantity(value ?? 0, line.availableNumberOfPacks)
            )
          }
        />
      );
    },
  },
];

// ---- Step 2: the reason grid — only lines with quantity (ui-surface S4 § step
// 2). Reason optional; options are the active RETURN reasons (rules § line
// rules). ----
export const reasonColumns = (
  update: UpdateLine
): Column<DraftReturnLine, never>[] => [
  {
    c: { key: 'itemCode' },
    header: () => t('label.code'),
    ...getCellDefinition('itemCode'),
  },
  {
    c: { key: 'itemName' },
    header: () => t('label.name'),
    ...getCellDefinition('itemName', {
      headerPosition: 'primary',
      wrapLines: 2,
    }),
  },
  {
    c: { key: 'batch' },
    header: () => t('label.batch'),
    ...getCellDefinition('batch'),
  },
  {
    c: { key: 'expiryDate' },
    header: () => t('label.expiry'),
    ...getCellDefinition('expiryDate'),
  },
  {
    c: { id: 'returnReasonInput' },
    header: () => t('label.reason'),
    // No CELL_DEF key — the width holds the reason picker.
    size: remToPx(10),
    cell: info => {
      const line = info.row.original;
      return (
        <ReasonSelect
          kind="return"
          label={t('label.reason')}
          hideLabel
          value={line.reasonId ?? undefined}
          onChange={reason => update(line.id, 'reasonId', reason?.id ?? null)}
        />
      );
    },
  },
  {
    c: { key: 'note' },
    header: () => t('label.comment'),
    ...getCellDefinition('note'),
    cell: info => {
      const line = info.row.original;
      return (
        <TextField
          label={t('label.comment')}
          hideLabel
          size="small"
          value={line.note ?? ''}
          onInput={e => update(line.id, 'note', e.currentTarget.value || null)}
        />
      );
    },
  },
];

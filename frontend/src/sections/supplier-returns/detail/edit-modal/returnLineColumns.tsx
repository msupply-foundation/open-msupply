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
import type {
  FocusTarget,
  KeyedFocusTargets,
} from '../../../../ui/utils/createFocusTarget';
import { ReasonSelect } from '../../../../domain/reasonOptions';
import { clampQuantity, type DraftReturnLine } from './returnLineLogic';

// The two inline-editable grids of the return-items wizard
// (spec/supplier-returns/ui-surface.md S4): Select-quantity (step 1) and
// Select-reason (step 2). ONE definition backs both hosts — the per-item edit
// modal (ReturnItemsModal, on an existing return) and the from-shipment create
// modal (ReturnFromShipmentModal, over an inbound shipment) — so the columns
// can't drift between them.
//
// A supplier-return line is an EXISTING stock line: batch, expiry, pack size
// and the available figure are the stock line's own, shown read-only — only the
// returned quantity is editable (contrast customer returns' invented batches).

// Edit ONE field of ONE draft line (a fine-grained store write —
// kdd/state-management); each host owns the store, the column just calls back.
export type UpdateLine = <F extends keyof DraftReturnLine>(
  id: string,
  field: F,
  value: DraftReturnLine[F]
) => void;

// One focus destination PER ROW, keyed by the row's own id — the same key the
// draft store is keyed on (ui/utils/createFocusTarget). The host arms a request;
// the grid binds it to the row's editable control, so "focus the row the user
// clicked" never reaches for a test id or a selector.
//
// Each grid's target is the control a user came to that step to change: the
// quantity field on step 1, the reason picker on step 2. Same rule the stocktake
// and inbound line editors follow.

// The keyed registry, adapted to the single-control shape a compound control
// (Combobox, and so ReasonSelect) takes: the row's key selects WHICH ref.
const targetFor = (targets: KeyedFocusTargets, key: string): FocusTarget => ({
  ref: targets.ref(key),
  focus: () => targets.focus(key),
  cancel: targets.cancel,
});

// Whose rows are these? The from-shipment host's drafts span SEVERAL items, so
// its grids must name each row's item; the per-item host's rows are all the one
// item the dialog title already names, so they don't — repeating it per row
// says nothing and costs the width the quantity field needs (issue #1002). The
// same rule every other per-item line editor follows (stocktake, inbound).
export type ItemIdentity = { showItem: boolean };

const itemColumns = ({
  showItem,
}: ItemIdentity): Column<DraftReturnLine, never>[] =>
  showItem
    ? [
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
      ]
    : [];

// ---- Step 1: the quantity grid (ui-surface S4 § step 1) ----
export const quantityColumns = (
  update: UpdateLine,
  quantityFields: KeyedFocusTargets,
  identity: ItemIdentity
): Column<DraftReturnLine, never>[] => [
  ...itemColumns(identity),
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
    // NumberField (not a raw controlled input): it clamps to min/max and
    // repairs the DOM when a keystroke is rejected — the §13 pitfall a plain
    // value= binding would hit (kdd/solid-reactivity-pitfalls).
    cell: info => {
      const line = info.row.original;
      return (
        <NumberField
          ref={quantityFields.ref(line.id)}
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
  update: UpdateLine,
  reasonFields: KeyedFocusTargets,
  identity: ItemIdentity
): Column<DraftReturnLine, never>[] => [
  ...itemColumns(identity),
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
          // The compact height every other control in this grid uses. Without
          // it the picker takes the default 40px against their 36px and stands
          // a step taller than the cells either side of it — the failure
          // ReasonSelect's own `size` prop doc names.
          size="small"
          focusTarget={targetFor(reasonFields, line.id)}
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

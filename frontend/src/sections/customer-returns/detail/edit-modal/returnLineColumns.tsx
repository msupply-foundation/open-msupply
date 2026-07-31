import { t } from '../../../../intl';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { DateField } from '../../../../ui/elements/inputs/DateField';
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
// (spec/customer-returns/ui-surface.md S4): Select-quantity (step 1) and
// Select-reason (step 2). ONE definition backs both hosts — the per-item edit
// modal (ReturnItemsModal, on an existing return) and the from-shipment create
// modal (ReturnFromShipmentModal, over an outbound shipment) — so the columns
// can't drift between them.

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

// Each column takes its cell-type width preset (docs/CELL_TYPES.md) — spread
// BEFORE any editable `cell` override, so the preset supplies the width and
// alignment while the override supplies the control (the documented order).
// ---- Step 1: the quantity grid (ui-surface S4 § step 1) ----
export const quantityColumns = (
  update: UpdateLine,
  quantityFields: KeyedFocusTargets
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
    cell: info => {
      const line = info.row.original;
      return (
        <TextField
          label={t('label.batch')}
          hideLabel
          size="small"
          value={line.batch ?? ''}
          onInput={e => update(line.id, 'batch', e.currentTarget.value || null)}
        />
      );
    },
  },
  {
    c: { key: 'expiryDate' },
    header: () => t('label.expiry'),
    ...getCellDefinition('expiryDate'),
    // DateField, never a native date input (ui-standards § inputs → dates &
    // times): typed or picked, app-formatted, over the same plain ISO
    // YYYY-MM-DD the draft holds.
    cell: info => {
      const line = info.row.original;
      return (
        <DateField
          label={t('label.expiry')}
          hideLabel
          size="small"
          value={line.expiryDate}
          onChange={value => update(line.id, 'expiryDate', value || null)}
        />
      );
    },
  },
  {
    // Packs issued: context from the originating shipment line — present on
    // from-shipment drafts only (contract § draft-line generation); blank on
    // per-item drafts. Read-only. No CELL_DEF key — the explicit helper plus a
    // call-site width, since "Pack quantity issued" is the binding constraint.
    c: { key: 'numberOfPacksIssued' },
    header: () => t('label.pack-quantity-issued'),
    ...getNumberCell(),
    size: remToPx(8),
  },
  {
    c: { key: 'packSize' },
    header: () => t('label.pack-size'),
    ...getCellDefinition('packSize'),
    // NumberField (not a raw controlled input): it clamps to min/max and
    // repairs the DOM when a keystroke is rejected — the §13 pitfall
    // (kdd/solid-reactivity-pitfalls) a plain value= binding would hit.
    cell: info => {
      const line = info.row.original;
      return (
        <NumberField
          label={t('label.pack-size')}
          hideLabel
          size="small"
          min={1}
          decimalLimit={2}
          value={line.packSize}
          onChange={value => update(line.id, 'packSize', value ?? 1)}
        />
      );
    },
  },
  {
    // Quantity returned: min 0; capped at packs issued where known — a
    // UI-only cap (rules § creation; OMS-REG-DIST-07.31).
    c: { key: 'numberOfPacksReturned' },
    header: () => t('label.quantity-returned'),
    ...getNumberCell(),
    // No CELL_DEF key; "Quantity returned" is the binding constraint.
    size: remToPx(8),
    cell: info => {
      const line = info.row.original;
      return (
        <NumberField
          ref={quantityFields.ref(line.id)}
          label={t('label.quantity-returned')}
          hideLabel
          size="small"
          min={0}
          max={line.numberOfPacksIssued ?? undefined}
          decimalLimit={2}
          value={line.numberOfPacksReturned}
          onChange={value =>
            update(
              line.id,
              'numberOfPacksReturned',
              clampQuantity(value ?? 0, line.numberOfPacksIssued)
            )
          }
        />
      );
    },
  },
  {
    c: { key: 'volumePerPack' },
    header: () => t('label.volume-per-pack'),
    ...getCellDefinition('volumePerPack'),
    cell: info => {
      const line = info.row.original;
      return (
        <NumberField
          label={t('label.volume-per-pack')}
          hideLabel
          size="small"
          min={0}
          decimalLimit={4}
          value={line.volumePerPack}
          onChange={value => update(line.id, 'volumePerPack', value ?? 0)}
        />
      );
    },
  },
];

// ---- Step 2: the reason grid — only lines with quantity (ui-surface S4 §
// step 2). Reason optional; options are the active RETURN reasons (rules §
// line rules, OMS-REG-DIST-07.30). ----
export const reasonColumns = (
  update: UpdateLine,
  reasonFields: KeyedFocusTargets
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
    // Expiry, read-only here (edited in the quantity step) — matches the
    // current app's reason-step table (ReturnReasonsTable: batch · expiry ·
    // reason · comment; no quantity column). The expiry preset carries the
    // near-expiry emphasis as well as the width.
    c: { key: 'expiryDate' },
    header: () => t('label.expiry'),
    ...getCellDefinition('expiryDate'),
  },
  {
    c: { id: 'returnReasonInput' },
    header: () => t('label.reason'),
    // No CELL_DEF key — a width wide enough for the reason picker.
    ...getTextCell(),
    size: remToPx(12),
    cell: info => {
      const line = info.row.original;
      return (
        <ReasonSelect
          kind="return"
          label={t('label.reason')}
          hideLabel
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

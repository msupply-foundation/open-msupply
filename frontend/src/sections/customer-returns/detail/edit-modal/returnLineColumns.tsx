import { t } from '../../../../intl';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { type Column } from '../../../../ui/elements/table/DataTable';
import {
  getDateCell,
  getNumberCell,
} from '../../../../ui/elements/table/tableHelpers';
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

// ---- Step 1: the quantity grid (ui-surface S4 § step 1) ----
export const quantityColumns = (
  update: UpdateLine
): Column<DraftReturnLine, never>[] => [
  {
    c: { key: 'itemCode' },
    header: () => t('label.code'),
  },
  {
    c: { key: 'itemName' },
    header: () => t('label.name'),
    meta: { headerPosition: 'primary', wrapLines: 2 },
  },
  {
    c: { key: 'batch' },
    header: () => t('label.batch'),
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
    cell: info => {
      const line = info.row.original;
      return (
        <TextField
          label={t('label.expiry')}
          hideLabel
          size="small"
          type="date"
          value={line.expiryDate ?? ''}
          onInput={e =>
            update(line.id, 'expiryDate', e.currentTarget.value || null)
          }
        />
      );
    },
  },
  {
    // Packs issued: context from the originating shipment line — present on
    // from-shipment drafts only (contract § draft-line generation); blank on
    // per-item drafts. Read-only.
    c: { key: 'numberOfPacksIssued' },
    header: () => t('label.pack-quantity-issued'),
    ...getNumberCell(),
  },
  {
    c: { key: 'packSize' },
    header: () => t('label.pack-size'),
    ...getNumberCell(),
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
    // UI-only cap (rules § creation; OMS-REG-DIST-07.23).
    c: { key: 'numberOfPacksReturned' },
    header: () => t('label.quantity-returned'),
    ...getNumberCell(),
    cell: info => {
      const line = info.row.original;
      return (
        <NumberField
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
    ...getNumberCell(),
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
// line rules, OMS-REG-DIST-07.22). ----
export const reasonColumns = (
  update: UpdateLine
): Column<DraftReturnLine, never>[] => [
  { c: { key: 'itemCode' }, header: () => t('label.code') },
  {
    c: { key: 'itemName' },
    header: () => t('label.name'),
    meta: { headerPosition: 'primary', wrapLines: 2 },
  },
  { c: { key: 'batch' }, header: () => t('label.batch') },
  {
    // Expiry, read-only here (edited in the quantity step) — matches the
    // current app's reason-step table (ReturnReasonsTable: batch · expiry ·
    // reason · comment; no quantity column).
    c: { key: 'expiryDate' },
    header: () => t('label.expiry'),
    ...getDateCell(),
  },
  {
    c: { id: 'returnReasonInput' },
    header: () => t('label.reason'),
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

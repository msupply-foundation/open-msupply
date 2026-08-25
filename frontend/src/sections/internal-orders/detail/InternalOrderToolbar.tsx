import { createSignal, type Component } from 'solid-js';
import { Show } from 'solid-js';
import { t, tPlural } from '../../../intl';
import { TextField } from '../../../ui/elements/inputs/TextField';
import {
  Select,
  type SelectOption,
} from '../../../ui/elements/selectors/Select';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { FormRowItem } from '../../../ui/layout/Form/FormRowItem';
import { NameSearch, type NameOption } from '../../../domain/name';
import { type DebouncedEdit } from '../../../domain/debouncedEdit';
import type { InternalOrderInfoFragment } from './internalOrderDetail.generated';

// The detail header's field cluster (spec/internal-orders S3 § toolbar),
// rendered as the children of the page's <HeaderToolbar>: each field carries
// its own label above a small control, and the cluster's FormRow shares the
// row per each field's FormRowItem weight — the name lookups take the larger
// shares and the MOS selects cap at what a "N months" value needs
// (ui/docs/PAGES.md § header field cluster). The item filter and the
// hide-stock-over-minimum narrowing live in the line table's own toolbar
// (ui-standards § tables → filtering), not here. The read-only info notices
// are the VIEW's (they render beneath the cluster, pending the header-notice
// treatment decision).

// The buffered as-you-type header fields — reference + comment share one
// buffer; this toolbar reads theirReference, the side panel reads comment.
export type HeaderEditFields = { theirReference: string; comment: string };

export interface InternalOrderToolbarProps {
  storeId: string;
  node: InternalOrderInfoFragment;
  /** The standing editability gate (Draft + supplier store enabled). */
  editable: boolean;
  /** A program order locks supplier + MOS thresholds even while Draft. */
  isProgram: boolean;
  /** The destination-customer field's store-preference gate (AC-H5). */
  showDestination: boolean;
  /** The shared header edit buffer; reads/writes theirReference. */
  edit: DebouncedEdit<HeaderEditFields>;
  /** A supplier change (replace-only); typed rejections come back inline. */
  onChangeSupplier: (supplierId: string) => void;
  supplierError?: string;
  /** A destination-customer change (clearable → null clears). */
  onChangeDestination: (customerId: string | null) => void;
  /** MOS threshold / target changes (each already confirmed here). */
  onChangeThreshold: (months: number) => void;
  onChangeTarget: (months: number) => void;
}

// The MOS selects offer 1…6 months (label.number-months); the threshold also
// offers "Not set" (stored as 0). Built at render so labels re-translate on a
// language switch.
const MONTH_VALUES = [1, 2, 3, 4, 5, 6];

// A pending MOS change awaiting its confirmation (each change recalculates
// every line's suggestion, so it passes a confirm — AC-H2).
type PendingMos = { field: 'min' | 'max'; months: number; message: string };

export const InternalOrderToolbar: Component<
  InternalOrderToolbarProps
> = props => {
  const [pendingMos, setPendingMos] = createSignal<PendingMos>();

  // Supplier + MOS are locked on a program order even while Draft (AC-H3), and
  // on any non-editable order.
  const fieldsLocked = () => !props.editable || props.isProgram;

  const supplierSeed = (): NameOption => ({
    id: props.node.otherPartyId,
    name: props.node.otherPartyName,
    code: '',
    isSupplier: true,
    isDonor: false,
    isOnHold: false,
    isStore: false,
  });
  const destinationSeed = (): NameOption | undefined => {
    const dc = props.node.destinationCustomer;
    return dc
      ? {
          id: dc.id,
          name: dc.name,
          code: '',
          isSupplier: false,
          isDonor: false,
          isOnHold: false,
          isStore: true,
        }
      : undefined;
  };

  // The MOS selects apply only after a confirmation, but a Kobalte Select must
  // stay controlled by a value that MATCHES the user's pick — otherwise it
  // re-fires onChange trying to reconcile, reopening the confirm forever. So we
  // hold the picked value locally (the "display" override): the pick sets it
  // immediately (Select stays consistent → no reopen loop), cancel clears it
  // (reverts to the stored value), and a confirmed value equals the stored one
  // once the save lands. Undefined → fall back to the stored node value.
  const [minOverride, setMinOverride] = createSignal<string>();
  const [maxOverride, setMaxOverride] = createSignal<string>();

  const thresholdValue = () =>
    minOverride() ??
    (props.node.minMonthsOfStock > 0
      ? String(props.node.minMonthsOfStock)
      : '');
  const targetValue = () =>
    maxOverride() ??
    (props.node.maxMonthsOfStock > 0
      ? String(props.node.maxMonthsOfStock)
      : '');

  // Threshold ≤ target, enforced in the UI (the server accepts any values): a
  // threshold above the target, or a target below the threshold, can't be
  // chosen.
  const thresholdOptions = (): SelectOption[] => [
    { value: '', label: t('label.not-set') },
    ...MONTH_VALUES.map(n => ({
      value: String(n),
      label: tPlural('label.number-months', n),
      disabled:
        props.node.maxMonthsOfStock > 0 && n > props.node.maxMonthsOfStock,
    })),
  ];
  const targetOptions = (): SelectOption[] =>
    MONTH_VALUES.map(n => ({
      value: String(n),
      label: tPlural('label.number-months', n),
      disabled:
        props.node.minMonthsOfStock > 0 && n < props.node.minMonthsOfStock,
    }));

  const onThresholdChange = (value: string) => {
    if (value === thresholdValue()) return; // no-op / reconcile re-fire
    const months = value === '' ? 0 : Number(value);
    setMinOverride(value);
    setPendingMos({
      field: 'min',
      months,
      // Clearing to "Not set" has its own copy (AC-H2).
      message:
        months === 0
          ? t('messages.unassign-min-mos')
          : t('messages.changing-min-mos'),
    });
  };
  const onTargetChange = (value: string) => {
    if (value === targetValue()) return; // no-op / reconcile re-fire
    setMaxOverride(value);
    setPendingMos({
      field: 'max',
      months: Number(value),
      message: t('messages.changing-max-mos'),
    });
  };
  // Every dialog close path (Cancel, scrim, Escape, AND the OK button, which
  // fires onClose right after onConfirm). confirmMos clears `pendingMos` before
  // that onClose runs, so a still-set pending here means the user CANCELLED —
  // revert the display overrides to the stored values. After a confirm, pending
  // is already null, so the picked override is kept until the save lands.
  const onDialogClose = () => {
    if (pendingMos() == null) return; // was a confirm — keep the override
    setPendingMos(undefined);
    setMinOverride(undefined);
    setMaxOverride(undefined);
  };
  const confirmMos = () => {
    const pending = pendingMos();
    if (!pending) return;
    if (pending.field === 'min') props.onChangeThreshold(pending.months);
    else props.onChangeTarget(pending.months);
    setPendingMos(undefined);
  };

  // Cluster weights: the whole cluster is weighted (never just one field —
  // FormRowItem's rule), floors summing to no more than the unweighted row's
  // (fields × 10rem) so the wrap point doesn't move earlier.
  //
  // A floor is also the width the field's LABEL gets, and a label that doesn't
  // fit wraps to a second line — which pushes that one control half a row
  // below its neighbours', since the row top-aligns its items (it must: an
  // error has to extend its own field downward and leave the rest of the row
  // where it was). "Reorder threshold MOS" needs ~9rem, so the MOS selects
  // sat at their old 8.5rem floor with a two-line label and a dropped control
  // on any narrow viewport. They keep the row's own 10rem floor instead —
  // still the full unweighted budget, and their 12rem cap still hands the
  // surplus to the lookups. Check a header label against its slot's floor
  // whenever you pin one narrow.
  return (
    <>
      <FormRowItem weight={1.5}>
        {/* Internal (store-backed) suppliers only, matching the create
            picker — a supplier change is re-validated by the same checks
            that govern creation (rules › header fields). */}
        <NameSearch
          storeId={props.storeId}
          role="supplier"
          label={t('label.supplier-name')}
          size="small"
          storeBacked
          selected={supplierSeed()}
          disabled={fieldsLocked()}
          error={props.supplierError}
          clearable={false}
          onSelect={supplier => {
            if (supplier) props.onChangeSupplier(supplier.id);
          }}
        />
      </FormRowItem>
      <FormRowItem weight={1}>
        <TextField
          label={t('label.supplier-reference')}
          size="small"
          data-testid="supplier-reference-field"
          value={props.edit.state.theirReference}
          disabled={!props.editable}
          onInput={e =>
            props.edit.setField('theirReference', e.currentTarget.value)
          }
          onBlur={() => props.edit.flush()}
        />
      </FormRowItem>
      <Show when={props.showDestination}>
        <FormRowItem weight={1.5}>
          {/* Store-backed customers only, the chosen supplier excluded
              (spec S3 § toolbar). The picker's filtering is load-bearing:
              a lone destination update is NOT re-validated server-side
              (D42), so this is the only guard on the stored value. */}
          <NameSearch
            storeId={props.storeId}
            role="customer"
            label={t('label.destination-customer')}
            size="small"
            inputTestId="customer-search-input"
            storeBacked
            excludeId={props.node.otherPartyId}
            selected={destinationSeed()}
            disabled={!props.editable}
            onSelect={customer =>
              props.onChangeDestination(customer?.id ?? null)
            }
          />
        </FormRowItem>
      </Show>
      <FormRowItem weight={0.7} maxWidth="12rem">
        <Select
          label={t('label.min-months-of-stock')}
          size="small"
          testId="min-months-of-stock-select"
          options={thresholdOptions()}
          value={thresholdValue()}
          disabled={fieldsLocked()}
          onValueChange={onThresholdChange}
        />
      </FormRowItem>
      <FormRowItem weight={0.7} maxWidth="12rem">
        <Select
          label={t('label.max-months-of-stock')}
          size="small"
          testId="max-months-of-stock-select"
          options={targetOptions()}
          value={targetValue()}
          disabled={fieldsLocked()}
          onValueChange={onTargetChange}
        />
      </FormRowItem>
      {/* MOS-change confirmation (recalculates suggestions — AC-H2). A closed
          <dialog> renders nothing, so it costs the cluster's row no slot. */}
      <ConfirmDialog
        open={pendingMos() != null}
        onClose={onDialogClose}
        title={t('heading.are-you-sure')}
        message={pendingMos()?.message ?? ''}
        onConfirm={confirmMos}
      />
    </>
  );
};

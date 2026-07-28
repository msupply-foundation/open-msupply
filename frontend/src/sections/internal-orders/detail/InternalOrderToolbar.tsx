import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '../../../intl';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { ToggleSwitch } from '../../../ui/elements/inputs/ToggleSwitch';
import { Select, type SelectOption } from '../../../ui/elements/selectors/Select';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { FormColumns } from '../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../ui/layout/Form/FormColumn';
import { FormRow } from '../../../ui/layout/Form/FormRow';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { NameSearch, type NameOption } from '../../../domain/name';
import { type DebouncedEdit } from '../../../domain/debouncedEdit';
import type { InternalOrderInfoFragment } from './internalOrderDetail.generated';
import styles from './InternalOrderToolbar.module.css';

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
  /**
   * Hide-stock-over-minimum switch — a client-side line filter (see the
   * detail view's interim note on the missing server-paginated line query).
   */
  hideOverMin: boolean;
  onHideOverMinChange: (value: boolean) => void;
  /** Item filter — a client-side line filter, same interim as hideOverMin. */
  itemFilter: string;
  onItemFilterChange: (value: string) => void;
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
      disabled: props.node.maxMonthsOfStock > 0 && n > props.node.maxMonthsOfStock,
    })),
  ];
  const targetOptions = (): SelectOption[] =>
    MONTH_VALUES.map(n => ({
      value: String(n),
      label: tPlural('label.number-months', n),
      disabled: props.node.minMonthsOfStock > 0 && n < props.node.minMonthsOfStock,
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

  return (
    <div class={styles.layout}>
      {/* Two equal columns (FormColumns/FormColumn own the even share + the
          intrinsic wrap to a single stack on narrow). Each column stacks its
          FieldRows tightly (Stack), so labels line up down each column and the
          controls align across both. */}
      <FormColumns>
        {/* Left column — supplier, reference, (gated) destination customer. */}
        <FormColumn>
          <Stack gap="sm">
            <FieldRow label={t('label.supplier-name')}>
              {/* Internal (store-backed) suppliers only, matching the create
                  picker — a supplier change is re-validated by the same checks
                  that govern creation (rules › header fields). */}
              <NameSearch
                storeId={props.storeId}
                role="supplier"
                label={t('label.supplier-name')}
                hideLabel
                storeBacked
                selected={supplierSeed()}
                disabled={fieldsLocked()}
                error={props.supplierError}
                clearable={false}
                onSelect={supplier => {
                  if (supplier) props.onChangeSupplier(supplier.id);
                }}
              />
            </FieldRow>
            <FieldRow label={t('label.supplier-reference')}>
              <TextField
                label={t('label.supplier-reference')}
                hideLabel
                width="full"
                data-testid="supplier-reference-field"
                value={props.edit.state.theirReference}
                disabled={!props.editable}
                onInput={e =>
                  props.edit.setField('theirReference', e.currentTarget.value)
                }
                onBlur={() => props.edit.flush()}
              />
            </FieldRow>
            <Show when={props.showDestination}>
              <FieldRow label={t('label.destination-customer')}>
                {/* Store-backed customers only, the chosen supplier excluded
                    (spec S3 § toolbar). The picker's filtering is load-bearing:
                    a lone destination update is NOT re-validated server-side
                    (D42), so this is the only guard on the stored value. */}
                <NameSearch
                  storeId={props.storeId}
                  role="customer"
                  label={t('label.destination-customer')}
                  hideLabel
                  storeBacked
                  excludeId={props.node.otherPartyId}
                  selected={destinationSeed()}
                  disabled={!props.editable}
                  onSelect={customer =>
                    props.onChangeDestination(customer?.id ?? null)
                  }
                />
              </FieldRow>
            </Show>
          </Stack>
        </FormColumn>

        {/* Right column — MOS thresholds, then the hide-over-min switch + item
            filter on their own row. */}
        <FormColumn>
          <Stack gap="sm">
            <FieldRow label={t('label.min-months-of-stock')}>
              <Select
                label={t('label.min-months-of-stock')}
                hideLabel
                width="full"
                options={thresholdOptions()}
                value={thresholdValue()}
                disabled={fieldsLocked()}
                onValueChange={onThresholdChange}
              />
            </FieldRow>
            <FieldRow label={t('label.max-months-of-stock')}>
              <Select
                label={t('label.max-months-of-stock')}
                hideLabel
                width="full"
                options={targetOptions()}
                value={targetValue()}
                disabled={fieldsLocked()}
                onValueChange={onTargetChange}
              />
            </FieldRow>
            <FormRow>
              <ToggleSwitch
                label={t('label.hide-stock-over-minimum')}
                checked={props.hideOverMin}
                onChange={props.onHideOverMinChange}
                testId="hide-over-minimum-switch"
              />
              <TextField
                label={t('placeholder.filter-items')}
                hideLabel
                width="full"
                placeholder={t('placeholder.filter-items')}
                data-testid="filter-items-field"
                value={props.itemFilter}
                onInput={e => props.onItemFilterChange(e.currentTarget.value)}
              />
            </FormRow>
          </Stack>
        </FormColumn>
      </FormColumns>

      {/* Full-width notices beneath both columns (helper text never sits inside
          a column). */}
      <Stack gap="sm">
        <Show when={props.node.otherParty.store?.isDisabled}>
          <Alert severity="info">
            {t('info.cannot-edit-disabled-store')}
          </Alert>
        </Show>
        <Show when={props.isProgram}>
          <Alert severity="info">
            {t('info.cannot-edit-program-requisition')}
          </Alert>
        </Show>
      </Stack>

      {/* MOS-change confirmation (recalculates suggestions — AC-H2). */}
      <ConfirmDialog
        open={pendingMos() != null}
        onClose={onDialogClose}
        title={t('heading.are-you-sure')}
        message={pendingMos()?.message ?? ''}
        onConfirm={confirmMos}
      />
    </div>
  );
};

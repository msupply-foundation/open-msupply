import { generateUUID } from '../../uuid';
import { createResource, createSignal, Show, type JSX } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { graphqlFetch } from '../../api/graphql';
import { gated } from '../../api/gated';
import { t } from '../../intl';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Button } from '../../ui/elements/buttons/Button';
import {
  CancelButton,
  DialogSaveButton,
} from '../../ui/elements/buttons/StandardButtons';
import { IconButton } from '../../ui/elements/buttons/IconButton';
import { TextField } from '../../ui/elements/inputs/TextField';
import { CurrencyField } from '../../ui/elements/inputs/CurrencyField';
import { NumberField } from '../../ui/elements/inputs/NumberField';
import { Select } from '../../ui/elements/selectors/Select';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { DataTable, type Column } from '../../ui/elements/table/DataTable';
import { formatCurrencyCell } from '../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../api/createTableConfig';
import { PlusCircleIcon, TrashIcon } from '../../ui/icons';
import styles from './ServiceChargesModal.module.css';
import { ServiceItems } from './invoiceModals.generated';
import {
  chargeTotalAfterTax,
  splitServiceChargeBatch,
  type ServiceChargeBatch,
  type ServiceChargeDraft,
} from './serviceChargeBatch';

// The service-charges editor BOTH shipment verticals host (outbound S5,
// inbound S6 — the old app shares one column set the same way): a table of
// service lines — Name (a SERVICE-item lookup, never free text) · Comment ·
// Amount (before tax) · Tax (rate %) · Total (derived after-tax) · Delete —
// with an Add-charge action (disabled when the store has no service item)
// and a Cancel/Save footer. Edits live in a local draft; Save lands them in
// ONE batch (inserts + updates + deletes) via the hosting vertical's `save`.
// This module owns no writes — each vertical maps the batch to its own wire
// twin and returns any error message to show inline.

/** An existing SERVICE line, as the hosting vertical loads it. */
export type ServiceChargeSeed = {
  id: string;
  itemId: string;
  name: string;
  totalBeforeTax: number;
  taxPercentage: number | null;
  note: string | null;
};

export interface ServiceChargesModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  /** The hosting shipment is read-only (its editability gate). */
  disabled: boolean;
  /**
   * Load the shipment's current SERVICE lines when the editor opens.
   * undefined = the fetch failed (already surfaced globally) — the editor
   * treats it as empty rather than blocking.
   */
  fetchCharges: () => Promise<ServiceChargeSeed[] | undefined>;
  /**
   * Commit the batch on Save. ok → the editor closes (the vertical refreshes
   * its own view before resolving); not ok → it stays open, showing `message`
   * inline when given (omit it for a transport failure the global modal
   * already surfaced).
   */
  save: (batch: ServiceChargeBatch) => Promise<ServiceChargeSaveResult>;
}

export type ServiceChargeSaveResult =
  { ok: true } | { ok: false; message?: string };

export const ServiceChargesModal = (
  props: ServiceChargesModalProps
): JSX.Element => (
  <Show when={props.open}>
    <ServiceChargesContent {...props} />
  </Show>
);

const ServiceChargesContent = (
  props: ServiceChargesModalProps
): JSX.Element => {
  const [draft, setDraft] = createStore<ServiceChargeDraft[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | undefined>();
  const tableConfig = createTableConfig({ tableId: 'service-charges' });

  // One seed fetch per open: the existing charges (into the draft) + the
  // store's service items (the Name lookup's options). The modal mounts fresh
  // each open (the <Show> wrapper), so this never refetches under the user.
  const [seed] = createResource(async () => {
    const [charges, itemsResult] = await Promise.all([
      props.fetchCharges(),
      graphqlFetch(ServiceItems, { storeId: props.storeId }),
    ]);
    setDraft(
      (charges ?? []).map(charge => ({
        id: charge.id,
        isNew: false,
        deleted: false,
        itemId: charge.itemId,
        name: charge.name,
        totalBeforeTax: charge.totalBeforeTax,
        taxPercentage: charge.taxPercentage,
        note: charge.note ?? '',
      }))
    );
    return itemsResult.kind === 'success' &&
      itemsResult.data.items.__typename === 'ItemConnector'
      ? itemsResult.data.items.nodes
      : [];
  });
  // Read via gated, never seed() directly: this accessor is reached
  // from headerActions' Add-charge `disabled` WHILE the seed is pending, and a
  // pending direct read suspends the host view's route <Suspense> — tearing
  // the side panel out from under the opening modal (kdd/solid-reactivity-
  // pitfalls › No remounts on interaction; confirmed with detect-remounts).
  const serviceItems = () => gated(seed) ?? [];
  // The default for a NEW charge: the "service" item, else the first (the old
  // client's default-service-item rule).
  const defaultServiceItem = () =>
    serviceItems().find(item => item.code === 'service') ?? serviceItems()[0];

  const rows = () => draft.filter(charge => !charge.deleted);

  const update = <F extends keyof ServiceChargeDraft>(
    id: string,
    field: F,
    value: ServiceChargeDraft[F]
  ) => {
    const index = draft.findIndex(charge => charge.id === id);
    if (index >= 0) setDraft(index, field, value as never);
  };

  const selectItem = (id: string, itemId: string) => {
    const item = serviceItems().find(candidate => candidate.id === itemId);
    if (!item) return;
    update(id, 'itemId', item.id);
    update(id, 'name', item.name);
  };

  const addCharge = () => {
    const item = defaultServiceItem();
    if (!item) return;
    setDraft(
      produce(charges =>
        charges.push({
          id: generateUUID(),
          isNew: true,
          deleted: false,
          itemId: item.id,
          name: item.name,
          totalBeforeTax: 0,
          taxPercentage: null,
          note: '',
        })
      )
    );
  };

  const removeCharge = (charge: ServiceChargeDraft) => {
    if (charge.isNew) {
      setDraft(
        produce(charges => {
          const index = charges.findIndex(c => c.id === charge.id);
          if (index >= 0) charges.splice(index, 1);
        })
      );
    } else {
      update(charge.id, 'deleted', true);
    }
  };

  const save = async () => {
    if (saving()) return;
    setSaving(true);
    setErrorMessage(undefined);
    const result = await props.save(splitServiceChargeBatch(draft));
    setSaving(false);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    props.onClose();
  };

  // Old-app column order (its shared useServiceLineColumns): Name · Comment ·
  // Amount · Tax · Total · Delete. Editable cells read the draft store IN the
  // cell render — accessor-computed values freeze on in-place store edits.
  const columns = (): Column<ServiceChargeDraft, never>[] => [
    {
      c: { key: 'itemId' },
      header: () => t('label.name'),
      size: 220,
      cell: info => {
        const charge = info.row.original;
        return (
          <Select
            label={t('label.name')}
            hideLabel
            size="small"
            options={serviceItems().map(item => ({
              value: item.id,
              label: item.name,
            }))}
            value={charge.itemId}
            disabled={props.disabled}
            onValueChange={itemId => selectItem(charge.id, itemId)}
          />
        );
      },
    },
    {
      c: { key: 'note' },
      header: () => t('label.comment'),
      cell: info => {
        const charge = info.row.original;
        return (
          <TextField
            label={t('label.comment')}
            hideLabel
            size="small"
            disabled={props.disabled}
            value={charge.note}
            onInput={e => update(charge.id, 'note', e.currentTarget.value)}
          />
        );
      },
    },
    {
      c: { key: 'totalBeforeTax' },
      header: () => t('label.amount'),
      meta: { align: 'right' },
      cell: info => {
        const charge = info.row.original;
        return (
          <CurrencyField
            label={t('label.amount')}
            hideLabel
            size="small"
            disabled={props.disabled}
            value={charge.totalBeforeTax}
            onChange={value => update(charge.id, 'totalBeforeTax', value ?? 0)}
          />
        );
      },
    },
    {
      c: { key: 'taxPercentage' },
      header: () => t('label.tax'),
      meta: { align: 'right' },
      cell: info => {
        const charge = info.row.original;
        return (
          <NumberField
            label={t('label.tax')}
            hideLabel
            size="small"
            min={0}
            max={100}
            decimalLimit={2}
            endAdornment="%"
            disabled={props.disabled}
            value={charge.taxPercentage ?? undefined}
            onChange={value =>
              update(charge.id, 'taxPercentage', value ?? null)
            }
          />
        );
      },
    },
    {
      c: { id: 'totalAfterTax' },
      header: () => t('label.total'),
      meta: { align: 'right' },
      // JSX-wrapped so the store reads live in a tracked expression — a bare
      // string computed in the cell fn freezes at its first value when
      // amount/tax mutate in place (the same trap as the line editors'
      // derived cells).
      cell: info => (
        <>{formatCurrencyCell(chargeTotalAfterTax(info.row.original))}</>
      ),
    },
    {
      c: { id: 'actions' },
      header: () => t('label.delete'),
      meta: { align: 'right' },
      cell: info => (
        <IconButton
          bordered
          size="small"
          variant="danger"
          icon={<TrashIcon />}
          label={t('label.delete')}
          disabled={props.disabled}
          onClick={() => removeCharge(info.row.original)}
        />
      ),
    },
  ];

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      testId="service-charges-modal"
      title={t('heading.service-charges')}
      // Workbench-size, like the line editors: the charges DataTable gets the
      // flexing body, and the modal goes full-screen at the compact breakpoint.
      size="large"
      headerActions={
        <Button
          variant="secondary"
          icon={<PlusCircleIcon />}
          data-testid="add-charge-button"
          disabled={props.disabled || !defaultServiceItem()}
          onClick={addCharge}
        >
          {t('label.add-charge')}
        </Button>
      }
      actionsLead={
        <Show when={errorMessage()}>
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
      }
      actions={
        <>
          <CancelButton
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          />
          <DialogSaveButton
            data-testid="dialog-button-ok"
            disabled={props.disabled}
            // Also busy while the seed loads — a Save before the existing
            // charges land in the draft would commit an empty batch.
            loading={saving() || seed.loading}
            onClick={() => void save()}
          />
        </>
      }
    >
      <Show when={!seed.loading} fallback={<Spinner center />}>
        <Show
          when={rows().length > 0}
          fallback={
            // Distinct empty states (the old client's): no service item
            // assigned to the store (Add charge is disabled) vs simply no
            // charges added yet.
            <Alert severity="neutral">
              {!defaultServiceItem()
                ? t('error.no-service-charges')
                : t('messages.no-service-charges')}
            </Alert>
          }
        >
          <div class={styles.chargesGrid}>
            <DataTable
              columns={columns()}
              rows={rows()}
              rowKey={charge => charge.id}
              showFullScreen={false}
              config={tableConfig.config()}
              setConfig={tableConfig.setConfig}
            />
          </div>
        </Show>
      </Show>
    </Dialog>
  );
};

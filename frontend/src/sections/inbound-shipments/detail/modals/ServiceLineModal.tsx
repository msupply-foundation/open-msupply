import {
  createMemo,
  createResource,
  createSignal,
  For,
  Show,
  type Component,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { IconButton } from '../../../../ui/elements/buttons/IconButton';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { CurrencyField } from '../../../../ui/elements/inputs/CurrencyField';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { Select } from '../../../../ui/elements/selectors/Select';
import { Spinner } from '../../../../ui/elements/feedback/Spinner';
import { PlusCircleIcon, TrashIcon, XCircleIcon } from '../../../../ui/icons';
import {
  InboundServiceLines,
  ServiceItems,
  type BatchInboundShipmentVariables,
} from '../inboundShipmentDetail.generated';
import { runInboundBatch } from '../inboundShipmentUpdate';

export interface ServiceLineModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  invoiceId: string;
  isExternal: boolean;
  /** True once Verified — the whole modal is read-only. */
  disabled: boolean;
  onSaved: () => void;
}

// The service-charge modal (spec S6): a table of service lines. Each line names
// a SERVICE item (a lookup, not free text — rules → service lines), carries a
// note, a before-tax amount, and its own tax rate; the after-tax total is
// derived (amount × (1 + tax/100)). Add charges is disabled when no service
// item exists or the shipment isn't editable. Saved as one batch on OK.
type DraftRow = {
  id: string;
  itemId: string;
  name: string;
  totalBeforeTax: number;
  taxPercentage: number;
  note: string;
  isNew: boolean;
  deleted: boolean;
};

const lineTotalAfterTax = (row: DraftRow): number =>
  row.totalBeforeTax * (1 + (row.taxPercentage || 0) / 100);

export const ServiceLineModal: Component<ServiceLineModalProps> = props => (
  <Show when={props.open}>
    <Body {...props} />
  </Show>
);

const Body: Component<ServiceLineModalProps> = props => {
  const [rows, setRows] = createStore<DraftRow[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  // Existing service lines + the store's visible service items (the Name
  // column's lookup options; first is the default for a new charge).
  const [loaded] = createResource(async () => {
    const [linesResult, itemsResult] = await Promise.all([
      graphqlFetch(InboundServiceLines, {
        storeId: props.storeId,
        filter: {
          invoiceId: { equalTo: props.invoiceId },
          type: { equalTo: 'SERVICE' },
        },
      }),
      graphqlFetch(ServiceItems, { storeId: props.storeId }),
    ]);
    const lines =
      linesResult.kind === 'success' &&
      linesResult.data.invoiceLines.__typename === 'InvoiceLineConnector'
        ? linesResult.data.invoiceLines.nodes
        : [];
    setRows(
      lines.map(line => ({
        id: line.id,
        itemId: line.itemId,
        name: line.itemName,
        totalBeforeTax: line.totalBeforeTax,
        taxPercentage: line.taxPercentage ?? 0,
        note: line.note ?? '',
        isNew: false,
        deleted: false,
      }))
    );
    const serviceItems =
      itemsResult.kind === 'success' &&
      itemsResult.data.items.__typename === 'ItemConnector'
        ? itemsResult.data.items.nodes
        : [];
    return { serviceItems };
  });

  const serviceItems = () => loaded()?.serviceItems ?? [];
  const itemOptions = createMemo(() =>
    serviceItems().map(item => ({ value: item.id, label: item.name }))
  );
  const visibleRows = () => rows.filter(r => !r.deleted);

  const addCharge = () => {
    const first = serviceItems()[0];
    if (!first) return;
    setRows(
      produce(draft =>
        draft.push({
          id: crypto.randomUUID(),
          itemId: first.id,
          name: first.name,
          totalBeforeTax: 0,
          taxPercentage: 0,
          note: '',
          isNew: true,
          deleted: false,
        })
      )
    );
  };

  const selectItem = (index: number, itemId: string) => {
    const item = serviceItems().find(i => i.id === itemId);
    if (!item) return;
    setRows(
      index,
      produce(row => {
        row.itemId = item.id;
        row.name = item.name;
      })
    );
  };

  const removeRow = (id: string) => {
    const idx = rows.findIndex(r => r.id === id);
    if (idx < 0) return;
    if (rows[idx].isNew) setRows(produce(draft => draft.splice(idx, 1)));
    else setRows(idx, 'deleted', true);
  };

  const buildBatch = (): BatchInboundShipmentVariables['input'] => {
    const insert = rows
      .filter(r => r.isNew && !r.deleted)
      .map(r => ({
        id: r.id,
        invoiceId: props.invoiceId,
        itemId: r.itemId,
        name: r.name,
        totalBeforeTax: r.totalBeforeTax,
        taxPercentage: r.taxPercentage,
        note: r.note || undefined,
      }));
    // Update takes tax as the TaxInput wrapper (`tax: { percentage }`), unlike
    // insert's flat `taxPercentage` — mirror the generated input shapes.
    const update = rows
      .filter(r => !r.isNew && !r.deleted)
      .map(r => ({
        id: r.id,
        itemId: r.itemId,
        name: r.name,
        totalBeforeTax: r.totalBeforeTax,
        tax: { percentage: r.taxPercentage },
        note: r.note,
      }));
    const del = rows
      .filter(r => !r.isNew && r.deleted)
      .map(r => ({ id: r.id }));
    return {
      insertInboundShipmentServiceLines: insert,
      updateInboundShipmentServiceLines: update,
      deleteInboundShipmentServiceLines: del,
    };
  };

  const save = async () => {
    if (saving()) return;
    setSaving(true);
    setErrorMessage(undefined);
    const outcome = await runInboundBatch(
      props.storeId,
      props.isExternal,
      buildBatch()
    );
    setSaving(false);
    if (!outcome) return props.onClose();
    if (outcome.errors.size > 0) {
      setErrorMessage([...outcome.errors.values()][0]);
      return;
    }
    if (outcome.applied) props.onSaved();
    props.onClose();
  };

  return (
    <Dialog
      open
      dismissable={!saving()}
      onClose={props.onClose}
      title={t('heading.service-charges')}
      testId="service-charges-modal"
      widthRem={60}
      headerActions={
        <Button
          icon={<PlusCircleIcon />}
          disabled={props.disabled || serviceItems().length === 0}
          data-testid="add-charge-button"
          onClick={addCharge}
        >
          {t('label.add-charges')}
        </Button>
      }
      actionsLead={
        <Show when={errorMessage()}>
          <Alert severity="error">{errorMessage()}</Alert>
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Button
            data-testid="dialog-button-ok"
            loading={saving()}
            disabled={props.disabled}
            onClick={() => void save()}
          >
            {t('button.ok')}
          </Button>
        </>
      }
    >
      <Show when={!loaded.loading} fallback={<Spinner center />}>
        <Show
          when={visibleRows().length > 0}
          fallback={
            <Alert severity="neutral">{t('messages.no-service-charges')}</Alert>
          }
        >
          <For each={rows}>
            {(row, index) => (
              <Show when={!row.deleted}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--space-2)',
                    'align-items': 'flex-end',
                    'margin-block-end': 'var(--space-2)',
                  }}
                >
                  <Select
                    label={t('label.name')}
                    options={itemOptions()}
                    value={row.itemId}
                    disabled={props.disabled}
                    onValueChange={itemId => selectItem(index(), itemId)}
                  />
                  <TextField
                    label={t('label.comment')}
                    value={row.note}
                    disabled={props.disabled}
                    onInput={e =>
                      setRows(index(), 'note', e.currentTarget.value)
                    }
                  />
                  <CurrencyField
                    label={t('label.amount')}
                    value={row.totalBeforeTax}
                    disabled={props.disabled}
                    onChange={value =>
                      setRows(index(), 'totalBeforeTax', value ?? 0)
                    }
                  />
                  <NumberField
                    label={t('label.tax')}
                    value={row.taxPercentage}
                    min={0}
                    max={100}
                    decimalLimit={2}
                    endAdornment="%"
                    disabled={props.disabled}
                    onChange={value =>
                      setRows(index(), 'taxPercentage', value ?? 0)
                    }
                  />
                  <CurrencyField
                    label={t('label.total')}
                    value={lineTotalAfterTax(row)}
                    disabled
                  />
                  <IconButton
                    icon={<TrashIcon />}
                    label={t('button.delete')}
                    variant="danger"
                    disabled={props.disabled}
                    onClick={() => removeRow(row.id)}
                  />
                </div>
              </Show>
            )}
          </For>
        </Show>
      </Show>
    </Dialog>
  );
};

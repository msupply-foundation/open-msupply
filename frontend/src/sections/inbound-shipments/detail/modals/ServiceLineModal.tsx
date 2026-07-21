import {
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

// The service-charge modal (spec S6): a small table of service lines (name,
// before-tax total, note) with Add charge (disabled when no service item
// exists or the shipment isn't editable). Service lines carry a charge only —
// no item/batch/stock (rules → service lines). Saved as one batch on OK.
type DraftRow = {
  id: string;
  name: string;
  totalBeforeTax: number;
  note: string;
  isNew: boolean;
  deleted: boolean;
};

export const ServiceLineModal: Component<ServiceLineModalProps> = props => (
  <Show when={props.open}>
    <Body {...props} />
  </Show>
);

const Body: Component<ServiceLineModalProps> = props => {
  const [rows, setRows] = createStore<DraftRow[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  // Existing service lines + the store's service items (for a default item id).
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
        name: line.itemName,
        totalBeforeTax: line.totalBeforeTax,
        note: line.note ?? '',
        isNew: false,
        deleted: false,
      }))
    );
    const serviceItemId =
      itemsResult.kind === 'success' &&
      itemsResult.data.items.__typename === 'ItemConnector'
        ? itemsResult.data.items.nodes[0]?.id
        : undefined;
    return { serviceItemId };
  });

  const serviceItemId = () => loaded()?.serviceItemId;
  const visibleRows = () => rows.filter(r => !r.deleted);

  const addCharge = () => {
    setRows(
      produce(draft =>
        draft.push({
          id: crypto.randomUUID(),
          name: t('label.service-charge'),
          totalBeforeTax: 0,
          note: '',
          isNew: true,
          deleted: false,
        })
      )
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
        itemId: serviceItemId(),
        name: r.name,
        totalBeforeTax: r.totalBeforeTax,
        note: r.note || undefined,
      }));
    const update = rows
      .filter(r => !r.isNew && !r.deleted)
      .map(r => ({
        id: r.id,
        name: r.name,
        totalBeforeTax: r.totalBeforeTax,
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
      testId="service-line-modal"
      headerActions={
        <Button
          icon={<PlusCircleIcon />}
          disabled={props.disabled || !serviceItemId()}
          data-testid="add-charge-button"
          onClick={addCharge}
        >
          {t('label.add-charge')}
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
                  <TextField
                    label={t('label.name')}
                    value={row.name}
                    disabled={props.disabled}
                    onInput={e =>
                      setRows(index(), 'name', e.currentTarget.value)
                    }
                  />
                  <CurrencyField
                    label={t('label.total-before-tax')}
                    value={row.totalBeforeTax}
                    disabled={props.disabled}
                    onChange={value =>
                      setRows(index(), 'totalBeforeTax', value ?? 0)
                    }
                  />
                  <TextField
                    label={t('label.note')}
                    value={row.note}
                    disabled={props.disabled}
                    onInput={e =>
                      setRows(index(), 'note', e.currentTarget.value)
                    }
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

import { createResource, createSignal, Show, type JSX } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { IconButton } from '../../../../ui/elements/buttons/IconButton';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import { createTableConfig } from '../../../../api/createTableConfig';
import { toNumberOrNull } from '../../../../typeHelpers';
import {
  CheckIcon,
  PlusCircleIcon,
  TrashIcon,
  XCircleIcon,
} from '../../../../ui/icons';
import {
  SaveOutboundServiceLines,
  ServiceItems,
} from './serviceCharges.generated';
import type { OutboundLineFragment } from '../outboundDetail.generated';

// S5 — service charges editor (spec/outbound-shipments ui-surface § S5): one
// row per service line (name, amount before tax, tax, note, delete), an Add
// charge action (disabled when no default service item exists), Cancel/OK.
// Edits live in a local draft; OK lands them in ONE batch (inserts + updates +
// deletes). Amounts are entered before tax (rules.md § service lines).

type DraftCharge = {
  id: string;
  isNew: boolean;
  deleted: boolean;
  name: string;
  totalBeforeTax: number;
  taxPercentage: number | null;
  note: string;
};

interface ServiceChargesModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  invoiceId: string;
  disabled: boolean;
  /** The shipment's current SERVICE lines (seed the draft). */
  serviceLines: OutboundLineFragment[];
  /** A save committed — the view refetches the shipment. */
  onCommitted: () => void;
}

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
  const [draft, setDraft] = createStore<DraftCharge[]>(
    props.serviceLines.map(line => ({
      id: line.id,
      isNew: false,
      deleted: false,
      name: line.itemName,
      totalBeforeTax: line.totalBeforeTax,
      taxPercentage: line.taxPercentage ?? null,
      note: line.note ?? '',
    }))
  );
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | undefined>();
  const tableConfig = createTableConfig({
    tableId: 'outbound-service-charges',
  });

  // The default service item (item code "service") gates Add charge; its name
  // seeds a new row. Fetched once per open.
  const [serviceItems] = createResource(
    () => props.storeId,
    async storeId => {
      const result = await graphqlFetch(ServiceItems, { storeId });
      if (result.kind !== 'success') return [];
      return result.data.items.__typename === 'ItemConnector'
        ? result.data.items.nodes
        : [];
    }
  );
  const defaultServiceItem = () => {
    const items =
      serviceItems.state === 'ready' || serviceItems.state === 'refreshing'
        ? (serviceItems.latest ?? [])
        : [];
    return items.find(item => item.code === 'service') ?? items[0];
  };

  const rows = () => draft.filter(charge => !charge.deleted);

  const update = <F extends keyof DraftCharge>(
    id: string,
    field: F,
    value: DraftCharge[F]
  ) => {
    const index = draft.findIndex(charge => charge.id === id);
    if (index >= 0) setDraft(index, field, value as never);
  };

  const addCharge = () => {
    const item = defaultServiceItem();
    if (!item) return;
    setDraft(
      produce(charges =>
        charges.push({
          id: crypto.randomUUID(),
          isNew: true,
          deleted: false,
          name: item.name,
          totalBeforeTax: 0,
          taxPercentage: null,
          note: '',
        })
      )
    );
  };

  const removeCharge = (charge: DraftCharge) => {
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
    setSaving(true);
    setErrorMessage(undefined);
    const inserts = draft
      .filter(charge => charge.isNew && !charge.deleted)
      .map(charge => ({
        id: charge.id,
        invoiceId: props.invoiceId,
        // Omitted itemId resolves the default service item server-side; we
        // pass the one we showed so the name matches what the user saw.
        itemId: defaultServiceItem()?.id,
        name: charge.name,
        totalBeforeTax: charge.totalBeforeTax,
        taxPercentage: charge.taxPercentage,
        note: charge.note || null,
      }));
    const updates = draft
      .filter(charge => !charge.isNew && !charge.deleted)
      .map(charge => ({
        id: charge.id,
        name: charge.name,
        totalBeforeTax: charge.totalBeforeTax,
        tax: { percentage: charge.taxPercentage },
        note: charge.note || null,
      }));
    const deletes = draft
      .filter(charge => !charge.isNew && charge.deleted)
      .map(charge => ({ id: charge.id }));
    const result = await graphqlFetch(SaveOutboundServiceLines, {
      storeId: props.storeId,
      inserts,
      updates,
      deletes,
    });
    setSaving(false);
    if (result.kind !== 'success') return;
    const batch = result.data.batchOutboundShipment;
    const failures = [
      ...(batch.insertOutboundShipmentServiceLines ?? []),
      ...(batch.updateOutboundShipmentServiceLines ?? []),
      ...(batch.deleteOutboundShipmentServiceLines ?? []),
    ].filter(item => item.response.__typename.endsWith('Error'));
    if (failures.length > 0) {
      const descriptions = failures
        .map(item => item.response.error.description)
        .filter(description => description.length > 0);
      setErrorMessage(
        descriptions.length > 0 ? descriptions.join('\n') : t('error.cant-save')
      );
      return;
    }
    props.onCommitted();
    props.onClose();
  };

  const columns = (): Column<DraftCharge, never>[] => [
    {
      c: { key: 'name' },
      header: t('label.name'),
      cell: info => {
        const charge = info.row.original;
        return (
          <TextField
            label={t('label.name')}
            hideLabel
            size="small"
            disabled={props.disabled}
            value={charge.name}
            onInput={e => update(charge.id, 'name', e.currentTarget.value)}
          />
        );
      },
    },
    {
      c: { key: 'totalBeforeTax' },
      header: t('label.amount'),
      meta: { align: 'right' },
      cell: info => {
        const charge = info.row.original;
        return (
          <TextField
            label={t('label.amount')}
            hideLabel
            size="small"
            type="number"
            disabled={props.disabled}
            value={charge.totalBeforeTax}
            onInput={e =>
              update(
                charge.id,
                'totalBeforeTax',
                toNumberOrNull(e.currentTarget.value) ?? 0
              )
            }
          />
        );
      },
    },
    {
      c: { key: 'taxPercentage' },
      header: t('label.tax'),
      meta: { align: 'right' },
      cell: info => {
        const charge = info.row.original;
        return (
          <TextField
            label={t('label.tax')}
            hideLabel
            size="small"
            type="number"
            min="0"
            max="100"
            step="0.01"
            disabled={props.disabled}
            value={charge.taxPercentage ?? ''}
            onInput={e =>
              update(
                charge.id,
                'taxPercentage',
                toNumberOrNull(e.currentTarget.value)
              )
            }
          />
        );
      },
    },
    {
      c: { key: 'note' },
      header: t('label.note'),
      cell: info => {
        const charge = info.row.original;
        return (
          <TextField
            label={t('label.note')}
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
      c: { id: 'actions' },
      header: t('label.actions'),
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
      widthRem={48}
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
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Button
            icon={<CheckIcon />}
            data-testid="dialog-button-ok"
            disabled={props.disabled}
            loading={saving()}
            onClick={() => void save()}
          >
            {t('button.ok')}
          </Button>
        </>
      }
    >
      <Show
        when={rows().length > 0}
        fallback={
          // Distinct empty states: no default service item assigned to the
          // store (so Add charge is disabled — the current client's
          // !defaultServiceItem message) vs simply no charges added yet (the
          // same line the inbound service modal shows). Held back until the
          // items fetch settles so the message never flashes from one state
          // to the other.
          <Show when={!serviceItems.loading}>
            <p>
              {!defaultServiceItem()
                ? t('error.no-service-charges')
                : t('messages.no-service-charges')}
            </p>
          </Show>
        }
      >
        <DataTable
          columns={columns()}
          rows={rows()}
          rowKey={charge => charge.id}
          showFullScreen={false}
          config={tableConfig.config()}
          setConfig={tableConfig.setConfig}
        />
      </Show>
    </Dialog>
  );
};

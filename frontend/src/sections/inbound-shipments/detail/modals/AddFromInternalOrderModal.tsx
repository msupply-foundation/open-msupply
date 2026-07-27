import { createResource, createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { XCircleIcon } from '../../../../ui/icons';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import { getNumberCell } from '../../../../ui/elements/table/tableHelpers';
import {
  InternalOrderLines,
  type InternalOrderLineRowFragment,
} from '../inboundShipmentLookups.generated';
import { runInboundBatch } from '../inboundShipmentUpdate';

export interface AddFromInternalOrderModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  invoiceId: string;
  requisitionId: string;
  isExternal: boolean;
  onAdded: () => void;
}

// Pull lines from the shipment's linked internal order (spec S7 / AC-IO1). A
// multi-select table of the order's lines — pick one OR many and add them in a
// single action; each becomes a stock line pre-filled with the item + requested
// quantity, stock created immediately (server side). Reachable only through the
// batch's insertFromInternalOrderLines member (an array), so several selected
// lines go up in one batch call.
export const AddFromInternalOrderModal: Component<
  AddFromInternalOrderModalProps
> = props => (
  <Show when={props.open}>
    <Body {...props} />
  </Show>
);

const Body: Component<AddFromInternalOrderModalProps> = props => {
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const [data] = createResource(async () => {
    const result = await graphqlFetch(InternalOrderLines, {
      storeId: props.storeId,
      requisitionId: props.requisitionId,
    });
    return result.kind === 'success' &&
      result.data.requisition.__typename === 'RequisitionNode'
      ? result.data.requisition.lines.nodes
      : [];
  });
  const lines = (): InternalOrderLineRowFragment[] => data() ?? [];

  const columns = (): Column<InternalOrderLineRowFragment, never>[] => [
    {
      c: { accessor: row => row.item.code, id: 'code' },
      header: () => t('label.code'),
    },
    { c: { key: 'itemName' }, header: () => t('label.name') },
    {
      c: { key: 'requestedQuantity' },
      header: () => t('label.requested-quantity'),
      ...getNumberCell(),
    },
  ];

  // Add every selected order line in one batch (each → one stock line).
  const add = async () => {
    const ids = selectedIds();
    if (ids.length === 0 || saving()) return;
    setSaving(true);
    setErrorMessage(undefined);
    const outcome = await runInboundBatch(props.storeId, props.isExternal, {
      insertFromInternalOrderLines: ids.map(requisitionLineId => ({
        invoiceId: props.invoiceId,
        requisitionLineId,
      })),
    });
    setSaving(false);
    if (!outcome) return props.onClose();
    if (outcome.errors.size > 0) {
      setErrorMessage([...outcome.errors.values()][0]);
      return;
    }
    props.onAdded();
    props.onClose();
  };

  return (
    <Dialog
      open
      dismissable={!saving()}
      onClose={props.onClose}
      size="large"
      title={t('header.add-lines-from-internal-order')}
      testId="add-internal-order-modal"
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
            disabled={selectedIds().length === 0}
            onClick={() => void add()}
          >
            {t('button.select')}
          </Button>
        </>
      }
    >
      <DataTable
        columns={columns()}
        rows={lines()}
        rowKey={r => r.id}
        loading={data.loading}
        showFullScreen={false}
        emptyMessage={t('error.no-internal-order-items')}
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        // Clicking anywhere on the row toggles its selection (multi-select),
        // not just the checkbox; the checkbox still toggles independently (its
        // click doesn't propagate — see TableRow).
        onRowClick={row =>
          setSelectedIds(ids =>
            ids.includes(row.id)
              ? ids.filter(id => id !== row.id)
              : [...ids, row.id]
          )
        }
      />
    </Dialog>
  );
};

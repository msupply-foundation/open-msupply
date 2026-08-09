import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../ui/elements/buttons/StandardButtons';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import type { LinkPurchaseOrderRowFragment } from './createInboundShipment.generated';

// The from-a-purchase-order create step (spec S2 → Link purchase order modal),
// offered when the store's procurement preference is on. A rich, contextful
// table of the store's Sent purchase orders — NOT a bare dropdown — so the user
// can pick the right one by supplier / reference / comment. Unlike the
// internal-order link, linking a PO here is MANDATORY: both add buttons are
// disabled until a row is selected; the only choice they offer is whether to
// seed the shipment with the order's lines. The supplier is taken from the
// chosen order (no separate supplier step). Presentational — the parent owns
// the data + the create mutation and acts on onSelect(purchaseOrderId,
// addLines).

const PAGE_SIZE = 20;

export interface LinkPurchaseOrderModalProps {
  open: boolean;
  onClose: () => void;
  /** The store's Sent purchase orders, newest-numbered first. */
  orders: LinkPurchaseOrderRowFragment[];
  loading: boolean;
  /** A create is in flight — disable actions + block dismiss. */
  busy: boolean;
  /** Server rejection from the create attempt, surfaced beside the actions. */
  error?: string;
  onSelect: (purchaseOrderId: string, addLines: boolean) => void;
}

export const LinkPurchaseOrderModal: Component<
  LinkPurchaseOrderModalProps
> = props => {
  // Single-row selection built on the DataTable's (multi-capable) selection:
  // keep only the most-recently-toggled id, so the table behaves single-select
  // and the two add buttons act on that one order.
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const selectedId = () => selectedIds()[0];

  const [offset, setOffset] = createSignal(0);
  const [pageSize, setPageSize] = createSignal(PAGE_SIZE);
  const page = () => props.orders.slice(offset(), offset() + pageSize());

  const columns = (): Column<LinkPurchaseOrderRowFragment, never>[] => [
    {
      c: { accessor: row => row.supplier?.name ?? '', id: 'supplier' },
      header: () => t('label.supplier'),
      ...getCellDefinition('supplierName'),
    },
    {
      c: { key: 'number' },
      header: () => t('label.purchase-order-number'),
      // No CELL_DEF key; "PO number" is the binding constraint, not the digits.
      ...getNumberCell(),
      size: remToPx(7),
    },
    {
      c: { key: 'reference' },
      header: () => t('label.reference'),
      ...getCellDefinition('reference'),
    },
    {
      c: { key: 'comment' },
      header: () => t('label.comment'),
      ...getCellDefinition('comment'),
    },
  ];

  return (
    <Dialog
      open={props.open}
      dismissable={!props.busy}
      onClose={props.onClose}
      size="large"
      title={t('heading.link-purchase-order')}
      testId="link-purchase-order-modal"
      actionsLead={
        <Show when={props.error}>
          <Alert severity="error">{props.error}</Alert>
        </Show>
      }
      actions={
        <>
          <CancelButton
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          />
          {/* Linking a PO is mandatory — both disabled until a row is picked;
              the choice is only whether to seed the shipment's lines. Their own
              verbs, so plain Buttons rather than the standard dialog three. The
              with-lines variant is the primary, so it takes the confirm role;
              this one is an alternative and claims none, so Enter cannot pick
              the narrower outcome by accident. */}
          <Button
            variant="secondary"
            data-testid="dialog-button-add-no-lines"
            disabled={!selectedId()}
            loading={props.busy}
            onClick={() => selectedId() && props.onSelect(selectedId(), false)}
          >
            {t('button.add-with-no-lines')}
          </Button>
          <Button
            confirms="plain"
            data-testid="dialog-button-add-all-lines"
            disabled={!selectedId()}
            loading={props.busy}
            onClick={() => selectedId() && props.onSelect(selectedId(), true)}
          >
            {t('button.add-with-all-lines')}
          </Button>
        </>
      }
    >
      <DataTable
        columns={columns()}
        rows={page()}
        rowKey={r => r.id}
        loading={props.loading}
        showFullScreen={false}
        emptyMessage={t('messages.no-sent-purchase-orders')}
        enableSelection
        selectedIds={selectedIds()}
        // Constrain to single-select: keep only the newly-toggled row.
        onSelectionChange={ids => setSelectedIds(ids.slice(-1))}
        // Clicking anywhere on the row selects it (not just the checkbox); the
        // checkbox still toggles (its click doesn't propagate — see TableRow).
        onRowClick={row => setSelectedIds([row.id])}
        pagination={{
          offset: offset(),
          pageSize: pageSize(),
          total: props.orders.length,
          onOffsetChange: setOffset,
          onPageSizeChange: size => {
            setPageSize(size);
            setOffset(0);
          },
        }}
      />
    </Dialog>
  );
};

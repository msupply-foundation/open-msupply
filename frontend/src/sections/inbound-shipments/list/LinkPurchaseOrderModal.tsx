import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { initialPageSize, rememberPageSize } from '../../../list/pageSize';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../ui/elements/buttons/StandardButtons';
import { FilterBar } from '../../../ui/elements/selectors/FilterBar';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  CommentHeader,
  getCellDefinition,
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import {
  LINK_PURCHASE_ORDER_FILTERS,
  type LinkPurchaseOrderFilter,
} from './linkPurchaseOrderFilters';
import styles from './LinkPurchaseOrderModal.module.css';
import type { LinkPurchaseOrderRowFragment } from './createInboundShipment.generated';

// The from-a-purchase-order create step (spec S2 → Link purchase order modal),
// offered when the store's procurement preference is on. A rich, contextful
// table of the store's Sent purchase orders — NOT a bare dropdown — so the user
// can pick the right one by supplier / number / sent date / reference /
// comment. Finding the order is the first thing a user does here (they usually
// know which one they are after), so the three filters sit on the table's bar
// from the start. Unlike the internal-order link, linking a PO here is
// MANDATORY: both add buttons are disabled until a row is selected; the only
// choice they offer is whether to seed the shipment with the order's lines.
// The supplier is taken from the chosen order (no separate supplier step).
// Presentational — the parent owns the data, the filter state + the create
// mutation, and acts on onSelect(purchaseOrderId, addLines).

export interface LinkPurchaseOrderModalProps {
  open: boolean;
  onClose: () => void;
  /** The store's Sent orders matching `filter`, newest-numbered first. */
  orders: LinkPurchaseOrderRowFragment[];
  loading: boolean;
  /** The bar's filter, in the query's own shape; the parent queries with it. */
  filter: LinkPurchaseOrderFilter;
  onFilterChange: (filter: LinkPurchaseOrderFilter) => void;
  /** A create is in flight — disable actions + block dismiss. */
  busy: boolean;
  /** Server rejection from the create attempt, surfaced beside the actions. */
  error?: string;
  onSelect: (purchaseOrderId: string, addLines: boolean) => void;
}

export const LinkPurchaseOrderModal: Component<
  LinkPurchaseOrderModalProps
> = props => {
  // Single-row selection by highlight: the clicked row's id alone, with no
  // checkbox column — a checkbox is the multi-select affordance, and only one
  // order can be linked (OMS-REG-REPL-02.39). The DataTable paints the tint
  // from selectedIds without enableSelection.
  const [selectedId, setSelectedId] = createSignal<string>();

  const [offset, setOffset] = createSignal(0);
  const [pageSize, setPageSize] = createSignal(initialPageSize());
  const page = () => props.orders.slice(offset(), offset() + pageSize());

  // A narrowed set starts from its first page, and a selection the new set
  // may no longer hold is dropped rather than acted on unseen.
  const onFilterChange = (filter: LinkPurchaseOrderFilter) => {
    setOffset(0);
    setSelectedId(undefined);
    props.onFilterChange(filter);
  };

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
      c: { key: 'sentDatetime' },
      header: () => t('label.sent'),
      ...getDateCell(),
      size: remToPx(7),
    },
    {
      c: { key: 'reference' },
      header: () => t('label.reference'),
      ...getCellDefinition('reference'),
    },
    {
      c: { key: 'comment' },
      header: () => <CommentHeader />,
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
            onClick={() => selectedId() && props.onSelect(selectedId()!, false)}
          >
            {t('button.link-without-lines')}
          </Button>
          <Button
            confirms="plain"
            data-testid="dialog-button-add-all-lines"
            disabled={!selectedId()}
            loading={props.busy}
            onClick={() => selectedId() && props.onSelect(selectedId()!, true)}
          >
            {t('button.add-with-all-lines-from-po')}
          </Button>
        </>
      }
    >
      {/* Load-bearing: the only statement of what the step is for, and that
          exactly one order is wanted (OMS-REG-REPL-02.36). */}
      <Alert
        severity="info"
        class={styles.notice}
        testId="link-purchase-order-notice"
      >
        {t('message.select-purchase-order-for-shipment')}
      </Alert>
      <DataTable
        columns={columns()}
        rows={page()}
        rowKey={r => r.id}
        loading={props.loading}
        showFullScreen={false}
        emptyMessage={t('messages.no-sent-purchase-orders')}
        // Filters live in the table's own toolbar (ui-standards § tables →
        // filtering); state is the parent's, which queries with it.
        filters={
          <FilterBar
            filters={LINK_PURCHASE_ORDER_FILTERS}
            filter={props.filter}
            onChange={onFilterChange}
          />
        }
        selectedIds={selectedId() ? [selectedId()!] : []}
        // Clicking anywhere on the row (or Enter on it) selects that order.
        onRowClick={row => setSelectedId(row.id)}
        pagination={{
          offset: offset(),
          pageSize: pageSize(),
          total: props.orders.length,
          onOffsetChange: setOffset,
          onPageSizeChange: size => {
            rememberPageSize(size);
            setPageSize(size);
            setOffset(0);
          },
        }}
      />
    </Dialog>
  );
};

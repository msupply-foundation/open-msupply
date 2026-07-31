import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { XCircleIcon } from '../../../ui/icons';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getCommentCell,
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import type { LinkInternalOrderRowFragment } from '../detail/inboundShipmentLookups.generated';

// The create-flow "Link internal order" step (spec S2 → Link internal order
// modal). Offered after a supplier is chosen, when the store allows manually
// linking internal orders AND the supplier has ≥1 linkable (Sent) internal
// order. A rich, contextful table — NOT a bare dropdown of order numbers — so
// the user can tell the orders apart (created date, who entered it, program,
// reference, comment). Linking is OPTIONAL: the italic instruction says so, and
// Next creates the shipment without a link. This is presentational — the parent
// (CreateInboundShipmentModal) owns the orders data and the create mutation:
//  - clicking a row → onLink(that order's id) (create linked),
//  - Next          → onNext()                 (create unlinked),
//  - Cancel        → onClose()                (abort — nothing created).

const PAGE_SIZE = 20;

export interface LinkInternalOrderModalProps {
  open: boolean;
  onClose: () => void;
  /** The supplier's linkable (Sent) internal orders, newest-created first. */
  orders: LinkInternalOrderRowFragment[];
  loading: boolean;
  /** A create is in flight — disable actions + block dismiss. */
  busy: boolean;
  /** Server rejection from the create attempt, surfaced beside the actions. */
  error?: string;
  onLink: (requisitionId: string) => void;
  onNext: () => void;
}

export const LinkInternalOrderModal: Component<
  LinkInternalOrderModalProps
> = props => {
  // Client-side pagination over the fetched orders (the parent hands in the
  // full set; a supplier normally has few, but a busy one can have many).
  const [offset, setOffset] = createSignal(0);
  const [pageSize, setPageSize] = createSignal(PAGE_SIZE);
  const page = () => props.orders.slice(offset(), offset() + pageSize());

  const columns = (): Column<LinkInternalOrderRowFragment, never>[] => [
    {
      c: { key: 'requisitionNumber' },
      header: () => t('label.number'),
      ...getNumberCell(),
    },
    {
      c: { key: 'createdDatetime' },
      header: () => t('label.created'),
      ...getDateCell(),
    },
    {
      c: { accessor: row => row.user?.username ?? '', id: 'enteredBy' },
      header: () => t('label.entered-by'),
    },
    {
      c: { accessor: row => row.program?.name ?? '', id: 'program' },
      header: () => t('label.program'),
    },
    { c: { key: 'theirReference' }, header: () => t('label.reference') },
    {
      c: { key: 'comment' },
      header: () => t('label.comment'),
      ...getCommentCell(),
    },
  ];

  return (
    <Dialog
      open={props.open}
      dismissable={!props.busy}
      onClose={props.onClose}
      size="large"
      title={t('header.link-internal-order')}
      testId="link-internal-order-modal"
      actionsLead={
        <Show when={props.error}>
          <Alert severity="error">{props.error}</Alert>
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            confirms="cancel"
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          {/* Next creates the shipment WITHOUT a link — the optional-skip path
              the instruction above describes. It is this dialog's confirming
              action (picking an order from the list is the other route). */}
          <Button
            confirms="plain"
            data-testid="dialog-button-next"
            loading={props.busy}
            onClick={props.onNext}
          >
            {t('button.next')}
          </Button>
        </>
      }
    >
      {/* Load-bearing instruction: linking is optional, and this is the only
          cue that the step is skippable (via Next). */}
      <p style={{ 'font-style': 'italic' }}>
        {t('message.continue-to-make-inbound-shipment')}
      </p>
      <DataTable
        columns={columns()}
        rows={page()}
        rowKey={r => r.id}
        loading={props.loading}
        // Clicking a row links THAT order and creates the shipment.
        onRowClick={row => !props.busy && props.onLink(row.id)}
        showFullScreen={false}
        emptyMessage={t('error.no-internal-orders')}
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

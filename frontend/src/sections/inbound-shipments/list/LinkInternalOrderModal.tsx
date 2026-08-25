import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { initialPageSize, rememberPageSize } from '../../../list/pageSize';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../ui/elements/buttons/StandardButtons';
import { Text } from '../../../ui/elements/typography/Text';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  CommentHeader,
  getCellDefinition,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import styles from './LinkInternalOrderModal.module.css';
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
  const [pageSize, setPageSize] = createSignal(initialPageSize());
  const page = () => props.orders.slice(offset(), offset() + pageSize());

  const columns = (): Column<LinkInternalOrderRowFragment, never>[] => [
    {
      c: { key: 'requisitionNumber' },
      header: () => t('label.number'),
      // No CELL_DEF key for a requisition number; take the shared record-number
      // width so it lines up with the other "#" columns.
      ...getNumberCell(),
      size: remToPx(3.5),
    },
    {
      c: { key: 'createdDatetime' },
      header: () => t('label.created'),
      ...getCellDefinition('createdDatetime'),
    },
    {
      c: { accessor: row => row.user?.username ?? '', id: 'enteredBy' },
      header: () => t('label.entered-by'),
      // The acting user's username — the shared short-text width.
      ...getCellDefinition('user'),
    },
    {
      c: { accessor: row => row.program?.name ?? '', id: 'program' },
      header: () => t('label.program'),
      ...getCellDefinition('name'),
    },
    {
      c: { key: 'theirReference' },
      header: () => t('label.reference'),
      ...getCellDefinition('theirReference'),
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
      title={t('header.link-internal-order')}
      testId="link-internal-order-modal"
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
          {/* Next creates the shipment WITHOUT a link — the optional-skip path
              the instruction above describes. Its own verb, so a plain Button
              rather than one of the standard dialog three — and it is this
              dialog's confirming action (picking an order from the list is the
              other route), so it claims the role by hand. */}
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
      <Text variant="body" class={styles.instruction}>
        {t('message.continue-to-make-inbound-shipment')}
      </Text>
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
            rememberPageSize(size);
            setPageSize(size);
            setOffset(0);
          },
        }}
      />
    </Dialog>
  );
};

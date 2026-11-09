import { createMemo, createSignal, For } from 'solid-js';
import { Alert } from '../../ui/elements/feedback/Alert';
import { StatusChip } from '../../ui/elements/feedback/StatusChip';
import { CheckboxButton } from '../../ui/elements/buttons/CheckboxButton';
import { DataTable, type Column } from '../../ui/elements/table/DataTable';
import { remToPx } from '../../ui/utils/rem';
import { ReviewRequestModal } from './ReviewRequestModal';
import {
  CURRENT_USER,
  KIND_LABEL,
  STATUS_CHIP,
  approvalBlock,
  type ItemRequest,
  type RequestStatus,
} from './requests';
import styles from './catalogueItems.module.css';

/*
 * The approval queue: everything proposed for the central catalogue, and what
 * happened to it.
 *
 * Deliberately not a separate "inbox" app. It is a view of Catalogue > Items,
 * reached from that page's header, because a request is a pending state of an
 * ITEM and belongs beside the items rather than in a workflow tool of its own.
 *
 * Decided requests stay listed rather than disappearing, so "why is this item
 * here / why was mine turned down" has an answer months later. The default
 * filter is Pending, since that is the work.
 */

const FILTERS: { key: RequestStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

/** Fixed demo stamps, so this renders the same every time. */
const formatWhen = (iso: string): string => {
  const [date, time] = iso.split('T');
  return `${date} ${time?.slice(0, 5) ?? ''}`.trim();
};

export interface ItemRequestsPanelProps {
  /** Lifted so the items page can badge its header with the pending count. */
  requests: ItemRequest[];
  onDecide: (id: string, status: RequestStatus, reason?: string) => void;
}

export const ItemRequestsPanel = (props: ItemRequestsPanelProps) => {
  const [filter, setFilter] = createSignal<RequestStatus | 'all'>('pending');
  const [reviewing, setReviewing] = createSignal<ItemRequest | null>(null);

  const counts = createMemo(() => ({
    all: props.requests.length,
    pending: props.requests.filter(r => r.status === 'pending').length,
    approved: props.requests.filter(r => r.status === 'approved').length,
    rejected: props.requests.filter(r => r.status === 'rejected').length,
  }));

  const rows = () => {
    const f = filter();
    return f === 'all'
      ? props.requests
      : props.requests.filter(r => r.status === f);
  };

  const columns = (): Column<ItemRequest, never, never>[] => [
    {
      c: { key: 'requestedAt' },
      header: () => 'Requested',
      cell: info => formatWhen(info.row.original.requestedAt),
      size: remToPx(9),
    },
    {
      c: { id: 'kind' },
      header: () => 'Kind',
      cell: info => {
        const request = info.row.original;
        return request.kind === 'import-batch'
          ? `${KIND_LABEL[request.kind]} (${request.itemCount} items)`
          : KIND_LABEL[request.kind];
      },
      size: remToPx(11),
    },
    { c: { key: 'summary' }, header: () => 'Proposed', maxSize: remToPx(22) },
    { c: { key: 'requestedBy' }, header: () => 'Requested by', size: remToPx(9) },
    {
      c: { id: 'status' },
      header: () => 'Status',
      cell: info => {
        const chip = STATUS_CHIP[info.row.original.status];
        return <StatusChip label={chip.label} colour={chip.colour} />;
      },
      size: remToPx(7),
    },
    {
      // Why a pending row cannot be actioned by THIS user, in the row itself,
      // so the queue explains itself without opening every request.
      c: { id: 'note' },
      header: () => 'Note',
      cell: info => {
        const request = info.row.original;
        if (request.status === 'rejected') return request.reason ?? '';
        if (request.status === 'approved')
          return `Approved by ${request.decidedBy}`;
        return approvalBlock(request, CURRENT_USER) ?? 'Ready for your review';
      },
    },
  ];

  return (
    <>
      <div class={styles.wizardBody}>
        <div class={styles.wideInner}>
          <Alert severity="info">
            Nothing proposed here has reached a facility yet. A change becomes
            central data only when it is approved, and no one can approve their
            own request.
          </Alert>

          <div class={styles.chipBar} style={{ 'margin-block-start': 'var(--space-4)' }}>
            <For each={FILTERS}>
              {f => (
                <CheckboxButton
                  checked={filter() === f.key}
                  onChange={() => setFilter(f.key)}
                >
                  {f.label} <span class={styles.chipCount}>{counts()[f.key]}</span>
                </CheckboxButton>
              )}
            </For>
          </div>

          <DataTable
            columns={columns()}
            rows={rows()}
            rowKey={r => r.id}
            onRowClick={request => setReviewing(request)}
            // Pending rows that this user can act on carry the needs-action
            // marking, so the actionable work reads down one edge.
            rowTint={r =>
              r.status === 'pending' && !approvalBlock(r, CURRENT_USER)
                ? 'unfinished'
                : undefined
            }
            rowAccent={r =>
              r.status === 'pending' && !approvalBlock(r, CURRENT_USER)
                ? 'unfinished'
                : undefined
            }
            rowState={r => (r.status === 'rejected' ? 'disabled' : undefined)}
            emptyMessage="No requests with that status."
          />
        </div>
      </div>

      <ReviewRequestModal
        request={reviewing()}
        onClose={() => setReviewing(null)}
        onDecide={props.onDecide}
      />
    </>
  );
};

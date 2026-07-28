import { createResource, type Component } from 'solid-js';
import { t } from '../../../intl';
import { graphqlFetch } from '../../../api/graphql';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Button } from '../../../ui/elements/buttons/Button';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { PrescriptionHistory } from './history.generated';
import { historyRows, type HistoryRow } from './historyMerge';

// The recently-prescribed history (spec/prescriptions/ui-surface.md S6;
// AC-H1): every other prescription of the patient past NEW, newest first
// (capped at 20 by the query), one row per item with the lines merged. A
// read-only table in a dialog; OK closes.

export interface HistoryModalProps {
  storeId: string;
  patientId: string;
  /** The open prescription — excluded from its own history. */
  excludeInvoiceId: string;
  onClose: () => void;
}

export const HistoryModal: Component<HistoryModalProps> = props => {
  const [data] = createResource(async () => {
    const result = await graphqlFetch(PrescriptionHistory, {
      storeId: props.storeId,
      patientId: props.patientId,
      // Past NEW (rules § history): the equal-any set, CANCELLED included —
      // a cancelled dispense is still history.
      statuses: ['PICKED', 'VERIFIED', 'CANCELLED'],
    });
    if (result.kind !== 'success') return undefined;
    return historyRows(
      result.data.invoices.nodes.filter(
        invoice => invoice.id !== props.excludeInvoiceId
      )
    );
  });
  // State-gated (never suspends): this resource FIRST-fetches while the
  // modal is already open over the detail — a suspending read would remount
  // the page under it (kdd/solid-reactivity-pitfalls § no remounts).
  const rows = (): HistoryRow[] =>
    (data.state === 'ready' || data.state === 'refreshing'
      ? data.latest
      : undefined) ?? [];

  const columns = (): Column<HistoryRow, never>[] => [
    { c: { key: 'itemName' }, header: () => t('report.item-name') },
    {
      c: { key: 'units' },
      header: () => t('label.unit-quantity'),
      ...getNumberCell(),
    },
    { c: { key: 'directions' }, header: () => t('label.directions') },
    { c: { key: 'date' }, header: () => t('label.date'), ...getDateCell() },
    { c: { key: 'prescriber' }, header: () => t('label.prescriber') },
  ];

  return (
    <Dialog
      open
      onClose={props.onClose}
      size="large"
      title={t('heading.recently-prescribed')}
      testId="prescription-history-modal"
      actions={
        <Button data-testid="dialog-button-ok" onClick={props.onClose}>
          {t('button.ok')}
        </Button>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={row => row.id}
        loading={data.loading}
        emptyMessage={t('error.no-results')}
      />
    </Dialog>
  );
};

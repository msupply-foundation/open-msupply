import { type Component } from 'solid-js';
import { t } from '../../../intl';
import { Button } from '../../../ui/elements/buttons/Button';
import { PlusCircleIcon } from '../../../ui/icons';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getNumberCell,
  getTextCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import { hasPermission } from '../../../store/storeContext';
import type { StockLineVvmLogFragment } from './stockLine.generated';

// The stock-line detail "VVM history" tab (spec/stock S2 › VVM history, FL7).
// The line's VVM status entries: date, time, VVM status, distribution priority,
// entered by, comment. A "New status entry" action (opens S6); selecting an
// entry opens S6 to edit its comment. Gated to vaccine items with
// manageVvmStatusForStock on (the tab is only mounted then). Recording /
// editing requires the VVM permission; viewing needs only stock-view.

type Log = StockLineVvmLogFragment;

export const VvmHistoryPanel: Component<{
  logs: Log[];
  onNewEntry: () => void;
  onEditEntry: (entry: Log) => void;
}> = props => {
  const canEdit = () => hasPermission('VIEW_AND_EDIT_VVM_STATUS');

  // Newest-first by created time (ids/datetime monotonic).
  const rows = (): Log[] =>
    [...props.logs].sort((a, b) =>
      a.createdDatetime < b.createdDatetime ? 1 : -1
    );

  // Cell rendering + widths from the shared presets (docs/CELL_TYPES.md). Note
  // the free-text Comment column deliberately does NOT use the `comment` key —
  // that preset is the icon-and-popover cell, and this column shows the text
  // itself.
  const columns = (): Column<Log, never>[] => [
    {
      c: { accessor: l => l.createdDatetime, id: 'date' },
      header: () => t('label.date'),
      ...getCellDefinition('date'),
    },
    {
      c: { accessor: l => l.createdDatetime, id: 'time' },
      header: () => t('label.time'),
      ...getCellDefinition('time'),
    },
    {
      c: { accessor: l => l.status?.description ?? '', id: 'status' },
      header: () => t('label.vvm-status'),
      ...getCellDefinition('vvmStatus'),
    },
    {
      c: { accessor: l => l.status?.priority ?? '', id: 'priority' },
      header: () => t('label.distribution-priority'),
      // A number cell formats and right-aligns; a log with no status resolves
      // to '' above and renders blank.
      ...getNumberCell(),
      size: remToPx(9),
    },
    {
      c: { accessor: l => l.user?.username ?? '', id: 'user' },
      header: () => t('label.entered-by'),
      ...getCellDefinition('user'),
    },
    {
      c: { accessor: l => l.comment ?? '', id: 'comment' },
      header: () => t('label.comment'),
      ...getTextCell({ wrapLines: 2 }),
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'column',
        gap: 'var(--space-3)',
      }}
    >
      <div style={{ display: 'flex', 'justify-content': 'flex-end' }}>
        <Button
          icon={<PlusCircleIcon />}
          data-testid="new-vvm-status-button"
          disabled={!canEdit()}
          onClick={props.onNewEntry}
        >
          {t('button.new-status-entry')}
        </Button>
      </div>
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={l => l.id}
        onRowClick={canEdit() ? props.onEditEntry : undefined}
        emptyMessage={t('messages.no-vvm-history')}
      />
    </div>
  );
};

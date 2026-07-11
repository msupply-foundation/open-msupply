import { Show, type JSX } from 'solid-js';
import { t } from '../../intl';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import {
  DataTable,
  type Column,
  type TabAndCardGroup,
  ALL_TABS,
} from '../../ui/elements/table/DataTable';
import { getDateCell, getNumberCell } from '../../ui/elements/table/tableHelpers';
import { StockIcon, InfoIcon } from '../../ui/icons';
import { createTableConfig } from '../../api/createTableConfig';
import type { StocktakeDetailResult } from './stocktakeDetail.generated';

// A deliberately BASIC, read-only modal that opens on a detail-view row click. Its whole point
// is to demonstrate the DataTable's grouped CARD view (kdd/table-state / kdd/edit-line-card-table):
// the same one column set renders as tabs in table view and as grouped card sections in card
// view. Here the table is forced to card view (viewMode 'card') and rendered read-only — no
// inputs, no mutation. (Editing those lines — the batchStocktake mutation, the draft store, the
// editable cells — is deferred to a later branch.)

type StocktakeNode = Extract<StocktakeDetailResult['stocktake'], { __typename: 'StocktakeNode' }>;
type Line = StocktakeNode['lines']['nodes'][number];

// The card sections for the grouped view. Batch is NOT a group — it's an ALL_TABS anchor (the
// card title). The rest split across two sections.
type GroupKey = 'batch' | 'other';
const TABS_AND_CARD_GROUPS: TabAndCardGroup<GroupKey>[] = [
  { key: 'batch', labelKey: 'stocktake.column.batch', icon: () => <StockIcon /> },
  { key: 'other', labelKey: 'stocktake.detail.info-heading', icon: () => <InfoIcon /> },
];

interface StocktakeLineCardModalProps {
  open: boolean;
  onClose: () => void;
  /** The clicked line's item name (modal title) — undefined when nothing is open. */
  itemName?: string;
  /** The lines to show as cards (all the clicked item's batches). */
  lines: Line[];
}

export const StocktakeLineCardModal = (props: StocktakeLineCardModalProps): JSX.Element => {
  // Force CARD view — this modal exists to show the grouped card face. It's its own tableId so
  // the demo's card mode doesn't touch the detail table's config.
  const tableConfig = createTableConfig({
    tableId: 'stocktake-line-card-demo',
    defaultConfig: { base: { viewMode: 'card' } },
  });

  // Read-only columns: batch is the ALL_TABS anchor + the card title (meta.card primary); the
  // rest fall into the two card sections. No `cell` inputs — values render as-is / formatted.
  const columns = (): Column<Line, never, GroupKey>[] => [
    {
      c: { key: 'batch' },
      header: t('stocktake.column.batch'),
      tabsAndCardGroups: ALL_TABS,
      meta: { card: { region: 'primary', showLabel: true } },
      cell: (info) => info.getValue<string | null>() ?? '—',
    },
    {
      c: { key: 'countedNumberOfPacks' },
      header: t('stocktake.column.counted'),
      tabsAndCardGroups: ALL_TABS,
      ...getNumberCell({ card: { region: 'badge' } }),
      cell: (info) => info.getValue<number | null>() ?? '—',
    },
    {
      c: { key: 'expiryDate' },
      header: t('stocktake.column.expiry'),
      tabsAndCardGroups: ['batch'],
      ...getDateCell(),
    },
    {
      c: { key: 'snapshotNumberOfPacks' },
      header: t('stocktake.column.snapshot'),
      tabsAndCardGroups: ['batch'],
      ...getNumberCell(),
    },
    {
      c: { key: 'comment' },
      header: t('stocktake.detail.comment'),
      tabsAndCardGroups: ['other'],
      cell: (info) => info.getValue<string | null>() ?? '—',
    },
  ];

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.itemName ?? t('stocktake.detail.title', { number: '' })}
      size="large"
    >
      <Show when={props.open}>
        <DataTable
          columns={columns()}
          rows={props.lines}
          rowKey={(line) => line.id}
          tabsAndCardGroups={TABS_AND_CARD_GROUPS}
          showFullScreen={false}
          config={tableConfig.config()}
          setConfig={tableConfig.setConfig}
          emptyMessage={t('stocktake.detail.empty')}
        />
      </Show>
    </Dialog>
  );
};

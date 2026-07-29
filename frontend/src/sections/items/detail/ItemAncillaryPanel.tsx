import {
  createMemo,
  createResource,
  createSignal,
  Show,
  type Component,
} from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { createTableConfig } from '../../../api/createTableConfig';
import { t } from '../../../intl';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getTextCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import { Button } from '../../../ui/elements/buttons/Button';
import { TrashIcon } from '../../../ui/icons';
import { ItemAncillaryItems } from './ancillaryItems.generated';
import { DeleteAncillaryItem } from './ancillaryItemMutations.generated';
import { formatRatio } from './ancillaryItemEdit';
import {
  AncillaryItemEditModal,
  type AncillaryEditorState,
  type AncillaryRow,
} from './AncillaryItemEditModal';

// The Ancillary items tab (spec/items S2 › Ancillary items tab, rules.md §
// ancillary supplies). Read-only everywhere; add/edit/delete are
// central-server-only (OMS-REG-CAT-08.1) — the caller passes `isCentral`
// (isCentralServer(), shared with the Variants tab's gating) so this panel
// never needs its own central check. Its own query (kdd/state-management),
// independent of the itemDetail read, so a save/delete refetches only this
// tab.

// The ratio column's width (rem) — "1:2" is tiny, so the header "Ratio" is the
// binding constraint.
const RATIO_WIDTH_REM = 4;

export const ItemAncillaryPanel: Component<{
  storeId: string;
  itemId: string;
  isCentral: boolean;
  editor: AncillaryEditorState | undefined;
  onEditorChange: (editor: AncillaryEditorState | undefined) => void;
}> = props => {
  const [pendingDelete, setPendingDelete] = createSignal<AncillaryRow>();

  // Column config — also what puts the Columns + Settings controls in the
  // table's toolbar (DataTable renders both only when `setConfig` is wired).
  const tableConfig = createTableConfig({ tableId: 'item-ancillary-items' });

  const [data, { refetch }] = createResource(
    () => ({ storeId: props.storeId, itemId: props.itemId }),
    async v => {
      const result = await graphqlFetch(ItemAncillaryItems, v);
      if (result.kind !== 'success') return undefined;
      return result.data.items.nodes[0]?.ancillaryItems ?? [];
    }
  );

  // Read WITHOUT suspending: this panel mounts when its TAB is opened, so its
  // FIRST read is pending under the already-open detail screen's <Suspense> —
  // a suspending read there tears down and remounts the whole screen. `.latest`
  // alone is not enough (it suspends on the first pending read), so gate on
  // `.state` (kdd/solid-reactivity-pitfalls § no remounts on interaction).
  const rows = (): AncillaryRow[] =>
    data.state === 'ready' || data.state === 'refreshing'
      ? (data.latest ?? [])
      : [];

  const onSaved = () => {
    props.onEditorChange(undefined);
    void refetch();
  };

  const confirmDelete = async () => {
    // Captured before ConfirmDialog's own onClose (fired right after
    // onConfirm, synchronously) clears pendingDelete.
    const row = pendingDelete();
    if (!row) return;
    const result = await graphqlFetch(DeleteAncillaryItem, {
      storeId: props.storeId,
      input: { id: row.id },
    });
    // Failure (transport/unexpected — no typed error exists for this delete)
    // → the global modal already surfaced it; the table simply stays as-is.
    if (result.kind === 'success') void refetch();
  };

  // createMemo, NOT a plain function: TanStack memoizes on this array's
  // REFERENCE, so a fresh one per read invalidates four layers of its internal
  // memo chain (kdd/solid-reactivity-pitfalls §14). Re-derives when the central
  // gate or the language changes.
  const columns = createMemo((): Column<AncillaryRow, never>[] => {
    const cols: Column<AncillaryRow, never>[] = [
      {
        c: { accessor: row => row.ancillaryItem?.name ?? '', id: 'name' },
        header: () => t('label.ancillary-item'),
        ...getCellDefinition('name'),
      },
      {
        c: { accessor: row => row.ancillaryItem?.code ?? '', id: 'code' },
        header: () => t('label.code'),
        ...getCellDefinition('code'),
      },
      {
        c: {
          accessor: row => formatRatio(row.itemQuantity, row.ancillaryQuantity),
          id: 'ratio',
        },
        header: () => t('label.ratio'),
        // A pre-formatted "x:y" string, so no preset key fits — the explicit
        // text helper plus its own width (docs/CELL_TYPES.md § Width model).
        ...getTextCell(),
        size: remToPx(RATIO_WIDTH_REM),
      },
    ];
    if (props.isCentral) {
      cols.push({
        // A structural actions column — never a cell preset
        // (docs/CELL_TYPES.md § Not cell types).
        c: { id: 'delete' },
        header: () => t('label.delete'),
        cell: info => (
          <IconButton
            icon={<TrashIcon />}
            label={t('label.delete')}
            variant="danger"
            onClick={e => {
              e.stopPropagation();
              setPendingDelete(info.row.original);
            }}
          />
        ),
      });
    }
    return cols;
  });

  return (
    <>
      {/* No <Show> wrapper around the table: the DataTable owns the empty
          treatment, and gating on the row count would take the column headers
          down with it AND show "nothing here" during the first fetch instead of
          the spinner (ui-standards § tables → empty & loading). The create
          affordance rides the table's own `empty` slot — central only. */}
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={row => row.id}
        loading={data.loading}
        onRowClick={
          props.isCentral
            ? row => props.onEditorChange({ mode: 'edit', row })
            : undefined
        }
        emptyMessage={t('messages.no-ancillary-items')}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        configIsDefault={tableConfig.isConfigDefault()}
        onSaveGlobalDefault={
          tableConfig.canSaveGlobalDefault()
            ? tableConfig.saveGlobalTableConfig
            : undefined
        }
        empty={
          <Show when={props.isCentral}>
            <Button
              variant="ghost"
              onClick={() => props.onEditorChange({ mode: 'create' })}
            >
              {t('label.add-ancillary-item')}
            </Button>
          </Show>
        }
      />

      <Show when={props.editor}>
        {editor => (
          <AncillaryItemEditModal
            storeId={props.storeId}
            principalItemId={props.itemId}
            editor={editor()}
            existingAncillaryItemIds={rows()
              .map(row => row.ancillaryItem?.id)
              .filter((id): id is string => !!id)}
            onClose={() => props.onEditorChange(undefined)}
            onSaved={onSaved}
          />
        )}
      </Show>

      <Show when={pendingDelete()}>
        <ConfirmDialog
          open
          title={t('heading.are-you-sure')}
          message={t('messages.confirm-delete-ancillary-item')}
          confirmLabel={t('button.delete')}
          confirmVariant="danger"
          onConfirm={() => void confirmDelete()}
          onClose={() => setPendingDelete(undefined)}
        />
      </Show>
    </>
  );
};

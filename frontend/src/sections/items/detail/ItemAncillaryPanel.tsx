import { createResource, createSignal, Show, type Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import { EmptyState } from '../../../ui/elements/feedback/EmptyState';
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

export const ItemAncillaryPanel: Component<{
  storeId: string;
  itemId: string;
  isCentral: boolean;
  editor: AncillaryEditorState | undefined;
  onEditorChange: (editor: AncillaryEditorState | undefined) => void;
}> = props => {
  const [pendingDelete, setPendingDelete] = createSignal<AncillaryRow>();

  const [data, { refetch }] = createResource(
    () => ({ storeId: props.storeId, itemId: props.itemId }),
    async v => {
      const result = await graphqlFetch(ItemAncillaryItems, v);
      if (result.kind !== 'success') return undefined;
      return result.data.items.nodes[0]?.ancillaryItems ?? [];
    }
  );

  const rows = (): AncillaryRow[] => data.latest ?? [];

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

  const columns = (): Column<AncillaryRow, never>[] => {
    const cols: Column<AncillaryRow, never>[] = [
      {
        c: { accessor: row => row.ancillaryItem?.name ?? '', id: 'name' },
        header: () => t('label.ancillary-item'),
      },
      {
        c: { accessor: row => row.ancillaryItem?.code ?? '', id: 'code' },
        header: () => t('label.code'),
      },
      {
        c: {
          accessor: row => formatRatio(row.itemQuantity, row.ancillaryQuantity),
          id: 'ratio',
        },
        header: () => t('label.ratio'),
      },
    ];
    if (props.isCentral) {
      cols.push({
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
  };

  return (
    <>
      <Show
        when={rows().length > 0}
        fallback={
          <EmptyState message={t('messages.no-ancillary-items')}>
            <Show when={props.isCentral}>
              <Button
                variant="ghost"
                onClick={() => props.onEditorChange({ mode: 'create' })}
              >
                {t('label.add-ancillary-item')}
              </Button>
            </Show>
          </EmptyState>
        }
      >
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
        />
      </Show>

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

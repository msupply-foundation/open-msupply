import {
  createMemo,
  createResource,
  createSignal,
  Show,
  type Component,
} from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { createTableConfig } from '../../../api/createTableConfig';
import { t } from '../../../intl';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getTextCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { HStack } from '../../../ui/layout/Stack/HStack';
import {
  confirmProposal,
  removeBarcode,
  type BarcodeChange,
} from '../../../domain/barcode';
import { ItemBarcodes } from './itemBarcodes.generated';
import { ItemBarcodeModal, type BarcodeEditorState } from './ItemBarcodeModal';
import {
  barcodeRows,
  type BarcodeRow,
  type ConfirmedBarcode,
  type NamedItem,
} from './barcodeEdit';

// The Barcodes tab (spec/items/ui-surface.md S2 › Barcodes tab;
// barcode-scanning rules § Maintaining barcodes): the item's confirmed
// barcodes, with pack size and manufacturer, then the proposals central hasn't
// decided on
// — every store's on central, this site's elsewhere — saying which store made
// each. Only central changes barcodes: there, where the user may (`canManage`,
// rules § Permissions), a proposal offers Confirm and a confirmed barcode
// offers Remove and Move to another item…. The page header offers Add barcode
// wherever the user may: on central it confirms the barcode, elsewhere it
// proposes it. Add and Move open ItemBarcodeModal, whose state the detail view
// owns (the Add trigger is a page action, as on the Ancillary items tab);
// Remove asks first. Removing a barcode never touches stock or shipments that
// already have it. Its own query, so a change refetches only this tab.

// Room for a 14-digit code.
const BARCODE_WIDTH_REM = 10;
const { maxSize: _codeCap, ...codeCell } =
  getCellDefinition<BarcodeRow>('code');

export const ItemBarcodesPanel: Component<{
  storeId: string;
  item: NamedItem;
  /** Confirm, move and remove are central's. */
  isCentral: boolean;
  canManage: boolean;
  editor: BarcodeEditorState | undefined;
  onEditorChange: (editor: BarcodeEditorState | undefined) => void;
}> = props => {
  const tableConfig = createTableConfig({ tableId: 'item-barcodes' });

  const [data, { refetch }] = createResource(
    () => ({ storeId: props.storeId, itemId: props.item.id }),
    async v => {
      const result = await graphqlFetch(ItemBarcodes, v);
      if (result.kind !== 'success') return undefined;
      return barcodeRows(result.data);
    }
  );

  // Read WITHOUT suspending: this panel mounts when its TAB is opened, under
  // the already-open detail screen's <Suspense> (kdd/solid-reactivity-pitfalls
  // § no remounts on interaction).
  const rows = (): BarcodeRow[] => gated(data) ?? [];

  const onSaved = () => void refetch();

  // The row whose removal is being asked about, and the last action failure.
  const [removing, setRemoving] = createSignal<ConfirmedBarcode>();
  const [actionError, setActionError] = createSignal<string>();
  const [acting, setActing] = createSignal(false);

  const act = async (run: () => Promise<BarcodeChange>) => {
    if (acting()) return;
    setActing(true);
    setActionError(undefined);
    const result = await run();
    setActing(false);
    if (result.kind === 'error') setActionError(result.message);
    else onSaved();
  };

  // createMemo: TanStack memoizes on the array's reference
  // (kdd/solid-reactivity-pitfalls §14). Re-derives when the permission gate
  // or the language changes.
  const columns = createMemo((): Column<BarcodeRow, never>[] => {
    const cols: Column<BarcodeRow, never>[] = [
      {
        c: { accessor: row => row.barcode.barcode, id: 'barcode' },
        header: () => t('label.barcode'),
        enableSorting: false,
        // A code, but up to 14 digits (an ITF-14) or longer: the code preset's
        // ~9-character cap would truncate it, so it is widened and its hard
        // cap dropped — by removing the key, since an explicit
        // `maxSize: undefined` would override TanStack's own default.
        ...codeCell,
        size: remToPx(BARCODE_WIDTH_REM),
      },
      {
        c: {
          accessor: row => row.barcode.packSize ?? undefined,
          id: 'packSize',
        },
        header: () => t('label.pack-size'),
        enableSorting: false,
        ...getCellDefinition('packSize'),
      },
      {
        c: {
          accessor: row =>
            row.status === 'confirmed'
              ? (row.barcode.manufacturerName ?? '')
              : '',
          id: 'manufacturer',
        },
        header: () => t('label.manufacturer'),
        enableSorting: false,
        ...getTextCell(),
      },
      {
        c: {
          accessor: row =>
            row.status === 'confirmed'
              ? t('label.barcode-confirmed')
              : t('label.barcode-proposed-by', {
                  store:
                    row.barcode.store?.storeName ??
                    row.barcode.store?.code ??
                    '',
                }),
          id: 'status',
        },
        header: () => t('label.barcode-status'),
        enableSorting: false,
        ...getTextCell(),
      },
    ];
    if (props.isCentral && props.canManage) {
      cols.push({
        // A structural actions column — never a cell preset
        // (docs/CELL_TYPES.md § Not cell types).
        c: { id: 'actions' },
        header: () => '',
        enableSorting: false,
        cell: info => {
          const row = info.row.original;
          return (
            <Show
              when={row.status === 'proposed'}
              fallback={
                <HStack gap="sm">
                  <Button
                    variant="ghost"
                    size="small"
                    data-testid="barcode-remove-button"
                    disabled={acting()}
                    onClick={e => {
                      e.stopPropagation();
                      if (row.status === 'confirmed') setRemoving(row.barcode);
                    }}
                  >
                    {t('button.remove-barcode')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    data-testid="barcode-move-button"
                    onClick={e => {
                      e.stopPropagation();
                      if (row.status === 'confirmed')
                        props.onEditorChange({
                          mode: 'move',
                          row: row.barcode,
                        });
                    }}
                  >
                    {t('button.move-barcode')}
                  </Button>
                </HStack>
              }
            >
              <Button
                variant="ghost"
                size="small"
                data-testid="barcode-confirm-button"
                disabled={acting()}
                onClick={e => {
                  e.stopPropagation();
                  const id = row.barcode.id;
                  const storeId = props.storeId;
                  void act(() => confirmProposal(storeId, id));
                }}
              >
                {t('button.confirm-barcode')}
              </Button>
            </Show>
          );
        },
      });
    }
    return cols;
  });

  return (
    <>
      <Show when={actionError()}>
        {message => (
          <Alert severity="error" testId="item-barcode-action-error">
            {message()}
          </Alert>
        )}
      </Show>
      {/* No <Show> around the table: the DataTable owns the empty and
          loading treatments (ui-standards § tables → empty & loading). */}
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={row => `${row.status}:${row.barcode.id}`}
        loading={data.loading}
        emptyMessage={t('messages.no-barcodes')}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        configIsDefault={tableConfig.isConfigDefault()}
        onSaveGlobalDefault={
          tableConfig.canSaveGlobalDefault()
            ? tableConfig.saveGlobalTableConfig
            : undefined
        }
        empty={
          <Show when={props.canManage}>
            <Button
              variant="ghost"
              onClick={() => props.onEditorChange({ mode: 'add' })}
            >
              {t('label.add-barcode')}
            </Button>
          </Show>
        }
      />

      <ConfirmDialog
        open={removing() !== undefined}
        title={t('title.remove-barcode')}
        message={t('messages.confirm-remove-barcode', {
          barcode: removing()?.barcode ?? '',
        })}
        confirmLabel={t('button.remove-barcode')}
        onConfirm={() => {
          const row = removing();
          const storeId = props.storeId;
          setRemoving(undefined);
          if (row) void act(() => removeBarcode(storeId, row.id));
        }}
        onClose={() => setRemoving(undefined)}
      />

      <Show when={props.editor}>
        {editor => (
          <ItemBarcodeModal
            storeId={props.storeId}
            item={props.item}
            isCentral={props.isCentral}
            editor={editor()}
            onClose={() => props.onEditorChange(undefined)}
            onSaved={onSaved}
          />
        )}
      </Show>
    </>
  );
};

import {
  createMemo,
  createResource,
  createSignal,
  Match,
  Show,
  Switch,
  type Component,
} from 'solid-js';
import { describeErrors, graphqlFetch } from '../../../api/graphql';
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
  removeBarcode,
  withdrawProposal,
  type BarcodeChange,
} from '../../../domain/barcode';
import { ItemBarcodes } from './itemBarcodes.generated';
import { PromoteItemVariant } from './itemVariantMutations.generated';
import { ItemBarcodeModal, type BarcodeEditorState } from './ItemBarcodeModal';
import {
  barcodeRows,
  barcodeVariants,
  canWithdraw,
  manufacturerLabel,
  thisSiteId,
  variantLabel,
  type BarcodeRow,
  type NamedItem,
} from './barcodeEdit';

// The Barcodes tab (spec/items/ui-surface.md S2 › Barcodes tab;
// barcode-scanning rules § Maintaining barcodes): the item's confirmed
// barcodes, with pack size, manufacturer and the variant each is on, then the
// proposals central hasn't decided on — every store's on central, this site's
// elsewhere — saying which store made each. A confirmed barcode lives on one
// of the item's packaging variants; one central put there on its own is on an
// auto-created variant, hidden from variant lists, and says "Barcode only"
// (decisions/2026-09-30_barcodes.md, Option 6). Where the user may
// (`canManage`, `canMakeVariant`, rules § Permissions): on central a proposal
// offers Confirm, which asks where the barcode goes, and a confirmed barcode
// offers Remove, plus Make a variant when it's barcode only; elsewhere confirmed barcodes
// are read-only. A proposal made on this site (on central, by one of its own
// stores) also offers Remove, which withdraws it (e.g. it picked the wrong
// item); another site's proposal is that site's to withdraw. The page header
// offers Add barcode wherever the user may: on central it confirms the
// barcode, elsewhere it proposes it. Add and Confirm open ItemBarcodeModal,
// whose state the detail view owns (the Add trigger is a page action, as on
// the Ancillary items tab); Remove and Make a variant ask first. Removing
// never touches stock or shipments that already have the barcode. A barcode
// on the wrong item is removed here and added on the right one. Its own
// query, so a change refetches only this tab.

/**
 * Central: make the auto-created variant a barcode-only row is on a real one,
 * so it shows on the Variants tab and in pickers. It keeps its id, so stock
 * already on it stays linked, and any other barcodes on it go with it.
 */
const promoteVariant = async (
  storeId: string,
  id: string
): Promise<BarcodeChange> => {
  const result = await graphqlFetch(
    PromoteItemVariant,
    { storeId, id },
    { returnGraphqlErrors: true }
  );
  if (result.kind === 'success') return { kind: 'saved' };
  const error =
    result.kind === 'graphqlError'
      ? describeErrors(result.errors)
      : result.kind;
  return {
    kind: 'error',
    message: t('error.unable-to-make-variant', { error }),
  };
};

// Room for a 14-digit code.
const BARCODE_WIDTH_REM = 10;
const { maxSize: _codeCap, ...codeCell } =
  getCellDefinition<BarcodeRow>('code');

export const ItemBarcodesPanel: Component<{
  storeId: string;
  item: NamedItem;
  /** Confirm, remove and make a variant are central's. */
  isCentral: boolean;
  canManage: boolean;
  /** Make a variant is variant editing, gated apart from barcodes. */
  canMakeVariant: boolean;
  editor: BarcodeEditorState | undefined;
  onEditorChange: (editor: BarcodeEditorState | undefined) => void;
}> = props => {
  const tableConfig = createTableConfig({ tableId: 'item-barcodes' });

  const [data, { refetch }] = createResource(
    () => ({ storeId: props.storeId, itemId: props.item.id }),
    async v => {
      const result = await graphqlFetch(ItemBarcodes, v);
      if (result.kind !== 'success') return undefined;
      return {
        rows: barcodeRows(result.data),
        variants: barcodeVariants(result.data),
        siteId: thisSiteId(result.data),
      };
    }
  );

  // Read WITHOUT suspending: this panel mounts when its TAB is opened, under
  // the already-open detail screen's <Suspense> (kdd/solid-reactivity-pitfalls
  // § no remounts on interaction).
  const rows = (): BarcodeRow[] => gated(data)?.rows ?? [];
  const variants = () => gated(data)?.variants ?? [];
  const siteId = () => gated(data)?.siteId;

  const onSaved = () => void refetch();

  // The row whose removal is being asked about, the barcode-only row whose
  // variant is being made a real one, and the last action failure.
  const [removing, setRemoving] = createSignal<BarcodeRow>();
  const [promoting, setPromoting] = createSignal<BarcodeRow>();
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
        c: { accessor: manufacturerLabel, id: 'manufacturer' },
        header: () => t('label.manufacturer'),
        enableSorting: false,
        ...getTextCell(),
      },
      {
        c: { accessor: variantLabel, id: 'variant' },
        header: () => t('label.item-variant'),
        enableSorting: false,
        ...getTextCell(),
      },
      {
        c: {
          accessor: row =>
            row.status === 'confirmed'
              ? row.barcode.isAutoCreated
                ? t('label.barcode-confirmed-barcode-only')
                : t('label.barcode-confirmed')
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
    if (props.canManage || props.canMakeVariant) {
      cols.push({
        // A structural actions column — never a cell preset
        // (docs/CELL_TYPES.md § Not cell types).
        c: { id: 'actions' },
        header: () => '',
        enableSorting: false,
        cell: info => {
          const row = info.row.original;
          const removeButton = () => (
            <Button
              variant="ghost"
              size="small"
              data-testid="barcode-remove-button"
              disabled={acting()}
              onClick={e => {
                e.stopPropagation();
                setRemoving(row);
              }}
            >
              {t('button.remove-barcode')}
            </Button>
          );
          // Confirmed: central removes it, and makes a barcode-only one's
          // variant a real one. Proposed: central confirms it, and this site
          // may withdraw its own (canWithdraw) — on central only its own
          // stores' proposals.
          return (
            <Switch>
              <Match when={row.status === 'confirmed' && props.isCentral}>
                <HStack gap="sm">
                  <Show when={props.canManage}>{removeButton()}</Show>
                  <Show
                    when={
                      props.canMakeVariant &&
                      row.status === 'confirmed' &&
                      row.barcode.isAutoCreated
                    }
                  >
                    <Button
                      variant="ghost"
                      size="small"
                      data-testid="barcode-promote-button"
                      disabled={acting()}
                      onClick={e => {
                        e.stopPropagation();
                        setPromoting(row);
                      }}
                    >
                      {t('button.make-variant')}
                    </Button>
                  </Show>
                </HStack>
              </Match>
              <Match
                when={
                  props.canManage &&
                  row.status === 'proposed' &&
                  props.isCentral
                }
              >
                <HStack gap="sm">
                  <Button
                    variant="ghost"
                    size="small"
                    data-testid="barcode-confirm-button"
                    disabled={acting()}
                    onClick={e => {
                      e.stopPropagation();
                      if (row.status === 'proposed')
                        props.onEditorChange({
                          mode: 'confirm',
                          row: row.barcode,
                        });
                    }}
                  >
                    {t('button.confirm-barcode')}
                  </Button>
                  <Show when={canWithdraw(row, true, siteId())}>
                    {removeButton()}
                  </Show>
                </HStack>
              </Match>
              <Match
                when={props.canManage && canWithdraw(row, false, siteId())}
              >
                {removeButton()}
              </Match>
            </Switch>
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
        message={
          removing()?.status === 'proposed'
            ? t('messages.confirm-withdraw-barcode-proposal', {
                barcode: removing()?.barcode.barcode ?? '',
              })
            : t('messages.confirm-remove-barcode', {
                barcode: removing()?.barcode.barcode ?? '',
              })
        }
        confirmLabel={t('button.remove-barcode')}
        onConfirm={() => {
          const row = removing();
          const storeId = props.storeId;
          setRemoving(undefined);
          if (!row) return;
          const id = row.barcode.id;
          void act(() =>
            row.status === 'proposed'
              ? withdrawProposal(storeId, id)
              : removeBarcode(storeId, id)
          );
        }}
        onClose={() => setRemoving(undefined)}
      />

      <ConfirmDialog
        open={promoting() !== undefined}
        title={t('title.make-variant')}
        message={t('messages.confirm-make-variant', {
          barcode: promoting()?.barcode.barcode ?? '',
        })}
        confirmLabel={t('button.make-variant')}
        onConfirm={() => {
          const row = promoting();
          const storeId = props.storeId;
          setPromoting(undefined);
          if (row?.status !== 'confirmed' || !row.barcode.itemVariantId) return;
          const id = row.barcode.itemVariantId;
          void act(() => promoteVariant(storeId, id));
        }}
        onClose={() => setPromoting(undefined)}
      />

      <Show when={props.editor}>
        {editor => (
          <ItemBarcodeModal
            storeId={props.storeId}
            item={props.item}
            isCentral={props.isCentral}
            variants={variants()}
            editor={editor()}
            onClose={() => props.onEditorChange(undefined)}
            onSaved={onSaved}
          />
        )}
      </Show>
    </>
  );
};

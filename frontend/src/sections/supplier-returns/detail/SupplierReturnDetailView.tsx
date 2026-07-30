import {
  createMemo,
  createResource,
  createSignal,
  Show,
  Suspense,
} from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t, tPlural } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { HeaderToolbar } from '../../../ui/layout/Header/HeaderToolbar';
import { Button } from '../../../ui/elements/buttons/Button';
import { OkButton } from '../../../ui/elements/buttons/StandardButtons';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import {
  Tabs,
  TabList,
  TabPanel,
  type TabDef,
} from '../../../ui/elements/tabs/Tabs';
import { createSidePanelOpen } from '../../../ui/layout/SidePanel/createSidePanelOpen';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import {
  InfoIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  SidebarIcon,
} from '../../../ui/icons';
import {
  DataTable,
  type CardGroup,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import { useUrlQueryState } from '../../../list/urlQueryState';
import {
  getCellDefinition,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import { createTableConfig } from '../../../api/createTableConfig';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import {
  CustomFieldsEditTab,
  CustomFieldsToolbar,
} from '../../../domain/customFields';
import {
  SupplierReturnDetail,
  SupplierReturnLines,
  type SupplierReturnInfoFragment,
  type SupplierReturnLineFragment,
  type SupplierReturnLinesVariables,
  type UpdateSupplierReturnVariables,
} from './supplierReturnDetail.generated';
import { SupplierReturnPreferences } from '../preferences.generated';
import { SupplierReturnToolbar } from './SupplierReturnToolbar';
import { SupplierReturnSidePanel } from './SupplierReturnSidePanel';
import { SupplierReturnStatusFooter } from './SupplierReturnStatusFooter';
import { LogTab } from './LogTab';
import {
  ReturnItemsModal,
  type ReturnItem,
} from './edit-modal/ReturnItemsModal';
import { isReturnDisabled } from './returnStatus';
import { changeSupplier, saveReturnFields } from './returnUpdate';
import type { ReturnEditFields } from './returnEdit';
import { ExportPrintAction } from './actions/ExportPrintAction';
import { DeleteLinesAction } from './actions/DeleteLinesAction';

// The supplier-return detail view (spec/supplier-returns/ui-surface.md S3):
// toolbar (supplier lookup / reference / prominent custom fields), Details |
// Custom fields | Log tabs, the read-only cost-valued line table (row click →
// the return-items modal), the Additional-info side panel, and the status
// footer (hold / lifecycle / close / advance). Every edit affordance shares the
// one editability gate (rules § editability): a SHIPPED return is read-only.

type Line = SupplierReturnLineFragment;

// The line table's sort keys, taken from the generated variables so a schema
// change is a compile error rather than a silently-ignored sort.
type SortKey = NonNullable<SupplierReturnLinesVariables['sort']>[number]['key'];

const DEFAULT_PAGE_SIZE = 20;

// The URL-backed view state (kdd/url-structure): sort + pagination in the one
// `?query=` JSON param, so a sorted/paged table is shareable and survives a
// reload or back-nav. Conforms to the generated supplierReturnLines variables
// (no remapping). Selection and the side-panel open state stay local (transient
// UI). The detail table offers no filter of its own — the invoiceId + type
// filter is pinned by the query, not the user.
type DetailUrlState = {
  sort: NonNullable<SupplierReturnLinesVariables['sort']>;
  offset: number;
  first: number;
};

const DEFAULT_URL_STATE: DetailUrlState = {
  // Default sort: item name ascending (ui-surface S3 § line table).
  sort: [{ key: 'itemName', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

// Card view (below 600px): the item name is the card title (headerPosition
// 'primary') and the packs its badge; Code / Batch / Expiry / Unit form the
// always-shown default group and every remaining column drops into one
// collapsed "More details" disclosure (ui-standards → CARD_TABLE_MODEL).
type GroupKey = 'more';
const CARD_GROUPS: CardGroup<Line, GroupKey>[] = [
  { key: 'more', disclosure: 'closed' },
];

const SupplierReturnDetailView: Component = () => {
  const params = useParams<{ storeId: string; returnId: string }>();
  const navigate = useNavigate();
  // Sort + pagination are URL-backed in one `?query=` param (spec rules §
  // server-paginated line table).
  const { query, setQuery } =
    useUrlQueryState<DetailUrlState>(DEFAULT_URL_STATE);
  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();
  const [supplierError, setSupplierError] = createSignal<string | undefined>();
  // Line selection (transient UI, like every other detail screen's): drives the
  // footer's bulk-action bar (ui-surface S3 § footer).
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);

  // A row open carries BOTH ids: the item decides which drafts load, the line
  // decides which of that item's batch rows takes focus.
  type EditState =
    | { mode: 'update'; itemId: string; lineId: string }
    | { mode: 'add' }
    | undefined;
  const [editState, setEditState] = createSignal<EditState>();

  const tableConfig = createTableConfig({ tableId: 'supplier-return-detail' });

  // Fetch the return's HEADER (the lines are their own query below). A
  // non-return / bad id resolves to undefined — the not-found deep-link alert
  // renders below (ui-surface S3 § tabs). The resource IS the local state for
  // the header: every return-level save writes back with `mutate`
  // (kdd/state-management).
  const [data, { mutate }] = createResource(
    () => ({ storeId: params.storeId, id: params.returnId }),
    async variables => {
      const result = await graphqlFetch(SupplierReturnDetail, variables, {
        mapSuccessToError: d =>
          d.invoice.__typename === 'NodeError'
            ? d.invoice.error.description
            : undefined,
      });
      if (result.kind !== 'success') return undefined;
      return result.data.invoice.__typename === 'InvoiceNode'
        ? result.data.invoice
        : undefined;
    }
  );

  const info = (): SupplierReturnInfoFragment | undefined => data();

  // ONE server-sorted, server-paginated page of the return's lines. invoiceId +
  // type are pinned (a supplier return's lines are STOCK_OUT); sort and page
  // come from the URL. Keyed on the SERIALISED variables (a stable string) so
  // identical query content never refetches (kdd/solid-reactivity-pitfalls).
  const linesVariables = createMemo<SupplierReturnLinesVariables>(() => ({
    storeId: params.storeId,
    filter: {
      invoiceId: { equalTo: params.returnId },
      type: { equalTo: 'STOCK_OUT' },
    },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));
  const [linesData, { refetch: refetchLines }] = createResource(
    () => JSON.stringify(linesVariables()),
    async serialised => {
      const result = await graphqlFetch(
        SupplierReturnLines,
        JSON.parse(serialised) as SupplierReturnLinesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.invoiceLines.__typename === 'InvoiceLineConnector'
        ? result.data.invoiceLines
        : undefined;
    }
  );
  // NON-suspending reads (kdd/solid-reactivity-pitfalls § no remounts on
  // interaction): a line save, a bulk delete, and every "Save & next" page
  // advance refetch this while the return-items modal is OPEN. A suspending
  // read would tear down the page's Suspense boundary and detach the <dialog>
  // (backdrop gone, focus lost). The `.state` gate keeps the current page on
  // screen while the fresh one lands.
  const linesReady = () =>
    linesData.state === 'ready' || linesData.state === 'refreshing';
  const rows = (): Line[] =>
    linesReady() ? (linesData.latest?.nodes ?? []) : [];
  // The return's WHOLE line count, not the held page's — the pager reads it, and
  // so does the no-lines status precondition: a page can be empty while later
  // pages hold lines.
  const totalCount = () =>
    linesReady() ? (linesData.latest?.totalCount ?? 0) : 0;
  const hasLines = () => totalCount() > 0;
  // Selection is per page, so the selected rows are always resolvable from the
  // held page.
  const selectedLines = (): Line[] =>
    rows().filter(line => selectedIds().includes(line.id));

  // A save-triggered refetch is SILENT: the table keeps its rows while the fresh
  // page swaps in, so a "Save & next" walk doesn't flash a loading treatment
  // behind the open modal. A user fetch (sort/page) shows it.
  const [silentRefetching, setSilentRefetching] = createSignal(false);
  const refetchAfterSave = async () => {
    setSilentRefetching(true);
    try {
      await refetchLines();
    } finally {
      setSilentRefetching(false);
    }
  };
  const tableLoading = () => linesData.loading && !silentRefetching();

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };
  // Header click: the table computed the next direction; record it as the
  // GraphQL sort array and go back to the first page.
  const onSort = (key: SortKey, desc: boolean) => {
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
    setSelectedIds([]);
  };

  // The store preferences the status controls key off (rules § preference
  // gates).
  const [prefs] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(SupplierReturnPreferences, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.preferences;
    }
  );
  // NON-suspending read (kdd/solid-reactivity-pitfalls § no remounts on
  // interaction): the footer's status controls read the options lazily as they
  // render, so a still-pending preference must never suspend this screen's
  // boundary — `.latest` alone would, on its first pending read, tearing down
  // the open screen. Unresolved = no restriction.
  const statusOptions = () =>
    prefs.state === 'ready' || prefs.state === 'refreshing'
      ? (prefs.latest?.invoiceStatusOptions ?? [])
      : [];

  // --- Return-level saves (updateSupplierReturn, spliced back, no refetch) ---

  const saveField = async (
    patch: Partial<Omit<UpdateSupplierReturnVariables['input'], 'id'>>
  ) => {
    const node = data();
    if (!node) return;
    const result = await saveReturnFields(params.storeId, {
      id: node.id,
      ...patch,
    });
    if (result.kind === 'saved') {
      const saved = result.node;
      mutate(prev => (prev ? { ...prev, ...saved } : prev));
    }
    return result;
  };

  // ONE debounced buffer for the as-you-type fields (toolbar reference + side
  // panel comment + transport reference) — a burst across them coalesces into
  // one save.
  const edit = createDebouncedEdit<ReturnEditFields>({
    id: () => data()?.id ?? '',
    initial: () => ({
      theirReference: data()?.theirReference ?? '',
      comment: data()?.comment ?? '',
      transportReference: data()?.transportReference ?? '',
    }),
    save: patch => void saveField(patch),
  });

  const setHold = (hold: boolean) => void saveField({ onHold: hold });
  const setColour = (colour: string) => void saveField({ colour });

  const saveCustomFields = async (
    patch: Record<string, unknown>
  ): Promise<boolean> => {
    const result = await saveField({ customFields: patch });
    return result?.kind === 'saved';
  };

  // Changing the supplier is a SEPARATE, delete-and-recreate mutation (rules §
  // header rules): success returns a NEW node under a NEW id, so navigate to
  // it; its typed rejections surface inline on the supplier lookup.
  const onChangeSupplier = async (supplierId: string) => {
    setSupplierError(undefined);
    const node = data();
    if (!node) return;
    const result = await changeSupplier(params.storeId, {
      id: node.id,
      otherPartyId: supplierId,
    });
    if (result.kind === 'saved')
      navigate(
        `/${params.storeId}/replenishment/supplier-return/${result.node.id}`
      );
    else if (result.kind === 'error') setSupplierError(result.message);
  };

  // A line save or bulk delete landed: drop the selection and refetch the held
  // page. The mutation's own line set is never spliced in — only the server
  // knows which lines belong on this sorted, paginated page.
  const onLinesChanged = () => {
    setSelectedIds([]);
    void refetchAfterSave();
  };

  const onAdvanced = (saved: SupplierReturnInfoFragment) =>
    mutate(prev => (prev ? { ...prev, ...saved } : prev));

  // --- The return-items modal's item plumbing ---

  const itemById = (id: string): ReturnItem | undefined => {
    const line = rows().find(l => l.item.id === id);
    return line ? { id, code: line.item.code, name: line.itemName } : undefined;
  };

  // The distinct item AFTER currentId in the current row order ("Save & next").
  const nextItem = (currentId: string): ReturnItem | undefined => {
    const seen = new Set<string>();
    let past = false;
    for (const line of rows()) {
      const id = line.item.id;
      if (id === currentId) {
        past = true;
        seen.add(id);
        continue;
      }
      if (past && !seen.has(id))
        return { id, code: line.item.code, name: line.itemName };
      seen.add(id);
    }
    return undefined;
  };

  const existingItemIds = (): string[] => [
    ...new Set(rows().map(line => line.item.id)),
  ];
  const existingLineIds = (): ReadonlySet<string> =>
    new Set(rows().map(line => line.id));

  const openRow = (line: Line) =>
    setEditState({ mode: 'update', itemId: line.item.id, lineId: line.id });
  const openAdd = () => setEditState({ mode: 'add' });

  // The page-level tab set (ui-surface S3 § tabs) — the strip renders in the
  // Header, the panels in the body.
  const tabs = (): TabDef[] => [
    { value: 'details', label: t('label.details') },
    { value: 'custom-fields', label: t('label.custom-fields') },
    { value: 'log', label: t('label.log') },
  ];

  // The item the modal opens on — narrowed off the union ONCE (re-reading the
  // accessor inside the JSX would lose the narrowing and need a cast).
  const editItemId = () => {
    const state = editState();
    return state?.mode === 'update' ? state.itemId : undefined;
  };
  const editLineId = () => {
    const state = editState();
    return state?.mode === 'update' ? state.lineId : undefined;
  };

  const crumbs = (node: SupplierReturnInfoFragment) => [
    { label: t('replenishment') },
    {
      label: t('supplier-return'),
      onClick: () =>
        navigate(`/${params.storeId}/replenishment/supplier-return`),
    },
    { label: String(node.invoiceNumber) },
  ];

  // Line columns (ui-surface S3 § line table) — cost-valued, one row per stock
  // line (grouping is a DataTable gap; rendered flat, as customer returns).
  // Only the columns the server can sort carry a `sortKey` (the rest render
  // un-sortable rather than sorting one page in place, which would lie about
  // the whole set). Card view: the item name is the title and the packs its
  // badge; Code / Batch / Expiry / Unit stay always-shown and the pricing /
  // derived columns drop into the collapsed "More details" group.
  const columns = (): Column<Line, SortKey, GroupKey>[] => [
    {
      c: { accessor: line => line.item.code, id: 'item.code' },
      sortKey: 'itemCode',
      header: () => t('label.code'),
      ...getCellDefinition('itemCode'),
    },
    {
      c: { key: 'itemName' },
      sortKey: 'itemName',
      header: () => t('label.name'),
      ...getCellDefinition('itemName', {
        headerPosition: 'primary',
        wrapLines: 2,
      }),
    },
    {
      c: { key: 'batch' },
      sortKey: 'batch',
      header: () => t('label.batch'),
      ...getCellDefinition('batch'),
    },
    {
      c: { key: 'expiryDate' },
      sortKey: 'expiryDate',
      header: () => t('label.expiry'),
      ...getCellDefinition('expiryDate'),
    },
    {
      c: { accessor: line => line.item.unitName ?? '', id: 'unitName' },
      header: () => t('label.unit'),
      // The `unit` preset, not `unitName`: same cell type, but a width that
      // allows for the "Unit" header (the `unitName` preset's 2rem is narrower
      // than the header word — see LIB-4 in the migration report). Matches the
      // items / stock lists and the inbound Financial tab, which head this
      // column the same way.
      ...getCellDefinition('unit'),
    },
    {
      c: { key: 'packSize' },
      sortKey: 'packSize',
      header: () => t('label.pack-size'),
      ...getCellDefinition('packSize'),
      cardGroup: 'more',
    },
    {
      c: { key: 'numberOfPacks' },
      header: () => t('label.num-packs'),
      ...getCellDefinition('numberOfPacks', { headerPosition: 'badge' }),
    },
    {
      c: {
        accessor: line => line.packSize * line.numberOfPacks,
        id: 'totalQuantity',
      },
      header: () => t('label.total-quantity'),
      // No CELL_DEF key — the width accounts for the "Total quantity" header.
      ...getNumberCell(),
      size: remToPx(7),
      cardGroup: 'more',
    },
    {
      c: { key: 'costPricePerPack' },
      header: () => t('label.pack-cost-price'),
      ...getCellDefinition('costPricePerPack'),
      cardGroup: 'more',
    },
    {
      c: {
        accessor: line => line.costPricePerPack * line.numberOfPacks,
        id: 'lineTotal',
      },
      header: () => t('label.line-total'),
      ...getCellDefinition('lineTotal'),
      cardGroup: 'more',
    },
  ];

  return (
    <Suspense fallback={<Spinner center />}>
      {/* NON-keyed Show (kdd/solid-reactivity-pitfalls): every save sets a
          fresh node object; keyed would remount the page and drop focus. The
          resolved-undefined fallback is the not-found deep-link alert. */}
      <Show
        when={info()}
        fallback={
          <Dialog
            open
            icon={<InfoIcon />}
            title={t('error.return-not-found')}
            description={t('messages.click-to-return-to-returns')}
            onClose={() =>
              navigate(`/${params.storeId}/replenishment/supplier-return`)
            }
            actions={
              <OkButton
                data-testid="dialog-button-ok"
                onClick={() =>
                  navigate(`/${params.storeId}/replenishment/supplier-return`)
                }
              />
            }
          />
        }
      >
        {node => {
          const disabled = createMemo(() => isReturnDisabled(node()));
          return (
            // The <Tabs> root wraps the whole Page from outside (display:
            // contents, so it adds no layout box): the TabList lives in the
            // Header — claiming its bottom edge — and the TabPanels in the
            // body, both sharing this one tabs context (ui-standards →
            // page-level tabs).
            <Tabs defaultValue="details">
              <Page
                fillBody
                sidePanelOpen={sidePanelOpen()}
                sidePanelTitle={t('heading.details')}
                onSidePanelClose={() => setSidePanelOpen(false)}
                sidePanelContent={
                  <SupplierReturnSidePanel
                    node={node()}
                    disabled={disabled()}
                    edit={edit}
                    onSetColour={setColour}
                  />
                }
                header={
                  <Header>
                    <Breadcrumb crumbs={crumbs(node())} />
                    <HeaderButtons>
                      {/* Add item hides once the return is read-only (D39). */}
                      <Show when={!disabled()}>
                        <Button
                          icon={<PlusCircleIcon />}
                          data-testid="add-item-button"
                          onClick={openAdd}
                        >
                          {t('button.add-item')}
                        </Button>
                      </Show>
                      {/* Primary only while Add item is hidden, so the header
                          never shows two filled buttons (controls.md — one
                          primary action per region). */}
                      <ExportPrintAction
                        returnId={node().id}
                        leadingAction={disabled()}
                      />
                      {/* More — the closed-panel reopen affordance, at the end
                          of the app-bar page-action cluster (spec ui-standards/
                          layout.md → page regions). Shows ONLY while the panel
                          is closed; uses the sidebar glyph (not the info icon),
                          and reopening counts as the user's explicit open
                          choice. */}
                      <Show when={!sidePanelOpen()}>
                        <Button
                          variant="secondary"
                          icon={<SidebarIcon />}
                          data-testid="open-detail-panel-button"
                          onClick={() => setSidePanelOpen(true)}
                        >
                          {t('button.more')}
                        </Button>
                      </Show>
                    </HeaderButtons>
                    {/* The header field cluster (ui-standards → HeaderToolbar):
                        each field labelled above its control, equal shares
                        wrapping as a unit. There is no standing-context banner
                        — a supplier return has one forward-only lifecycle. */}
                    <HeaderToolbar>
                      <SupplierReturnToolbar
                        storeId={params.storeId}
                        node={node()}
                        disabled={disabled()}
                        edit={edit}
                        onChangeSupplier={id => void onChangeSupplier(id)}
                        supplierError={supplierError()}
                      />
                      {/* PROMINENT custom fields — stay in the toolbar even
                          when read-only, just disabled. They wear their own
                          labels like the fields above (the cluster's `field`
                          layout). */}
                      <CustomFieldsToolbar
                        scope="supplier_return"
                        recordId={node().id}
                        values={node().customFields}
                        disabled={disabled()}
                        layout="field"
                        onSave={patch =>
                          void saveField({ customFields: patch })
                        }
                      />
                    </HeaderToolbar>
                    {/* Last child of the Header → the tab strip claims its
                        bottom edge (Header.module.css / Tabs). Details | Custom
                        fields | Log (ui-surface S3 § tabs). */}
                    <TabList tabs={tabs()} />
                  </Header>
                }
                contentFooter={
                  // On selection the bulk-action bar REPLACES the status footer
                  // (ui-surface S3 § footer): selected count · Delete · clear.
                  <Show
                    when={selectedIds().length > 0}
                    fallback={
                      <SupplierReturnStatusFooter
                        storeId={params.storeId}
                        node={node()}
                        disabled={disabled()}
                        hasLines={hasLines()}
                        statusOptions={statusOptions()}
                        onSetHold={setHold}
                        onAdvanced={onAdvanced}
                      />
                    }
                  >
                    <ContentFooter testId="actions-footer">
                      <strong data-testid="selected-rows-count">
                        {tPlural('label.items-selected', selectedIds().length)}
                      </strong>
                      <DeleteLinesAction
                        storeId={params.storeId}
                        returnId={node().id}
                        selectedLines={selectedLines}
                        onDeleted={onLinesChanged}
                      />
                      <ContentFooterActions>
                        <Button
                          variant="secondary"
                          icon={<MinusCircleIcon />}
                          onClick={() => setSelectedIds([])}
                        >
                          {t('label.clear-selection')}
                        </Button>
                      </ContentFooterActions>
                    </ContentFooter>
                  </Show>
                }
              >
                <TabPanel value="details">
                  <DataTable
                    columns={columns()}
                    rows={rows()}
                    rowKey={line => line.id}
                    cardGroups={CARD_GROUPS}
                    loading={tableLoading()}
                    sort={currentSort()}
                    onSort={onSort}
                    onRowClick={disabled() ? undefined : openRow}
                    // Selection drives the footer's bulk delete, so it is
                    // offered only while the return is editable.
                    enableSelection={!disabled()}
                    selectedIds={selectedIds()}
                    onSelectionChange={setSelectedIds}
                    emptyMessage={t('error.no-supplier-return-items')}
                    empty={
                      disabled() ? undefined : (
                        <Button
                          variant="ghost"
                          data-testid="nothing-here-create-button"
                          onClick={openAdd}
                        >
                          {t('button.add-item')}
                        </Button>
                      )
                    }
                    config={tableConfig.config()}
                    setConfig={tableConfig.setConfig}
                    configIsDefault={tableConfig.isConfigDefault()}
                    // Central-server admins (EDIT_CENTRAL_DATA) can promote
                    // their layout to the install-wide default.
                    onSaveGlobalDefault={
                      tableConfig.canSaveGlobalDefault()
                        ? tableConfig.saveGlobalTableConfig
                        : undefined
                    }
                    // Pagination renders as an overlay INSIDE the table, not in
                    // a page footer band (kdd/table-state). State stays
                    // page-owned / URL-backed; changing page drops the
                    // selection, which is per-page.
                    pagination={{
                      offset: query().offset,
                      pageSize: query().first,
                      total: totalCount(),
                      onOffsetChange: offset => {
                        setQuery({ ...query(), offset });
                        setSelectedIds([]);
                      },
                      onPageSizeChange: first => {
                        setQuery({ ...query(), first, offset: 0 });
                        setSelectedIds([]);
                      },
                    }}
                  />
                </TabPanel>
                <TabPanel value="custom-fields">
                  <CustomFieldsEditTab
                    scope="supplier_return"
                    promoteToToolbar
                    disabled={disabled()}
                    values={node().customFields}
                    onSave={saveCustomFields}
                  />
                </TabPanel>
                <TabPanel value="log">
                  <LogTab storeId={params.storeId} recordId={node().id} />
                </TabPanel>
                <ReturnItemsModal
                  open={editState() != null}
                  onClose={() => setEditState(undefined)}
                  storeId={params.storeId}
                  returnId={node().id}
                  mode={editState()?.mode ?? 'update'}
                  initialItemId={editItemId()}
                  initialLineId={editLineId()}
                  excludeItemIds={existingItemIds}
                  nextItem={nextItem}
                  itemById={itemById}
                  onSaved={onLinesChanged}
                  existingLineIds={existingLineIds}
                  returnToName={node().otherPartyName}
                  edit={edit}
                />
              </Page>
            </Tabs>
          );
        }}
      </Show>
    </Suspense>
  );
};

export default SupplierReturnDetailView;

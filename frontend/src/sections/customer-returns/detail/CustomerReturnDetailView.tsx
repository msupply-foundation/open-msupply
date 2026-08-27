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
import { gated } from '../../../api/gated';
import { t, tPlural } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { HeaderToolbar } from '../../../ui/layout/Header/HeaderToolbar';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { createSidePanelOpen } from '../../../ui/layout/SidePanel/createSidePanelOpen';
import { createAddAction } from '../../../ui/utils/keyActions';
import { ALT_M, ALT_N } from '../../../ui/utils/shortcuts';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import {
  Tabs,
  TabList,
  TabPanel,
  type TabDef,
} from '../../../ui/elements/tabs/Tabs';
import {
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
import {
  getCellDefinition,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import { createTableConfig } from '../../../api/createTableConfig';
import { useUrlQueryState } from '../../../list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '../../../list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import {
  CustomFieldsEditTab,
  CustomFieldsToolbar,
} from '../../../domain/customFields';
import {
  CustomerReturnDetail,
  CustomerReturnLines,
  type CustomerReturnInfoFragment,
  type CustomerReturnLineFragment,
  type CustomerReturnLinesVariables,
  type UpdateCustomerReturnVariables,
} from './customerReturnDetail.generated';
import { CustomerReturnPreferences } from '../preferences.generated';
import { CustomerReturnToolbar } from './CustomerReturnToolbar';
import { CustomerReturnSidePanel } from './CustomerReturnSidePanel';
import { CustomerReturnStatusFooter } from './CustomerReturnStatusFooter';
import { ActivityLogPanel } from '../../../domain/activityLog';
import {
  ReturnItemsModal,
  type ReturnItem,
} from './edit-modal/ReturnItemsModal';
import { isReturnDisabled, returnKind } from './returnStatus';
import { saveReturnFields } from './returnUpdate';
import type { ReturnEditFields } from './returnEdit';
import { ExportPrintAction } from './actions/ExportPrintAction';
import { DeleteLinesAction } from './actions/DeleteLinesAction';

// The customer-return detail view (spec/customer-returns/ui-surface.md S3):
// toolbar (customer / reference / kind banner), Details | Log tabs, the
// read-only line table (row click → the return-items modal), the
// Additional-info side panel, and the status footer (hold / lifecycle / close /
// advance). Every edit affordance shares the one editability gate (rules §
// editability; OMS-REG-DIST-07.26): a VERIFIED return — or a transfer return
// still in the sender's hands — is read-only.
//
// TWO independent resources, mirroring the stocktake/inbound reference (spec
// rules § server-paginated line table, OMS-REG-DIST-07.47): `info` (the header
// node — a single record, spliced in place from each return-level save) and
// `lines` (ONE server-sorted, server-paginated page, refetched after any line
// change). The browser never holds the whole line set, so anything that needs
// every line reads a server count instead (`totalCount`).

type Line = CustomerReturnLineFragment;

// The server sort-field union, straight from codegen — a column can only ever
// name a real server sort key (kdd/type-safety). The columns the server has no
// key for (Unit, Number of packs, Pack sell price) and the two client-computed
// ones (Total quantity, Line total) simply omit `sortKey` (spec contract §
// backend gaps).
type SortKey = NonNullable<CustomerReturnLinesVariables['sort']>[number]['key'];

// The URL-backed view state (kdd/url-structure): sort + pagination in the one
// `?query=` JSON param, so a sorted/paged table is shareable and survives a
// reload or back-nav. Conforms to the generated customerReturnLines variables
// (no remapping). Selection and the side-panel open state stay local (transient
// UI). The detail table offers no filter of its own — the invoiceId + type
// filter is pinned by the query, not the user (spec contract § backend gaps).
type DetailUrlState = {
  sort: NonNullable<CustomerReturnLinesVariables['sort']>;
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
// 'primary') and the packs returned its badge; Code / Batch / Expiry / Unit
// form the always-shown default group and every remaining column drops into
// one collapsed "More details" disclosure (ui-standards → CARD_TABLE_MODEL).
type GroupKey = 'more';
const CARD_GROUPS: CardGroup<Line, GroupKey>[] = [
  { key: 'more', disclosure: 'closed' },
];

const CustomerReturnDetailView: Component = () => {
  const params = useParams<{ storeId: string; returnId: string }>();
  const navigate = useNavigate();
  // Sort + pagination are URL-backed in one `?query=` param (spec rules §
  // server-paginated line table).
  const { query, setQuery } = useUrlQueryState<DetailUrlState>({
    ...DEFAULT_URL_STATE,
    first: initialPageSize(),
  });
  // The shared side-panel open state: responsive default (open on a wide
  // viewport) with the user's explicit choice persisted — the same helper every
  // other detail screen uses.
  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();
  const [customerError, setCustomerError] = createSignal<string | undefined>();
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

  const tableConfig = createTableConfig({
    tableId: 'customer-return-detail',
    defaultConfig: {
      base: {
        columnVisibility: { volumePerPack: false },
      },
    },
  });

  // Fetch the return's HEADER (no lines — they are their own query below). A
  // NodeError (bad id) is promoted to the global unexpected-error modal; a
  // non-return invoice id is treated the same. The resource IS the local state
  // for the header: every return-level save writes back with `mutate`
  // (kdd/state-management).
  const [data, { mutate }] = createResource(
    () => ({ storeId: params.storeId, id: params.returnId }),
    async variables => {
      const result = await graphqlFetch(CustomerReturnDetail, variables, {
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

  const info = (): CustomerReturnInfoFragment | undefined => data();

  // ONE server-sorted, server-paginated page of the return's lines. invoiceId +
  // type are pinned (a customer return's lines are STOCK_IN); sort and page
  // come from the URL. Keyed on the SERIALISED variables (a stable string) so
  // identical query content never refetches (kdd/solid-reactivity-pitfalls).
  const linesVariables = createMemo<CustomerReturnLinesVariables>(() => ({
    storeId: params.storeId,
    filter: {
      invoiceId: { equalTo: params.returnId },
      type: { equalTo: 'STOCK_IN' },
    },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));
  const [linesData, { refetch: refetchLines }] = createResource(
    () => JSON.stringify(linesVariables()),
    async serialised => {
      const result = await graphqlFetch(
        CustomerReturnLines,
        JSON.parse(serialised) as CustomerReturnLinesVariables
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
  // (backdrop gone, focus lost). gated keeps the current page on
  // screen while the fresh one lands.
  const rows = (): Line[] => gated(linesData)?.nodes ?? [];
  // The return's WHOLE line count, not the held page's — the pager reads it,
  // and so does the no-lines status precondition (OMS-REG-DIST-07.38): a page
  // can be empty while later pages hold lines.
  const totalCount = () => gated(linesData)?.totalCount ?? 0;
  const hasLines = () => totalCount() > 0;

  // A bulk delete of the last page's rows leaves the offset past the new end
  // (src/list/clampPageOffset.ts, issue #1117).
  clampPageOffset({
    total: () => settledTotal(linesData, page => page.totalCount),
    offset: () => query().offset,
    pageSize: () => query().first,
    setOffset: offset => setQuery({ ...query(), offset }),
  });
  // Selection is per page (the deferred multi-page selection pattern —
  // spec/customer-returns README § known gaps), so the selected rows are always
  // resolvable from the held page.
  const selectedLines = (): Line[] =>
    rows().filter(line => selectedIds().includes(line.id));

  // A save-triggered refetch is SILENT: the table keeps its rows while the
  // fresh page swaps in, so a "Save & next" walk doesn't flash a loading
  // treatment behind the open modal. A user fetch (sort/page) shows it.
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
  // gates). `.latest` — never suspends; empty = no restriction while loading.
  const [prefs] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(CustomerReturnPreferences, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.preferences;
    }
  );
  // NON-suspending read (kdd/solid-reactivity-pitfalls § no remounts on
  // interaction): the page body renders as soon as the return resolves, so a
  // still-pending preferences read must never suspend this screen's boundary.
  // Empty = no restriction.
  const statusOptions = () => gated(prefs)?.invoiceStatusOptions ?? [];

  // --- Return-level saves (updateCustomerReturn, spliced back, no refetch) ---

  const saveField = async (
    patch: Partial<Omit<UpdateCustomerReturnVariables['input'], 'id'>>
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
  // panel comment) — a burst across both coalesces into one save.
  const edit = createDebouncedEdit<ReturnEditFields>({
    id: () => data()?.id ?? '',
    initial: () => ({
      theirReference: data()?.theirReference ?? '',
      comment: data()?.comment ?? '',
    }),
    save: patch => void saveField(patch),
  });

  const setHold = (hold: boolean) => void saveField({ onHold: hold });
  const setColour = (colour: string) => void saveField({ colour });

  // Custom-fields save (explicit-save tab) — patch-merged server-side; true on
  // success so the tab clears its dirty state. The prominent-field toolbar uses
  // saveField directly (fire-and-forget, like the other toolbar fields).
  const saveCustomFields = async (
    patch: Record<string, unknown>
  ): Promise<boolean> => {
    const result = await saveField({ customFields: patch });
    return result?.kind === 'saved';
  };

  // A customer change re-runs the customer checks; its typed rejections show
  // inline on the lookup (OMS-REG-DIST-07.17 / .24).
  const changeCustomer = async (customerId: string) => {
    setCustomerError(undefined);
    const result = await saveField({ otherPartyId: customerId });
    if (result?.kind === 'error') setCustomerError(result.message);
  };

  // A line-level change committed (the return-items modal, or the bulk delete).
  // The table is server-paginated, so we REFETCH its current page rather than
  // splice the mutation's line set into a held list (spec rules § server-
  // paginated line table; issue #428). The selection is dropped with it: a save
  // can remove lines (a zeroed quantity deletes — rules § line rules), so
  // keeping ids the user can no longer see would leave the bulk-action bar
  // acting on nothing.
  const onLinesChanged = () => {
    setSelectedIds([]);
    void refetchAfterSave();
  };

  const onAdvanced = (saved: CustomerReturnInfoFragment) =>
    mutate(prev => (prev ? { ...prev, ...saved } : prev));

  // --- The return-items modal's item plumbing ---

  const itemById = (id: string): ReturnItem | undefined => {
    const line = rows().find(l => l.item.id === id);
    return line ? { id, code: line.item.code, name: line.itemName } : undefined;
  };

  // "Save & next" asks the PARENT for the next item to edit, because the line
  // table is server-paginated: the next item may sit on a later page, and
  // finding it means paging the visible table forward — exactly as the user
  // would (spec rules § line rules, OMS-REG-DIST-07.49). Mirrors the stocktake
  // and inbound reference implementations.
  //
  //   1. Scan the CURRENT page's rows after the current item for the next
  //      distinct item not in `covered` (an item spans several batch rows).
  //   2. None left on this page → advance a page (offset += first, so the table
  //      VISIBLY moves), fetch it, and rescan from its top.
  //   3. Every page exhausted → undefined; the modal then drops into add mode
  //      and the table is left on the page the walk reached.
  //
  // `covered` is the modal's this-run set (every item stepped through, the
  // current one included), so a re-appearing item is never offered twice —
  // across pages too.
  //
  // Later pages are fetched DIRECTLY rather than through the reactive resource,
  // so the walk is race-free; setQuery still moves the URL-backed offset so the
  // visible table follows along.
  const nextItem = async (
    currentId: string,
    covered: Set<string>
  ): Promise<ReturnItem | undefined> => {
    // On the CURRENT page start AFTER the current item's rows (`fromStart`
    // false): items before it are uncovered but already behind the user, so a
    // `past` gate walks past the current item first. Later pages are all
    // "after", so `fromStart` is true.
    const pick = (
      pageRows: Line[],
      fromStart: boolean
    ): ReturnItem | undefined => {
      let past = fromStart;
      for (const line of pageRows) {
        const id = line.item.id;
        if (id === currentId) {
          past = true;
          continue;
        }
        if (!past || covered.has(id)) continue;
        return { id, code: line.item.code, name: line.itemName };
      }
      return undefined;
    };

    const onThisPage = pick(rows(), false);
    if (onThisPage) return onThisPage;

    let offset = query().offset;
    const first = query().first;
    for (;;) {
      offset += first;
      if (offset >= totalCount()) return undefined; // no further pages
      setQuery({ ...query(), offset });
      const result = await graphqlFetch(CustomerReturnLines, {
        storeId: params.storeId,
        filter: {
          invoiceId: { equalTo: params.returnId },
          type: { equalTo: 'STOCK_IN' },
        },
        sort: query().sort,
        page: { first, offset },
      });
      if (
        result.kind !== 'success' ||
        result.data.invoiceLines.__typename !== 'InvoiceLineConnector'
      )
        return undefined;
      const found = pick(result.data.invoiceLines.nodes, true);
      if (found) return found;
    }
  };

  const openRow = (line: Line) =>
    setEditState({ mode: 'update', itemId: line.item.id, lineId: line.id });
  const openAdd = () => setEditState({ mode: 'add' });

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). Declared by
  // the SCREEN, once, for the two controls that trigger it (the header button
  // and the ghost button in the table's empty slot); each carries
  // `shortcut={ALT_N}` for its badge, neither owns the action.
  //
  // Gated on `.state`, NOT on `info()` — that reads `data()` and suspends, and
  // the palette evaluates every action's `disabled()` inside its own render
  // (kdd/keyboard-layer § an action's disabled MUST NOT read a suspending
  // source).
  createAddAction({
    name: 'button.add-item',
    run: openAdd,
    disabled: () => {
      if (data.state !== 'ready' && data.state !== 'refreshing') return true;
      const node = data.latest;
      return !node || isReturnDisabled(node);
    },
  });

  // The item / line the modal opens on — narrowed off the union ONCE. Re-reading
  // the accessor inside the JSX would lose the narrowing and need a cast.
  const editItemId = () => {
    const state = editState();
    return state?.mode === 'update' ? state.itemId : undefined;
  };
  const editLineId = () => {
    const state = editState();
    return state?.mode === 'update' ? state.lineId : undefined;
  };

  // The page-level tab set (ui-surface S3 § tabs) — the strip renders in the
  // Header, the panels in the body.
  const tabs = (): TabDef[] => [
    { value: 'details', label: t('label.details') },
    { value: 'custom-fields', label: t('label.custom-fields') },
    { value: 'log', label: t('label.log') },
  ];

  const crumbs = (node: CustomerReturnInfoFragment) => [
    {
      label: t('customer-returns'),
      onClick: () =>
        navigate(`/${params.storeId}/distribution/customer-return`),
    },
    { label: String(node.invoiceNumber) },
  ];

  // Line columns (ui-surface S3 § line table). Each takes its cell-type width
  // preset via getCellDefinition (docs/CELL_TYPES.md) — a bare helper carries
  // no `size`, so the column would mis-width and resize badly; `code`/`batch`
  // also gain the monospace treatment the spec's column table names. Code /
  // Batch / Expiry / Unit stay in the card's default group; the rest fold into
  // the collapsed "More details" disclosure (CARD_GROUPS above).
  //
  // `sortKey` appears ONLY where InvoiceLineSortFieldInput has a key, since all
  // sorting is server-side (spec ui-surface § line table, contract § backend
  // gaps): Code / Name / Batch / Expiry / Pack size sort; Unit, Number of packs
  // and Pack sell price have no server key, and Total quantity / Line total are
  // client arithmetic over two fields.
  const columns = (): Column<Line, SortKey, GroupKey>[] => [
    {
      c: { accessor: line => line.item.code, id: 'item.code' },
      sortKey: 'itemCode',
      header: () => t('label.code'),
      ...getCellDefinition('code'),
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
      // The expiry preset, not the plain date cell: it carries the near-expiry
      // emphasis the spec's column 4 names.
      ...getCellDefinition('expiryDate'),
    },
    {
      c: { accessor: line => line.item.unitName ?? '', id: 'unitName' },
      header: () => t('label.unit'),
      // The `unit` preset, not `unitName`: same cell type (short text), but a
      // width that allows for the "Unit" header — `unitName`'s 2rem is narrower
      // than the header word itself, so the column collides with Pack size
      // beside it (LIB-4).
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
      // No CELL_DEF key — the explicit helper plus a call-site width, since
      // "Total quantity" is the binding constraint, not the value.
      c: {
        accessor: line => line.packSize * line.numberOfPacks,
        id: 'totalQuantity',
      },
      header: () => t('label.total-quantity'),
      ...getNumberCell(),
      size: remToPx(7),
      cardGroup: 'more',
    },
    {
      c: { key: 'sellPricePerPack' },
      header: () => t('label.pack-sell-price'),
      ...getCellDefinition('sellPricePerPack'),
      cardGroup: 'more',
    },
    {
      c: {
        accessor: line => line.sellPricePerPack * line.numberOfPacks,
        id: 'lineTotal',
      },
      header: () => t('label.line-total'),
      ...getCellDefinition('lineTotal'),
      cardGroup: 'more',
    },
    {
      c: { key: 'volumePerPack' },
      header: () => t('label.volume-per-pack'),
      ...getCellDefinition('volumePerPack'),
      cardGroup: 'more',
    },
  ];

  return (
    <Suspense fallback={<Spinner center />}>
      {/* NON-keyed Show (kdd/solid-reactivity-pitfalls): every save sets a
          fresh node object; keyed would remount the page and drop focus. */}
      <Show when={info()}>
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
                  <CustomerReturnSidePanel
                    node={node()}
                    disabled={disabled()}
                    hasLines={hasLines()}
                    edit={edit}
                    onSetColour={setColour}
                  />
                }
                header={
                  <Header>
                    <Breadcrumb crumbs={crumbs(node())} />
                    <HeaderButtons>
                      <Show when={!disabled()}>
                        <Button
                          icon={<PlusCircleIcon />}
                          shortcut={ALT_N}
                          data-testid="add-item-button"
                          onClick={openAdd}
                        >
                          {t('button.add-item')}
                        </Button>
                      </Show>
                      {/* Export/Print — the reports vertical's record-screen
                          selector (reports S4), available at every status.
                          Primary only while Add item is hidden, so the header
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
                          // createSidePanelOpen registers Alt+M; this is the
                          // control that advertises it (ui-surface S2).
                          shortcut={ALT_M}
                          data-testid="open-detail-panel-button"
                          onClick={() => setSidePanelOpen(true)}
                        >
                          {t('button.more')}
                        </Button>
                      </Show>
                    </HeaderButtons>
                    {/* The header field cluster (ui-standards → HeaderToolbar):
                        each field labelled above its control, equal shares
                        wrapping as a unit. The kind banner (rules § manual vs
                        transfer) is the cluster's trailing compact Alert — it
                        rides the row's end and drops to its own line when the
                        row can't hold it: manual returns don't track delivery
                        automatically; a transfer return explains why editing
                        waits until it is received (OMS-REG-DIST-07.43). */}
                    <HeaderToolbar
                      alert={
                        <Alert
                          severity="info"
                          compact
                          testId="return-kind-banner"
                        >
                          <Show
                            when={returnKind(node()) === 'transfer'}
                            fallback={t('info.manual-return')}
                          >
                            {t('info.automatic-return')}
                            <Show
                              when={disabled() && node().status !== 'VERIFIED'}
                            >
                              {' '}
                              {t('info.automatic-return-no-edit')}
                            </Show>
                          </Show>
                        </Alert>
                      }
                    >
                      <CustomerReturnToolbar
                        storeId={params.storeId}
                        node={node()}
                        disabled={disabled()}
                        edit={edit}
                        onChangeCustomer={id => void changeCustomer(id)}
                        customerError={customerError()}
                      />
                      {/* PROMINENT custom fields — stay in the cluster even
                          when the return is read-only, just disabled. They wear
                          their own labels like the fields beside them (the
                          cluster's `field` layout). */}
                      <CustomFieldsToolbar
                        scope="customer_return"
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
                  // On selection the bulk-action bar REPLACES the status row
                  // (ui-surface S3 § footer) — count · Delete · clear.
                  // Selection is offered only while the return is editable (see
                  // the table below), so the bar can't appear on a read-only
                  // return.
                  <Show
                    when={selectedIds().length > 0}
                    fallback={
                      <CustomerReturnStatusFooter
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
                    cardGroups={CARD_GROUPS}
                    rows={rows()}
                    rowKey={line => line.id}
                    loading={tableLoading()}
                    sort={currentSort()}
                    onSort={onSort}
                    onRowClick={disabled() ? undefined : openRow}
                    // Selection exists only to delete lines, so it follows the
                    // one editability gate: a read-only return offers no
                    // checkboxes at all rather than a selection whose only
                    // action would refuse (blocked affordances, D39).
                    enableSelection={!disabled()}
                    selectedIds={selectedIds()}
                    onSelectionChange={setSelectedIds}
                    emptyMessage={t('error.no-customer-return-items')}
                    empty={
                      disabled() ? undefined : (
                        <Button
                          variant="ghost"
                          shortcut={ALT_N}
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
                    // Server-side paging: the page the table shows is the page
                    // the server returned (spec rules § server-paginated line
                    // table). A page-size change resets to the first page.
                    pagination={{
                      offset: query().offset,
                      pageSize: query().first,
                      total: totalCount(),
                      onOffsetChange: offset => {
                        setQuery({ ...query(), offset });
                        setSelectedIds([]);
                      },
                      onPageSizeChange: first => {
                        rememberPageSize(first);
                        setQuery({ ...query(), first, offset: 0 });
                        setSelectedIds([]);
                      },
                    }}
                  />
                </TabPanel>
                <TabPanel value="custom-fields">
                  {/* Custom fields for the customer_return scope — disabled once
                      the return is read-only. Prominent fields live in the
                      header cluster, so the tab shows the rest. */}
                  <CustomFieldsEditTab
                    scope="customer_return"
                    promoteToToolbar
                    disabled={disabled()}
                    values={node().customFields}
                    onSave={saveCustomFields}
                  />
                </TabPanel>
                <TabPanel value="log">
                  <ActivityLogPanel
                    storeId={params.storeId}
                    recordId={node().id}
                  />
                </TabPanel>
                <ReturnItemsModal
                  open={editState() != null}
                  onClose={() => setEditState(undefined)}
                  storeId={params.storeId}
                  returnId={node().id}
                  mode={editState()?.mode ?? 'update'}
                  initialItemId={editItemId()}
                  initialLineId={editLineId()}
                  nextItem={nextItem}
                  itemById={itemById}
                  onSaved={onLinesChanged}
                  returnFromName={node().otherPartyName}
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

export default CustomerReturnDetailView;

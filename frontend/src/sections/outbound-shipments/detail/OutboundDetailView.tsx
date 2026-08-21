import {
  createMemo,
  createResource,
  createSignal,
  lazy,
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
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../../ui/elements/buttons/Button';
import { OkButton } from '../../../ui/elements/buttons/StandardButtons';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { Tabs, TabList, TabPanel } from '../../../ui/elements/tabs/Tabs';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import {
  AbsentValue,
  getCellDefinition,
  getFlagCell,
  getNumberCell,
  isNearOrPastExpiry,
} from '../../../ui/elements/table/tableHelpers';
import {
  Pagination,
  type PaginationProps,
} from '../../../ui/elements/table/Pagination';
import { remToPx } from '../../../ui/utils/rem';
import {
  useIsNavOverlay,
  useIsShortViewport,
} from '../../../ui/utils/createMediaQuery';
import { createTableConfig } from '../../../api/createTableConfig';
import { createSidePanelOpen } from '../../../ui/layout/SidePanel/createSidePanelOpen';
import { createAddAction } from '../../../ui/utils/keyActions';
import { ALT_M, ALT_N } from '../../../ui/utils/shortcuts';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { RowStatusBadges, uncapped } from './RowStatusBadges';
import {
  AlertCircleIcon,
  InfoIcon,
  MinusCircleIcon,
  PauseIcon,
  PlusCircleIcon,
} from '../../../ui/icons';
import { isExpired } from '../../../domain/allocation';
import { fetchLocations } from '../../../domain/location';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import { useUrlQueryState } from '../../../list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '../../../list/pageSize';
import { clampPageOffset, settledTotal } from '@/list/clampPageOffset';
import { stripEmpty } from '../../../typeHelpers';
import { CustomFieldsEditTab } from '../../../domain/customFields';
import {
  OutboundDetail,
  OutboundLines,
  UpdateOutboundShipmentName,
  type OutboundLineFragment,
  type OutboundLinesVariables,
} from './outboundDetail.generated';
import { saveShipmentFields, type OutboundNode } from './outboundUpdate';
import type { OutboundEditFields } from './outboundEdit';
import type { OutboundLineFilter } from './outboundLineFilter';
import { createNextItemWalk } from './nextItemWalk';
import { OutboundLineFilters } from './OutboundLineFilters';
import type { StatusPreflight } from './actions/StatusChangeAction';
import { isEditable, canReturnLines } from '../outboundStatus';
import { outboundShipmentPreferences } from '@/store/storeContext';
import { OutboundDetailToolbar } from './OutboundDetailToolbar';
import { OutboundStatusFooter } from './OutboundStatusFooter';
import { OutboundTotalsStrip } from './OutboundTotalsStrip';
import { OutboundSidePanel } from './OutboundSidePanel';
import { ActivityLogPanel } from '../../../domain/activityLog';
import {
  OutboundLineEditModal,
  type LineEditItem,
} from './edit-modal/OutboundLineEditModal';
import { ServiceChargesModal } from '../../../domain/invoice';
import {
  fetchOutboundServiceCharges,
  saveOutboundServiceCharges,
} from './service-charges/outboundServiceCharges';
// The from-shipment customer-return flow (spec/customer-returns S4, owned by
// the returns vertical — OMS-REG-DIST-04.21 hands over to it). Lazy so the
// returns graph it pulls in stays out of this section's eager chunk, loading
// only when a return is actually started.
const ReturnFromShipmentModal = lazy(() =>
  import('../../customer-returns/detail/edit-modal/ReturnFromShipmentModal').then(
    module => ({ default: module.ReturnFromShipmentModal })
  )
);
import {
  AddFromMasterListAction,
  AllocateLinesAction,
  DeleteLinesAction,
  ExportPrintAction,
} from './actions';

// The outbound-shipment detail view (spec/outbound-shipments S3): app-bar
// header (customer + customer reference + line search/filters), Details/Log
// tabs, the flat read-only SERVER-paginated line table (row click opens the
// line editor S4 on that row's item AND batch —
// OMS-REG-DIST-03.27/OMS-REG-DIST-03.31), the side panel (S3 § side panel), and
// the persistent status footer (hold / crumbs / status split button —
// OMS-REG-DIST-04.20), replaced by the bulk line-action bar on selection. Line
// quantities are entered ONLY in the line editor.
//
// TWO independent queries (rules.md § server-paginated line table,
// OMS-REG-DIST-03.28): `info` (outboundDetail — header/footer/side-panel
// fields, NOT the lines) and `lines` (outboundLines — one
// server-filtered/sorted page). An entity-LEVEL save mutates `info` in place;
// a LINE-level change refetches the lines page AND the entity (the footer
// totals are its server-side pricing aggregates — D45; placeholders and trims
// move server-side too — kdd/state-management: refresh by direct call). Service
// lines are their own small read (the S5 editor + side-panel rows).

type Line = OutboundLineFragment;

// A held line — its batch, or the batch's location, on hold — cannot be
// issued (OMS-REG-DIST-03.18); the detail table says so where the user looks
// first: the amber "On hold" badge beside the item name and the amber card
// treatment (OMS-REG-DIST-03.37). A held line is also, necessarily, a line
// with nothing issued, so it takes the needs-action marking below as well.
const lineOnHold = (line: Line): boolean =>
  !!line.stockLine?.onHold || !!line.location?.onHold;

// Calendar-expired line (D112) — the medium-weight red Expiry-date cell, the
// red "Expired" badge, and the red card treatment (tinted title + the Expired
// chip after it).
const lineExpired = (line: Line): boolean =>
  !!line.expiryDate && isExpired(line.expiryDate);

// Inside the shared near-expiry window but not yet expired — the "Near
// expiry" badge tier (the expiry cell is red at this tier, regular weight).
const lineNearExpiry = (line: Line): boolean =>
  !!line.expiryDate &&
  !lineExpired(line) &&
  isNearOrPastExpiry(line.expiryDate);

// A line the user still has to act on before this shipment can go anywhere:
// a PLACEHOLDER (the requested quantity has no batch behind it yet) or a
// stock line with nothing issued on it. Everything else is done work.
const lineNeedsAction = (line: Line): boolean =>
  line.type === 'UNALLOCATED_STOCK' || line.numberOfPacks === 0;

// The row-status badges beside the item name (the shared RowStatusBadges
// cluster — ui-standards § table interaction; OMS-REG-DIST-03.37/.38,
// D111/D112). A placeholder carries none — its Batch cell's "Unallocated"
// word is the flag, and it is the word the needs-action marking below leans
// on; a stock line with nothing issued has no such cell, so it takes the
// "Not issued" badge instead.
const LineStatusBadges = (props: { line: Line }) => (
  <Show when={props.line.type !== 'UNALLOCATED_STOCK'}>
    <RowStatusBadges
      expired={lineExpired(props.line)}
      nearExpiry={lineNearExpiry(props.line)}
      held={lineOnHold(props.line)}
      notIssued={lineNeedsAction(props.line)}
    />
  </Show>
);

// The ACTIONED / UNACTIONED marking (ui-surface S3 line table): the lines
// still needing work carry the unfinished-work tint AND a bar of the same
// colour down the row's leading edge; a done line carries nothing at all. One channel,
// one question — "what is left?" — answered by running the eye down one
// edge rather than reading every row.
//
// This replaces the earlier status-per-tint scheme (allocated green /
// expired red / held amber, D111): colouring every done row green left the
// unfinished ones no louder than the rest, and it spent the row background —
// the screen's one at-a-glance channel — on a fact each row already states.
// The expiry and hold facts keep their own words: the row-status badges
// beside the item name and the reddened Expiry-date cell, plus the card
// tones below.
const lineRowTint = (
  line: Line
): 'unfinished' | 'success' | 'warning' | 'error' | undefined =>
  lineNeedsAction(line) ? 'unfinished' : undefined;

// The card tone (tinted title + the chips after it — D111/D112). Expired
// outranks held, which outranks needs-action — the amber a card takes for a
// held batch and for an unissued line is the same amber, and a held line is
// unissued by definition, so the order only decides which chip tone leads;
// both chips still show. A placeholder has nothing but its needs-action
// state, so it now reads amber where D111 left it plain.
const lineCardTone = (line: Line): 'warning' | 'error' | undefined => {
  if (line.type !== 'UNALLOCATED_STOCK' && lineExpired(line)) return 'error';
  if (line.type !== 'UNALLOCATED_STOCK' && lineOnHold(line)) return 'warning';
  return lineNeedsAction(line) ? 'warning' : undefined;
};

// The server sort-field union (from codegen) — a column can only ever name a
// real server sort key (kdd/type-safety). Columns whose data the server can't
// sort on (VVM, unit, doses, quantities, prices, received/difference, volume —
// spec contract § detail line table) simply omit `sortKey`.
type SortKey = NonNullable<OutboundLinesVariables['sort']>[number]['key'];

// The URL-backed view state (kdd/url-structure): filter + sort + pagination in
// the single `?query=` JSON param, so a filtered/sorted/paged view is
// shareable and survives reload + back-nav (OMS-REG-DIST-03.28). All three
// conform to the generated outboundLines variables (no remapping —
// kdd/type-safety). Selection and the side-panel open state stay local
// (transient UI). Mirrors the stocktakes detail.
type DetailUrlState = {
  filter: OutboundLineFilter;
  sort: NonNullable<OutboundLinesVariables['sort']>;
  offset: number;
  first: number;
};

const DEFAULT_URL_STATE: DetailUrlState = {
  // Default sort: item name ascending (spec S3 § line table). The item search
  // is the screen's default filter (ui-surface § line-table filters; D91):
  // seeded present-as-null so its chip is on the bar from the start; stripEmpty
  // keeps it out of the query until typed.
  filter: { itemCodeOrName: null },
  sort: [{ key: 'itemName', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const OutboundDetailView: Component = () => {
  const params = useParams<{ storeId: string; invoiceId: string }>();
  const navigate = useNavigate();
  // Filter + sort + pagination are URL-backed (shareable, survive reload/back-
  // nav) in one `?query=` param. Thin accessors over that single query.
  const { query, setQuery } = useUrlQueryState<DetailUrlState>({
    ...DEFAULT_URL_STATE,
    first: initialPageSize(),
  });
  const filter = () => query().filter;
  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // Side panel: starts CLOSED at every width (D90) — the lines table is this
  // screen's work surface and the widest table in the app, so the panel is
  // opt-in via the app bar's More button rather than taking a column of it
  // before the user asks. The choice lasts the visit and isn't persisted, so
  // every arrival starts closed.
  //
  // Still the shared helper, with the responsive default switched off, because
  // it also registers Alt+M / Alt+Shift+M (spec/keyboard KB-R2 — "the screen has
  // a more-info panel" IS "this helper was called"). A bare createSignal here
  // left this the one panel answering neither binding.
  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen({
    responsive: false,
  });

  // The line editor's open state (undefined = closed). The editor self-manages
  // its current item as the user advances with "OK & next"; we only tell it
  // WHICH item (and clicked batch, for scroll/focus — OMS-REG-DIST-03.31) to
  // open on:
  // - { item, lineId }: opened from a ROW click — update mode.
  // - {}: opened from "Add item" — add mode (item search focused).
  type EditState = { item?: LineEditItem; lineId?: string } | undefined;
  const [editState, setEditState] = createSignal<EditState>();
  const [serviceOpen, setServiceOpen] = createSignal(false);
  // Customer-change rejection — shown on the lookup itself (controls › action
  // feedback: inline, keyed to its cause).
  const [customerError, setCustomerError] = createSignal<string>();
  // "Return selected lines": at SHIPPED+ opens the customer-return create flow
  // (returnModalOpen, OMS-REG-DIST-04.21); before that the explanatory notice
  // instead.
  const [returnNoticeOpen, setReturnNoticeOpen] = createSignal(false);
  const [returnModalOpen, setReturnModalOpen] = createSignal(false);

  const [data, { mutate, refetch: refetchInfo }] = createResource(
    () => ({ storeId: params.storeId, id: params.invoiceId }),
    async variables => {
      // A not-found NodeError is NOT routed to the global error modal (which
      // would offer a useless reload of the same bad id, and shadow the local
      // notice); it falls through to `undefined` here and the view shows the
      // OMS-REG-DIST-01.20 "not found" blocking notice → back to list.
      const result = await graphqlFetch(OutboundDetail, variables);
      if (result.kind !== 'success') return undefined;
      return result.data.invoice.__typename === 'InvoiceNode'
        ? result.data.invoice
        : undefined;
    }
  );

  // `.latest` (not `data()`): saves mutate while the screen stays open, and a
  // suspending read would collapse the route's <Suspense> — unmounting the
  // table, footer, and any OPEN dialog (the line editor's "OK & next", the
  // allocate report) mid-interaction. `.latest` suspends only until the FIRST
  // load resolves, so the initial spinner is unchanged
  // (kdd/solid-reactivity-pitfalls § no remounts, rule 1).
  const node = (): OutboundNode | undefined => data.latest;

  // The lines PAGE — a separate, server-filtered/sorted/paged query
  // (OMS-REG-DIST-03.28). Keyed on the SERIALISED variables (a stable string)
  // so identical query content doesn't refetch (kdd/solid-reactivity-pitfalls).
  // stripEmpty drops added-but-empty filter chips; the fixed invoiceId +
  // non-service scoping is merged here (never URL state). Service lines are a
  // separate read below.
  const linesVariables = createMemo<OutboundLinesVariables>(() => ({
    storeId: params.storeId,
    filter: {
      ...stripEmpty(query().filter),
      invoiceId: { equalTo: params.invoiceId },
      type: { notEqualTo: 'SERVICE' },
    },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));
  const [linesData, { refetch: refetchLines }] = createResource(
    () => JSON.stringify(linesVariables()),
    async serialised => {
      const result = await graphqlFetch(
        OutboundLines,
        JSON.parse(serialised) as OutboundLinesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.invoiceLines;
    }
  );
  // Read `.latest` (non-suspending): during a refetch it returns the previous
  // page (keeps rows in place, no remount); undefined before the first load.
  const rows = (): Line[] => linesData.latest?.nodes ?? [];
  const totalCount = (): number => linesData.latest?.totalCount ?? 0;

  // The line table's pager. It lives in the screen's bottom bar — the status
  // footer, or the selection footer while rows are ticked — rather than in a
  // band of its own under the table (spec/ui-standards § tables → pagination):
  // that bar is present at every line count, so hosting the pager there costs
  // no extra row, and `conditional` means it renders nothing at all until the
  // lines outrun one page, leaving the bar as it was and the height to the
  // rows. Paging still clears the selection (OMS-REG-DIST-03.34): the
  // bulk-action gates classify by rows in view.
  // The shipment's totals (spec § line table, D45): whole-shipment SERVER
  // aggregates off the entity's pricing stats — never a sum over the loaded
  // rows, which would silently become a page total under server pagination
  // (OMS-REG-DIST-03.28). Price = stockTotalBeforeTax (contract § detail line
  // table): the sum of the Total column, pack sell price × packs before tax —
  // the after-tax figure belongs to the side panel's stock-charges Total.
  // Shown in the status footer rather than a pinned row beneath the table:
  // being whole-shipment figures, a band under one page of rows would read as
  // that page's column sums, and would cost a row to do it.
  const shipmentTotals = () => ({
    price: node()?.pricing?.stockTotalBeforeTax ?? 0,
    volume: node()?.pricing?.totalVolume ?? 0,
  });

  // Where the totals live is a "which element renders" decision, so it is the
  // one responsive mechanism that touches JS (src/ui/CLAUDE.md #7): a band of
  // its own above the bar on a wide screen, and ON the bar below the
  // navOverlay line — tablet portrait and down, where the shipment's lines are
  // worth more than a row of chrome and the bar has the room. Rendered by a
  // function, not a stored element: the two footer faces each need their own
  // instance, and one element can't be in two places.
  const narrowViewport = useIsNavOverlay();
  // …and the same trade on a SHORT one. The rule was written for tablet
  // portrait, but a landscape tablet is the case that needs it most: wide
  // enough that the width query never fires, short enough that a third stacked
  // bar under the table costs a row of the thing the user came to work on.
  // Measured at 1434×742, chrome took 52% of the screen.
  const shortViewport = useIsShortViewport();
  const foldTotalsIntoBar = () => narrowViewport() || shortViewport();
  const inlineTotals = () => (
    <Show when={foldTotalsIntoBar()}>
      <OutboundTotalsStrip
        inline
        totals={totalCount() > 0 ? shipmentTotals : undefined}
      />
    </Show>
  );

  const linePagination = (): PaginationProps => ({
    offset: query().offset,
    pageSize: query().first,
    total: totalCount(),
    onOffsetChange: offset => {
      setQuery({ ...query(), offset });
      setSelectedIds([]);
    },
    onPageSizeChange: first => {
      // The remembered page size (D106) — it rode the DataTable's own
      // pagination prop, which this accessor replaced when the pager moved
      // into the status footer, so it has to travel with the handler.
      rememberPageSize(first);
      setQuery({ ...query(), first, offset: 0 });
      setSelectedIds([]);
    },
  });
  // Deleting the last page's rows leaves the offset past the end — an empty
  // "41-40 of 40" page (src/list/clampPageOffset.ts, where this rule started).
  clampPageOffset({
    total: () => settledTotal(linesData, page => page.totalCount),
    offset: () => query().offset,
    pageSize: () => query().first,
    setOffset: offset => setQuery({ ...query(), offset }),
  });

  // Service lines — a small dedicated read (spec S5; the side panel's service
  // rows). Never in the paginated table; refetched alongside the lines page
  // (a bulk delete can remove service lines too).
  const [serviceData, { refetch: refetchServiceLines }] = createResource(
    () => ({ storeId: params.storeId, invoiceId: params.invoiceId }),
    async variables => {
      const result = await graphqlFetch(OutboundLines, {
        storeId: variables.storeId,
        filter: {
          invoiceId: { equalTo: variables.invoiceId },
          type: { equalTo: 'SERVICE' },
        },
        page: { first: 100 },
      });
      if (result.kind !== 'success') return undefined;
      return result.data.invoiceLines.nodes;
    }
  );
  const serviceLines = (): Line[] => serviceData.latest ?? [];

  // The store's locations (code/name only) for the Location filter chip.
  // Volume-blind — the chip narrows a line list, capacity is irrelevant.
  const [locationsData] = createResource(() => params.storeId, fetchLocations);
  const locations = () => locationsData.latest ?? [];

  // A save-triggered refetch is SILENT — no refreshing bar (the table stays
  // put while the fresh page swaps in). A user-navigation refetch (filter/
  // sort/page) shows the bar as usual.
  const [silentRefetching, setSilentRefetching] = createSignal(false);
  const refetchAfterSave = async () => {
    setSilentRefetching(true);
    try {
      // The entity refetches WITH the lines: the footer totals are the
      // entity's server-side pricing aggregates (D45), so every line-level
      // change moves them — a lines-only refetch would leave the footer one
      // edit behind. `.latest` reads keep the refresh remount-free.
      await Promise.all([refetchLines(), refetchServiceLines(), refetchInfo()]);
    } finally {
      setSilentRefetching(false);
    }
  };
  const tableLoading = () => linesData.loading && !silentRefetching();

  const editable = () => {
    const current = node();
    return current ? isEditable(current.status) : false;
  };

  // Status pre-flight (OMS-REG-DIST-04.15/OMS-REG-DIST-04.16) — whole-shipment
  // answers the current page can't give (rules.md § server-paginated line
  // table): three sequential count/name probes run when the user invokes the
  // status change, not reactive derivations. A failed probe returns undefined
  // (graphqlFetch has already routed the error to the global modal) and the
  // action aborts.
  const preflight = async (): Promise<StatusPreflight | undefined> => {
    const invoiceId = { equalTo: params.invoiceId };
    const nonService = await graphqlFetch(OutboundLines, {
      storeId: params.storeId,
      filter: { invoiceId, type: { notEqualTo: 'SERVICE' } },
      page: { first: 1 },
    });
    if (nonService.kind !== 'success') return undefined;
    const stock = await graphqlFetch(OutboundLines, {
      storeId: params.storeId,
      filter: { invoiceId, type: { equalTo: 'STOCK_OUT' } },
      page: { first: 1 },
    });
    if (stock.kind !== 'success') return undefined;
    const zeros = await graphqlFetch(OutboundLines, {
      storeId: params.storeId,
      filter: {
        invoiceId,
        type: { notEqualTo: 'SERVICE' },
        numberOfPacks: { equalTo: 0 },
      },
      page: { first: 1000 },
    });
    if (zeros.kind !== 'success') return undefined;
    const lineCount = nonService.data.invoiceLines.totalCount;
    return {
      hasLines: lineCount > 0,
      hasOnlyPlaceholders:
        lineCount > 0 && stock.data.invoiceLines.totalCount === 0,
      zeroQuantityItems: zeros.data.invoiceLines.nodes.map(
        line => line.itemName
      ),
    };
  };

  const tableConfig = createTableConfig({
    tableId: 'outbound-detail',
    defaultConfig: {
      base: {
        // Code starts pinned left (spec S3 § line table: "item code, pinned
        // left") — the row anchor stays visible while the wide table scrolls.
        columnPinning: { left: ['itemCode'] },
        // Name's width comes from its `text` cell-type preset (the widest kind,
        // and the flex-fill sink) — no per-table override needed.
        columnVisibility: {
          // The denser columns start hidden (spec S1's hidden-by-default idea
          // applied to the detail table); the user reveals them via column
          // settings. Received/difference matter for transfers only.
          unitName: false,
          receivedNumberOfPacks: false,
          difference: false,
          volume: false,
          locationCode: false,
        },
      },
    },
  });

  // ONE debounced buffer for the as-you-type text fields (toolbar customer
  // reference + side panel comment/transport reference) — bursts coalesce into
  // a single updateOutboundShipment (kdd/state-management).
  const edit = createDebouncedEdit<OutboundEditFields>({
    id: () => node()?.id ?? '',
    initial: () => ({
      theirReference: node()?.theirReference ?? '',
      comment: node()?.comment ?? '',
      transportReference: node()?.transportReference ?? '',
    }),
    save: patch => void saveField(patch),
  });

  const saveField = async (
    patch: Partial<Omit<Parameters<typeof saveShipmentFields>[1], 'id'>>
  ) => {
    const current = node();
    if (!current) return;
    const saved = await saveShipmentFields(params.storeId, {
      id: current.id,
      ...patch,
    });
    if (saved) mutate(() => saved);
  };

  const setHold = (hold: boolean) => void saveField({ onHold: hold });

  // Custom-fields save (explicit-save tab) — patch-merged server-side; returns
  // true so the tab clears its dirty state. The toolbar (prominent fields) uses
  // saveField directly (fire-and-forget, like the other toolbar fields).
  const saveCustomFields = async (
    patch: Record<string, unknown>
  ): Promise<boolean> => {
    const current = node();
    if (!current) return false;
    const saved = await saveShipmentFields(params.storeId, {
      id: current.id,
      customFields: patch,
    });
    if (saved) {
      mutate(() => saved);
      return true;
    }
    return false;
  };

  // Customer change (OMS-REG-DIST-02.20): reissues under a NEW identity —
  // renavigate to the returned id. Blocked (UI) when the shipment came from a
  // requisition (OMS-REG-DIST-02.19 — the lookup is disabled then, this is the
  // backstop).
  const changeCustomer = async (customerId: string) => {
    const current = node();
    if (!current || customerId === current.otherParty.id) return;
    setCustomerError(undefined);
    const result = await graphqlFetch(UpdateOutboundShipmentName, {
      storeId: params.storeId,
      input: { id: current.id, otherPartyId: customerId },
    });
    if (result.kind !== 'success') return;
    const response = result.data.updateOutboundShipmentName;
    if (response.__typename !== 'InvoiceNode') {
      setCustomerError(response.error.description);
      return;
    }
    navigate(
      `/${params.storeId}/distribution/outbound-shipment/${response.id}`
    );
  };

  const onLineOpsCommitted = () => {
    setSelectedIds([]);
    // A save may have changed the rows — the walk must refetch, not trust
    // its remembered page.
    walk.reset();
    void refetchAfterSave();
  };

  // Header click: TanStack computed the next direction; record it as the
  // GraphQL sort array, reset to the first page, and clear the selection
  // (OMS-REG-DIST-03.34 — the gates below classify by the rows in view).
  const onSort = (key: SortKey, desc: boolean) => {
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
    setSelectedIds([]);
  };

  const onFilterChange = (next: OutboundLineFilter) => {
    setQuery({ ...query(), filter: next, offset: 0 });
    setSelectedIds([]);
  };

  // Row click → the line editor for that row's ITEM (OMS-REG-DIST-03.27),
  // carrying the clicked line so the editor scrolls to / focuses that batch
  // (OMS-REG-DIST-03.31); disabled rows (read-only shipment) get no handler at
  // all. The editor advances through the list itself via "OK & next"
  // (OMS-REG-DIST-03.32).
  const openRow = (line: Line) =>
    setEditState({
      item: {
        id: line.item.id,
        code: line.item.code,
        name: line.item.name,
        unitName: line.item.unitName,
        isVaccine: line.item.isVaccine,
        doses: line.item.doses,
      },
      lineId: line.id,
    });
  const openAdd = () => setEditState({});

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). Declared by
  // the SCREEN, once, for the two controls that trigger it (the header button and
  // the ghost button in the table's empty slot); each carries `shortcut={ALT_N}`
  // for its badge, neither owns the action.
  //
  // Gated on `.state`, NOT through `editable()` — that reads `data.latest`, which
  // suspends on the first pending read, and the palette evaluates every action's
  // `disabled()` inside its own render (kdd/keyboard-layer § an action's
  // `disabled` MUST NOT read a suspending source).
  createAddAction({
    name: 'button.add-item',
    run: openAdd,
    disabled: () => {
      if (data.state !== 'ready' && data.state !== 'refreshing') return true;
      const current = data.latest;
      return !current || !isEditable(current.status);
    },
  });

  // "OK & next" (update mode) asks the parent for the next item to edit. We
  // own this (not the modal) because the list is server-paginated: the next
  // item may be on a later PAGE, and finding it means advancing the detail
  // table forward — the same as the user paging (rules.md § Save & next).
  // The paging logic lives in ./nextItemWalk (unit-tested); this wires its
  // deps: direct page fetches (race-free — never the reactive resource),
  // page advance = setQuery + selection clear (OMS-REG-DIST-03.34), abort =
  // the editor closed (a cancel mid-walk must not keep paging the table).
  const walk = createNextItemWalk({
    fetchPage: async (offset, first) => {
      const result = await graphqlFetch(OutboundLines, {
        ...linesVariables(),
        page: { first, offset },
      });
      if (result.kind !== 'success') return undefined;
      return {
        rows: result.data.invoiceLines.nodes,
        totalCount: result.data.invoiceLines.totalCount,
      };
    },
    currentOffset: () => query().offset,
    pageSize: () => query().first,
    advancePage: offset => {
      setQuery({ ...query(), offset });
      setSelectedIds([]);
    },
    aborted: () => editState() == null,
  });
  const nextItem = async (
    currentId: string,
    covered: Set<string>
  ): Promise<LineEditItem | undefined> => walk.next(currentId, covered);

  const selectedLines = () =>
    rows().filter(line => selectedIds().includes(line.id));
  // Bulk-action visibility (spec S3 § bulk line actions matrix):
  // state-disallowed actions are HIDDEN, not disabled.
  const hasSelectedPlaceholder = () =>
    selectedLines().some(line => line.type === 'UNALLOCATED_STOCK');

  const prefs = () => outboundShipmentPreferences();
  const dosesOn = () => prefs().manageVaccinesInDoses;
  const vvmOn = () => prefs().manageVvmStatusForStock;

  const crumbs = (current: OutboundNode) => [
    {
      label: t('outbound-shipments'),
      onClick: () =>
        navigate(`/${params.storeId}/distribution/outbound-shipment`),
    },
    { label: String(current.invoiceNumber) },
  ];

  // The detail line table (spec S3 § line table): one row per stock/placeholder
  // line — flat, since main dropped row-grouping from the shared DataTable;
  // placeholder rows show the requested quantity. Sortable columns name a real
  // server sort key; the rest omit sortKey (no client-side fallback).
  const columns = (): Column<Line, SortKey>[] => {
    return [
      {
        c: { key: 'itemCode' },
        sortKey: 'itemCode',
        header: () => t('label.code'),
        // The `code` kind carries the monospace treatment the spec's line-table
        // column 1 asks for ("text (mono)"), plus the shared code width.
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
        // Name + the row-status badges (LineStatusBadges above). The name is
        // wrapped so it can carry the gap on its TRAILING edge: this cell
        // clamps to two lines, and a long name pushes the chips onto line 2,
        // where a leading margin on the cluster would render as an indent
        // instead of lining the chip up under the name (see
        // [data-row-badges-label] in DataTable.module.css).
        cell: info => (
          <>
            <span data-row-badges-label>{info.row.original.itemName}</span>
            <LineStatusBadges line={info.row.original} />
          </>
        ),
      },
      {
        c: {
          accessor: line =>
            line.type === 'UNALLOCATED_STOCK'
              ? t('label.unallocated')
              : (line.batch ?? '—'),
          id: 'batch',
        },
        sortKey: 'batch',
        header: () => t('label.batch'),
        // Mono, per the spec's line-table column 3 — but WITHOUT the `code`
        // kind's 7rem growth cap: this column doesn't only hold a code, it
        // renders the word "Unallocated" for a placeholder line, which fills
        // the cap exactly and pins the column there so it can't be dragged
        // wider at all. Same reasoning (and fix) as the `locationCode` key's
        // "own size, NO cap" note in _globalColumnConfig (#601).
        //
        // NOT user-hideable (hideFromColumnSettings), unlike every other data
        // column here: this cell carries the WORD behind the placeholder
        // marking, and the tint and bar beside it are colour. Hide the column
        // from the Columns popover and a placeholder row would be marked by
        // colour alone — the one thing the marking is never allowed to be
        // (styling principle 9 / WCAG 1.4.1). The column stays draggable and
        // sortable; it just can't be switched off.
        ...uncapped(
          getCellDefinition<Line>('batch', { hideFromColumnSettings: true })
        ),
        // A placeholder has no batch, and the word standing in for one must
        // not be readable AS one: in this mono column "Unallocated" set in
        // Monaco alongside e2e-030062-a is just another code at a glance. The
        // absent-value treatment types it as prose instead — the UI face,
        // italic, muted.
        //
        // A word, not a chip: this row already carries the amber tint AND the
        // leading bar, so nothing more is needed to FIND it. The cell's one
        // remaining job is to say WHICH value is missing, and a chip on a
        // tinted row adds a fourth marker for a fact three already carry (and
        // shows the tint through its own transparent fill).
        //
        // The accessor above keeps the plain word as the cell's VALUE, so
        // sorting, the hover-reveal and any export are unchanged.
        cell: info =>
          info.row.original.type === 'UNALLOCATED_STOCK' ? (
            <AbsentValue label={t('label.unallocated')} />
          ) : (
            (info.row.original.batch ?? '—')
          ),
      },
      {
        // On-hold flag, CARD-ONLY (OMS-REG-DIST-03.37, D111): the table's
        // amber "On hold" badge beside the item name carries the state, so
        // the grid has no On-hold column; the card's after-the-title chip
        // is this.
        c: { accessor: lineOnHold, id: 'onHold' },
        header: () => t('label.on-hold'),
        ...getFlagCell(
          t('label.on-hold'),
          {
            headerPosition: 'badge',
            hideOnTable: true,
            hideFromColumnSettings: true,
          },
          'warning',
          () => <PauseIcon />
        ),
      },
      {
        // Expired flag, CARD-ONLY (D112): the table's Expiry-date cell
        // reddens under its header; a card buries that in the body, so the
        // chip puts the word after the card title, with the row's error tone.
        c: { accessor: lineExpired, id: 'expired' },
        header: () => t('label.expired'),
        ...getFlagCell(
          t('label.expired'),
          {
            headerPosition: 'badge',
            hideOnTable: true,
            hideFromColumnSettings: true,
          },
          'error',
          () => <AlertCircleIcon />
        ),
      },
      {
        // Needs-action flag, CARD-ONLY: in the table the amber tint, the
        // leading bar and the "Not issued" badge beside the item name carry
        // it; a card has none of those, and its Batch field ("Unallocated")
        // sits in the body where nothing distinguishes it — so the corner
        // badge is where the fact lands. Shown for placeholders too, unlike
        // the table badge.
        c: { accessor: lineNeedsAction, id: 'notIssued' },
        header: () => t('label.not-issued'),
        ...getFlagCell(
          t('label.not-issued'),
          {
            headerPosition: 'badge',
            hideOnTable: true,
            hideFromColumnSettings: true,
          },
          'warning'
        ),
      },
      {
        c: { key: 'expiryDate' },
        sortKey: 'expiryDate',
        header: () => t('label.expiry-date'),
        ...getCellDefinition('expiryDate'),
      },
      ...(vvmOn()
        ? [
            {
              c: {
                accessor: (line: Line) => line.vvmStatus?.description ?? '',
                id: 'vvmStatus',
              },
              header: () => t('label.vvm-status'),
              ...getCellDefinition('vvmStatus'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      {
        c: { accessor: line => line.location?.code ?? '', id: 'locationCode' },
        // The server key sorts by location NAME; code is what we display —
        // near enough in practice (codes prefix names in this dataset).
        sortKey: 'locationName',
        header: () => t('label.location'),
        ...getCellDefinition('locationCode'),
      },
      {
        c: { accessor: line => line.item.unitName ?? '', id: 'unitName' },
        header: () => t('label.unit'),
        ...getCellDefinition('unitName'),
      },
      {
        c: { key: 'packSize' },
        sortKey: 'packSize',
        header: () => t('label.pack-size'),
        ...getCellDefinition('packSize'),
      },
      ...(dosesOn()
        ? [
            {
              c: {
                accessor: (line: Line) =>
                  line.item.isVaccine ? line.item.doses : null,
                id: 'dosesPerUnit',
              },
              header: () => t('label.doses-per-unit'),
              ...getCellDefinition('dosesPerUnit'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      {
        c: { key: 'numberOfPacks' },
        header: () => t('label.pack-quantity'),
        ...getCellDefinition('numberOfPacks'),
      },
      {
        c: { key: 'receivedNumberOfPacks' },
        header: () => t('label.packs-received'),
        ...getCellDefinition('receivedNumberOfPacks'),
      },
      {
        c: {
          accessor: line =>
            line.receivedNumberOfPacks != null
              ? line.receivedNumberOfPacks - line.numberOfPacks
              : null,
          id: 'difference',
        },
        header: () => t('label.difference'),
        ...getCellDefinition('difference'),
      },
      {
        c: {
          accessor: line => line.numberOfPacks * line.packSize,
          id: 'unitQuantity',
        },
        header: () => t('label.unit-quantity'),
        ...getCellDefinition('unitQuantity'),
      },
      ...(dosesOn()
        ? [
            {
              c: {
                accessor: (line: Line) =>
                  line.item.isVaccine
                    ? line.numberOfPacks * line.packSize * line.item.doses
                    : null,
                id: 'doses',
              },
              header: () => t('label.doses'),
              ...getCellDefinition('doses'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      {
        c: { key: 'sellPricePerPack' },
        header: () => t('label.unit-sell-price'),
        ...getCellDefinition('sellPricePerPack'),
      },
      {
        // Pack sell price × packs, BEFORE tax (spec § line table col 16) —
        // not the line's totalAfterTax.
        c: {
          accessor: line =>
            line.type === 'UNALLOCATED_STOCK'
              ? null
              : line.sellPricePerPack * line.numberOfPacks,
          id: 'total',
        },
        header: () => t('label.total'),
        ...getCellDefinition('total'),
      },
      {
        // Line volume — volume per pack × packs (the old app's volume column),
        // not the raw per-pack figure; the footer then sums to the shipment
        // volume, matching the old app's footer.
        c: {
          accessor: line => line.volumePerPack * line.numberOfPacks,
          id: 'volume',
        },
        header: () => t('label.volume'),
        // Same display rounding as the column's cells (ui-standards § tables'
        // 2-dp number cell) — a 5-dp footer under 2-dp cells reads as a
        // mismatch.
        ...getNumberCell(),
        // No CELL_DEF key; the "Volume (m³)" header is the binding constraint.
        size: remToPx(6),
      },
    ];
  };

  return (
    <Suspense fallback={<Spinner center />}>
      {/* NON-keyed Show — saves set a fresh node object; keyed would remount
          the page and drop focus (kdd/solid-reactivity-pitfalls). */}
      <Show
        when={node()}
        fallback={
          <Show when={!data.loading}>
            <Dialog
              open
              dismissable={false}
              onClose={() =>
                navigate(`/${params.storeId}/distribution/outbound-shipment`)
              }
              icon={<InfoIcon />}
              title={t('heading.not-found')}
              description={t('error.shipment-not-found')}
              actions={
                <OkButton
                  data-testid="dialog-button-ok"
                  onClick={() =>
                    navigate(
                      `/${params.storeId}/distribution/outbound-shipment`
                    )
                  }
                />
              }
            />
          </Show>
        }
      >
        {current => (
          <Tabs defaultValue="details">
            <Page
              fillBody
              sidePanelOpen={sidePanelOpen()}
              sidePanelTitle={t('label.details')}
              onSidePanelClose={() => setSidePanelOpen(false)}
              sidePanelContent={
                <OutboundSidePanel
                  node={current()}
                  serviceLines={serviceLines()}
                  storeId={params.storeId}
                  disabled={!editable()}
                  foreignCurrencyAllowed={
                    outboundShipmentPreferences().issueInForeignCurrency
                  }
                  onSaved={saved => mutate(() => saved)}
                  edit={edit}
                  onSaveField={async patch => {
                    await saveField(patch);
                    // A backdate DELETES the shipment's lines server-side
                    // (OMS-REG-DIST-04.24) — the visible page must follow,
                    // like any other line-level change.
                    if ('backdatedDatetime' in patch) await refetchAfterSave();
                  }}
                  onEditServiceCharges={() => setServiceOpen(true)}
                />
              }
              header={
                <Header>
                  <Breadcrumb crumbs={crumbs(current())} />
                  {/* Every button here collapses to its icon on a narrow
                      viewport (`collapsible="narrow"`, with the label kept as
                      the accessible name and repeated as a tooltip): four
                      labelled buttons need ~38rem, which is more than a
                      tablet's header has left beside the breadcrumb, so the
                      cluster wrapped onto a row of its own. Icon-only they fit
                      on the breadcrumb's line, and the screen keeps that row's
                      height for table rows. */}
                  <HeaderButtons>
                    <Show when={editable()}>
                      <Button
                        icon={<PlusCircleIcon />}
                        shortcut={ALT_N}
                        collapsible="narrow"
                        title={t('button.add-item')}
                        data-testid="add-item-button"
                        onClick={openAdd}
                      >
                        {t('button.add-item')}
                      </Button>
                    </Show>
                    <AddFromMasterListAction
                      storeId={params.storeId}
                      shipmentId={current().id}
                      customerNameId={current().otherParty.id}
                      visible={current().status === 'NEW'}
                      onCommitted={onLineOpsCommitted}
                    />
                    {/* Export/Print — the reports vertical's record-screen
                        selector (reports S4), available at every status. A
                        self-contained action (static import), mirroring the
                        sibling verticals — see ExportPrintAction. */}
                    <ExportPrintAction shipmentId={current().id} />
                    <Show when={!sidePanelOpen()}>
                      <Button
                        variant="secondary"
                        icon={<InfoIcon />}
                        collapsible="narrow"
                        title={t('button.more')}
                        data-testid="open-detail-panel-button"
                        // createSidePanelOpen registers Alt+M; this is the
                        // control that advertises it (ui-surface S2).
                        shortcut={ALT_M}
                        onClick={() => setSidePanelOpen(true)}
                      >
                        {t('button.more')}
                      </Button>
                    </Show>
                  </HeaderButtons>
                  {/* The header field cluster — never a hand-rolled <Toolbar>
                      + FieldRow (ui/docs/PAGES.md § header field cluster). The
                      line filters live in the DataTable's own toolbar below. */}
                  <HeaderToolbar>
                    <OutboundDetailToolbar
                      storeId={params.storeId}
                      node={current()}
                      disabled={!editable()}
                      edit={edit}
                      customerError={customerError()}
                      onChangeCustomer={customerId =>
                        void changeCustomer(customerId)
                      }
                      onSaveCustomFields={patch =>
                        void saveField({ customFields: patch })
                      }
                    />
                  </HeaderToolbar>
                  <TabList
                    tabs={[
                      {
                        value: 'details',
                        label: t('label.details'),
                      },
                      {
                        value: 'custom-fields',
                        label: t('label.custom-fields'),
                      },
                      { value: 'log', label: t('label.log') },
                    ]}
                  />
                </Header>
              }
              contentFooter={
                <>
                  {/* The totals band, above BOTH footer faces — a document
                      fact, so a live row selection doesn't take it away.
                      Only where there is ROOM for it: on a narrow viewport, or
                      a short one (landscape), the same figures ride the bar
                      itself (below) rather than stacking a third band under
                      the table, because height is the scarcer resource. */}
                  <Show when={!foldTotalsIntoBar()}>
                    <OutboundTotalsStrip
                      totals={totalCount() > 0 ? shipmentTotals : undefined}
                    />
                  </Show>
                  <Show
                    when={selectedIds().length > 0}
                    fallback={
                      <OutboundStatusFooter
                        storeId={params.storeId}
                        node={current()}
                        pagination={linePagination()}
                        preflight={preflight}
                        onSetHold={setHold}
                        totals={inlineTotals()}
                        // A status change can trim zero-quantity lines
                        // server-side — refetch the lines page alongside the
                        // in-place entity splice.
                        onSaved={saved => {
                          mutate(() => saved);
                          void refetchAfterSave();
                        }}
                      />
                    }
                  >
                    <ContentFooter testId="actions-footer">
                      {/* Same on the selection face: the totals stay on screen
                          while rows are ticked, on the bar itself when narrow. */}
                      {inlineTotals()}
                      <strong data-testid="selected-rows-count">
                        {tPlural('label.items-selected', selectedIds().length)}
                      </strong>
                      {/* Delete: hidden (not disabled) when read-only — editable
                        only (NEW/ALLOCATED/PICKED). S3 bulk-action matrix. */}
                      <Show when={editable()}>
                        <DeleteLinesAction
                          storeId={params.storeId}
                          selectedLines={selectedLines}
                          disabled={false}
                          onCommitted={onLineOpsCommitted}
                        />
                      </Show>
                      {/* Allocate placeholder lines: only while editable AND a
                        placeholder line is in the selection. */}
                      <Show when={editable() && hasSelectedPlaceholder()}>
                        <AllocateLinesAction
                          storeId={params.storeId}
                          selectedLines={selectedLines}
                          disabled={false}
                          onCommitted={onLineOpsCommitted}
                        />
                      </Show>
                      {/* Return selected lines (OMS-REG-DIST-04.21): shown at EVERY status (not
                        hidden, not disabled). At SHIPPED / DELIVERED / VERIFIED
                        it opens the customer-return create flow (owned by the
                        returns vertical, over this shipment); any other status
                        (RECEIVED included) gets the explanatory notice. See the
                        S3 bulk-action matrix. */}
                      <Button
                        variant="secondary"
                        data-testid="return-lines-button"
                        onClick={() =>
                          canReturnLines(current().status)
                            ? setReturnModalOpen(true)
                            : setReturnNoticeOpen(true)
                        }
                      >
                        {t('button.return-lines')}
                      </Button>
                      {/* The pager rides the selection face as well: ticking a
                        row must not strip the way to the rest of the lines. */}
                      <Pagination {...linePagination()} inBar />
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
                </>
              }
            >
              <TabPanel value="details">
                <DataTable
                  columns={columns()}
                  rows={rows()}
                  rowKey={line => line.id}
                  // Filters live WITH the table, in its own toolbar — never the
                  // page header (ui-standards § tables › toolbar, binding). The
                  // item search is the permanent default chip; Location is
                  // addable (OutboundLineFilters).
                  filters={
                    <OutboundLineFilters
                      filter={filter()}
                      onFilterChange={onFilterChange}
                      locations={locations()}
                    />
                  }
                  // Non-suspending loading read — a between-page/filter/sort
                  // refetch keeps rows + shows the refreshing bar; a post-save
                  // refetch is silent (tableLoading gates it out). Initial
                  // load → Suspense.
                  loading={tableLoading()}
                  sort={currentSort()}
                  onSort={onSort}
                  onRowClick={editable() ? openRow : undefined}
                  rowTint={lineRowTint}
                  // Same predicate on both channels: the tint colours the
                  // row, the bar makes the unfinished lines legible down one
                  // edge as the user scrolls.
                  rowAccent={lineRowTint}
                  cardTone={lineCardTone}
                  emptyMessage={t('error.no-outbound-items')}
                  empty={
                    editable() ? (
                      <Button
                        variant="ghost"
                        shortcut={ALT_N}
                        data-testid="nothing-here-create-button"
                        onClick={openAdd}
                      >
                        {t('button.add-item')}
                      </Button>
                    ) : undefined
                  }
                  enableSelection
                  selectedIds={selectedIds()}
                  onSelectionChange={setSelectedIds}
                  config={tableConfig.config()}
                  setConfig={tableConfig.setConfig}
                  // Central-server admins can promote this table's layout to
                  // the shared install-wide default, the same as the list
                  // (issue #1118 — detail tables offered no way to save table
                  // defaults). Gate + action both off the config controller;
                  // undefined for everyone else, so the action isn't offered.
                  onSaveGlobalDefault={
                    tableConfig.canSaveGlobalDefault()
                      ? tableConfig.saveGlobalTableConfig
                      : undefined
                  }
                />
              </TabPanel>
              <TabPanel value="custom-fields">
                {/* Custom fields for the outbound_shipment scope — disabled once
                    the shipment is read-only (past PICKED). Prominent fields
                    live in the toolbar, so the tab shows the rest. */}
                <CustomFieldsEditTab
                  scope="outbound_shipment"
                  promoteToToolbar
                  disabled={!editable()}
                  values={current().customFields}
                  onSave={saveCustomFields}
                />
              </TabPanel>
              <TabPanel value="log">
                {/* The shared activity-log surface (domain/activityLog) — the
                    same Date · Time · User · Event · Details table every other
                    vertical's Log tab renders. Oldest-first, preserving this
                    tab's existing order and matching the real OMS
                    ActivityLogList (which sends no sort and takes the server's
                    datetime-ascending default). */}
                <ActivityLogPanel
                  storeId={params.storeId}
                  recordId={current().id}
                  order="oldest-first"
                />
              </TabPanel>

              <OutboundLineEditModal
                open={editState() != null}
                onClose={() => setEditState(undefined)}
                storeId={params.storeId}
                invoiceId={current().id}
                isNew={current().status === 'NEW'}
                customerIsStore={current().otherParty.store != null}
                currencyCode={current().currency?.code}
                currencyRate={current().currencyRate}
                initialItem={editState()?.item}
                initialLineId={editState()?.lineId}
                nextItem={nextItem}
                onCommitted={onLineOpsCommitted}
              />
              {/* The shared service-charges editor (spec S5) with outbound's
                  wire twins; a committed batch refetches like any other
                  line-level change (the totals are entity aggregates). */}
              <ServiceChargesModal
                open={serviceOpen()}
                onClose={() => setServiceOpen(false)}
                storeId={params.storeId}
                disabled={!editable()}
                fetchCharges={() =>
                  fetchOutboundServiceCharges(params.storeId, current().id)
                }
                save={async batch => {
                  const result = await saveOutboundServiceCharges(
                    params.storeId,
                    current().id,
                    batch
                  );
                  if (result.ok) onLineOpsCommitted();
                  return result;
                }}
              />
              {/* Returns need a shipped shipment (OMS-REG-DIST-04.21) — an info-only
                  notice; the return flow is the returns vertical's. */}
              <Show when={returnNoticeOpen()}>
                <Dialog
                  open
                  onClose={() => setReturnNoticeOpen(false)}
                  icon={<InfoIcon />}
                  title={t('button.return-lines')}
                  description={t('messages.cant-return-shipment')}
                  actions={
                    <OkButton onClick={() => setReturnNoticeOpen(false)} />
                  }
                />
              </Show>
              {/* From-shipment customer-return flow (OMS-REG-DIST-04.21 → customer-returns
                  S4): seeded from the selected STOCK lines (placeholder and
                  service lines can't be returned, so they're excluded); the
                  return is created born VERIFIED and linked to this shipment,
                  then we navigate to it. Own Suspense boundary, as for the
                  report selector above. */}
              <Show when={returnModalOpen()}>
                <Suspense>
                  <ReturnFromShipmentModal
                    open
                    onClose={() => setReturnModalOpen(false)}
                    storeId={params.storeId}
                    outboundShipmentId={current().id}
                    outboundShipmentInvoiceNumber={current().invoiceNumber}
                    customerId={current().otherParty.id}
                    customerName={current().otherParty.name}
                    outboundShipmentLineIds={() =>
                      selectedLines()
                        .filter(
                          line =>
                            line.type !== 'SERVICE' &&
                            line.type !== 'UNALLOCATED_STOCK'
                        )
                        .map(line => line.id)
                    }
                    onCreated={returnId => {
                      setReturnModalOpen(false);
                      setSelectedIds([]);
                      navigate(
                        `/${params.storeId}/distribution/customer-return/${returnId}`
                      );
                    }}
                  />
                </Suspense>
              </Show>
            </Page>
          </Tabs>
        )}
      </Show>
    </Suspense>
  );
};

export default OutboundDetailView;

import {
  createEffect,
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
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../../ui/elements/buttons/Button';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Tabs, TabList, TabPanel } from '../../../ui/elements/tabs/Tabs';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import {
  FilterBar,
  FilterTextInput,
} from '../../../ui/elements/selectors/FilterBar';
import {
  formatCurrencyCell,
  getCurrencyCell,
  getExpiryDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { formatNumber } from '../../../intl/formatNumber';
import { createTableConfig } from '../../../api/createTableConfig';
import { createMediaQuery } from '../../../ui/utils/createMediaQuery';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import {
  CheckIcon,
  InfoIcon,
  MinusCircleIcon,
  PlusCircleIcon,
} from '../../../ui/icons';
import { NameSearch } from '../../../domain/name';
import { fetchLocations } from '../../../domain/location';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { stripEmpty } from '../../../typeHelpers';
import {
  CustomFieldsEditTab,
  CustomFieldsToolbar,
} from '../../../domain/customFields';
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
import { outboundDetailFilters } from './outboundDetailFilters';
import type { StatusPreflight } from './actions/StatusChangeAction';
import { isEditable, canReturnLines } from '../outboundStatus';
import { outboundPrefs } from '../outboundPreferencesResource';
import { OutboundStatusFooter } from './OutboundStatusFooter';
import { OutboundSidePanel } from './OutboundSidePanel';
import { LogTab } from './LogTab';
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
// the returns vertical — AC-V3 hands over to it). Lazy so the returns graph it
// pulls in stays out of this section's eager chunk, loading only when a return
// is actually started.
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
// line editor S4 on that row's item AND batch — AC-V1/AC-V6), the side panel
// (S3 § side panel), and the persistent status footer (hold / crumbs / status
// split button — AC-V2), replaced by the bulk line-action bar on selection.
// Line quantities are entered ONLY in the line editor.
//
// TWO independent queries (rules.md § server-paginated line table, AC-V4):
// `info` (outboundDetail — header/footer/side-panel fields, NOT the lines)
// and `lines` (outboundLines — one server-filtered/sorted page). An entity-
// LEVEL save mutates `info` in place; a LINE-level change refetches the lines
// page AND the entity (the footer totals are its server-side pricing
// aggregates — D45; placeholders and trims move server-side too —
// kdd/state-management: refresh by direct call). Service lines are their own
// small read (the S5 editor + side-panel rows).

type Line = OutboundLineFragment;

// The server sort-field union (from codegen) — a column can only ever name a
// real server sort key (kdd/type-safety). Columns whose data the server can't
// sort on (VVM, unit, doses, quantities, prices, received/difference, volume —
// spec contract § detail line table) simply omit `sortKey`.
type SortKey = NonNullable<OutboundLinesVariables['sort']>[number]['key'];

const DEFAULT_PAGE_SIZE = 20;

// The URL-backed view state (kdd/url-structure): filter + sort + pagination in
// the single `?query=` JSON param, so a filtered/sorted/paged view is
// shareable and survives reload + back-nav (AC-V4). All three conform to the
// generated outboundLines variables (no remapping — kdd/type-safety).
// Selection and the side-panel open state stay local (transient UI). Mirrors
// the stocktakes detail.
type DetailUrlState = {
  filter: OutboundLineFilter;
  sort: NonNullable<OutboundLinesVariables['sort']>;
  offset: number;
  first: number;
};

const DEFAULT_URL_STATE: DetailUrlState = {
  // Default sort: item name ascending (spec S3 § line table).
  filter: {},
  sort: [{ key: 'itemName', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const OutboundDetailView: Component = () => {
  const params = useParams<{ storeId: string; invoiceId: string }>();
  const navigate = useNavigate();
  // Filter + sort + pagination are URL-backed (shareable, survive reload/back-
  // nav) in one `?query=` param. Thin accessors over that single query.
  const { query, setQuery } =
    useUrlQueryState<DetailUrlState>(DEFAULT_URL_STATE);
  const filter = () => query().filter;
  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // Side panel: auto-open on wide viewports, closed below (the responsive
  // detail-panel behaviour the shared e2e suites drive); the More button and
  // the panel's close re-take control until the breakpoint next flips.
  const isWide = createMediaQuery('(min-width: 1536px)');
  const [sidePanelOpen, setSidePanelOpen] = createSignal(false);
  createEffect(() => setSidePanelOpen(isWide()));

  // The line editor's open state (undefined = closed). The editor self-manages
  // its current item as the user advances with "OK & next"; we only tell it
  // WHICH item (and clicked batch, for scroll/focus — AC-V6) to open on:
  // - { item, lineId }: opened from a ROW click — update mode.
  // - {}: opened from "Add item" — add mode (item search focused).
  type EditState = { item?: LineEditItem; lineId?: string } | undefined;
  const [editState, setEditState] = createSignal<EditState>();
  const [serviceOpen, setServiceOpen] = createSignal(false);
  // Customer-change rejection — shown on the lookup itself (controls › action
  // feedback: inline, keyed to its cause).
  const [customerError, setCustomerError] = createSignal<string>();
  // "Return selected lines": at SHIPPED+ opens the customer-return create flow
  // (returnModalOpen, AC-V3); before that the explanatory notice instead.
  const [returnNoticeOpen, setReturnNoticeOpen] = createSignal(false);
  const [returnModalOpen, setReturnModalOpen] = createSignal(false);

  const [data, { mutate, refetch: refetchInfo }] = createResource(
    () => ({ storeId: params.storeId, id: params.invoiceId }),
    async variables => {
      // A not-found NodeError is NOT routed to the global error modal (which
      // would offer a useless reload of the same bad id, and shadow the local
      // notice); it falls through to `undefined` here and the view shows the
      // AC-L5 "not found" blocking notice → back to list.
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

  // The lines PAGE — a separate, server-filtered/sorted/paged query (AC-V4).
  // Keyed on the SERIALISED variables (a stable string) so identical query
  // content doesn't refetch (kdd/solid-reactivity-pitfalls). stripEmpty drops
  // added-but-empty filter chips; the fixed invoiceId + non-service scoping is
  // merged here (never URL state). Service lines are a separate read below.
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
  // Deleting the last page's rows can leave the offset past the end (an
  // empty "41–40 of 40" page) — clamp back to the last real page when a
  // resolved page proves the offset overshot. Idempotent: the clamped offset
  // satisfies the guard, so the effect settles in one step.
  createEffect(() => {
    const total = linesData.latest?.totalCount;
    const { offset, first } = query();
    if (total == null || offset === 0 || offset < total) return;
    const lastPage = Math.floor(Math.max(0, total - 1) / first) * first;
    setQuery({ ...query(), offset: lastPage });
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

  // Status pre-flight (AC-S5/AC-S6) — whole-shipment answers the current page
  // can't give (rules.md § server-paginated line table): three sequential
  // count/name probes run when the user invokes the status change, not
  // reactive derivations. A failed probe returns undefined (graphqlFetch has
  // already routed the error to the global modal) and the action aborts.
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

  // Customer change (AC-N1): reissues under a NEW identity — renavigate to the
  // returned id. Blocked (UI) when the shipment came from a requisition
  // (AC-N2 — the lookup is disabled then, this is the backstop).
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
  // (AC-V9 — the gates below classify by the rows in view).
  const onSort = (key: SortKey, desc: boolean) => {
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });
    setSelectedIds([]);
  };

  const onFilterChange = (next: OutboundLineFilter) => {
    setQuery({ ...query(), filter: next, offset: 0 });
    setSelectedIds([]);
  };

  // Row click → the line editor for that row's ITEM (AC-V1), carrying the
  // clicked line so the editor scrolls to / focuses that batch (AC-V6);
  // disabled rows (read-only shipment) get no handler at all. The editor
  // advances through the list itself via "OK & next" (AC-V7).
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

  // "OK & next" (update mode) asks the parent for the next item to edit. We
  // own this (not the modal) because the list is server-paginated: the next
  // item may be on a later PAGE, and finding it means advancing the detail
  // table forward — the same as the user paging (rules.md § Save & next).
  // The paging logic lives in ./nextItemWalk (unit-tested); this wires its
  // deps: direct page fetches (race-free — never the reactive resource),
  // page advance = setQuery + selection clear (AC-V9), abort = the editor
  // closed (a cancel mid-walk must not keep paging the table).
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
  // Bulk-action visibility (spec S3 § bulk line actions matrix): state-disallowed
  // actions are HIDDEN, not disabled.
  const hasSelectedPlaceholder = () =>
    selectedLines().some(line => line.type === 'UNALLOCATED_STOCK');

  const prefs = () => outboundPrefs()?.prefs;
  const dosesOn = () => prefs()?.manageVaccinesInDoses ?? false;
  const vvmOn = () => prefs()?.manageVvmStatusForStock ?? false;

  // Build the filter definitions ONCE (a component body runs once at mount).
  // The location chip's render reads `locations` through the accessor, so the
  // live list flows in without rebuilding the filter array.
  const detailFilters = outboundDetailFilters(locations);

  const crumbs = (current: OutboundNode) => [
    { label: t('distribution') },
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
    // Footer totals (spec § line table, D45): whole-shipment SERVER aggregates
    // off the entity's pricing stats — never a sum over the loaded rows, which
    // would silently become a page total under server pagination (AC-V4).
    const pricing = node()?.pricing;
    const totals = {
      price: pricing?.stockTotalAfterTax ?? 0,
      volume: pricing?.totalVolume ?? 0,
    };
    return [
      {
        c: { key: 'itemCode' },
        sortKey: 'itemCode',
        header: () => t('label.code'),
        footer: () => t('label.total'),
      },
      {
        c: { key: 'itemName' },
        sortKey: 'itemName',
        header: () => t('label.name'),
        meta: { headerPosition: 'primary', wrapLines: 2 },
      },
      {
        c: {
          accessor: line =>
            line.type === 'UNALLOCATED_STOCK'
              ? t('label.placeholder')
              : (line.batch ?? '—'),
          id: 'batch',
        },
        sortKey: 'batch',
        header: () => t('label.batch'),
      },
      {
        c: { key: 'expiryDate' },
        sortKey: 'expiryDate',
        header: () => t('label.expiry-date'),
        ...getExpiryDateCell(),
      },
      ...(vvmOn()
        ? [
            {
              c: {
                accessor: (line: Line) => line.vvmStatus?.description ?? '',
                id: 'vvmStatus',
              },
              header: () => t('label.vvm-status'),
            } as Column<Line, SortKey>,
          ]
        : []),
      {
        c: { accessor: line => line.location?.code ?? '', id: 'locationCode' },
        // The server key sorts by location NAME; code is what we display —
        // near enough in practice (codes prefix names in this dataset).
        sortKey: 'locationName',
        header: () => t('label.location'),
      },
      {
        c: { accessor: line => line.item.unitName ?? '', id: 'unitName' },
        header: () => t('label.unit'),
      },
      {
        c: { key: 'packSize' },
        sortKey: 'packSize',
        header: () => t('label.pack-size'),
        ...getNumberCell(),
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
              ...getNumberCell(),
            } as Column<Line, SortKey>,
          ]
        : []),
      {
        c: { key: 'numberOfPacks' },
        header: () => t('label.pack-quantity'),
        ...getNumberCell(),
      },
      {
        c: { key: 'receivedNumberOfPacks' },
        header: () => t('label.packs-received'),
        ...getNumberCell(),
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
        ...getNumberCell(),
      },
      {
        c: {
          accessor: line => line.numberOfPacks * line.packSize,
          id: 'unitQuantity',
        },
        header: () => t('label.unit-quantity'),
        ...getNumberCell(),
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
              ...getNumberCell(),
            } as Column<Line, SortKey>,
          ]
        : []),
      {
        c: { key: 'sellPricePerPack' },
        header: () => t('label.unit-sell-price'),
        ...getCurrencyCell(),
      },
      {
        c: { key: 'totalAfterTax' },
        header: () => t('label.total'),
        footer: () => formatCurrencyCell(totals.price),
        ...getCurrencyCell(),
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
        footer: () => formatNumber(totals.volume, { maximumFractionDigits: 2 }),
        ...getNumberCell(),
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
                <Button
                  variant="secondary"
                  icon={<CheckIcon />}
                  data-testid="dialog-button-ok"
                  onClick={() =>
                    navigate(
                      `/${params.storeId}/distribution/outbound-shipment`
                    )
                  }
                >
                  {t('button.ok')}
                </Button>
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
                    outboundPrefs()?.store?.issueInForeignCurrency ?? false
                  }
                  onSaved={saved => mutate(() => saved)}
                  edit={edit}
                  onSaveField={async patch => {
                    await saveField(patch);
                    // A backdate DELETES the shipment's lines server-side
                    // (AC-B2) — the visible page must follow, like any other
                    // line-level change.
                    if ('backdatedDatetime' in patch) await refetchAfterSave();
                  }}
                  onEditServiceCharges={() => setServiceOpen(true)}
                />
              }
              header={
                <Header>
                  <Breadcrumb crumbs={crumbs(current())} />
                  <HeaderButtons>
                    <Show when={editable()}>
                      <Button
                        icon={<PlusCircleIcon />}
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
                        data-testid="open-detail-panel-button"
                        onClick={() => setSidePanelOpen(true)}
                      >
                        {t('button.more')}
                      </Button>
                    </Show>
                  </HeaderButtons>
                  <Toolbar>
                    {/* Inline label: control pairs on one row (FieldRow, the
                        current app's toolbar layout — the controls hide their
                        own labels, the rows carry them). Customer lookup:
                        disabled when not editable or when the shipment came
                        from a requisition (AC-N2). */}
                    <FieldRow label={t('label.customer-name')}>
                      <NameSearch
                        label={t('label.customer-name')}
                        hideLabel
                        storeId={params.storeId}
                        role="customer"
                        // Seed the record's current customer so the selection's
                        // label resolves before (or regardless of) its page.
                        selected={{
                          id: current().otherParty.id,
                          name: current().otherParty.name,
                          code: current().otherParty.code,
                          isOnHold: current().otherParty.isOnHold,
                          isStore: current().otherParty.store != null,
                          isSupplier: false,
                          isDonor: false,
                        }}
                        disabled={!editable() || current().requisition != null}
                        error={customerError()}
                        clearable={false}
                        onSelect={customer => {
                          if (customer) void changeCustomer(customer.id);
                        }}
                      />
                    </FieldRow>
                    <FieldRow label={t('label.customer-ref')}>
                      <TextField
                        label={t('label.customer-ref')}
                        hideLabel
                        size="small"
                        data-testid="customer-reference-field"
                        value={edit.state.theirReference}
                        disabled={!editable()}
                        onInput={e =>
                          edit.setField('theirReference', e.currentTarget.value)
                        }
                        onBlur={() => edit.flush()}
                      />
                    </FieldRow>
                    {/* PROMINENT custom fields — stay in the toolbar even when
                        the shipment is read-only (past PICKED), just disabled. */}
                    <CustomFieldsToolbar
                      scope="outbound_shipment"
                      recordId={current().id}
                      values={current().customFields}
                      disabled={!editable()}
                      onSave={patch => void saveField({ customFields: patch })}
                    />
                    {/* Always-on item search — name OR code (server
                        itemCodeOrName.like, AC-V5), like the stocktakes
                        detail. Blank clears to null so stripEmpty drops it (a
                        blank `like` would match everything). */}
                    <FilterTextInput
                      label={t('placeholder.filter-items')}
                      placeholder={t('placeholder.filter-items')}
                      value={filter().itemCodeOrName?.like ?? ''}
                      onInput={value =>
                        onFilterChange({
                          ...filter(),
                          itemCodeOrName: value ? { like: value } : null,
                        })
                      }
                    />
                    <FilterBar
                      filters={detailFilters}
                      filter={filter()}
                      onChange={onFilterChange}
                    />
                  </Toolbar>
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
                <Show
                  when={selectedIds().length > 0}
                  fallback={
                    <OutboundStatusFooter
                      storeId={params.storeId}
                      node={current()}
                      preflight={preflight}
                      onSetHold={setHold}
                      // A status change can trim zero-quantity lines
                      // server-side — refetch the lines page alongside the
                      // in-place entity splice.
                      onSaved={saved => {
                        mutate(() => saved);
                        void refetchAfterSave();
                      }}
                      onClose={() =>
                        navigate(
                          `/${params.storeId}/distribution/outbound-shipment`
                        )
                      }
                    />
                  }
                >
                  <ContentFooter testId="actions-footer">
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
                    {/* Return selected lines (AC-V3): shown at EVERY status (not
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
                  // Non-suspending loading read — a between-page/filter/sort
                  // refetch keeps rows + shows the refreshing bar; a post-save
                  // refetch is silent (tableLoading gates it out). Initial
                  // load → Suspense.
                  loading={tableLoading()}
                  sort={currentSort()}
                  onSort={onSort}
                  onRowClick={editable() ? openRow : undefined}
                  // Placeholder lines read in the info tone — whole-row blue
                  // text, matching the current app (ui-surface S3 line table).
                  rowTone={line =>
                    line.type === 'UNALLOCATED_STOCK' ? 'info' : undefined
                  }
                  emptyMessage={t('error.no-outbound-items')}
                  empty={
                    editable() ? (
                      <Button
                        icon={<PlusCircleIcon />}
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
                  // Page navigation clears the selection (AC-V9): the bulk-
                  // action gates classify by rows in view, so a selection must
                  // never carry ids the user can no longer see.
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
                <LogTab storeId={params.storeId} recordId={current().id} />
              </TabPanel>

              <OutboundLineEditModal
                open={editState() != null}
                onClose={() => setEditState(undefined)}
                storeId={params.storeId}
                invoiceId={current().id}
                isNew={current().status === 'NEW'}
                customerIsStore={current().otherParty.store != null}
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
              {/* Returns need a shipped shipment (AC-V3) — an info-only
                  notice; the return flow is the returns vertical's. */}
              <Show when={returnNoticeOpen()}>
                <Dialog
                  open
                  onClose={() => setReturnNoticeOpen(false)}
                  icon={<InfoIcon />}
                  title={t('button.return-lines')}
                  description={t('messages.cant-return-shipment')}
                  actions={
                    <Button
                      variant="secondary"
                      icon={<CheckIcon />}
                      onClick={() => setReturnNoticeOpen(false)}
                    >
                      {t('button.ok')}
                    </Button>
                  }
                />
              </Show>
              {/* From-shipment customer-return flow (AC-V3 → customer-returns
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

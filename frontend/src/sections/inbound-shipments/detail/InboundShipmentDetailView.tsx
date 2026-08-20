import {
  createMemo,
  createResource,
  createSignal,
  Show,
  Suspense,
} from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { HeaderToolbar } from '../../../ui/layout/Header/HeaderToolbar';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import {
  Tabs,
  TabList,
  TabPanel,
  type TabDef,
} from '../../../ui/elements/tabs/Tabs';
import { Button } from '../../../ui/elements/buttons/Button';
import {
  SplitButton,
  type SplitButtonOption,
} from '../../../ui/elements/buttons/SplitButton';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { CloseIcon, PlusCircleIcon, SidebarIcon } from '../../../ui/icons';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import {
  CommentHeader,
  getCellDefinition,
  getNumberCell,
  getTextCell,
} from '../../../ui/elements/table/tableHelpers';
import {
  Pagination,
  type PaginationProps,
} from '../../../ui/elements/table/Pagination';
import { remToPx } from '../../../ui/utils/rem';
import styles from './InboundShipmentDetailView.module.css';
import { createTableConfig } from '../../../api/createTableConfig';
import { useUrlQueryState } from '../../../list/urlQueryState';
import {
  DEFAULT_PAGE_SIZE,
  initialPageSize,
  rememberPageSize,
} from '../../../list/pageSize';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import {
  CustomFieldsEditTab,
  CustomFieldsToolbar,
} from '../../../domain/customFields';
import {
  fetchLocationsWithVolume,
  type LocationWithVolume,
} from '../../../domain/location';
import { inboundShipmentPreferences } from '../../../store/storeContext';
import {
  InboundShipment,
  InboundShipmentLines,
  type InboundInfoFragment,
  type InboundLineFragment,
  type InboundShipmentLinesVariables,
} from './inboundShipmentDetail.generated';
import type { UpdateInboundShipmentVariables } from './inboundShipmentDetail.generated';
import {
  isPlaceholderLine,
  updateInboundShipment,
  type InboundLineErrors,
} from './inboundShipmentUpdate';
import {
  canMutateInboundScope,
  isExternalScope,
  scopeFromParam,
} from '../inboundShipmentScope';
import type { InboundEditFields } from './inboundShipmentEdit';
import { InboundShipmentDetailToolbar } from './InboundShipmentDetailToolbar';
import { InboundShipmentSidePanel } from './InboundShipmentSidePanel';
import { createSidePanelOpen } from '../../../ui/layout/SidePanel/createSidePanelOpen';
import { createAddAction } from '../../../ui/utils/keyActions';
import { ALT_M, ALT_N } from '../../../ui/utils/shortcuts';
import { InboundShipmentStatusFooter } from './InboundShipmentStatusFooter';
import {
  canChangeStatus,
  isEditable,
  sourceLinkOf,
  supplierIsStore,
} from './inboundShipmentStatus';
import { SupplierKindIcon } from '../SupplierKindIcon';
import { ActivityLogPanel } from '../../../domain/activityLog';
import { InboundDocumentsPanel } from './tabs/InboundDocumentsPanel';
import { InboundCurrencyPanel } from './tabs/InboundCurrencyPanel';
import { InboundFinancialPanel } from './tabs/InboundFinancialPanel';
import { InboundDeliveryPanel } from './tabs/InboundDeliveryPanel';
import { InboundShipmentLineEditModal } from './edit-modal/InboundShipmentLineEditModal';
import { AddFromMasterListModal } from './modals/AddFromMasterListModal';
import { AddFromInternalOrderModal } from './modals/AddFromInternalOrderModal';
import {
  DeleteLinesAction,
  ZeroLineQuantityAction,
  ChangeLocationAction,
  AuthoriseLinesAction,
  ChangeCampaignProgramAction,
  ExportPrintAction,
} from './actions';
// "Return selected lines" → the supplier-return from-shipment create flow. The
// entry point is owned here (inbound detail); the flow is the returns
// vertical's (mirrors outbound-shipments → customer-returns).
import { ReturnFromInboundAction } from '../../supplier-returns/detail/edit-modal/ReturnFromInboundAction';

// The inbound-shipment detail view (spec S3). Mirrors the stocktake detail
// reference: TWO resources — `info` (header/footer/side-panel, a single node,
// spliced in place on a header save) and `lines` (one server-paginated page of
// the shipment's stock lines, refetched on any line change). A Verified
// shipment is read-only (the global edit gate); on-hold blocks only status
// changes.

type Line = InboundLineFragment;
type SortKey = NonNullable<
  InboundShipmentLinesVariables['sort']
>[number]['key'];

type DetailUrlState = {
  sort: NonNullable<InboundShipmentLinesVariables['sort']>;
  offset: number;
  first: number;
};
// The columns spec S3's line table marks "hidden by default (narrow)" — keyed
// by column ID (not accessor key). The compact band starts from this whole set;
// the base band hides the four a desktop still keeps out of the way.
const NARROW_HIDDEN: Record<string, boolean> = {
  comment: false,
  vvmStatus: false,
  location: false,
  unitName: false,
  dosesPerUnit: false,
  difference: false,
  unitQuantity: false,
  doses: false,
  costPricePerPack: false,
  sellPricePerPack: false,
  total: false,
  donor: false,
  manufacturer: false,
  manufactureDate: false,
  campaignProgram: false,
};

const DEFAULT_URL_STATE: DetailUrlState = {
  sort: [{ key: 'itemName', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const InboundShipmentDetailView: Component = () => {
  const params = useParams<{ storeId: string; invoiceId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } = useUrlQueryState<DetailUrlState>({
    ...DEFAULT_URL_STATE,
    first: initialPageSize(),
  });
  // The shipment's permission scope, carried by the route (inboundShipmentHref)
  // because the id alone can't reveal it. It selects `type` on the read below,
  // gates the mutate permission, and picks the plain-vs-`...External` mutation
  // twins — the whole screen's scope, known before the node arrives. The node
  // that comes back can only agree with it: the server filters on exactly this
  // (purchaseOrderId IS NULL / IS NOT NULL), so a mismatched URL yields no node
  // at all rather than a screen crossed between the two scopes.
  const [searchParams] = useSearchParams<{ type?: string }>();
  const scope = () => scopeFromParam(searchParams.type);

  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // Details-panel open state: responsive default (open on very wide viewports —
  // ≥1536px — closed otherwise), with the user's explicit open/close choice
  // persisted across reloads (spec ui-standards/layout.md → page regions).
  // Shared helper so this inherits the reference-vertical behaviour rather than
  // a bare createSignal. The header's More button opens it; the panel's own
  // close button closes it — both go through setSidePanelOpen, so both count as
  // an explicit choice.
  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();
  const [lineErrors, setLineErrors] = createSignal<InboundLineErrors>(
    new Map()
  );
  const [activeTab, setActiveTab] = createSignal('details');

  // The line table's pager. It lives in the screen's bottom bar — the status
  // footer, or the selection footer while rows are ticked — rather than in a
  // band of its own under the table (spec/ui-standards § tables → pagination):
  // that bar is present at every line count, so hosting the pager there costs
  // no extra row, and `conditional` means it renders nothing at all until the
  // lines outrun one page, leaving the bar as it was and the height to the
  // rows.
  const linePagination = (): PaginationProps => ({
    offset: query().offset,
    pageSize: query().first,
    total: totalCount(),
    onOffsetChange: offset => setQuery({ ...query(), offset }),
    onPageSizeChange: first => {
      // The remembered page size (D106) — it rode the DataTable's own
      // pagination prop, which this accessor replaced when the pager moved
      // into the status footer, so it has to travel with the handler.
      rememberPageSize(first);
      setQuery({ ...query(), first, offset: 0 });
    },
  });
  // The line-edit modal open state: { itemId, lineId } to edit an item's
  // batches (lineId = the clicked batch, focused on open), {} to add a new
  // item, undefined = closed. Fixed for the whole "OK & next" walk — the modal
  // advances between items imperatively, so this never changes mid-walk (no
  // remount); it only clears on close.
  const [editState, setEditState] = createSignal<{
    itemId?: string;
    lineId?: string;
  }>();
  const [masterListOpen, setMasterListOpen] = createSignal(false);
  const [internalOrderOpen, setInternalOrderOpen] = createSignal(false);

  const prefs = () => inboundShipmentPreferences();

  const tableConfig = createTableConfig({
    tableId: 'inbound-shipment-detail',
    defaultConfig: {
      // Code is pinned inline-start (spec S3 line table col 2) so the row stays
      // identifiable as the wide column set scrolls.
      compact: {
        viewMode: 'card',
        columnPinning: { left: ['itemCode'] },
        columnVisibility: NARROW_HIDDEN,
      },
      base: {
        columnPinning: { left: ['itemCode'] },
        columnVisibility: {
          manufactureDate: false,
          manufacturer: false,
          comment: false,
          sellPricePerPack: false,
        },
      },
    },
  });

  // Header/side-panel/footer node. `type` is the permission scope selector and
  // must match the shipment's own scope — which the URL carries, put there by
  // whatever surfaced this shipment (see inboundShipmentHref). ONE request: a
  // RecordNotFound here is a real missing record, promoted to the global
  // unexpected-error modal, and never the wrong-scope kind.
  const [data, { mutate, refetch: refetchInfo }] = createResource(
    () => ({ storeId: params.storeId, id: params.invoiceId, type: scope() }),
    async variables => {
      const result = await graphqlFetch(InboundShipment, variables, {
        mapSuccessToError: d =>
          d.invoice.__typename === 'NodeError'
            ? d.invoice.error.description
            : undefined,
      });
      return result.kind === 'success' &&
        result.data.invoice.__typename === 'InvoiceNode'
        ? result.data.invoice
        : undefined;
    }
  );
  // Header/side-panel/footer node — read NON-SUSPENDING (kdd/solid-reactivity-
  // pitfalls › No remounts on interaction). A line save refetches this node
  // (its stock/service charge totals change), and the line editor stays open
  // across an "OK & next" walk: a direct `data()` read would suspend the page
  // <Suspense> on that refetch, detaching the open native <dialog> (backdrop
  // gone, focus lost). The `.state` gate keeps the previous node on screen
  // while it refreshes. Initial load (no live state) is handled by the <Show>
  // fallback below, not by suspending.
  const info = (): InboundInfoFragment | undefined =>
    data.state === 'ready' || data.state === 'refreshing'
      ? data.latest
      : undefined;

  // One server-paginated page of the shipment's stock lines (invoiceId + type
  // forced; user filter/sort/page from the URL). Keyed on serialised variables
  // so identical content doesn't refetch. Both STOCK_IN and UNALLOCATED_STOCK
  // are pulled: a line REJECTED during authorisation flips server-side from
  // STOCK_IN to UNALLOCATED_STOCK, and it must stay on the table so its "Auth
  // status" column reads Rejected and the row-selection Approve/Reject/Pending
  // actions can un-reject it (spec ui-surface col 16 / AC-E6). SERVICE lines
  // stay out — they belong to the service-charge modal, not this table.
  const linesVariables = createMemo<InboundShipmentLinesVariables>(() => ({
    storeId: params.storeId,
    filter: {
      invoiceId: { equalTo: params.invoiceId },
      type: { equalAny: ['STOCK_IN', 'UNALLOCATED_STOCK'] },
    },
    sort: query().sort,
    page: { first: query().first, offset: query().offset },
  }));
  const [linesData, { refetch: refetchLines }] = createResource(
    () => JSON.stringify(linesVariables()),
    async serialised => {
      const result = await graphqlFetch(
        InboundShipmentLines,
        JSON.parse(serialised) as InboundShipmentLinesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.invoiceLines.__typename === 'InvoiceLineConnector'
        ? result.data.invoiceLines
        : undefined;
    }
  );
  // Lines page read NON-SUSPENDING too (same rule): a line save / bulk action /
  // "OK & next" page-advance refetches this while the editor is open — the
  // `.state` gate keeps the current page visible instead of suspending.
  const rows = (): Line[] =>
    linesData.state === 'ready' || linesData.state === 'refreshing'
      ? (linesData.latest?.nodes ?? [])
      : [];
  const totalCount = () =>
    linesData.state === 'ready' || linesData.state === 'refreshing'
      ? (linesData.latest?.totalCount ?? 0)
      : 0;

  // Total volume of the selected lines (volumePerPack × packs received) — feeds
  // the change-location picker's "Available" filter so it keeps only locations
  // with room for the whole move.
  const selectedVolume = (): number => {
    const ids = new Set(selectedIds());
    return rows()
      .filter(r => ids.has(r.id))
      .reduce((total, r) => total + r.volumePerPack * r.numberOfPacks, 0);
  };

  // Volume-aware: inbound places received stock at a location, so the picker
  // shows each location's % used and offers the All / Empty / Available filter
  // (same picker as stocktakes). A plain (non-cached) read, so the figures are
  // fresh whenever it runs — see fetchLocationsWithVolume.
  //
  // Fetched ON DEMAND, then held for the visit (kdd/state-management → data
  // needed only sometimes). Unlike the stocktake detail — whose toolbar
  // location FILTER reads this list, so it must be there on arrival — inbound's
  // only consumers are the bulk change-location modal and the line editor, so
  // nothing is fetched until one of the two gestures that reach them: ticking a
  // line's checkbox (which is what raises the bulk action bar) or clicking a
  // line (which opens the editor). The shipment's first paint pays for no
  // locations+stock query it may never need.
  //
  // The latch never lowers, so that is ONE fetch per visit rather than one per
  // interaction — a dropped gate would discard the list every time the
  // selection cleared. Freshness comes from refetching where it actually
  // changes: volumeUsed is server-computed and moves as stock lands, so
  // onLinesChanged re-reads it, exactly as the stocktake detail does after
  // every line save.
  const locationsNeeded = createMemo(
    prev => prev || editState() != null || selectedIds().length > 0,
    false
  );
  const [locationsData, { refetch: refetchLocations }] = createResource(
    () => (locationsNeeded() ? params.storeId : undefined),
    fetchLocationsWithVolume
  );
  // Non-suspending read — the binding read-safety gate (kdd/solid-reactivity-
  // pitfalls → No remounts on interaction). This resource now FIRST fetches
  // during an interaction, under the already-open screen's Suspense boundary,
  // so `.latest` alone would suspend on that first pending read and detach the
  // very <dialog> that triggered it. The picker renders empty while it's in
  // flight.
  const locations = (): LocationWithVolume[] =>
    locationsData.state === 'ready' || locationsData.state === 'refreshing'
      ? (locationsData.latest ?? [])
      : [];

  const current = () => info();
  // The two standing conditions that refuse EVERY write, a status advance
  // included — the server checks both before it reads the request. Mirrored so
  // a control the server would refuse reads as disabled, rather than taking the
  // edit and discarding it in silence (rules → editability).
  const writeBlocked = () => {
    const node = current();
    if (!node) return true;
    return (
      (node.otherParty.store?.isDisabled ?? false) ||
      !canMutateInboundScope(scope())
    );
  };
  // Edit surfaces add the status rule: read-only at Picked, Shipped, Verified.
  const isDisabled = () =>
    writeBlocked() || !isEditable(current()?.status ?? '');
  // The status footer keeps its own, looser status rule — an advance has to
  // stay reachable at Shipped, which the edit gate closes.
  const statusLocked = () =>
    writeBlocked() || !canChangeStatus(current()?.status ?? '');
  const isExternal = () => isExternalScope(scope());

  const refetchAll = () => {
    void refetchInfo();
    void refetchLines();
  };

  // Header field save → updateInboundShipment (twin by isExternal) → splice.
  // Returns the server's inline verdict so a field that can legitimately be
  // rejected while enabled (the received date — backdating window/direction,
  // spec S7/AC-B) can show it; buffered fire-and-forget callers ignore it.
  const saveField = async (
    patch: Partial<Omit<UpdateInboundShipmentVariables['input'], 'id'>>
  ): Promise<{ ok: boolean; message?: string }> => {
    const node = current();
    if (!node) return { ok: false };
    const result = await updateInboundShipment(params.storeId, isExternal(), {
      id: node.id,
      ...patch,
    });
    if (result.kind === 'saved') {
      mutate(prev => (prev ? { ...prev, ...result.node } : prev));
      // A tax/currency/charge change cascades to line costs — refetch the page.
      void refetchLines();
      return { ok: true };
    }
    // 'error' → server's inline verdict; 'failed' → already surfaced globally.
    return result.kind === 'error'
      ? { ok: false, message: result.message }
      : { ok: false };
  };

  const edit = createDebouncedEdit<InboundEditFields>({
    id: () => current()?.id ?? '',
    initial: () => ({
      theirReference: current()?.theirReference ?? '',
      comment: current()?.comment ?? '',
    }),
    save: patch => void saveField(patch),
  });

  const setHold = (hold: boolean) => void saveField({ onHold: hold });
  const onAdvanced = (saved: InboundInfoFragment) => {
    mutate(prev => (prev ? { ...prev, ...saved } : prev));
    void refetchLines();
  };
  const onNodeSaved = (saved: InboundInfoFragment) =>
    mutate(prev => (prev ? { ...prev, ...saved } : prev));

  const onDeleted = () =>
    navigate(`/${params.storeId}/replenishment/inbound-shipment`, {
      replace: true,
    });

  const onLinesChanged = () => {
    setSelectedIds([]);
    setLineErrors(new Map());
    refetchAll();
    // A line save or bulk action can place stock at a location (or move it), so
    // the pickers' % used / fullness filter must re-read — the stocktake
    // detail's refetchAfterSave, in the shape this view already has. A no-op
    // until something has armed the latch above.
    void refetchLocations();
  };
  const stampErrors = (errors: InboundLineErrors) =>
    setLineErrors(new Map(errors));

  const currentSort = (): SortState<SortKey> | undefined => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };
  const onSort = (key: SortKey, desc: boolean) =>
    setQuery({ ...query(), sort: [{ key, desc }], offset: 0 });

  const openRow = (line: Line) =>
    setEditState({ itemId: line.itemId, lineId: line.id });
  const openAdd = () => setEditState({});

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). Declared by
  // the SCREEN, once, because two controls trigger it: the header SplitButton
  // and the ghost button in the table's empty slot. Each carries
  // `shortcut={ALT_N}` for its badge; neither owns the action — which is
  // exactly the case a control-owned declaration could not express
  // (kdd/keyboard-layer decision 3).
  //
  // `run` is the plain add, the split button's default option, NOT its
  // menu-selected value: the binding means "add an item", and the master-list
  // and internal-order routes have their own gates. `isDisabled()` reads the
  // `.state`-gated `info()`, so this predicate never suspends the palette.
  createAddAction({
    name: 'button.add-item',
    run: openAdd,
    disabled: () => !current() || isDisabled(),
  });

  // "OK & next" (update mode): resolve the next item for the editor to advance
  // to. Owned by the PARENT because the line table is server-paginated — the
  // next item may be on a later page, and finding it pages the visible table
  // forward. Given the current item id and the covered-items set (every item
  // stepped through this walk, so a re-appearing item — one spans several batch
  // rows — is never offered twice, across pages too), returns the next distinct
  // uncovered item id in the current sorted order, or undefined when the whole
  // list is exhausted (→ the modal drops into add mode, table left on the last
  // page walked). Mirrors the stocktake reference (kdd/stocktake-line-editing).
  const nextItem = async (
    currentId: string,
    covered: Set<string>
  ): Promise<string | undefined> => {
    // The next distinct, uncovered item within a page's rows. On the CURRENT
    // page start AFTER the current item's rows (`fromStart` false): items
    // before it are uncovered but already behind us, so a `past` gate walks
    // past the current item first. Later pages are all "after", so `fromStart`
    // true.
    const pick = (pageRows: Line[], fromStart: boolean): string | undefined => {
      let past = fromStart;
      for (const line of pageRows) {
        const id = line.itemId;
        if (id === currentId) {
          past = true;
          continue;
        }
        if (!past || covered.has(id)) continue;
        return id;
      }
      return undefined;
    };

    // 1. The current page (already loaded) — scan only after the current item.
    const onThisPage = pick(rows(), false);
    if (onThisPage) return onThisPage;

    // 2/3. Walk forward a page at a time until we find one or run out. Later
    // pages scan from their top; the covered set guards repeats. Each page is
    // fetched DIRECTLY (race-free) while the table's URL offset follows along.
    let offset = query().offset;
    const first = query().first;
    for (;;) {
      offset += first;
      if (offset >= totalCount()) return undefined; // no further pages
      setQuery({ ...query(), offset });
      const result = await graphqlFetch(InboundShipmentLines, {
        storeId: params.storeId,
        filter: {
          invoiceId: { equalTo: params.invoiceId },
          type: { equalAny: ['STOCK_IN', 'UNALLOCATED_STOCK'] },
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

  const reportSort = () => {
    const s = query().sort[0];
    return s ? { key: s.key, desc: s.desc ?? false } : undefined;
  };

  // Financial / Currency / Delivery are PO-linked-only tabs (spec S3 tabs).
  const tabs = (): TabDef[] => [
    { value: 'details', label: t('label.details') },
    ...(isExternal()
      ? [
          { value: 'financial', label: t('label.financial') },
          { value: 'currency', label: t('label.currency') },
          { value: 'delivery', label: t('label.delivery') },
        ]
      : []),
    { value: 'documents', label: t('label.documents') },
    { value: 'custom-fields', label: t('label.custom-fields') },
    { value: 'log', label: t('label.log') },
  ];

  // The trail's leading glyph is the Replenishment section's, supplied by the
  // shell for every page. The KIND icon (truck / house) is the RECORD's, so it
  // rides the number crumb — before the number, as the current app shows it
  // (spec S3 § breadcrumb).
  const crumbs = (node: InboundInfoFragment) => [
    {
      label: t('inbound-shipment'),
      onClick: () =>
        navigate(`/${params.storeId}/replenishment/inbound-shipment`),
    },
    {
      label: String(node.invoiceNumber),
      icon: <SupplierKindIcon isStore={supplierIsStore(node)} />,
    },
  ];

  // Add-item split button options — master list & internal order gated (spec
  // AC-ML1 / AC-PG4).
  const addOptions = () => {
    const node = current();
    const opts: SplitButtonOption[] = [
      { value: 'item', label: t('button.add-item') },
    ];
    // Add from master list — only while New and not PO-linked (spec AC-ML1).
    // Disabled-with-reason rather than hidden (M5 / ui-surface cross-cutting).
    const masterListReason = !node
      ? undefined
      : isExternal()
        ? t('messages.master-list-not-on-po')
        : node.status !== 'NEW'
          ? t('messages.master-list-only-when-new')
          : undefined;
    opts.push({
      value: 'masterList',
      label: t('label.add-from-master-list'),
      disabled: !!masterListReason,
      title: masterListReason,
    });
    // Add-from-internal-order — store allows the manual link, the shipment is
    // still editable, and it carries a MANUALLY linked internal order (spec
    // AC-PG4 / AC-IO1). The distinguishing signal is linkedShipment: an
    // INCOMING transfer has one (it arrives pre-populated, so there is no
    // order-line pull to offer), a manual link has a requisition without one.
    // That is the same signal sourceLinkOf() keys on, so a !== 'transfer' test
    // would read equivalently here — linkedShipment is named directly because
    // this gate is about the pre-populated lines, not about the status flow.
    // Offered only when the store enables manual IO linking (a preference
    // gate → offer-shaping, omitted otherwise). When offered,
    // disable-with-reason for the per-shipment state (M5): needs a manually
    // linked internal order and an editable shipment.
    if (prefs().manuallyLinkInternalOrderToInboundShipment) {
      const ioReason = !node
        ? undefined
        : !node.requisition
          ? t('messages.internal-order-add-needs-order')
          : node.linkedShipment
            ? t('messages.internal-order-add-not-on-transfer')
            : isDisabled()
              ? t('error.inbound-shipment-not-editable')
              : undefined;
      opts.push({
        value: 'internalOrder',
        label: t('label.add-from-internal-order'),
        disabled: !!ioReason,
        title: ioReason,
      });
    }
    return opts;
  };
  const onAddAction = (value: string) => {
    if (value === 'masterList') setMasterListOpen(true);
    else if (value === 'internalOrder') setInternalOrderOpen(true);
    else openAdd();
  };

  const columns = (): Column<Line, SortKey>[] => {
    const isManual = !isExternal();
    return [
      // Comment first, hidden by default (spec S3 line table col 1) — the
      // line's note, in the shared comment cell (icon + popover). Explicit
      // `id: 'comment'`, NOT the `note` accessor key: the id is what the
      // column-visibility defaults and `cell-<columnId>` testids speak, and
      // this column is "Comment" everywhere else (the list's own comment
      // column, and the getCellDefinition preset key).
      {
        c: { accessor: line => line.note, id: 'comment' },
        header: () => <CommentHeader />,
        ...getCellDefinition('comment'),
      },
      {
        c: { accessor: line => line.itemCode, id: 'itemCode' },
        sortKey: 'itemCode',
        header: () => t('label.code'),
        ...getCellDefinition('itemCode'),
        // A line that arrived via another store's transfer (linkedInvoiceId
        // set) can't be independently deleted; flag its code in the error tone
        // so the provenance is visible (spec AC-E9 / M9).
        cell: info => {
          const line = info.row.original;
          return (
            <span class={line.linkedInvoiceId ? styles.errorCode : undefined}>
              {line.itemCode}
            </span>
          );
        },
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
      // PO line number — PO-linked shipments only.
      ...(isExternal()
        ? [
            {
              c: {
                accessor: line => line.purchaseOrderLine?.lineNumber ?? '',
                id: 'poLine',
              },
              header: () => t('label.po-line-number'),
              // No CELL_DEF key; "PO line number" is the binding constraint.
              ...getNumberCell(),
              size: remToPx(8),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
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
      // VVM status — gated by the store preference; shown for vaccine items
      // only, blank otherwise (VVM applies to vaccines, spec AC-PG1 / M1).
      ...(prefs().manageVvmStatusForStock
        ? [
            {
              c: {
                accessor: line =>
                  line.item?.isVaccine
                    ? (line.vvmStatus?.description ?? '')
                    : '',
                id: 'vvmStatus',
              },
              header: () => t('label.vvm-status'),
              ...getCellDefinition('vvmStatus'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      {
        c: { accessor: line => line.location?.code ?? '', id: 'location' },
        sortKey: 'locationName',
        header: () => t('label.location'),
        ...getCellDefinition('location'),
      },
      // Unit name (spec S1 line-table col 9 / L3).
      {
        c: { accessor: line => line.item?.unitName ?? '', id: 'unitName' },
        header: () => t('label.unit'),
        ...getCellDefinition('unitName'),
      },
      {
        c: { key: 'packSize' },
        sortKey: 'packSize',
        header: () => t('label.received-pack-size'),
        // Not `packSize` — that preset is sized for the header "Pack size".
        // See `receivedPackSize` in _globalColumnConfig for the measurement.
        ...getCellDefinition('receivedPackSize'),
      },
      // Doses per unit (H5) — vaccines-in-doses pref; the item's configured
      // doses, blank for a non-vaccine item.
      ...(prefs().manageVaccinesInDoses
        ? [
            {
              c: {
                accessor: line => {
                  const it = line.item;
                  return it?.isVaccine ? it.doses : '';
                },
                id: 'dosesPerUnit',
              },
              header: () => t('label.doses-per-unit'),
              ...getCellDefinition('dosesPerUnit'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      {
        c: { key: 'numberOfPacks' },
        header: () => t('label.packs-received'),
        ...getCellDefinition('numberOfPacks', { headerPosition: 'badge' }),
      },
      // Difference (H6) — supplier-shipped packs minus received packs; blank
      // when nothing was recorded as shipped.
      {
        c: {
          accessor: line =>
            line.shippedNumberOfPacks != null
              ? line.shippedNumberOfPacks - line.numberOfPacks
              : '',
          id: 'difference',
        },
        header: () => t('label.difference'),
        ...getCellDefinition('difference'),
      },
      // Unit quantity (H6) — pack size × pack quantity; manual shipments only.
      ...(isManual
        ? [
            {
              c: {
                accessor: line => line.packSize * line.numberOfPacks,
                id: 'unitQuantity',
              },
              header: () => t('label.unit-quantity'),
              ...getCellDefinition('unitQuantity'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      // Doses (H5) — units received × doses per unit; vaccines-in-doses pref,
      // vaccine items only.
      ...(prefs().manageVaccinesInDoses
        ? [
            {
              c: {
                accessor: line => {
                  const it = line.item;
                  return it?.isVaccine
                    ? line.numberOfPacks * line.packSize * it.doses
                    : '';
                },
                id: 'doses',
              },
              header: () => t('label.doses'),
              ...getCellDefinition('doses'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      // Auth status — gated by the authorisation preference. Header "Auth
      // status" (not the generic "Status"); values humanised from the raw
      // PENDING/PASSED/REJECTED enum (spec col 16 / M6).
      ...(prefs().externalInboundShipmentLinesMustBeAuthorised
        ? [
            {
              c: {
                accessor: line => {
                  switch (line.status) {
                    case 'PENDING':
                      return t('label.pending');
                    case 'PASSED':
                      return t('label.passed');
                    case 'REJECTED':
                      return t('label.rejected');
                    default:
                      return '';
                  }
                },
                id: 'authStatus',
              },
              header: () => t('label.auth-status'),
              // Pending/Passed/Rejected as text; no CELL_DEF key, and "Auth
              // status" is the binding constraint.
              ...getTextCell(),
              size: remToPx(7),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      // Prices — manual shipments only (PO-linked derive from the order).
      ...(isManual
        ? [
            {
              c: { key: 'costPricePerPack' },
              header: () => t('label.pack-cost-price'),
              ...getCellDefinition('costPricePerPack'),
            } satisfies Column<Line, SortKey>,
            {
              c: { key: 'sellPricePerPack' },
              header: () => t('label.pack-sell-price'),
              ...getCellDefinition('sellPricePerPack'),
            } satisfies Column<Line, SortKey>,
            {
              c: {
                // Placeholder lines (0 packs, nothing shipped) have no
                // meaningful total — blank (null → empty currency cell) rather
                // than a zero amount (AC-V3).
                accessor: line =>
                  isPlaceholderLine(line) ? null : line.totalAfterTax,
                id: 'total',
              },
              header: () => t('label.total'),
              ...getCellDefinition('total'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      // Donor — gated by the donor-tracking preference.
      ...(prefs().allowTrackingOfStockByDonor
        ? [
            {
              c: { accessor: line => line.donor?.name ?? '', id: 'donor' },
              header: () => t('label.donor'),
              // The `donor` preset, NOT `name`: `name` is the text SINK
              // (18.75rem, uncapped) — the width the item-name column earns
              // by being the row's identity. A second sink beside it just
              // eats the table.
              ...getCellDefinition('donor'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      {
        c: {
          accessor: line => line.manufacturer?.name ?? '',
          id: 'manufacturer',
        },
        header: () => t('label.manufacturer'),
        ...getCellDefinition('manufacturer'),
      },
      {
        c: { key: 'manufactureDate' },
        header: () => t('label.manufacture-date'),
        ...getCellDefinition('manufactureDate'),
      },
      // Campaign/program (spec S1 line-table col 23 / L3) — manual shipments
      // only; a line carries a campaign OR a program (mutually exclusive).
      ...(isManual
        ? [
            {
              c: {
                accessor: line =>
                  line.campaign?.name ?? line.program?.name ?? '',
                id: 'campaignProgram',
              },
              header: () => t('label.campaign'),
              // The `campaign` preset (a campaign OR program name), as the
              // stocktake line table uses — not the `name` text sink.
              ...getCellDefinition('campaign'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
    ];
  };

  return (
    // info()/rows() are read non-suspending (above), so the initial-load
    // spinner comes from this <Show> fallback, not from the <Suspense> (which
    // stays only as the lazy-route-chunk boundary). Once the node is present it
    // stays rendered through every refetch — no remount of the open editor.
    <Suspense fallback={<Spinner center />}>
      <Show when={info()} fallback={<Spinner center />}>
        {node => (
          <Tabs value={activeTab()} onValueChange={setActiveTab}>
            <Page
              fillBody
              sidePanelOpen={sidePanelOpen()}
              sidePanelTitle={t('heading.details')}
              onSidePanelClose={() => setSidePanelOpen(false)}
              sidePanelContent={
                <InboundShipmentSidePanel
                  storeId={params.storeId}
                  node={node()}
                  open={sidePanelOpen()}
                  disabled={isDisabled()}
                  scope={scope()}
                  edit={edit}
                  donorTracking={prefs().allowTrackingOfStockByDonor}
                  foreignCurrencyAllowed={prefs().issueInForeignCurrency}
                  onSaveField={saveField}
                  onSaved={onNodeSaved}
                  onRefetch={refetchAll}
                  onDeleted={onDeleted}
                />
              }
              header={
                <Header>
                  {/* No `icon` — the leading glyph is the Replenishment
                      section's, from the shell. The kind icon rides the number
                      crumb (see `crumbs`). */}
                  <Breadcrumb crumbs={crumbs(node())} />
                  {/* Every control here collapses to its icon on a narrow
                      viewport (`collapsible="narrow"`, label kept as the
                      accessible name and repeated as a tooltip — the outbound
                      header's tier). Labelled, this cluster needs more width
                      than a tablet's header has left beside the breadcrumb, so
                      it wrapped onto a row of its own — and on a short screen
                      that row costs table rows, which are worth more. The
                      split button gains an icon for the same reason: collapsed
                      it is nothing but its icon. */}
                  <HeaderButtons>
                    <Show when={!isDisabled()}>
                      <SplitButton
                        icon={<PlusCircleIcon />}
                        collapsible="narrow"
                        options={addOptions()}
                        value="item"
                        testId="add-item-button"
                        menuLabel={t('button.add-item')}
                        shortcut={ALT_N}
                        onAction={onAddAction}
                      />
                    </Show>
                    <ExportPrintAction
                      invoiceId={node().id}
                      sort={reportSort()}
                    />
                    {/* More — the closed-panel reopen affordance, at the end
                        of the app-bar page-action cluster (spec ui-standards/
                        layout.md → page regions). Shows ONLY while the panel is
                        closed; uses the sidebar glyph (not the info icon), and
                        reopening counts as the user's explicit open choice. */}
                    <Show when={!sidePanelOpen()}>
                      <Button
                        variant="secondary"
                        icon={<SidebarIcon />}
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
                      (ui/docs/PAGES.md § header field cluster). The kind banner
                      (spec S3: manual shipments don't auto-advance; a
                      transfer/automatic one is driven by the sending side) is
                      the cluster's `alert`: a COMPACT Alert, which is what the
                      slot takes — it hugs its content at the end of the field
                      row on the bottom baseline and drops to its own line when
                      the row can't hold it. A full-width Alert here would take
                      an equal share of the row like a field. */}
                  <HeaderToolbar
                    alert={
                      <Alert severity="info" compact>
                        {sourceLinkOf(node()) === 'none'
                          ? t('messages.inbound-manual-info')
                          : t('messages.inbound-automatic-info')}
                      </Alert>
                    }
                  >
                    <InboundShipmentDetailToolbar
                      storeId={params.storeId}
                      node={node()}
                      disabled={isDisabled()}
                      edit={edit}
                      backdatingEnabled={prefs().backdatingEnabled}
                      backdatingMaxDays={prefs().backdatingMaxDays}
                      onSaveField={saveField}
                    />
                    {/* PROMINENT custom fields for the scope — stay in the
                        toolbar even when the shipment is read-only, just
                        disabled (spec/ui-standards/custom-fields). They wear
                        their own labels like the fields above (the cluster's
                        `field` layout). */}
                    <CustomFieldsToolbar
                      scope="inbound_shipment"
                      recordId={node().id}
                      values={node().customFields}
                      disabled={isDisabled()}
                      layout="field"
                      onSave={patch => void saveField({ customFields: patch })}
                    />
                  </HeaderToolbar>
                  <TabList tabs={tabs()} />
                </Header>
              }
              contentFooter={
                <Show
                  when={selectedIds().length > 0}
                  fallback={
                    <InboundShipmentStatusFooter
                      storeId={params.storeId}
                      node={node()}
                      disabled={statusLocked()}
                      isExternal={isExternal()}
                      onSetHold={setHold}
                      onAdvanced={onAdvanced}
                      pagination={linePagination()}
                    />
                  }
                >
                  <ContentFooter testId="actions-footer">
                    <strong data-testid="selected-rows-count">
                      {selectedIds().length} {t('label.selected')}
                    </strong>
                    <DeleteLinesAction
                      storeId={params.storeId}
                      isExternal={isExternal()}
                      selectedIds={selectedIds}
                      disabled={isDisabled()}
                      onChanged={onLinesChanged}
                      onError={stampErrors}
                    />
                    <ZeroLineQuantityAction
                      storeId={params.storeId}
                      isExternal={isExternal()}
                      selectedIds={selectedIds}
                      disabled={isDisabled()}
                      onChanged={onLinesChanged}
                      onError={stampErrors}
                    />
                    <ChangeLocationAction
                      storeId={params.storeId}
                      isExternal={isExternal()}
                      selectedIds={selectedIds}
                      disabled={isDisabled()}
                      locations={locations()}
                      locationsLoading={locationsData.loading}
                      requiredVolume={selectedVolume}
                      onChanged={onLinesChanged}
                      onError={stampErrors}
                    />
                    <ChangeCampaignProgramAction
                      storeId={params.storeId}
                      isExternal={isExternal()}
                      selectedIds={selectedIds}
                      disabled={isDisabled()}
                      onChanged={onLinesChanged}
                      onError={stampErrors}
                    />
                    {/* Approve/Reject/Pending — only when the store requires
                        authorisation of these shipments' lines. */}
                    <Show
                      when={
                        prefs().externalInboundShipmentLinesMustBeAuthorised
                      }
                    >
                      <AuthoriseLinesAction
                        storeId={params.storeId}
                        isExternal={isExternal()}
                        selectedIds={selectedIds}
                        disabled={isDisabled()}
                        onChanged={onLinesChanged}
                        onError={stampErrors}
                      />
                    </Show>
                    {/* Return selected lines → supplier-return create flow
                        (spec/supplier-returns § from an originating inbound
                        shipment). Shown at every status; a non-returnable
                        status explains rather than acts. */}
                    <ReturnFromInboundAction
                      storeId={params.storeId}
                      shipmentId={node().id}
                      shipmentInvoiceNumber={node().invoiceNumber}
                      supplierId={node().otherPartyId}
                      supplierName={node().otherPartyName}
                      status={node().status}
                      stockLineIds={() =>
                        rows()
                          .filter(line => selectedIds().includes(line.id))
                          .map(line => line.stockLine?.id)
                          .filter((id): id is string => !!id)
                      }
                      onDone={() => setSelectedIds([])}
                    />
                    {/* The pager rides the selection face as well: ticking a
                        row must not strip the way to the rest of the lines. */}
                    <Pagination {...linePagination()} inBar />
                    <ContentFooterActions>
                      <Button
                        variant="secondary"
                        icon={<CloseIcon />}
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
                  loading={linesData.loading}
                  sort={currentSort()}
                  onSort={onSort}
                  onRowClick={isDisabled() ? undefined : openRow}
                  // A line the last bulk op failed reads in the error tone
                  // (spec S8 → per-line indicators); an untouched placeholder
                  // reads in the info tone (AC-V3). Error wins when both hold.
                  rowTone={line =>
                    lineErrors().has(line.id)
                      ? 'error'
                      : isPlaceholderLine(line)
                        ? 'info'
                        : undefined
                  }
                  emptyMessage={t('error.no-inbound-items')}
                  empty={
                    // The empty state's create affordance takes the shared
                    // nothing-here id — NOT `add-item-button`, which is the
                    // Add-item split button's prefix (it generates
                    // add-item-button-main / -dropdown, so re-stamping it here
                    // collided with them).
                    isDisabled() ? undefined : (
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
                  enableSelection
                  selectedIds={selectedIds()}
                  onSelectionChange={setSelectedIds}
                  config={tableConfig.config()}
                  setConfig={tableConfig.setConfig}
                  onSaveGlobalDefault={
                    tableConfig.canSaveGlobalDefault()
                      ? tableConfig.saveGlobalTableConfig
                      : undefined
                  }
                />
              </TabPanel>
              <Show when={isExternal()}>
                <TabPanel value="financial">
                  <InboundFinancialPanel node={node()} rows={rows()} />
                </TabPanel>
                <TabPanel value="currency">
                  <InboundCurrencyPanel
                    node={node()}
                    disabled={isDisabled()}
                    onSave={saveField}
                  />
                </TabPanel>
                <TabPanel value="delivery">
                  <InboundDeliveryPanel node={node()} rows={rows()} />
                </TabPanel>
              </Show>
              <TabPanel value="documents">
                <InboundDocumentsPanel
                  node={node()}
                  disabled={isDisabled()}
                  onChanged={() => void refetchInfo()}
                />
              </TabPanel>
              <TabPanel value="custom-fields">
                {/* Custom fields for the inbound_shipment scope — disabled once
                    the shipment is read-only; prominent fields live in the
                    toolbar, so the tab shows the rest. */}
                <CustomFieldsEditTab
                  scope="inbound_shipment"
                  promoteToToolbar
                  disabled={isDisabled()}
                  values={node().customFields}
                  onSave={patch =>
                    saveField({ customFields: patch }).then(r => r.ok)
                  }
                />
              </TabPanel>
              <TabPanel value="log">
                <ActivityLogPanel
                  storeId={params.storeId}
                  recordId={node().id}
                />
              </TabPanel>

              <InboundShipmentLineEditModal
                open={editState() != null}
                onClose={() => setEditState(undefined)}
                storeId={params.storeId}
                invoiceId={node().id}
                isExternal={isExternal()}
                initialItemId={editState()?.itemId}
                initialLineId={editState()?.lineId}
                purchaseOrderId={node().purchaseOrderId ?? undefined}
                // Cost price is read-only only when the shipment carries a
                // source link — a purchase order or a linked shipment (a
                // transfer) — NOT merely because the supplier is another store
                // (spec rules → header fields / AC-H1). A manual internal-
                // supplier shipment keeps cost editable.
                costLocked={isExternal() || !!node().linkedShipment}
                locations={locations()}
                prefs={{
                  vvm: prefs().manageVvmStatusForStock,
                  donor: prefs().allowTrackingOfStockByDonor,
                  doses: prefs().manageVaccinesInDoses,
                  authorisation:
                    prefs().externalInboundShipmentLinesMustBeAuthorised,
                }}
                onSaved={onLinesChanged}
                onRequestNext={nextItem}
              />
              <AddFromMasterListModal
                open={masterListOpen()}
                onClose={() => setMasterListOpen(false)}
                storeId={params.storeId}
                invoiceId={node().id}
                onAdded={onLinesChanged}
              />
              <Show when={node().requisition}>
                {req => (
                  <AddFromInternalOrderModal
                    open={internalOrderOpen()}
                    onClose={() => setInternalOrderOpen(false)}
                    storeId={params.storeId}
                    invoiceId={node().id}
                    requisitionId={req().id}
                    isExternal={isExternal()}
                    onAdded={onLinesChanged}
                  />
                )}
              </Show>
            </Page>
          </Tabs>
        )}
      </Show>
    </Suspense>
  );
};

export default InboundShipmentDetailView;

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
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
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
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { CloseIcon, InfoIcon, SidebarIcon, TruckIcon } from '../../../ui/icons';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import {
  getCurrencyCell,
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../api/createTableConfig';
import { useUrlQueryState } from '../../../list/urlQueryState';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
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
  isExternalShipment,
  isPlaceholderLine,
  updateInboundShipment,
  type InboundLineErrors,
} from './inboundShipmentUpdate';
import { heldInboundQueryScopes } from '../inboundShipmentScope';
import type { InboundEditFields } from './inboundShipmentEdit';
import { InboundShipmentDetailToolbar } from './InboundShipmentDetailToolbar';
import { InboundShipmentSidePanel } from './InboundShipmentSidePanel';
import { createSidePanelOpen } from '../../../ui/layout/SidePanel/createSidePanelOpen';
import { InboundShipmentStatusFooter } from './InboundShipmentStatusFooter';
import { InboundShipmentLogPanel } from './log/InboundShipmentLogPanel';
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

const DEFAULT_PAGE_SIZE = 20;

type DetailUrlState = {
  sort: NonNullable<InboundShipmentLinesVariables['sort']>;
  offset: number;
  first: number;
};
const DEFAULT_URL_STATE: DetailUrlState = {
  sort: [{ key: 'itemName', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

const InboundShipmentDetailView: Component = () => {
  const params = useParams<{ storeId: string; invoiceId: string }>();
  const navigate = useNavigate();
  const { query, setQuery } =
    useUrlQueryState<DetailUrlState>(DEFAULT_URL_STATE);

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
      base: {
        columnVisibility: {
          manufactureDate: false,
          manufacturer: false,
          note: false,
          sellPricePerPack: false,
        },
      },
    },
  });

  // Header/side-panel/footer node. `type` is the permission scope selector and
  // must match the shipment's own scope, which the id alone doesn't reveal
  // (contract → permissions), so we probe the query scopes the user holds:
  // INBOUND_SHIPMENT (manual/transfer) then INBOUND_SHIPMENT_EXTERNAL
  // (PO-linked). The wrong scope returns RecordNotFound (its purchaseOrderId
  // filter excludes the row), so we advance to the next scope; the last scope
  // promotes a genuine RecordNotFound to the global unexpected-error modal.
  const [data, { mutate, refetch: refetchInfo }] = createResource(
    () => ({ storeId: params.storeId, id: params.invoiceId }),
    async ({ storeId, id }) => {
      const scopes = heldInboundQueryScopes();
      for (let i = 0; i < scopes.length; i++) {
        const isLast = i === scopes.length - 1;
        const result = await graphqlFetch(
          InboundShipment,
          { storeId, id, type: scopes[i] },
          isLast
            ? {
                mapSuccessToError: d =>
                  d.invoice.__typename === 'NodeError'
                    ? d.invoice.error.description
                    : undefined,
              }
            : undefined
        );
        if (
          result.kind === 'success' &&
          result.data.invoice.__typename === 'InvoiceNode'
        )
          return result.data.invoice;
      }
      return undefined;
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
  // (same picker as stocktakes). Fetched once per view; a plain (non-cached)
  // read, so figures are fresh on each visit — see fetchLocationsWithVolume.
  const [locationsData] = createResource(
    params.storeId,
    fetchLocationsWithVolume
  );
  const locations = (): LocationWithVolume[] => locationsData.latest ?? [];

  const current = () => info();
  const isDisabled = () => current()?.status === 'VERIFIED';
  const isExternal = () => (current() ? isExternalShipment(current()!) : false);

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
    { value: 'log', label: t('label.log') },
  ];

  const crumbs = (node: InboundInfoFragment) => [
    {
      label: t('inbound-shipment'),
      onClick: () =>
        navigate(`/${params.storeId}/replenishment/inbound-shipment`),
    },
    { label: String(node.invoiceNumber) },
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
    // AC-PG4 / AC-IO1). The distinguishing signal is linkedShipment, NOT kind:
    // any requisition-linked shipment is inboundType FROM_REQUISITION, which
    // kindOf() calls 'transfer', so the old `kindOf(node) !== 'transfer'` gate
    // could never coexist with `node.requisition` — the option was dead code
    // (H4). An INCOMING transfer has linkedShipment (arrives pre-populated, no
    // order-line pull); a manual link has a requisition but no linkedShipment.
    // Offered only when the store enables manual IO linking (a preference
    // gate → offer-shaping, omitted otherwise). When offered, disable-with-reason for
    // the per-shipment state (M5): needs a manually linked internal order and an
    // editable shipment.
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

  const columns = (node: InboundInfoFragment): Column<Line, SortKey>[] => {
    const isManual = !isExternalShipment(node);
    return [
      {
        c: { accessor: line => line.itemCode, id: 'itemCode' },
        sortKey: 'itemCode',
        header: t('label.code'),
        // A line that arrived via another store's transfer (linkedInvoiceId
        // set) can't be independently deleted; flag its code in the error tone
        // so the provenance is visible (spec AC-E9 / M9). Inline token colour
        // matches the linked-order cell's inline-style precedent in this table.
        cell: info => {
          const line = info.row.original;
          return (
            <span
              style={
                line.linkedInvoiceId
                  ? { color: 'var(--error-main)' }
                  : undefined
              }
            >
              {line.itemCode}
            </span>
          );
        },
      },
      {
        c: { key: 'itemName' },
        sortKey: 'itemName',
        header: t('label.name'),
        meta: { card: { region: 'primary' }, wrapLines: 2 },
      },
      // PO line number — PO-linked shipments only.
      ...(isExternalShipment(node)
        ? [
            {
              c: {
                accessor: line => line.purchaseOrderLine?.lineNumber ?? '',
                id: 'poLine',
              },
              header: t('label.po-line-number'),
              ...getNumberCell(),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      { c: { key: 'batch' }, sortKey: 'batch', header: t('label.batch') },
      {
        c: { key: 'expiryDate' },
        sortKey: 'expiryDate',
        header: t('label.expiry'),
        ...getDateCell(),
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
              header: t('label.vvm-status'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      {
        c: { accessor: line => line.location?.code ?? '', id: 'location' },
        sortKey: 'locationName',
        header: t('label.location'),
      },
      // Unit name (spec S1 line-table col 9 / L3).
      {
        c: { accessor: line => line.item?.unitName ?? '', id: 'unitName' },
        header: t('label.unit'),
      },
      {
        c: { key: 'packSize' },
        sortKey: 'packSize',
        header: t('label.pack-size'),
        ...getNumberCell(),
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
              header: t('label.doses-per-unit'),
              ...getNumberCell(),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      {
        c: { key: 'numberOfPacks' },
        header: t('label.pack-quantity'),
        ...getNumberCell(),
        meta: { align: 'right', card: { region: 'badge' } },
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
        header: t('label.difference'),
        ...getNumberCell(),
      },
      // Unit quantity (H6) — pack size × pack quantity; manual shipments only.
      ...(isManual
        ? [
            {
              c: {
                accessor: line => line.packSize * line.numberOfPacks,
                id: 'unitQuantity',
              },
              header: t('label.unit-quantity'),
              ...getNumberCell(),
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
              header: t('label.doses'),
              ...getNumberCell(),
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
              header: t('label.auth-status'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      // Prices — manual shipments only (PO-linked derive from the order).
      ...(isManual
        ? [
            {
              c: { key: 'costPricePerPack' },
              header: t('label.pack-cost-price'),
              ...getCurrencyCell(),
            } satisfies Column<Line, SortKey>,
            {
              c: { key: 'sellPricePerPack' },
              header: t('label.pack-sell-price'),
              ...getCurrencyCell(),
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
              header: t('label.total'),
              ...getCurrencyCell(),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      // Donor — gated by the donor-tracking preference.
      ...(prefs().allowTrackingOfStockByDonor
        ? [
            {
              c: { accessor: line => line.donor?.name ?? '', id: 'donor' },
              header: t('label.donor'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      {
        c: {
          accessor: line => line.manufacturer?.name ?? '',
          id: 'manufacturer',
        },
        header: t('label.manufacturer'),
      },
      {
        c: { key: 'manufactureDate' },
        header: t('label.manufacture-date'),
        ...getDateCell(),
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
              header: t('label.campaign'),
            } satisfies Column<Line, SortKey>,
          ]
        : []),
      { c: { key: 'note' }, header: t('label.note') },
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
                  disabled={isDisabled()}
                  isExternal={isExternal()}
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
                  <Breadcrumb icon={<TruckIcon />} crumbs={crumbs(node())} />
                  <HeaderButtons>
                    <Show when={!isDisabled()}>
                      <SplitButton
                        options={addOptions()}
                        value="item"
                        testId="add-item-button"
                        menuLabel={t('button.add-item')}
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
                        onClick={() => setSidePanelOpen(true)}
                      >
                        {t('button.more')}
                      </Button>
                    </Show>
                  </HeaderButtons>
                  <Toolbar>
                    <InboundShipmentDetailToolbar
                      storeId={params.storeId}
                      node={node()}
                      disabled={isDisabled()}
                      edit={edit}
                      backdatingEnabled={prefs().backdatingEnabled}
                      backdatingMaxDays={prefs().backdatingMaxDays}
                      onSaveField={saveField}
                    />
                  </Toolbar>
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
                      disabled={isDisabled()}
                      onSetHold={setHold}
                      onAdvanced={onAdvanced}
                    />
                  }
                >
                  <ContentFooter>
                    <strong>
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
                  columns={columns(node())}
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
                    isDisabled() ? undefined : (
                      <Button
                        icon={<InfoIcon />}
                        data-testid="add-item-button"
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
                  pagination={{
                    offset: query().offset,
                    pageSize: query().first,
                    total: totalCount(),
                    onOffsetChange: offset => setQuery({ ...query(), offset }),
                    onPageSizeChange: first =>
                      setQuery({ ...query(), first, offset: 0 }),
                  }}
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
              <TabPanel value="log">
                <InboundShipmentLogPanel
                  storeId={params.storeId}
                  invoiceId={node().id}
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

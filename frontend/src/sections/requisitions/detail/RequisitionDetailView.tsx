import {
  createMemo,
  createResource,
  createSignal,
  Show,
  Suspense,
  type Component,
} from 'solid-js';
import { useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '@/ui/layout/Header/HeaderButtons';
import { Toolbar } from '@/ui/layout/Header/Toolbar';
import { HeaderToolbar } from '@/ui/layout/Header/HeaderToolbar';
import { createSidePanelOpen } from '@/ui/layout/SidePanel/createSidePanelOpen';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { Button } from '@/ui/elements/buttons/Button';
import { SplitButton } from '@/ui/elements/buttons/SplitButton';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Tabs, TabList, TabPanel } from '@/ui/elements/tabs/Tabs';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import { getCellDefinition } from '@/ui/elements/table/tableHelpers';
import { HStack } from '@/ui/layout/Stack/HStack';
import { StatusMarker } from '@/ui/elements/feedback/StatusMarker';
import {
  FilterBar,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '@/ui/elements/selectors/FilterBar';
import {
  AlertTriangleIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  SidebarIcon,
  TruckIcon,
} from '@/ui/icons';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { createTableConfig } from '@/api/createTableConfig';
import { createAddAction } from '@/ui/utils/keyActions';
import { ALT_M, ALT_N } from '@/ui/utils/shortcuts';
import { createDebouncedEdit } from '@/domain/debouncedEdit';
import {
  RequisitionDetail,
  type RequisitionInfoFragment,
  type RequisitionDetailLineFragment,
} from './requisitionDetail.generated';
import { RequisitionDetailContext } from './detailContext.generated';
import {
  addRequisitionFromMasterList,
  saveRequisitionFields,
} from './requisitionUpdate';
import { MasterListPickerModal } from '@/domain/masterList';
import {
  isApprovalBlocked,
  isRequisitionEditable,
} from './requisitionDetailStatus';
import {
  RequisitionToolbar,
  type HeaderEditFields,
} from './RequisitionToolbar';
import { RequisitionStatusFooter } from './RequisitionStatusFooter';
import { ActivityLogPanel } from '@/domain/activityLog';
import {
  ProgramIndicatorsTab,
  ProgramIndicatorValues,
} from '@/domain/indicators';
import { RequisitionDocumentsTab } from './RequisitionDocumentsTab';
import { RequisitionSidePanel } from './RequisitionSidePanel';
import { ExportPrintRequisitionAction } from './actions/ExportPrintRequisitionAction';
import { SupplyRequestedAction } from './actions/SupplyRequestedAction';
import {
  DeleteRequisitionLinesAction,
  type DeleteLinesBlock,
} from './actions/DeleteRequisitionLinesAction';
import { RequisitionLineEditModal } from './edit-modal/RequisitionLineEditModal';

// The requisition detail view (spec/requisitions S2): view, header edits
// (customer reference / comment / colour), the side panel (S5), the Documents
// and Log tabs, Export/Print (reports S4), line selection + bulk delete
// (AC-LD1–LD4), the master-list add (AC-ML1–ML2), the Supply requested
// auto-populate (rules § auto-populating), and navigation/not-found. The line
// editor (S4), Create shipment, and the finalise action live in their own
// modules (edit-modal/, RequisitionStatusFooter).
//
// ⚠️ Interim: the line table reads the NESTED `lines` connection with
// CLIENT-side filter/sort — the spec's server-paginated `requisitionLines`
// query does not exist yet (a backend gap, PR #12526; the same interim the
// internal-order detail carries). It moves server-side once the PR lands.

type Line = RequisitionDetailLineFragment;

// The client-side sort keys the read-only line table supports — the spec's
// sortable columns (spec S2 › columns).
type SortKey =
  | 'code'
  | 'name'
  | 'ourSoh'
  | 'customerSoh'
  | 'requested'
  | 'approved'
  | 'supply'
  | 'issued'
  | 'remaining';

// The line filter, shaped like the wire filter the server-paginated lines
// read will take (itemCodeOrName.like — see the interim note above), so the
// client-side match swaps to the server filter without a state change.
type LineFilter = { itemCodeOrName?: { like: string } | null };

// The line table's filters (ui-standards § tables → filtering): the item
// code/name search — the same chip the stocktake detail table keeps to hand.
// Client-side for now, so no debounce.
const lineFilters: Filter<LineFilter>[] = constructFilters<LineFilter>({
  itemCodeOrName: {
    label: () => t('label.code-or-name'),
    render: props => (
      <FilterTextInput
        label={t('label.code-or-name')}
        placeholder={t('placeholder.search')}
        testId={props.testId}
        debounceMs={0}
        value={props.filter().itemCodeOrName?.like ?? ''}
        onInput={value =>
          props.setPartialFilter({
            itemCodeOrName: value ? { like: value } : null,
          })
        }
      />
    ),
  },
});

const RequisitionDetailView: Component = () => {
  const params = useParams<{ storeId: string; requisitionId: string }>();
  const navigate = useNavigate();
  // The active tab persists in the URL (spec S2 § tabs).
  const [searchParams, setSearchParams] = useSearchParams<{ tab?: string }>();
  // The item search is the screen's default filter (ui-standards § tables →
  // filtering): seeded present-as-null so its chip is on the bar from the
  // start; the client-side match ignores it until typed.
  const [lineFilter, setLineFilter] = createSignal<LineFilter>({
    itemCodeOrName: null,
  });
  const [sort, setSort] = createSignal<SortState<SortKey>>({
    key: 'name',
    desc: false,
  });
  // A header save's whole-record rejection (rules › header edits), and the
  // lines a reasons rejection named — their Reason cells flag (AC-H4) until a
  // save succeeds.
  const [headerError, setHeaderError] = createSignal<string>();
  const [reasonFlaggedIds, setReasonFlaggedIds] = createSignal<Set<string>>(
    new Set()
  );
  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();

  const tableConfig = createTableConfig({
    tableId: 'requisition-detail',
    defaultConfig: {
      // Comment + code are pinned inline-start so the row stays identifiable
      // (and its comment reachable) as the wide column set scrolls.
      base: {
        columnPinning: { left: ['comment', 'code'] },
      },
      compact: {
        viewMode: 'card',
        columnPinning: { left: ['comment', 'code'] },
        columnVisibility: {
          unit: false,
        },
      },
    },
  });

  // The header read. The resource IS the local state: header saves write back
  // with `mutate` (no refetch → no remount). `info()` reads `.latest`
  // NON-suspending so later refetches never re-suspend the <Suspense> and
  // remount the subtree (kdd/solid-reactivity-pitfalls § no remounts).
  const [data, { mutate, refetch }] = createResource(
    () => ({ storeId: params.storeId, id: params.requisitionId }),
    async (variables): Promise<RequisitionInfoFragment | undefined> => {
      const result = await graphqlFetch(RequisitionDetail, variables);
      if (result.kind !== 'success') return undefined;
      return result.data.requisition.__typename === 'RequisitionNode'
        ? result.data.requisition
        : undefined;
    }
  );
  const info = (): RequisitionInfoFragment | undefined => data.latest;

  // Store-context gates, fetched once per store, read non-suspending (safe
  // default OFF while unresolved).
  const [context] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(RequisitionDetailContext, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data;
    }
  );
  const prefs = () => context.latest?.preferences;
  const storePrefs = () => context.latest?.storePreferences;

  const showDoses = () => prefs()?.manageVaccinesInDoses ?? false;
  const showPricing = () => prefs()?.showIndicativePriceInRequisitions ?? false;
  const showExcess = () => prefs()?.warningForExcessRequest ?? false;
  // Approval surfaces: the authorisation preference AND the requisition
  // carries an approval state (store-context gates).
  const showApproval = () =>
    (storePrefs()?.responseRequisitionRequiresAuthorisation ?? false) &&
    (info()?.approvalStatus ?? 'NONE') !== 'NONE';
  // Extended requisition columns: a PROGRAM requisition of an extra-fields
  // store; the customer-stock column shows on non-program rows instead.
  const isProgram = () => !!info()?.programName;
  const showExtended = () =>
    isProgram() && (storePrefs()?.extraFieldsInRequisition ?? false);

  const editable = () => {
    const node = info();
    return node ? isRequisitionEditable(node) : false;
  };
  // Adding a line (rules › line editing): an editable, non-program (a program
  // requisition's lines are fixed to its master list), non-transferred (the
  // customer's demand is not added to here) requisition.
  const canAdd = () => editable() && !isProgram() && !info()?.linkedRequisition;
  // The editor's Approved figure (spec S4 § read-only figures): the
  // authorisation preference with an Approved status.
  const showApprovedFigure = () =>
    (storePrefs()?.responseRequisitionRequiresAuthorisation ?? false) &&
    info()?.approvalStatus === 'APPROVED';
  const showForecast = () =>
    prefs()?.displayPopulationBasedForecasting ?? false;

  // The Indicators tab's data (definitions + this period's values), keyed to
  // the CUSTOMER's reporting identity — the store's record of the customer's
  // report, never the store's own figures (rules › indicator values). Fetched
  // only for a program requisition once its period resolves; the serialised
  // variables are the resource key so identical content never refetches. Read
  // non-suspending so it never remounts the open screen.
  const indicatorVariables = () => {
    const node = info();
    if (!node?.program || !node.period) return false;
    return JSON.stringify({
      storeId: params.storeId,
      programId: node.program.id,
      periodId: node.period.id,
      customerNameId: node.otherPartyId,
    });
  };
  const [indicators] = createResource(indicatorVariables, async serialised => {
    const result = await graphqlFetch(
      ProgramIndicatorValues,
      JSON.parse(serialised)
    );
    if (result.kind !== 'success') return undefined;
    return result.data.programIndicators.nodes;
  });
  const indicatorNodes = () =>
    indicators.state === 'ready' || indicators.state === 'refreshing'
      ? (indicators.latest ?? [])
      : [];
  // Indicators tab gate (spec S2 § tabs, AC-V5): a non-emergency program
  // requisition of a store-backed customer whose program defines ≥1
  // indicator.
  const showIndicators = () =>
    isProgram() &&
    info()?.isEmergency === false &&
    !!info()?.otherParty.store &&
    indicatorNodes().length > 0;
  // Whether the gate can still flip: the Indicators tab registers only after
  // its read resolves, so until then a deep-linked ?tab=indicators names a
  // tab Kobalte can't select yet.
  const indicatorGateResolving = () => {
    const node = info();
    if (!node) return true;
    if (!node.program) return false;
    return indicators.state !== 'ready' && indicators.state !== 'errored';
  };

  // The line editor (S4): closed, open in add mode, or open on an existing
  // line. One signal drives both.
  const [editorLine, setEditorLine] = createSignal<
    { mode: 'add' } | { mode: 'edit'; line: Line }
  >();
  // Narrowed once, so the editor's initialLine needs no cast (kdd/type-safety).
  const editorInitialLine = () => {
    const entry = editorLine();
    return entry?.mode === 'edit' ? entry.line : undefined;
  };

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). Declared
  // by the SCREEN, once, because two controls trigger it: the header
  // SplitButton and the ghost button in the table's empty slot. Each carries
  // `shortcut={ALT_N}` for its badge; neither owns the action. `run` is the
  // single-item add, the split button's default option. Same gate as both
  // controls (canAdd), but reached through `.state` rather than `info()`:
  // that reads `data.latest`, which suspends on the first pending read, and
  // the palette evaluates every action's `disabled()` in its own render
  // (kdd/keyboard-layer).
  createAddAction({
    name: 'button.add-item',
    run: () => setEditorLine({ mode: 'add' }),
    disabled: () => {
      if (data.state !== 'ready' && data.state !== 'refreshing') return true;
      const node = data.latest;
      return (
        !node ||
        !isRequisitionEditable(node) ||
        !!node.programName ||
        !!node.linkedRequisition
      );
    },
  });

  // Add from master list (spec S2 § page actions, AC-ML1): the S7 picker, a
  // pending choice awaiting its are-you-sure confirmation, and a rejection's
  // fixed-copy notice.
  const [addChoice, setAddChoice] = createSignal('item');
  const [masterListPickerOpen, setMasterListPickerOpen] = createSignal(false);
  const [pendingMasterList, setPendingMasterList] = createSignal<{
    id: string;
    name: string;
  }>();
  const [masterListError, setMasterListError] = createSignal<string>();

  // The Add split button's action: Add item opens the line editor, Add from
  // master list opens the shared picker.
  const onAddAction = (choice: string) => {
    if (choice === 'master-list') setMasterListPickerOpen(true);
    else setEditorLine({ mode: 'add' });
  };

  // The confirmed bulk add (AC-ML1): add, then re-read the line list so the
  // table reflects it; a rejection replaces the confirmation with its fixed
  // copy (AC-ML2).
  const confirmAddFromMasterList = async () => {
    const list = pendingMasterList();
    const node = info();
    if (!list || !node) return;
    setPendingMasterList(undefined);
    const result = await addRequisitionFromMasterList(
      params.storeId,
      node.id,
      list.id
    );
    if (result.kind === 'done') void refetch();
    else if (result.kind === 'error') setMasterListError(result.message);
  };

  // Line-table row selection (AC-LD1). Owned by the page (like sort/filter);
  // a non-empty selection swaps the status footer for the bulk-action bar
  // (spec S2 § footer). Checkboxes are always offered — on a blocked
  // requisition the Delete click explains instead (AC-LD2).
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // The standing states the UI mirrors without a server call (rules ›
  // deleting lines): not editable-by-status first, then transfer-linked.
  const deleteBlock = (): DeleteLinesBlock | undefined =>
    !editable()
      ? 'not-editable'
      : info()?.linkedRequisition
        ? 'transferred'
        : undefined;

  // Save & next's walk (AC-LE5): the next line after the current one in the
  // table's current sort/filter order, skipping ones already visited this
  // run. The client-side table holds every line (the server-paginated walk
  // collapses to a plain scan here — see the interim note above), so no page
  // advance is needed.
  const resolveNextLine = (
    currentLineId: string,
    covered: Set<string>
  ): Line | undefined => {
    const ordered = rows();
    const start = ordered.findIndex(line => line.id === currentLineId);
    for (let index = start + 1; index < ordered.length; index++)
      if (!covered.has(ordered[index]!.id)) return ordered[index];
    return ordered.find(line => !covered.has(line.id));
  };

  // The requisition's existing line for an item (add mode loads it rather
  // than duplicating — D74, AC-LE3).
  const findLineForItem = (itemId: string): Line | undefined =>
    info()?.lines.nodes.find(line => line.itemId === itemId);

  // ONE debounced buffer for the as-you-type reference (comment rides the
  // same buffer for the side panel).
  const edit = createDebouncedEdit<HeaderEditFields>({
    id: () => info()?.id ?? '',
    initial: () => ({
      theirReference: info()?.theirReference ?? '',
      comment: info()?.comment ?? '',
    }),
    save: patch => void saveField(patch),
  });

  // Header-level save (updateResponseRequisition), spliced back wholesale on
  // success. A rejection surfaces inline beneath the toolbar and — for the
  // reasons guard — flags the offending lines' Reason cells (AC-H4), keeping
  // the entered value in the buffer.
  const saveField = async (patch: Record<string, unknown>): Promise<void> => {
    const node = info();
    if (!node) return;
    const result = await saveRequisitionFields(params.storeId, {
      id: node.id,
      ...patch,
    });
    if (result.kind === 'saved') {
      setHeaderError(undefined);
      setReasonFlaggedIds(new Set<string>());
      mutate(() => result.node);
    }
    if (result.kind === 'error') {
      setHeaderError(result.message);
      setReasonFlaggedIds(new Set(result.reasonLineIds));
    }
  };

  // --- Read-only line table: client-side filter + sort over nested lines. ---

  // Two client-arithmetic columns (contract › the detail screen): available =
  // initial + incoming + additions − losses − outgoing; months of stock =
  // available ÷ AMC (one decimal, zero without consumption).
  const available = (line: Line) =>
    line.initialStockOnHandUnits +
    line.incomingUnits +
    line.additionInUnits -
    line.lossInUnits -
    line.outgoingUnits;
  const mos = (line: Line) =>
    line.averageMonthlyConsumption === 0
      ? 0
      : available(line) / line.averageMonthlyConsumption;
  const isExcess = (line: Line) =>
    showExcess() && line.requestedQuantity - line.suggestedQuantity >= 1;

  const sortValue = (line: Line, key: SortKey): number | string => {
    switch (key) {
      case 'code':
        return line.item.code.toLowerCase();
      case 'name':
        return line.itemName.toLowerCase();
      case 'ourSoh':
        return line.itemStats.stockOnHand;
      case 'customerSoh':
        return line.availableStockOnHand;
      case 'requested':
        return line.requestedQuantity;
      case 'approved':
        return line.approvedQuantity;
      case 'supply':
        return line.supplyQuantity;
      case 'issued':
        return line.alreadyIssued;
      case 'remaining':
        return line.remainingQuantityToSupply;
    }
  };

  const rows = (): Line[] => {
    const node = info();
    if (!node) return [];
    let lines = node.lines.nodes;
    const f = (lineFilter().itemCodeOrName?.like ?? '').trim().toLowerCase();
    if (f)
      lines = lines.filter(
        l =>
          l.item.code.toLowerCase().includes(f) ||
          l.itemName.toLowerCase().includes(f)
      );
    const s = sort();
    const dir = s.desc ? -1 : 1;
    return [...lines].sort((a, b) => {
      const av = sortValue(a, s.key);
      const bv = sortValue(b, s.key);
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  };

  // Dose annotation for a unit quantity on a vaccine item under the doses
  // preference — " (N ds)" (label.doses-short), value × doses-per-unit
  // (treated as 1 when the item has none, so the annotation shows for any
  // vaccine).
  const doseSuffix = (line: Line, value: number): string =>
    showDoses() && line.item.isVaccine
      ? ` (${Math.round(value * (line.item.doses || 1))} ${t('label.doses-short')})`
      : '';
  const numWithDoses = (line: Line, value: number) =>
    `${Math.round(value)}${doseSuffix(line, value)}`;

  // App bar breadcrumbs (spec S2): the Distribution truck icon (the group is
  // the icon, not a text crumb), Requisitions, the requisition number.
  const crumbs = (node: RequisitionInfoFragment) => [
    {
      label: t('customer-requisition'),
      onClick: () =>
        navigate(`/${params.storeId}/distribution/customer-requisition`),
    },
    { label: String(node.requisitionNumber) },
  ];

  // Memoized: DataTable reads this prop from several independent computations,
  // and TanStack keys its internal caches on the array's identity — a plain
  // function would rebuild the ~30 columns once per reader on any gate/locale
  // flip (kdd/solid-reactivity-pitfalls §14; both reference detail views
  // memoize the same way).
  const columns = createMemo((): Column<Line, SortKey>[] => [
    {
      // Pinned first: an affordance revealing the line's full comment.
      c: { key: 'comment' },
      header: () => t('label.comment'),
      ...getCellDefinition('comment'),
    },
    {
      c: { accessor: line => line.item.code, id: 'code' },
      sortKey: 'code',
      header: () => t('label.code'),
      ...getCellDefinition('itemCode'),
    },
    {
      c: { key: 'itemName' },
      sortKey: 'name',
      header: () => t('label.name'),
      // The text "sink" column: its width floor plus no growth cap lets it
      // absorb the slack the narrow numeric columns leave behind.
      ...getCellDefinition('itemName', {
        headerPosition: 'primary',
        wrapLines: 2,
      }),
    },
    {
      c: { accessor: line => line.item.unitName ?? '', id: 'unit' },
      header: () => t('label.unit'),
      ...getCellDefinition('unitName'),
    },
    // Doses per unit — doses preference; a dash for non-vaccine items.
    ...(showDoses()
      ? ([
          {
            c: {
              accessor: line => (line.item.isVaccine ? line.item.doses : '-'),
              id: 'dosesPerUnit',
            },
            header: () => t('label.doses-per-unit'),
            ...getCellDefinition('dosesPerUnit'),
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
    {
      // Our stock on hand — THIS store's current stock of the item.
      c: {
        accessor: line => numWithDoses(line, line.itemStats.stockOnHand),
        id: 'ourSoh',
      },
      sortKey: 'ourSoh',
      header: () => (
        <span title={t('description.our-soh')}>{t('label.our-soh')}</span>
      ),
      ...getCellDefinition('ourSoh'),
    },
    // Their avail. stock — the customer's available stock as requested;
    // NON-program requisitions only (the extended set replaces it).
    ...(!isProgram()
      ? ([
          {
            c: {
              accessor: line => numWithDoses(line, line.availableStockOnHand),
              id: 'customerSoh',
            },
            sortKey: 'customerSoh',
            header: () => (
              <span title={t('description.customer-soh')}>
                {t('label.customer-soh')}
              </span>
            ),
            ...getCellDefinition('customerSoh'),
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
    // The extended requisition columns — the customer's reported consumption
    // figures (extra-fields store + program requisition).
    ...(showExtended()
      ? ([
          {
            c: {
              accessor: l => numWithDoses(l, l.initialStockOnHandUnits),
              id: 'initialSoh',
            },
            header: () => (
              <span title={t('description.initial-stock-on-hand')}>
                {t('label.initial-stock-on-hand')}
              </span>
            ),
            ...getCellDefinition('initialSoh'),
          },
          {
            c: {
              accessor: l => numWithDoses(l, l.incomingUnits),
              id: 'incoming',
            },
            header: () => t('label.incoming'),
            ...getCellDefinition('incoming'),
          },
          {
            c: {
              accessor: l => numWithDoses(l, l.outgoingUnits),
              id: 'outgoing',
            },
            header: () => t('label.outgoing'),
            ...getCellDefinition('outgoing'),
          },
          {
            c: {
              accessor: l => numWithDoses(l, l.lossInUnits),
              id: 'losses',
            },
            header: () => t('label.losses'),
            ...getCellDefinition('losses'),
          },
          {
            c: {
              accessor: l => numWithDoses(l, l.additionInUnits),
              id: 'additions',
            },
            header: () => t('label.additions'),
            ...getCellDefinition('additions'),
          },
          {
            // Derived: initial + incoming + additions − losses − outgoing.
            c: {
              accessor: l => numWithDoses(l, available(l)),
              id: 'available',
            },
            header: () => (
              <span title={t('description.available-stock')}>
                {t('label.available')}
              </span>
            ),
            ...getCellDefinition('available'),
          },
          {
            c: {
              accessor: l => numWithDoses(l, l.expiringUnits),
              id: 'shortExpiry',
            },
            header: () => t('label.short-expiry'),
            ...getCellDefinition('shortExpiry'),
          },
          {
            c: {
              accessor: l => Math.round(l.daysOutOfStock),
              id: 'daysOutOfStock',
            },
            header: () => t('label.days-out-of-stock'),
            ...getCellDefinition('daysOutOfStock'),
          },
          {
            // AMC displays rounded UP (spec S2 › columns).
            c: {
              accessor: l =>
                numWithDoses(l, Math.ceil(l.averageMonthlyConsumption)),
              id: 'amc',
            },
            header: () => t('label.amc'),
            ...getCellDefinition('amc'),
          },
          {
            // MOS: available ÷ AMC, one decimal, zero without consumption.
            c: { accessor: l => mos(l).toFixed(1), id: 'mos' },
            header: () => t('label.months-of-stock'),
            ...getCellDefinition('mos'),
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
    {
      c: {
        accessor: line => numWithDoses(line, line.suggestedQuantity),
        id: 'suggested',
      },
      header: () => t('label.suggested'),
      ...getCellDefinition('suggested'),
    },
    {
      // Requested — what the customer asked for; under the excess-request
      // preference a request ≥ 1 unit above the suggestion carries a red
      // alert icon.
      c: {
        accessor: line => numWithDoses(line, line.requestedQuantity),
        id: 'requested',
      },
      sortKey: 'requested',
      header: () => t('label.customer-requested'),
      // The preset's width + right alignment; the custom cell below overrides
      // its number formatting (the value is pre-formatted with a dose suffix).
      ...getCellDefinition('requested'),
      cell: cellInfo => {
        const line = cellInfo.row.original;
        return (
          // justify="end" keeps the number at the cell's inline-end, where
          // the preset's right alignment put it before the marker joined it.
          <HStack gap="sm" justify="end">
            <Show when={isExcess(line)}>
              <StatusMarker
                severity="error"
                icon={AlertTriangleIcon}
                label={t('messages.requested-exceeds-suggested')}
              />
            </Show>
            {numWithDoses(line, line.requestedQuantity)}
          </HStack>
        );
      },
    },
    // Approved units + approval comment — the approval gate.
    ...(showApproval()
      ? ([
          {
            c: {
              accessor: l => numWithDoses(l, l.approvedQuantity),
              id: 'approvedQuantity',
            },
            sortKey: 'approved',
            header: () => t('label.approved-quantity'),
            ...getCellDefinition('approvedQuantity'),
          },
          {
            c: {
              accessor: l => l.approvalComment ?? '',
              id: 'approvalComment',
            },
            header: () => t('label.approval-comment'),
            ...getCellDefinition('approvalComment'),
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
    {
      // Units to supply — the ledger's supply quantity.
      c: {
        accessor: line => numWithDoses(line, line.supplyQuantity),
        id: 'supplyQuantity',
      },
      sortKey: 'supply',
      header: () => t('label.supply-quantity'),
      ...getCellDefinition('supplyQuantity'),
    },
    // Reason — the line's variance reason; extended gate. Flagged when a
    // header save was rejected for a missing reason (AC-H4).
    ...(showExtended()
      ? ([
          {
            c: { accessor: l => l.reason?.reason ?? '', id: 'reason' },
            header: () => t('label.reason'),
            ...getCellDefinition('reason'),
            cell: cellInfo => {
              const line = cellInfo.row.original;
              return (
                <HStack gap="sm">
                  <Show when={reasonFlaggedIds().has(line.id)}>
                    <StatusMarker
                      severity="error"
                      icon={AlertTriangleIcon}
                      label={t(
                        'error.reasons-not-provided-program-requisition'
                      )}
                    />
                  </Show>
                  {line.reason?.reason ?? ''}
                </HStack>
              );
            },
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
    {
      // Issued — units already on shipments (the ledger).
      c: {
        accessor: line => numWithDoses(line, line.alreadyIssued),
        id: 'alreadyIssued',
      },
      sortKey: 'issued',
      header: () => (
        <span title={t('description.already-issued')}>
          {t('label.already-issued')}
        </span>
      ),
      ...getCellDefinition('alreadyIssued'),
    },
    {
      // Remaining — the ledger's remainder (never negative).
      c: {
        accessor: line => numWithDoses(line, line.remainingQuantityToSupply),
        id: 'remaining',
      },
      sortKey: 'remaining',
      header: () => (
        <span title={t('description.remaining-to-supply')}>
          {t('label.remaining-to-supply')}
        </span>
      ),
      ...getCellDefinition('remaining'),
    },
    // Indicative pricing — the preference. Per-unit shows a dash when
    // priceless; the line total is per-unit × UNITS TO SUPPLY (zero when
    // priceless).
    ...(showPricing()
      ? ([
          {
            c: {
              accessor: line => line.pricePerUnit ?? '',
              id: 'pricePerUnit',
            },
            header: () => (
              <span title={t('description.indicative-price-per-unit')}>
                {t('label.indicative-price-per-unit')}
              </span>
            ),
            ...getCellDefinition('pricePerUnit'),
          },
          {
            c: {
              accessor: line => (line.pricePerUnit ?? 0) * line.supplyQuantity,
              id: 'indicativePrice',
            },
            header: () => (
              <span title={t('description.indicative-price')}>
                {t('label.indicative-price')}
              </span>
            ),
            ...getCellDefinition('indicativePrice'),
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
  ]);

  return (
    <Suspense fallback={<Spinner center />}>
      {/* NON-keyed Show: every save sets a fresh node object; a keyed Show
          would remount the page and drop focus. */}
      <Show
        when={info()}
        fallback={
          <Show when={!data.loading} fallback={<Spinner center />}>
            {/* Not found — or another store's, indistinguishable on the wire —
                a blocking notice returning to the list (spec S6). */}
            <ConfirmDialog
              open
              title={t('error.requisition-not-found')}
              message={t('messages.click-to-return-to-requisitions')}
              onConfirm={() =>
                navigate(
                  `/${params.storeId}/distribution/customer-requisition`,
                  { replace: true }
                )
              }
              onClose={() =>
                navigate(
                  `/${params.storeId}/distribution/customer-requisition`,
                  { replace: true }
                )
              }
            />
          </Show>
        }
      >
        {node => (
          <Page
            fillBody
            sidePanelOpen={sidePanelOpen()}
            sidePanelTitle={t('heading.details')}
            onSidePanelClose={() => setSidePanelOpen(false)}
            sidePanelContent={
              <RequisitionSidePanel
                storeId={params.storeId}
                node={node()}
                editable={editable()}
                isProgram={isProgram()}
                showPricing={showPricing()}
                edit={edit}
                onSaveField={patch => void saveField(patch)}
              />
            }
            header={
              <Header>
                <Breadcrumb icon={<TruckIcon />} crumbs={crumbs(node())} />
                <HeaderButtons>
                  {/* Add — a split of Add item (the line editor, S4) and Add
                      from master list (the shared S7 picker). The whole
                      control is disabled on a read-only, program, or
                      transfer-linked requisition (spec S2 § page actions). */}
                  <SplitButton
                    icon={<PlusCircleIcon />}
                    testId="add-item-button"
                    disabled={!canAdd()}
                    disabledTitle={t('error.cannot-add-items-to-requisition')}
                    value={addChoice()}
                    onValueChange={setAddChoice}
                    shortcut={ALT_N}
                    onAction={onAddAction}
                    options={[
                      { value: 'item', label: t('button.add-item') },
                      {
                        value: 'master-list',
                        label: t('button.add-from-master-list'),
                      },
                    ]}
                  />
                  {/* Supply requested — the auto-populate (rules §
                      auto-populating). Presents as Supply APPROVED when the
                      requisition carries an approval status (the server
                      writes the approved figures then); disabled while not
                      editable. onApplied re-reads the line list (the new
                      supply quantities). */}
                  <SupplyRequestedAction
                    storeId={params.storeId}
                    requisitionId={node().id}
                    toApproved={node().approvalStatus !== 'NONE'}
                    disabled={!editable()}
                    onApplied={() => void refetch()}
                  />
                  {/* Export/Print — a read, offered on every status. */}
                  <ExportPrintRequisitionAction requisitionId={node().id} />
                  {/* More — reopens the side panel; shown only while closed. */}
                  <Show when={!sidePanelOpen()}>
                    <Button
                      variant="secondary"
                      icon={<SidebarIcon />}
                      data-testid="open-detail-panel-button"
                      // createSidePanelOpen registers Alt+M; this is the
                      // control that advertises it.
                      shortcut={ALT_M}
                      onClick={() => setSidePanelOpen(true)}
                    >
                      {t('button.more')}
                    </Button>
                  </Show>
                </HeaderButtons>
                {/* The header field cluster (ui-standards → HeaderToolbar):
                    each field labelled above its small control, sharing the
                    row per its FormRowItem weight and wrapping as a unit. The
                    disabled-store notice rides the cluster's end as a compact
                    chip (the internal-orders pattern — same locale key). */}
                <HeaderToolbar
                  alert={
                    <Show when={node().otherParty.store?.isDisabled}>
                      <Alert severity="info" compact>
                        {t('info.cannot-edit-disabled-store')}
                      </Alert>
                    </Show>
                  }
                >
                  <RequisitionToolbar
                    node={node()}
                    editable={editable()}
                    showApproval={showApproval()}
                    edit={edit}
                  />
                </HeaderToolbar>
                {/* A header save's whole-record rejection (reasons guard /
                    emergency cap — rules › header edits) keeps its own
                    full-width row beneath the cluster: it is record-level and
                    transient, more than the compact alert chip slot is
                    documented to hold (the internal-orders ancillary banner's
                    row treatment — see ui-migration-report.md decision 1). */}
                <Show when={headerError()}>
                  <Toolbar>
                    <Alert severity="error">{headerError()}</Alert>
                  </Toolbar>
                </Show>
              </Header>
            }
            contentFooter={
              // Bulk-action bar while lines are selected (spec S2 § footer);
              // otherwise the requisition's status footer — clearing the
              // selection restores it.
              <Show
                when={selectedIds().length > 0}
                fallback={
                  <RequisitionStatusFooter
                    storeId={params.storeId}
                    node={node()}
                    editable={editable()}
                    // ONLY approval blocking → the status button shows disabled
                    // instead of hiding (spec S2 § footer).
                    approvalBlocked={
                      node().status === 'NEW' &&
                      !node().otherParty.store?.isDisabled &&
                      isApprovalBlocked(node())
                    }
                    // A finalise is an order-level save: splice the returned
                    // node back (the indicator advances, the whole screen
                    // re-renders read-only through the shared editability
                    // gate).
                    onSaved={saved => mutate(() => saved)}
                    onReasonsNotProvided={ids =>
                      setReasonFlaggedIds(new Set(ids))
                    }
                  />
                }
              >
                <ContentFooter>
                  <strong data-testid="selected-rows-count">
                    {selectedIds().length} {t('label.selected')}
                  </strong>
                  {/* On a read-only or transfer-linked requisition the click
                      explains why it can't proceed rather than confirming
                      (AC-LD2). onDeleted clears the selection (unmounting this
                      bar) and re-reads the line list (AC-LD1). */}
                  <DeleteRequisitionLinesAction
                    storeId={params.storeId}
                    selectedIds={selectedIds}
                    blocked={deleteBlock}
                    onDeleted={() => {
                      setSelectedIds([]);
                      void refetch();
                    }}
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
            {/* Details | Documents | Log | (gated) Indicators (spec S2 §
                tabs). The active tab persists in the URL. */}
            <Tabs
              value={searchParams.tab ?? 'details'}
              onValueChange={tab => {
                // While a deep-linked ?tab=indicators is waiting on its gate,
                // Kobalte reports a fallback to the first tab — swallow it so
                // the fallback never clobbers the URL; once the gate flips the
                // requested tab registers and is selected. A requisition whose
                // gate settles closed corrects the URL through this same path.
                if (
                  searchParams.tab === 'indicators' &&
                  tab !== 'indicators' &&
                  indicatorGateResolving()
                )
                  return;
                setSearchParams({ tab });
              }}
            >
              <TabList
                tabs={[
                  { value: 'details', label: t('label.details') },
                  { value: 'documents', label: t('label.documents') },
                  { value: 'log', label: t('label.log') },
                  ...(showIndicators()
                    ? [{ value: 'indicators', label: t('label.indicators') }]
                    : []),
                ]}
              />
              <TabPanel value="details">
                <DataTable
                  columns={columns()}
                  rows={rows()}
                  rowKey={line => line.id}
                  // Filters live in the table's own toolbar (ui-standards §
                  // tables → filtering), never the page header.
                  filters={
                    <FilterBar
                      filters={lineFilters}
                      filter={lineFilter()}
                      onChange={setLineFilter}
                    />
                  }
                  loading={data.loading}
                  sort={sort()}
                  onSort={(key, desc) => setSort({ key, desc })}
                  // A row click opens the line editor on that line (AC-LE1);
                  // on a read-only requisition it opens all-disabled (AC-LE9).
                  onRowClick={line => setEditorLine({ mode: 'edit', line })}
                  // Rows with a ZERO supply quantity read in the info tone —
                  // visually de-emphasised as placeholders (AC-V4).
                  rowTone={line =>
                    line.supplyQuantity === 0 ? 'info' : undefined
                  }
                  emptyMessage={
                    (lineFilter().itemCodeOrName?.like ?? '').trim()
                      ? t('error.no-items-filter-on')
                      : t('error.no-requisition-items')
                  }
                  // The empty line table offers the single-item add inline
                  // (AC-V7) — withheld when a line can't be added (read-only,
                  // program, or transfer-linked).
                  empty={
                    canAdd() ? (
                      <Button
                        variant="ghost"
                        shortcut={ALT_N}
                        data-testid="add-item-button"
                        onClick={() => setEditorLine({ mode: 'add' })}
                      >
                        {t('button.add-item')}
                      </Button>
                    ) : undefined
                  }
                  config={tableConfig.config()}
                  setConfig={tableConfig.setConfig}
                  // Leading-checkbox row selection for the bulk line delete
                  // (spec S2 § line table): checkbox-only — the row click
                  // stays bound to the editor. Always offered, on every
                  // standing state: a blocked delete explains on click
                  // (AC-LD2) rather than withholding the affordance.
                  enableSelection
                  selectedIds={selectedIds()}
                  onSelectionChange={setSelectedIds}
                />
              </TabPanel>
              <TabPanel value="documents">
                <RequisitionDocumentsTab node={node()} />
              </TabPanel>
              <TabPanel value="log">
                {/* The shared activity-log surface; oldest first per AC-LG1
                    (spec S2 § Log tab). */}
                <ActivityLogPanel
                  storeId={params.storeId}
                  recordId={node().id}
                  order="oldest-first"
                />
              </TabPanel>
              <Show when={showIndicators()}>
                <TabPanel value="indicators">
                  {/* The shared indicators surface — no customer breakdown on
                      the response side, on any store configuration (rules ›
                      indicator values, AC-IN1). */}
                  <ProgramIndicatorsTab
                    storeId={params.storeId}
                    nodes={indicatorNodes()}
                    editable={editable()}
                    showCustomerBreakdown={false}
                  />
                </TabPanel>
              </Show>
            </Tabs>

            {/* The line editor (S4): add mode from the Add action / empty
                state, edit mode from a row click. */}
            <RequisitionLineEditModal
              open={!!editorLine()}
              onClose={() => setEditorLine(undefined)}
              storeId={params.storeId}
              requisitionId={node().id}
              editable={editable()}
              canAdd={canAdd()}
              transferred={!!node().linkedRequisition}
              showExtended={showExtended()}
              showApproved={showApprovedFigure()}
              finalised={node().status === 'FINALISED'}
              showDoses={showDoses()}
              showForecast={showForecast()}
              showExcess={showExcess()}
              initialLine={editorInitialLine()}
              nextLine={resolveNextLine}
              findLineForItem={findLineForItem}
              onCommitted={() => {
                // A line edit may have supplied a missing reason — drop the
                // header save's stale flags, then re-read the line list
                // (rules › drafts: the list is re-read, never patched).
                setReasonFlaggedIds(new Set<string>());
                void refetch();
              }}
            />

            {/* Add from master list (S2 § page actions): the shared picker,
                then an are-you-sure confirmation — only on OK are the lines
                added (AC-ML1) — then the bulk add. */}
            <MasterListPickerModal
              open={masterListPickerOpen()}
              onClose={() => setMasterListPickerOpen(false)}
              storeId={params.storeId}
              onSelect={list => {
                setMasterListPickerOpen(false);
                setPendingMasterList(list);
              }}
            />
            <Show when={pendingMasterList()}>
              <ConfirmDialog
                open
                title={t('heading.are-you-sure')}
                message={t('messages.confirm-add-from-master-list')}
                onConfirm={() => void confirmAddFromMasterList()}
                onClose={() => setPendingMasterList(undefined)}
              />
            </Show>
            {/* A rejection's fixed copy (AC-ML2): not-found under its own
                message, anything else under the generic cannot-add copy. */}
            <Show when={masterListError()}>
              {message => (
                <ConfirmDialog
                  open
                  title={t('error.something-wrong')}
                  message={message()}
                  onConfirm={() => setMasterListError(undefined)}
                  onClose={() => setMasterListError(undefined)}
                />
              )}
            </Show>
          </Page>
        )}
      </Show>
    </Suspense>
  );
};

export default RequisitionDetailView;

import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Show,
  Suspense,
  untrack,
  type Component,
} from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { HeaderToolbar } from '../../../ui/layout/Header/HeaderToolbar';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { HStack } from '../../../ui/layout/Stack/HStack';
import { StatusMarker } from '../../../ui/elements/feedback/StatusMarker';
import { createSidePanelOpen } from '../../../ui/layout/SidePanel/createSidePanelOpen';
import { createAddAction } from '../../../ui/utils/keyActions';
import { ALT_M, ALT_N } from '../../../ui/utils/shortcuts';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { Button } from '../../../ui/elements/buttons/Button';
import { InfoTooltip } from '../../../ui/elements/feedback/InfoTooltip';
import { SidebarIcon } from '../../../ui/icons';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { Tabs, TabList, TabPanel } from '../../../ui/elements/tabs/Tabs';
import {
  DataTable,
  type Column,
  type SortState,
} from '../../../ui/elements/table/DataTable';
import { getCellDefinition } from '../../../ui/elements/table/tableHelpers';
import {
  FilterBar,
  FilterCheckbox,
  FilterTextInput,
  constructFilters,
  type Filter,
} from '../../../ui/elements/selectors/FilterBar';
import { AlertTriangleIcon } from '../../../ui/icons';
import { createTableConfig } from '../../../api/createTableConfig';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import { recordPluginDiagnostic } from '../../../plugins/diagnostics';
import {
  contributionId,
  visibleContributions,
} from '../../../plugins/PluginSlot';
import {
  INTERNAL_ORDER_LINE_COLUMNS as COL,
  mergeLineColumns,
  type LineColumnBatch,
} from './lineColumns';
import {
  toLineView,
  toInternalOrderView,
  lineMonthsOfStock,
} from './pluginViews';
import {
  InternalOrderDetail,
  type InternalOrderInfoFragment,
  type InternalOrderLineFragment,
} from './internalOrderDetail.generated';
import { InternalOrderDetailContext } from './detailContext.generated';
import { StoreOwnName } from './indicators.generated';
import {
  applySavedIndicatorValue,
  ProgramIndicatorsTab,
  ProgramIndicatorValues,
} from '../../../domain/indicators';
import {
  saveInternalOrderFields,
  addInternalOrderFromMasterList,
} from './internalOrderUpdate';
import { isOrderEditable } from './internalOrderDetailStatus';
import {
  InternalOrderToolbar,
  type HeaderEditFields,
} from './InternalOrderToolbar';
import { InternalOrderStatusFooter } from './InternalOrderStatusFooter';
import { ActivityLogPanel } from '../../../domain/activityLog';
import { InternalOrderSidePanel } from './InternalOrderSidePanel';
import { InternalOrderDocumentsTab } from './InternalOrderDocumentsTab';
import { InternalOrderAncillaryBanner } from './InternalOrderAncillaryBanner';
import { ExportPrintInternalOrderAction } from './actions/ExportPrintInternalOrderAction';
import { UseSuggestedQuantitiesAction } from './actions/UseSuggestedQuantitiesAction';
import { DeleteLinesAction } from './actions/DeleteLinesAction';
import { InternalOrderLineEditModal } from './edit-modal/InternalOrderLineEditModal';
import { MasterListPickerModal } from '../../../domain/masterList';
import { SplitButton } from '../../../ui/elements/buttons/SplitButton';
import { PlusCircleIcon, MinusCircleIcon } from '../../../ui/icons';

// The internal-order detail view (spec/internal-orders S3): view, header edits,
// send, the side panel (S5), the Documents / Indicators / Log tabs,
// Export/Print (reports S4), the ancillary Add/Update actions, the line editor
// (S4 — Add item + row-click edit), the master-list picker (S7),
// use-suggested, and bulk line delete.
//
// ⚠️ Interim: the line table reads the NESTED `lines` connection with
// CLIENT-side filter/sort — the spec's server-paginated `requisitionLines`
// query does not exist yet (a backend gap, PR #12526; see contract.md
// § "Backend gaps"). It moves server-side once the PR lands.

type Line = InternalOrderLineFragment;

// One shared empty map, so the non-suspending batch read returns a STABLE value
// while nothing is loaded — a fresh `new Map()` per read would make the columns
// memo recompute on every unrelated update.
const EMPTY_BATCH_DATA: ReadonlyMap<
  string,
  ReadonlyMap<string, unknown>
> = new Map();

// The client-side sort keys the read-only line table supports.
type SortKey =
  | 'code'
  | 'name'
  | 'dps'
  | 'available'
  | 'amc'
  | 'mos'
  | 'target'
  | 'suggested'
  | 'requested';

// The line filter, shaped like the wire filter the server-paginated lines
// read will take (itemCodeOrName.like, hideOverMinimum — see the interim note
// above), so the client-side match swaps to the server filter without a state
// change.
type LineFilter = {
  itemCodeOrName?: { like: string } | null;
  hideOverMinimum?: boolean | null;
};

// The line table's filters (ui-standards § tables → filtering): the item
// code/name search — the same chip the stocktake detail table keeps to hand —
// and the hide-stock-over-minimum narrowing. Client-side for now, so no
// debounce.
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
  hideOverMinimum: {
    label: () => t('label.hide-stock-over-minimum'),
    render: props => (
      <FilterCheckbox
        // The chip's own label names the fact, so the bare pill checkbox —
        // ticking narrows to the lines still under their reorder threshold;
        // unticked writes null (the chip stays, added-but-empty), since
        // there is no "show only over minimum" filter.
        label={t('label.hide-stock-over-minimum')}
        testId={props.testId}
        checked={props.filter().hideOverMinimum === true}
        onChange={checked =>
          props.setPartialFilter({ hideOverMinimum: checked ? true : null })
        }
      />
    ),
  },
});

const InternalOrderDetailView: Component = () => {
  const params = useParams<{ storeId: string; orderId: string }>();
  const navigate = useNavigate();
  // The item search and hide-over-minimum are the screen's default filters
  // (ui-standards § tables → filtering): seeded present-as-null so their chips
  // are on the bar from the start; the client-side match ignores each until
  // typed / ticked.
  const [lineFilter, setLineFilter] = createSignal<LineFilter>({
    itemCodeOrName: null,
    hideOverMinimum: null,
  });
  // Line-table row selection (AC-LN15). Owned by the page (like sort/filter);
  // a non-empty selection swaps the status footer for the bulk-action bar.
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  // Lines a send's reasons-backstop refusal named (AC-R3): their Reason cells
  // flag until the next send, or until a line edit refetches the table.
  const [reasonFlaggedIds, setReasonFlaggedIds] = createSignal<Set<string>>(
    new Set()
  );
  const [sort, setSort] = createSignal<SortState<SortKey>>({
    key: 'name',
    desc: false,
  });
  const [supplierError, setSupplierError] = createSignal<string>();
  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();
  // The line editor (S4): closed, open in add mode (undefined line), or open on
  // an existing line (edit mode). One signal drives both.
  const [editorLine, setEditorLine] = createSignal<
    { mode: 'add' } | { mode: 'edit'; line: Line }
  >();
  // Narrowed once, so the editor's initialLine needs no cast (kdd/type-safety).
  const editorInitialLine = () => {
    const entry = editorLine();
    return entry?.mode === 'edit' ? entry.line : undefined;
  };
  // The Add split button's remembered choice (its primary half reflects the
  // last-picked option, spec S3 § page actions).
  const [addChoice, setAddChoice] = createSignal('item');
  // The master-list picker (S7) and the chosen list awaiting its add
  // confirmation; a rejection surfaces as a blocking notice.
  const [masterListPickerOpen, setMasterListPickerOpen] = createSignal(false);
  const [pendingMasterList, setPendingMasterList] = createSignal<{
    id: string;
    name: string;
  }>();
  const [masterListError, setMasterListError] = createSignal<string>();

  const tableConfig = createTableConfig({
    tableId: 'internal-order-detail',
    defaultConfig: {
      // Comment + code are pinned inline-start so the row stays identifiable
      // (and its comment reachable) as the wide column set scrolls.
      base: {
        columnPinning: { left: [COL.comment, COL.code] },
      },
      compact: {
        viewMode: 'card',
        columnPinning: { left: [COL.comment, COL.code] },
        columnVisibility: {
          [COL.unit]: false,
          [COL.dps]: false,
          [COL.targetStock]: false,
        },
      },
    },
  });

  // The header read. The resource IS the local state: header saves write back
  // with `mutate` (no refetch → no remount), but the ancillary Add/Update, the
  // Documents tab, the line editor, and the master-list add all `refetch()`
  // while the screen — and often an OPEN dialog (the line editor) — stays up.
  // So `info()` must read `.latest` NON-suspending: a `data()` read would
  // re-suspend the <Suspense> on every refetch, remounting the subtree and
  // detaching the open <dialog> from the top layer (its backdrop vanishes and
  // the page shows through — kdd/solid-reactivity-pitfalls § no remounts).
  // `.latest` suspends only until the FIRST load resolves, so the initial
  // spinner (the fallback below, gated on `data.loading`) is unchanged.
  const [data, { mutate, refetch }] = createResource(
    () => ({ storeId: params.storeId, id: params.orderId }),
    async (variables): Promise<InternalOrderInfoFragment | undefined> => {
      const result = await graphqlFetch(InternalOrderDetail, variables);
      if (result.kind !== 'success') return undefined;
      return result.data.requisition.__typename === 'RequisitionNode'
        ? result.data.requisition
        : undefined;
    }
  );
  const info = (): InternalOrderInfoFragment | undefined => data.latest;

  // Store-context gates, fetched once per store, read non-suspending (safe
  // default OFF while unresolved).
  const [context] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(InternalOrderDetailContext, {
        storeId,
      });
      if (result.kind !== 'success') return undefined;
      return result.data;
    }
  );
  const prefs = () => context.latest?.preferences;
  const storePrefs = () => context.latest?.storePreferences;

  // The active store's own name id — the customer identity the indicator values
  // are keyed to. Fetched once per store, read non-suspending.
  const [ownName] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(StoreOwnName, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.stores.nodes[0]?.name.id;
    }
  );

  // The Indicators tab's data (definitions + this period's values). Fetched
  // only for a program order once its period and the store name id resolve; the
  // serialised variables are the resource key so identical content never
  // refetches. Read non-suspending so it never remounts the open screen.
  const indicatorVariables = () => {
    const node = info();
    const nameId = ownName.latest;
    if (!node?.program || !node.period || !nameId) return false;
    return JSON.stringify({
      storeId: params.storeId,
      programId: node.program.id,
      periodId: node.period.id,
      customerNameId: nameId,
    });
  };
  // Report generation seeds for an indicator program order (AC-PR4): the same
  // program / period / customer identity the Indicators tab reads, handed to
  // the Export/Print selector so indicator report templates can locate the
  // program data behind the order. Undefined on any other order (and until the
  // store's own name id resolves) — then only the standard seeds are sent.
  const reportSeedArgs = () => {
    const node = info();
    const nameId = ownName.latest;
    if (!showIndicators() || !node?.program || !node.period || !nameId)
      return undefined;
    return {
      programId: node.program.id,
      periodId: node.period.id,
      customerNameId: nameId,
    };
  };

  const [indicators, { mutate: mutateIndicators }] = createResource(
    indicatorVariables,
    async serialised => {
      const result = await graphqlFetch(
        ProgramIndicatorValues,
        JSON.parse(serialised)
      );
      if (result.kind !== 'success') return undefined;
      return result.data.programIndicators.nodes;
    }
  );
  // A saved indicator cell goes straight back into the fetched nodes (no
  // refetch → no remount, as the header edits do): the tab's inputs start from
  // what they are handed, so without this the next mount of a cell — stepping
  // to another line, re-entering the tab — would show the pre-edit figure
  // (#957).
  const onIndicatorSaved = (valueId: string, value: string) =>
    mutateIndicators(prev =>
      prev ? applySavedIndicatorValue(prev, valueId, value) : prev
    );
  const indicatorNodes = () =>
    indicators.state === 'ready' || indicators.state === 'refreshing'
      ? (indicators.latest ?? [])
      : [];
  const showDoses = () => prefs()?.manageVaccinesInDoses ?? false;
  const showPricing = () => prefs()?.showIndicativePriceInRequisitions ?? false;
  const showForecast = () =>
    prefs()?.displayPopulationBasedForecasting ?? false;
  const showExcess = () => prefs()?.warningForExcessRequest ?? false;
  const showDestination = () =>
    prefs()?.selectDestinationStoreForAnInternalOrder ?? false;
  const requiresAuth = () =>
    storePrefs()?.requestRequisitionRequiresAuthorisation ?? false;
  // The empty-send guard's keep-zero-lines arm (AC-S4, D20).
  const keepZeroLines = () =>
    storePrefs()?.keepRequisitionLinesWithZeroRequestedQuantityOnFinalised ??
    false;
  // The extended consumption columns / Area-AMC header: a program order on a
  // customer-statistics store.
  const showExtended = () =>
    !!info()?.program &&
    (storePrefs()?.useConsumptionAndStockFromCustomersForInternalOrders ??
      false);
  const showApproval = () =>
    requiresAuth() && (info()?.approvalStatus ?? 'NONE') !== 'NONE';
  // The side panel's "Created from requisition" row (display-only, AC-RD2).
  const showSourceLink = () =>
    prefs()?.canCreateInternalOrderFromARequisition ?? false;
  // Documents upload/remove are offered on any status, but withheld when the
  // supplier's store is disabled (AC-F2/F5).
  const supplierEnabled = () => !info()?.otherParty.store?.isDisabled;

  // Indicators tab gate (AC-I1): a non-emergency program order, a store-backed
  // supplier, and the program defines ≥1 indicator. Independent of the
  // customer-statistics prefs (those only gate the breakdown panel, AC-I10).
  const showIndicators = () =>
    isProgram() &&
    info()?.isEmergency === false &&
    !!info()?.otherParty.store &&
    indicatorNodes().length > 0;
  const showCustomerBreakdown = () =>
    (storePrefs()?.useConsumptionAndStockFromCustomersForInternalOrders ??
      false) &&
    (storePrefs()?.extraFieldsInRequisition ?? false);

  const editable = () => {
    const node = info();
    return node ? isOrderEditable(node) : false;
  };
  const isProgram = () => !!info()?.program;
  const orderInPacks = () => prefs()?.orderInPacks ?? false;
  // The Add-item affordance / add mode (AC-LN1): a Draft general order whose
  // supplier's store is enabled — program orders' item sets are fixed.
  const canAddLines = () => editable() && !isProgram();

  // Save & next's walk (AC-LN22): the next line after the current in the
  // table's current sort/filter order, skipping ones already visited this run.
  // The client-side table holds every line (the server-paginated walk collapses
  // to a plain scan here), so no page advance is needed.
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

  // The order's existing line for an item (add mode loads it rather than
  // duplicating, AC-LN2/LN6).
  const findLineForItem = (itemId: string): Line | undefined =>
    info()?.lines.nodes.find(line => line.itemId === itemId);

  // The Add split button's action (AC-LN1): Add item opens the line editor,
  // Add from master list opens the S7 picker.
  const onAddAction = (choice: string) => {
    if (choice === 'master-list') setMasterListPickerOpen(true);
    else setEditorLine({ mode: 'add' });
  };

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). Declared by
  // the SCREEN, once, because two controls trigger it: the header SplitButton
  // and the ghost button in the table's empty slot. Each carries
  // `shortcut={ALT_N}` for its badge; neither owns the action.
  //
  // `run` is the single-item add, the split button's default option — not its
  // current menu selection, which may be the master-list picker. Same gate as
  // both controls (canAddLines), but reached through `.state` rather than
  // `info()`: that one reads `data.latest`, which suspends on the first pending
  // read, and the palette evaluates every action's `disabled()` in its own
  // render (kdd/keyboard-layer § an action's `disabled` MUST NOT read a
  // suspending source).
  createAddAction({
    name: 'button.add-item',
    run: () => setEditorLine({ mode: 'add' }),
    disabled: () => {
      if (data.state !== 'ready' && data.state !== 'refreshing') return true;
      const node = data.latest;
      return !node || !isOrderEditable(node) || !!node.program;
    },
  });

  // The confirmed master-list bulk add (AC-LN7/LN8): add, then refetch the
  // page; a rejection replaces the confirmation with a notice.
  const confirmAddFromMasterList = async () => {
    const list = pendingMasterList();
    const node = info();
    if (!list || !node) return;
    setPendingMasterList(undefined);
    const result = await addInternalOrderFromMasterList(
      params.storeId,
      node.id,
      list.id
    );
    if (result.kind === 'done') void refetch();
    else if (result.kind === 'error') setMasterListError(result.message);
  };

  // ONE debounced buffer for the as-you-type reference (comment rides the same
  // buffer for the side panel).
  const edit = createDebouncedEdit<HeaderEditFields>({
    id: () => info()?.id ?? '',
    initial: () => ({
      theirReference: info()?.theirReference ?? '',
      comment: info()?.comment ?? '',
    }),
    save: patch => void saveField(patch),
  });

  // Header-level save (updateRequestRequisition), spliced back wholesale — the
  // response carries the refreshed node (with recalculated suggestions after a
  // threshold change), so no refetch is needed.
  const saveField = async (patch: Record<string, unknown>): Promise<void> => {
    const node = info();
    if (!node) return;
    const result = await saveInternalOrderFields(params.storeId, {
      id: node.id,
      ...patch,
    });
    if (result.kind === 'saved') mutate(() => result.node);
    if (result.kind === 'error') setSupplierError(result.message);
  };

  const changeSupplier = (supplierId: string) => {
    setSupplierError(undefined);
    void saveField({ otherPartyId: supplierId });
  };
  const changeDestination = (customerId: string | null) =>
    void saveField({ destinationCustomerId: { value: customerId } });
  const changeThreshold = (months: number) =>
    void saveField({ minMonthsOfStock: months });
  const changeTarget = (months: number) =>
    void saveField({ maxMonthsOfStock: months });

  const onSent = (node: InternalOrderInfoFragment) => mutate(() => node);

  // --- Read-only line table: client-side filter + sort over nested lines. ---

  const monthsThreshold = (node: InternalOrderInfoFragment) =>
    node.minMonthsOfStock > 0 ? node.minMonthsOfStock : node.maxMonthsOfStock;

  // The one MOS formula, shared with the SDK line view (pluginViews) so the
  // figure a plugin reads is the figure this column shows.
  const mos = (line: Line) => lineMonthsOfStock(line);
  const targetStock = (line: Line) =>
    line.averageMonthlyConsumption * (info()?.maxMonthsOfStock ?? 0);
  const isExcess = (line: Line) =>
    showExcess() && line.requestedQuantity - line.suggestedQuantity >= 1;

  const sortValue = (line: Line, key: SortKey): number | string => {
    switch (key) {
      case 'code':
        return line.item.code.toLowerCase();
      case 'name':
        return line.itemName.toLowerCase();
      case 'dps':
        return line.item.defaultPackSize;
      case 'available':
        return line.availableStockOnHand;
      case 'amc':
        return line.averageMonthlyConsumption;
      case 'mos':
        return mos(line);
      case 'target':
        return targetStock(line);
      case 'suggested':
        return line.suggestedQuantity;
      case 'requested':
        return line.requestedQuantity;
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
    if (lineFilter().hideOverMinimum === true) {
      const months = monthsThreshold(node);
      lines = lines.filter(
        l =>
          l.availableStockOnHand < l.averageMonthlyConsumption * months ||
          (l.availableStockOnHand === 0 && l.averageMonthlyConsumption === 0)
      );
    }
    const s = sort();
    const dir = s.desc ? -1 : 1;
    return [...lines].sort((a, b) => {
      const av = sortValue(a, s.key);
      const bv = sortValue(b, s.key);
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  };

  // Dose annotation for a unit quantity on a vaccine item under the doses
  // preference — " (N ds)" (label.doses-short), value × doses-per-unit (treated
  // as 1 when the item has none, so the annotation shows for any vaccine).
  const doseSuffix = (line: Line, value: number): string =>
    showDoses() && line.item.isVaccine
      ? ` (${Math.round(value * (line.item.doses || 1))} ${t('label.doses-short')})`
      : '';
  const numWithDoses = (line: Line, value: number) =>
    `${Math.round(value)}${doseSuffix(line, value)}`;

  const crumbs = (node: InternalOrderInfoFragment) => [
    {
      label: t('internal-order'),
      onClick: () =>
        navigate(`/${params.storeId}/replenishment/internal-order`),
    },
    { label: String(node.requisitionNumber) },
  ];

  // Details | Documents | Log | (gated) Indicators (spec S3 § tabs). An
  // accessor, so the labels re-translate on a language switch and the gated
  // Indicators tab appears as its gate resolves.
  const tabs = () => [
    { value: 'details', label: t('label.details') },
    { value: 'documents', label: t('label.documents') },
    { value: 'log', label: t('label.log') },
    ...(showIndicators()
      ? [{ value: 'indicators', label: t('label.indicators') }]
      : []),
  ];

  const hostColumns = (): Column<Line, SortKey>[] => [
    {
      c: { key: COL.comment },
      header: () => t('label.comment'),
      ...getCellDefinition('comment'),
    },
    {
      c: { accessor: line => line.item.code, id: COL.code },
      sortKey: 'code',
      header: () => t('label.code'),
      ...getCellDefinition('itemCode'),
    },
    {
      c: { key: COL.name },
      sortKey: 'name',
      header: () => t('label.name'),
      // The text "sink" column: its width floor plus no growth cap lets it
      // absorb the slack the narrow numeric columns leave behind.
      ...getCellDefinition('itemName', {
        headerPosition: 'primary',
        wrapLines: 2,
      }),
      // An ancillary line carries an "Ancillary of …" flag naming its
      // principal item(s) (AC-A8); a non-ancillary line shows a plain name.
      cell: info => {
        const line = info.row.original;
        return (
          <HStack gap="sm">
            {line.itemName}
            <Show when={line.ancillaryParents.length > 0}>
              <InfoTooltip
                label={t('label.ancillary-of')}
                text={`${t('label.ancillary-of')}: ${line.ancillaryParents
                  .map(parent => parent.name)
                  .join(', ')}`}
              />
            </Show>
          </HStack>
        );
      },
    },
    {
      c: { accessor: line => line.item.unitName ?? '', id: COL.unit },
      header: () => t('label.unit'),
      ...getCellDefinition('unitName'),
    },
    // Doses per unit — gated on the vaccine-doses preference; a dash for
    // non-vaccine items.
    ...(showDoses()
      ? ([
          {
            c: {
              accessor: line => (line.item.isVaccine ? line.item.doses : '-'),
              id: COL.dosesPerUnit,
            },
            header: () => t('label.doses-per-unit'),
            ...getCellDefinition('dosesPerUnit'),
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
    {
      c: { accessor: line => line.item.defaultPackSize, id: COL.dps },
      sortKey: 'dps',
      header: () => t('label.dps'),
      ...getCellDefinition('dps'),
    },
    {
      c: {
        accessor: line => numWithDoses(line, line.availableStockOnHand),
        id: COL.available,
      },
      sortKey: 'available',
      header: () => t('label.available-soh'),
      ...getCellDefinition('available'),
    },
    {
      // AMC displayed rounded UP; header reads "Area AMC" under the gate.
      c: {
        accessor: line =>
          numWithDoses(line, Math.ceil(line.averageMonthlyConsumption)),
        id: COL.amc,
      },
      sortKey: 'amc',
      header: () => (showExtended() ? t('label.area-amc') : t('label.amc')),
      ...getCellDefinition('amc'),
    },
    {
      c: { accessor: line => mos(line).toFixed(1), id: COL.mos },
      sortKey: 'mos',
      header: () => t('label.months-of-stock'),
      ...getCellDefinition('mos'),
    },
    {
      c: {
        accessor: line => numWithDoses(line, targetStock(line)),
        id: COL.targetStock,
      },
      sortKey: 'target',
      header: () => t('label.target-stock'),
      ...getCellDefinition('targetStock'),
    },
    // Target stock (population) — gated on the forecasting preference; the
    // stored forecast rounded up, zero on a forecast-less line.
    ...(showForecast()
      ? ([
          {
            c: {
              accessor: line =>
                numWithDoses(line, Math.ceil(line.forecastTotalUnits ?? 0)),
              id: COL.targetStockPopulation,
            },
            header: () => t('label.target-stock-population'),
            ...getCellDefinition('targetStockPopulation'),
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
    {
      c: {
        accessor: line => numWithDoses(line, line.suggestedQuantity),
        id: COL.suggested,
      },
      sortKey: 'suggested',
      // The reference keys this column "forecast quantity" (cite it).
      header: () => t('label.forecast-quantity'),
      ...getCellDefinition('suggested'),
    },
    {
      // Requested — under the excess-request preference a request ≥ 1 unit
      // above the suggestion carries a red alert icon (the line-table
      // counterpart of the editor banner).
      c: {
        accessor: line => numWithDoses(line, line.requestedQuantity),
        id: COL.requested,
      },
      sortKey: 'requested',
      header: () => t('label.requested'),
      // The preset's width + right alignment; the custom cell below overrides
      // its number formatting (the value is pre-formatted with a dose suffix).
      ...getCellDefinition('requested'),
      cell: info => {
        const line = info.row.original;
        return (
          // justify="end" keeps the number at the cell's inline-end, where the
          // preset's right alignment put it before the marker joined it.
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
    // Indicative pricing — gated on the preference.
    ...(showPricing()
      ? ([
          {
            c: {
              accessor: line => line.pricePerUnit ?? '',
              id: COL.pricePerUnit,
            },
            header: () => t('label.indicative-price-per-unit'),
            ...getCellDefinition('pricePerUnit'),
          },
          {
            c: {
              accessor: line =>
                (line.pricePerUnit ?? 0) * line.requestedQuantity,
              id: COL.indicativePrice,
            },
            header: () => t('label.indicative-price'),
            ...getCellDefinition('indicativePrice'),
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
    // Extended consumption columns — program order on a customer-statistics
    // store.
    ...(showExtended()
      ? ([
          {
            c: {
              accessor: l => numWithDoses(l, l.initialStockOnHandUnits),
              id: COL.initialSoh,
            },
            header: () => t('label.initial-stock-on-hand'),
            ...getCellDefinition('initialSoh'),
          },
          {
            c: {
              accessor: l => numWithDoses(l, l.incomingUnits),
              id: COL.incoming,
            },
            header: () => t('label.incoming'),
            ...getCellDefinition('incoming'),
          },
          {
            c: {
              accessor: l => numWithDoses(l, l.outgoingUnits),
              id: COL.outgoing,
            },
            header: () => t('label.outgoing'),
            ...getCellDefinition('outgoing'),
          },
          {
            c: {
              accessor: l => numWithDoses(l, l.lossInUnits),
              id: COL.losses,
            },
            header: () => t('label.losses'),
            ...getCellDefinition('losses'),
          },
          {
            c: {
              accessor: l => numWithDoses(l, l.additionInUnits),
              id: COL.additions,
            },
            header: () => t('label.additions'),
            ...getCellDefinition('additions'),
          },
          {
            c: {
              accessor: l => numWithDoses(l, l.expiringUnits),
              id: COL.shortExpiry,
            },
            header: () => t('label.short-expiry'),
            ...getCellDefinition('shortExpiry'),
          },
          {
            c: {
              accessor: l => Math.round(l.daysOutOfStock),
              id: COL.daysOutOfStock,
            },
            header: () => t('label.days-out-of-stock'),
            ...getCellDefinition('daysOutOfStock'),
          },
          {
            c: { accessor: l => l.reason?.reason ?? '', id: COL.reason },
            header: () => t('label.reason'),
            ...getCellDefinition('reason'),
            // A send's reasons backstop flags every offending line's Reason
            // cell (AC-R3): a red alert beside the (usually empty) reason text.
            cell: info => {
              const line = info.row.original;
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
    // Approval columns — only when the linked copy carries an approval status.
    ...(showApproval()
      ? ([
          {
            c: {
              accessor: l => Math.round(l.approvedQuantity),
              id: COL.approvedPacks,
            },
            header: () => t('label.approved-packs'),
            ...getCellDefinition('approvedPacks'),
          },
          {
            c: {
              accessor: l => l.approvalComment ?? '',
              id: COL.approvalComment,
            },
            header: () => t('label.approval-comment'),
            ...getCellDefinition('approvalComment'),
          },
        ] satisfies Column<Line, SortKey>[])
      : []),
  ];

  // --- The plugin column region (ui-surface § S8) ---
  //
  // ONE memo per reactive step, and the contributions read inside it: the
  // registry hands back a fresh array on every read, so reading it anywhere a
  // `<For>` or the table could see it directly would churn the table on every
  // unrelated update (kdd/solid-reactivity-pitfalls). `visibleContributions`
  // also applies each contribution's `when` gate, so a contribution hidden by
  // the session context never reaches the merge — and therefore never gets a
  // loader run (AC-PLUG-K3).
  const lineColumnContributions = createMemo(() =>
    visibleContributions('internalOrderLine.column')
  );

  // The line editor's info-panel contributions (§ S8 › editor region), composed
  // the same way and for the same reason: ONE memo, so the array the outlet
  // `<For>`s over keeps its identity and the mounted panels are never torn down
  // by an unrelated update. Mapped to the outlet's shape here, so the modal
  // stays free of the registry.
  const infoPanelContributions = createMemo(() =>
    visibleContributions('internalOrderLine.infoPanel').map(contribution => ({
      id: contributionId(contribution),
      Component: contribution.Component,
    }))
  );

  // The lines a contributed column sees, as the SDK's published DTO.
  const lineViews = createMemo(() => rows().map(toLineView));

  // The batched per-page column data (AC-PLUG-K4): one loader call per
  // contribution per rendered set of rows, never per cell. The resource key is
  // the SERIALISED row-id list plus the contributing ids, so re-reading
  // the same lines (a header save splicing the node back, a locale switch)
  // does not refetch, while a filter/sort/refetch that changes it does.
  const batchKey = () => {
    const loaders = lineColumnContributions().filter(
      contribution => contribution.loadData !== undefined
    );
    if (loaders.length === 0) return false;
    return JSON.stringify({
      rows: rows().map(line => line.id),
      contributions: loaders.map(contributionId),
    });
  };

  const [lineColumnData] = createResource(batchKey, async () => {
    // The key drives the fetch; the inputs are read UNTRACKED so the fetcher
    // never becomes a second, hidden dependency edge.
    const { views, loaders } = untrack(() => ({
      views: lineViews(),
      loaders: lineColumnContributions().filter(
        contribution => contribution.loadData !== undefined
      ),
    }));
    const loaded = new Map<string, ReadonlyMap<string, unknown>>();
    await Promise.all(
      loaders.map(async contribution => {
        try {
          const entries = await contribution.loadData?.(views);
          if (entries) loaded.set(contributionId(contribution), entries);
        } catch (error) {
          // One plugin's failed loader is that column's failure: it renders its
          // empty state and every other column keeps working.
          recordPluginDiagnostic({
            level: 'error',
            pluginCode: contribution.pluginCode,
            message: `column "${contribution.id}" data loader failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      })
    );
    return loaded;
  });

  // NON-suspending, `.state`-gated: the line editor is often open ABOVE this
  // table, and a suspending read would remount the subtree and detach the open
  // <dialog> from the top layer (kdd/solid-reactivity-pitfalls § no remounts on
  // interaction). `.latest` alone is not safe — it suspends on the first
  // pending read.
  const lineColumnBatch = (): LineColumnBatch => ({
    data:
      lineColumnData.state === 'ready' || lineColumnData.state === 'refreshing'
        ? (lineColumnData.latest ?? EMPTY_BATCH_DATA)
        : EMPTY_BATCH_DATA,
    loading: lineColumnData.loading,
  });

  const mergedColumns = createMemo(() =>
    mergeLineColumns(
      hostColumns(),
      lineColumnContributions(),
      toLineView,
      lineColumnBatch()
    )
  );
  const columns = () => mergedColumns().columns;

  // Degradations are RECORDED here, not inside the merge: the merge runs in a
  // memo, and recording is a write. Deduped per page instance so a re-merge (a
  // preference gate resolving, the batch landing) cannot spam the same broken
  // anchor.
  const reportedDiagnostics = new Set<string>();
  createEffect(() => {
    for (const diagnostic of mergedColumns().diagnostics) {
      const key = `${diagnostic.contributionId}:${diagnostic.message}`;
      if (reportedDiagnostics.has(key)) continue;
      reportedDiagnostics.add(key);
      recordPluginDiagnostic({
        level: 'warning',
        pluginCode: diagnostic.contributionId.split('.')[0],
        message: `internalOrderLine.column: ${diagnostic.contributionId} — ${diagnostic.message}`,
      });
    }
  });

  return (
    <Suspense fallback={<Spinner center />}>
      {/* NON-keyed Show: every save sets a fresh node object; a keyed Show would
          remount the page and drop focus. */}
      <Show
        when={info()}
        fallback={
          <Show when={!data.loading} fallback={<Spinner center />}>
            {/* Not found (or another store's) — a blocking notice returning to
                the list (AC-N3). */}
            <ConfirmDialog
              open
              title={t('error.order-not-found')}
              message={t('messages.click-to-return-to-internal-orders')}
              onConfirm={() =>
                navigate(`/${params.storeId}/replenishment/internal-order`, {
                  replace: true,
                })
              }
              onClose={() =>
                navigate(`/${params.storeId}/replenishment/internal-order`, {
                  replace: true,
                })
              }
            />
          </Show>
        }
      >
        {node => (
          // The <Tabs> root wraps the Page from outside (its display: contents
          // keeps the flex chain intact): the strip renders in the Header, the
          // panels in the body.
          <Tabs defaultValue="details">
            <Page
              fillBody
              sidePanelOpen={sidePanelOpen()}
              sidePanelTitle={t('heading.details')}
              onSidePanelClose={() => setSidePanelOpen(false)}
              sidePanelContent={
                <InternalOrderSidePanel
                  storeId={params.storeId}
                  node={node()}
                  editable={editable()}
                  isProgram={isProgram()}
                  showApproval={showApproval()}
                  showPricing={showPricing()}
                  showSourceLink={showSourceLink()}
                  edit={edit}
                  onSaveField={patch => void saveField(patch)}
                  onDeleted={() =>
                    navigate(
                      `/${params.storeId}/replenishment/internal-order`,
                      {
                        replace: true,
                      }
                    )
                  }
                />
              }
              header={
                <Header>
                  <Breadcrumb crumbs={crumbs(node())} />
                  {/* Every control here collapses to its icon on a narrow
                    viewport (`collapsible="narrow"`, label kept as the
                    accessible name and repeated as a tooltip — the outbound
                    header's tier). Labelled, this cluster needs ~44rem, more
                    than a tablet's header has left beside the breadcrumb, so
                    it wrapped onto a row of its own — and on a short screen
                    that row costs table rows, which are worth more. */}
                  <HeaderButtons>
                    {/* Add — a split of Add item (line editor) and Add from
                      master list (S7 picker). Shown always but DISABLED on
                      program orders (their item set is fixed at creation) and
                      on read-only orders, with a reason tooltip (AC-LN1 —
                      "disable with an explanation", not hide). */}
                    <SplitButton
                      icon={<PlusCircleIcon />}
                      collapsible="narrow"
                      testId="add-item-button"
                      disabled={!canAddLines()}
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
                    {/* Use suggested quantities — fills every zero-requested line
                      with its suggestion (AC-Q1). Available on program orders,
                      so gated on editability alone (not canAddLines); disabled
                      on read-only orders (AC-Q2). */}
                    <UseSuggestedQuantitiesAction
                      storeId={params.storeId}
                      orderId={node().id}
                      disabled={!editable()}
                      onApplied={() => void refetch()}
                    />
                    {/* Export/Print — a read, offered on every status (AC-PR1). */}
                    <ExportPrintInternalOrderAction
                      orderId={node().id}
                      seedArgs={reportSeedArgs()}
                    />
                    {/* More — reopens the side panel; shown only while closed. */}
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
                  {/* The header field cluster (ui-standards → HeaderToolbar):
                    each field labelled above its small control, sharing the
                    row per its FormRowItem weight and wrapping as a unit. The
                    read-only notices ride the cluster's end as compact chips —
                    persistent low-urgency context that shouldn't cost a
                    content row (Alert `compact`; the customer-returns kind
                    banner's pattern). Both can show; each wraps to its own
                    line when the row can't hold it. */}
                  <HeaderToolbar
                    alert={
                      <>
                        <Show when={node().otherParty.store?.isDisabled}>
                          <Alert severity="info" compact>
                            {t('info.cannot-edit-disabled-store')}
                          </Alert>
                        </Show>
                        <Show when={isProgram()}>
                          <Alert severity="info" compact>
                            {t('info.cannot-edit-program-requisition')}
                          </Alert>
                        </Show>
                      </>
                    }
                  >
                    <InternalOrderToolbar
                      storeId={params.storeId}
                      node={node()}
                      editable={editable()}
                      isProgram={isProgram()}
                      showDestination={showDestination()}
                      edit={edit}
                      onChangeSupplier={changeSupplier}
                      supplierError={supplierError()}
                      onChangeDestination={changeDestination}
                      onChangeThreshold={changeThreshold}
                      onChangeTarget={changeTarget}
                    />
                  </HeaderToolbar>
                  {/* The ancillary banner keeps its own full-width row beneath
                    the cluster (spec S3 § toolbar): it carries CONTROLS
                    (Details popover + Add/Update + inline error), which the
                    alert chip slot is not documented for — its final home is
                    the one open operator decision (ui-migration-report.md). */}
                  <Show
                    when={editable() && node().ancillaryState.state !== 'NONE'}
                  >
                    <Toolbar>
                      <InternalOrderAncillaryBanner
                        storeId={params.storeId}
                        requisitionId={node().id}
                        ancillary={node().ancillaryState}
                        editable={editable()}
                        onRefreshed={() => void refetch()}
                      />
                    </Toolbar>
                  </Show>
                  {/* The tab strip is the Header's LAST child, so it claims the
                    header's bottom edge (ui/docs/PAGES.md § tabs — the <Tabs>
                    root wraps the Page frame from outside). */}
                  <TabList tabs={tabs()} />
                </Header>
              }
              contentFooter={
                // Selection action bar while lines are selected (AC-LN15);
                // otherwise the order's status footer. Matches OMS, which swaps
                // the whole footer on selection. A program order's checkboxes are
                // disabled (no delete offered — D32), so nothing selects there
                // and this bar only ever appears on a general order.
                <Show
                  when={selectedIds().length > 0}
                  fallback={
                    <InternalOrderStatusFooter
                      storeId={params.storeId}
                      node={node()}
                      editable={editable()}
                      requiresAuthorisation={requiresAuth()}
                      keepZeroLines={keepZeroLines()}
                      onSent={onSent}
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
                    {/* On a read-only order the click explains why it can't
                      proceed rather than confirming (AC-LN16); the whole-order
                      delete is refused server-side regardless. onDeleted clears
                      the selection (unmounting this bar) and refetches. */}
                    <DeleteLinesAction
                      storeId={params.storeId}
                      selectedIds={selectedIds}
                      canDelete={editable}
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
                  // A row click opens the line editor on that line (AC-LN11);
                  // on a read-only order it opens with every control disabled.
                  onRowClick={line => setEditorLine({ mode: 'edit', line })}
                  // Placeholder lines (requested 0) read in the info tone —
                  // whole-row blue text, de-emphasising them (ui-surface S3
                  // line table), matching outbound's placeholder lines.
                  rowTone={line =>
                    line.requestedQuantity === 0 ? 'info' : undefined
                  }
                  emptyMessage={
                    (lineFilter().itemCodeOrName?.like ?? '').trim() ||
                    lineFilter().hideOverMinimum === true
                      ? t('error.no-items-filter-on')
                      : t('error.no-internal-order-items')
                  }
                  // The empty line table offers the single-item add inline
                  // (AC-LN1), the same add mode as the header split button —
                  // withheld when a single item can't be added (read-only or a
                  // program order, whose item set is fixed).
                  empty={
                    canAddLines() ? (
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
                  // Central-server admins can promote this table's layout to
                  // the shared install-wide default, the same as the list
                  // (issue #1118 — the detail table offered no way to save
                  // table defaults). Gate + action both off the config
                  // controller; undefined for everyone else, so the action
                  // isn't offered.
                  onSaveGlobalDefault={
                    tableConfig.canSaveGlobalDefault()
                      ? tableConfig.saveGlobalTableConfig
                      : undefined
                  }
                  // Row selection for the bulk line delete (AC-LN15). The
                  // column always shows; on a read-only order the delete is
                  // refused with an explanation (AC-LN16), and on a program
                  // order — whose line set is fixed — the checkboxes render
                  // disabled so the affordance reads as blocked, not missing
                  // (no delete offered, D32).
                  enableSelection
                  selectionDisabled={isProgram()}
                  selectedIds={selectedIds()}
                  onSelectionChange={setSelectedIds}
                />
              </TabPanel>
              <TabPanel value="documents">
                <InternalOrderDocumentsTab
                  storeId={params.storeId}
                  node={node()}
                  supplierEnabled={supplierEnabled()}
                  onChanged={() => void refetch()}
                />
              </TabPanel>
              <TabPanel value="log">
                {/* The shared activity-log surface; oldest first per AC-AL1
                    (spec S3 § Log tab). */}
                <ActivityLogPanel
                  storeId={params.storeId}
                  recordId={node().id}
                  order="oldest-first"
                />
              </TabPanel>
              <Show when={showIndicators()}>
                <TabPanel value="indicators">
                  <ProgramIndicatorsTab
                    storeId={params.storeId}
                    nodes={indicatorNodes()}
                    editable={editable()}
                    showCustomerBreakdown={showCustomerBreakdown()}
                    onSaved={onIndicatorSaved}
                  />
                </TabPanel>
              </Show>

              {/* The line editor (S4) — add mode (general orders) or edit mode
                (a clicked line). A committed save refetches the line table. */}
              <InternalOrderLineEditModal
                open={!!editorLine()}
                onClose={() => setEditorLine(undefined)}
                storeId={params.storeId}
                requisitionId={node().id}
                minMonths={node().minMonthsOfStock}
                maxMonths={node().maxMonthsOfStock}
                editable={editable()}
                canAdd={canAddLines()}
                showDoses={showDoses()}
                showPricing={showPricing()}
                showForecast={showForecast()}
                showExcess={showExcess()}
                showExtended={showExtended()}
                orderInPacks={orderInPacks()}
                initialLine={editorInitialLine()}
                nextLine={resolveNextLine}
                findLineForItem={findLineForItem}
                // The info-panel slot's other half (§ S8 › editor region): the
                // order as the SDK's published view. A prop getter, so a header
                // save or a status change reaches an open panel in place.
                order={toInternalOrderView(node(), editable())}
                infoPanelContributions={infoPanelContributions}
                onCommitted={() => {
                  // A line edit may have supplied a missing reason — drop the
                  // send-backstop flags so they don't linger stale (AC-R3).
                  setReasonFlaggedIds(new Set<string>());
                  void refetch();
                }}
              />

              {/* Add from master list (S7): the picker, then an are-you-sure
                confirmation, then the bulk add. */}
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
          </Tabs>
        )}
      </Show>
    </Suspense>
  );
};

export default InternalOrderDetailView;

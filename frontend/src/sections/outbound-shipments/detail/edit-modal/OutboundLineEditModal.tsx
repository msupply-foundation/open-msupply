import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { getPlural, t } from '../../../../intl';
import { formatNumber } from '../../../../intl/formatNumber';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Popover } from '../../../../ui/elements/feedback/Popover';
import { EmptyState } from '@/ui/elements/feedback/EmptyState';
import { InsetPanel } from '@/ui/layout/InsetPanel/InsetPanel';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import {
  CancelButton,
  DialogSaveButton,
  SaveAndNextButton,
} from '../../../../ui/elements/buttons/StandardButtons';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { Select } from '../../../../ui/elements/selectors/Select';
import styles from './OutboundLineEditModal.module.css';
import { Stack } from '../../../../ui/layout/Stack/Stack';
import { HStack } from '../../../../ui/layout/Stack/HStack';
import {
  DataTable,
  type CardGroup,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import { Table } from '../../../../ui/elements/table/Table';
import {
  getCellDefinition,
  getFlagCell,
  getNumberCell,
} from '../../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../../ui/utils/rem';
import { createTableConfig } from '../../../../api/createTableConfig';
import {
  CheckIcon,
  InfoIcon,
  MessageSquareIcon,
  StockIcon,
} from '../../../../ui/icons';
import {
  DraftStockOutLines,
  ItemVariants,
  SaveOutboundItemLines,
  type DraftStockOutLinesResult,
  type ItemVariantsResult,
} from './outboundLineEdit.generated';
import { ItemSearch } from '../../../../domain/item';
import { VvmStatusSelect, type VvmStatus } from '@/domain/vvmStatus';
import {
  createFocusTarget,
  createFocusTargets,
} from '../../../../ui/utils/createFocusTarget';
import { toSaveLineInputs } from './saveLineInputs';
import {
  availableUnits as sumAvailableUnits,
  issuedUnits as sumIssuedUnits,
  distinctPackSizes as packSizesIn,
  autoAllocateBarReasons,
  barReasons,
  clampManualPacks,
  deriveIssueWarnings,
  isExpired,
  rowHasAllocatableStock,
  distributeIssue,
  fillOrderCompare,
  lensToUnits,
  unitsToLens,
  packsToDoses,
  dosesToPacks,
  type AllocateUnit,
  type AllocationPreferences,
  type IssueWarning,
} from '../../../../domain/allocation';
import { outboundShipmentPreferences } from '@/store/storeContext';
import { issueWarningMessages } from './allocationWarnings';

// The line editor (spec S4): the SINGLE surface for issuing an item — set the
// quantity to issue and distribute it across batches. The batch grid is the
// server-computed draft (draftStockOutLines: one row per batch with
// available/in-store packs + the item's existing lines pre-filled); entry in
// the Issue field auto-distributes FEFO client-side (AC-AL1's manual-entry
// face), per-batch packs are directly editable bounded 0…available
// (OMS-REG-DIST-03.19), and quantity beyond available becomes the placeholder
// while NEW (OMS-REG-DIST-03.23/.9). Save is the item-set save
// (saveOutboundShipmentItemLines, OMS-REG-DIST-03.20): lines + placeholder in
// one call; every rejection is a non-typed GraphQL error (contract wire trap)
// surfaced in the footer.
//
// Two modes (spec S4, OMS-REG-DIST-03.31..33): 'update' (opened from a row —
// the picker locks, the clicked batch is scrolled into view + focused, and "OK
// & next" walks the parent's sorted/paginated line list via the parent-owned
// nextItem) and 'add' ("Add item", or fallen into when the walk runs out — the
// picker is active + focused, and "OK & next" reopens empty). The picker shows
// EVERY item — items already on the shipment are NOT excluded; picking one
// loads its existing allocation (the draft pre-fills existing lines).

type DraftLine =
  DraftStockOutLinesResult['draftStockOutLines']['draftLines'][number];

type ItemVariant =
  ItemVariantsResult['items']['nodes'][number]['variants'][number];

// The variant-info popover's body (spec S4 § batch grid): the item's variants
// as a compact read-only table — name · manufacturer · VVM type (vaccine
// items) — with the batch's own variant marked. The old app reuses its
// variant SELECTOR disabled; this is the same information as a plain table.
const VariantInfoTable = (props: {
  variants: ItemVariant[];
  selectedId: string;
  isVaccine: boolean;
}): JSX.Element => (
  <Show
    when={props.variants.length > 0}
    fallback={<p>{t('messages.no-item-variants')}</p>}
  >
    {/* The registry's STATIC SUB-TABLE role: a short, fixed row set inside
        another surface (this popover), where a DataTable's toolbar chrome would
        outweigh the content. The shell owns the row look; cell treatment is its
        data-attribute contract, not our own classes. */}
    <Table label={t('label.item-variant')}>
      <thead>
        <tr>
          <th data-check aria-label={t('label.selected')} />
          <th>{t('label.name')}</th>
          <th>{t('label.manufacturer')}</th>
          <Show when={props.isVaccine}>
            <th>{t('label.vvm-type')}</th>
          </Show>
        </tr>
      </thead>
      <tbody>
        <For each={props.variants}>
          {variant => {
            const selected = variant.id === props.selectedId;
            return (
              <tr aria-current={selected ? 'true' : undefined}>
                <td data-check>
                  <Show when={selected}>
                    <span
                      role="img"
                      aria-label={t('label.selected')}
                      title={t('label.selected')}
                    >
                      <CheckIcon />
                    </span>
                  </Show>
                </td>
                <td>{variant.name}</td>
                <td data-muted>{variant.manufacturer?.name ?? ''}</td>
                <Show when={props.isVaccine}>
                  <td data-muted>{variant.vvmType ?? ''}</td>
                </Show>
              </tr>
            );
          }}
        </For>
      </tbody>
    </Table>
  </Show>
);

// The batch grid presents as CARDS, not a table (the createTableConfig default
// below) — the same shape as the inbound and stocktake line editors. Batch is
// the card HEADER identity (meta.headerPosition), so it isn't itself a body
// group; the issue quantity and the stock context it's judged against sit in the
// always-shown batch panel, with pricing and ancillary detail behind
// disclosures. Group keys/labels/icons match the sibling editors exactly, so one
// card vocabulary reads the same across every line editor.
type GroupKey = 'batch' | 'pricing' | 'other';
const CARD_GROUPS: CardGroup<DraftLine, GroupKey>[] = [
  {
    key: 'batch',
    labelKey: 'label.batch',
    icon: () => <StockIcon />,
    panel: true,
  },
  {
    key: 'pricing',
    labelKey: 'label.pricing',
    icon: () => <InfoIcon />,
    panel: true,
    disclosure: 'closed',
  },
  {
    key: 'other',
    labelKey: 'heading.other',
    icon: () => <MessageSquareIcon />,
    panel: true,
    disclosure: 'closed',
  },
];

export type LineEditItem = {
  id: string;
  /** For the locked picker's "code - name" label (ItemSearch selectedItem). */
  code: string;
  name: string;
  unitName?: string | null;
  isVaccine?: boolean;
  doses?: number;
};

// Resolve the next item to step to in UPDATE mode ("OK & next"). Owned by the
// PARENT (the list is server-paginated — the next item may be on a later
// page, and finding it advances the detail table forward): given the current
// item id and the set of items already covered THIS iteration, it returns the
// next distinct uncovered item in the parent's filtered/sorted order, or
// undefined when the list is exhausted (→ the modal drops into add mode).
export type ResolveNextItem = (
  currentId: string,
  covered: Set<string>
) => Promise<LineEditItem | undefined>;

interface OutboundLineEditModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  invoiceId: string;
  /** NEW shipments may create placeholders (rules.md § placeholder lines). */
  isNew: boolean;
  /**
   * The item this open STARTS on (a row click) → UPDATE mode (the picker
   * locks). Omitted for "Add item" → add mode. The modal tracks its own
   * current item as the user advances with "OK & next".
   */
  initialItem?: LineEditItem;
  /**
   * The clicked LINE id for a row-click open — the editor scrolls its batch
   * into view and focuses its packs input (OMS-REG-DIST-03.31; draft rows
   * built from existing lines keep the invoice-line id). Omitted for "Add
   * item"; a clicked placeholder row has no batch row, so the Issue field is
   * focused.
   */
  initialLineId?: string;
  /**
   * UPDATE mode "OK & next": resolve the next item to edit (parent-owned;
   * pages the detail table forward as needed). See ResolveNextItem.
   */
  nextItem: ResolveNextItem;
  /**
   * Whether the shipment's customer is itself a store (a transfer). Non-store
   * (external) customers additionally get the received-packs / difference
   * columns.
   */
  customerIsStore: boolean;
  /**
   * The shipment's currency + rate (the side panel's foreign-currency block)
   * — the FC sell-price column re-expresses each batch's pack price at this
   * rate. Code undefined while the shipment has no currency set (home
   * currency) — the column then renders blank cells.
   */
  currencyCode?: string | null;
  currencyRate: number;
  /** A save committed — the view refetches the lines page. */
  onCommitted: () => void;
}

// The parent-facing wrapper: mount the editor ONLY while open. `<Show keyed>`
// tears the content down on close and rebuilds it on the next open, so each
// OPEN starts fresh. Within one open the content owns its current item
// (advancing via "OK & next" is imperative — seedItem — not a prop change).
// The keyed `when` is the OPEN identity: the initial item id when opened from
// a row, or the literal 'add' when opened from "Add item".
export const OutboundLineEditModal = (
  props: OutboundLineEditModalProps
): JSX.Element => (
  <Show when={props.open && (props.initialItem?.id ?? 'add')} keyed>
    {_openKey => <LineEditContent {...props} />}
  </Show>
);

// Issue-entry lens (spec/stock-allocation § the allocate-in lens): units,
// packs-of-‹size›, and — for vaccine items under manage-vaccines-in-doses —
// doses (AC-AL7).

// Resolve the shared distribution warnings (src/domain/allocation
// deriveIssueWarnings) to the editor's inline banner strings. The mapping —
// over-allocation surfaced (AC-AL3) and every skipped category reported
// (AC-AL2) — is the pure issueWarningMessages (unit-tested in
// ./allocationWarnings); here we only resolve its keys/params via t(), reusing
// the same ported vocabulary the bulk allocate report uses. The shortfall is
// NOT reported here — outbound surfaces it as the dedicated placeholder notice
// (NEW only) — so deriveIssueWarnings runs reportShortfall:false.
const warningMessages = (
  derived: readonly IssueWarning[],
  requestedUnits: number
): string[] =>
  issueWarningMessages(derived, requestedUnits).map(message =>
    message.key === 'messages.over-allocated'
      ? t(message.key, {
          quantity: formatNumber(message.quantity),
          issueQuantity: formatNumber(message.issueQuantity),
        })
      : t(message.key, {
          reasons: message.reasons.map(reason => t(reason)).join(', '),
        })
  );

const LineEditContent = (props: OutboundLineEditModalProps): JSX.Element => {
  const [item, setItem] = createSignal<LineEditItem | undefined>(
    props.initialItem
  );
  // Mode: 'update' (opened from a row — "OK & next" steps to the next item)
  // or 'add' ("Add item", or fallen into when an update walk runs out). Only
  // ever flips update → add, never back.
  const [mode, setMode] = createSignal<'add' | 'update'>(
    props.initialItem ? 'update' : 'add'
  );
  // Items already stepped through THIS iteration (since the modal opened on a
  // row), so the parent's next-item walk never offers one twice — across page
  // advances too. Seeded with each item as it loads; not reactive.
  const coveredItemIds = new Set<string>();
  // Each batch row's packs-issued field, bound per row and addressed by draft
  // row id — where a row-click open or an advance lands focus. The handle waits
  // for the row to attach, so no load gate is needed here.
  const batchFields = createFocusTargets();

  // The two named focus destinations — the add-mode item search and the Issue
  // field. Entering either state just calls focus(); the handle waits for the
  // control and defers the frame (ui/utils/createFocusTarget).
  const itemSearch = createFocusTarget();
  const issueField = createFocusTarget();

  const [draft, setDraft] = createStore<DraftLine[]>([]);
  // The item's variants — fetched by seedItem only when a draft line carries
  // an itemVariantId (the batch column's variant-info popover, spec S4 §
  // batch grid); empty for the common variant-less item.
  const [variants, setVariants] = createSignal<ItemVariant[]>([]);
  const [placeholderUnits, setPlaceholderUnits] = createSignal(0);
  const [issueValue, setIssueValue] = createSignal<number | undefined>();
  const [allocateIn, setAllocateIn] = createSignal<AllocateUnit>({
    kind: 'units',
  });
  const [loadingLines, setLoadingLines] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | undefined>();
  // Zero-allocation saves need a second confirmation (spec S4 § save).
  const [zeroConfirm, setZeroConfirm] = createSignal(false);
  // So does a zero-packs line whose VVM status changed — the set-save deletes
  // zero-pack lines, silently dropping that status change (spec S4 § save).
  const [vvmConfirm, setVvmConfirm] = createSignal(false);
  // Warnings raised by the last distribution (spec S4 § warnings).
  const [warnings, setWarnings] = createSignal<string[]>([]);
  // Dirty gate: OK is disabled until something changed (matches the e2e
  // expectation that OK saves a real change).
  const [dirty, setDirty] = createSignal(false);

  const tableConfig = createTableConfig({
    tableId: 'outbound-line-edit',
    // Cards by DEFAULT (as the inbound + stocktake line editors) — the
    // DataTable's showCardToggle offers the flip to a table above the compact
    // breakpoint and setConfig persists it per user (#886). Manufacturer starts
    // hidden (the old app's defaultHidden) — declared per band, since bands
    // don't share; the Columns popover restores it.
    defaultConfig: {
      base: { viewMode: 'card', columnVisibility: { manufacturer: false } },
      compact: { viewMode: 'card', columnVisibility: { manufacturer: false } },
    },
  });
  const prefs = () => outboundShipmentPreferences();

  // Seed one item's draft (server-computed: existing lines + available
  // batches + placeholder). The ONE seed path — sequential imperative fetch,
  // not a resource (issue #428's "do things sequential"): on mount (update
  // mode), on item pick (add mode), and on an "OK & next" advance.
  // `focusLineId` is the clicked batch to scroll/focus once loaded
  // (OMS-REG-DIST-03.31); omitted → the first batch row (an advance), undefined
  // row → Issue field.
  const seedItem = async (picked: LineEditItem, focusLineId?: string) => {
    setItem(picked);
    coveredItemIds.add(picked.id);
    setLoadingLines(true);
    setErrorMessage(undefined);
    setWarnings([]);
    setIssueValue(undefined);
    // Back to the units lens: the previous item's pack lens may not exist on
    // this one, and the auto-allocation below seeds through onIssueChange —
    // a stale packs-of-N lens would multiply the placeholder's units by N.
    setAllocateIn({ kind: 'units' });
    setDirty(false);
    setZeroConfirm(false);
    setVvmConfirm(false);
    const result = await graphqlFetch(DraftStockOutLines, {
      storeId: props.storeId,
      itemId: picked.id,
      invoiceId: props.invoiceId,
    });
    if (result.kind !== 'success') {
      setLoadingLines(false);
      return;
    }
    const data = result.data.draftStockOutLines;
    // Display and distribution order (spec/stock-allocation § ordering,
    // AC-AL1): the shared comparator — FEFO, or VVM-priority-then-expiry
    // under the sort-by-VVM preference, matching the server-side bulk
    // allocate's ordering — with rows holding nothing allocatable sunk to
    // the bottom (AC-AL15). Snapshot the seeded allocation first: the
    // on-hold manual exception and the sinking both judge it (AC-AL14).
    const sorted = [...data.draftLines].sort((a, b) =>
      fillOrderCompare(a, b, allocationPrefs())
    );
    seededPacksById = new Map(
      sorted.map(line => [line.id, line.numberOfPacks])
    );
    seededVvmIdById = new Map(
      sorted.map(line => [line.id, line.vvmStatus?.id ?? null])
    );
    nonAllocatableIds = new Set(
      sorted.filter(line => !rowHasAllocatableStock(line)).map(line => line.id)
    );
    const ordered = [
      ...sorted.filter(line => !nonAllocatableIds.has(line.id)),
      ...sorted.filter(line => nonAllocatableIds.has(line.id)),
    ];
    setDraft(reconcile(ordered, { key: 'id' }));
    const placeholder = data.placeholderQuantity ?? 0;
    setPlaceholderUnits(placeholder);
    // Seed the Issue field with the item's CURRENT requested quantity —
    // issued units + placeholder, the same total the grid footer shows; 0
    // when nothing is issued (spec S4 § issue field seed). Display-only: a
    // bare setIssueValue never re-distributes, so opening an item can't
    // disturb a hand-tuned per-batch spread. (The lens was just reset to
    // units, so the unit sum is the right shape.)
    const seededIssuedUnits = sorted.reduce(
      (sum, line) => sum + line.numberOfPacks * line.packSize,
      0
    );
    setIssueValue(seededIssuedUnits + placeholder);
    // The variant-info popover's data — only when some batch actually carries
    // a variant (most items have none; no read for them). Fire-and-forget,
    // unlike the draft fetch above: nothing below depends on it, so the focus
    // landing and the auto-allocation never wait on this second round-trip.
    // The item guard drops a response that lands after a switch away.
    setVariants([]);
    if (sorted.some(line => line.itemVariantId)) {
      void graphqlFetch(ItemVariants, {
        storeId: props.storeId,
        itemId: picked.id,
      }).then(variantsResult => {
        if (variantsResult.kind === 'success' && item()?.id === picked.id)
          setVariants(variantsResult.data.items.nodes[0]?.variants ?? []);
      });
    }
    // Land ready to type (OMS-REG-DIST-03.31). Update mode: the clicked batch's packs
    // input (draft rows from existing lines keep the invoice-line id), or the
    // first row on an advance (nothing was clicked). A clicked PLACEHOLDER row
    // has no batch row of its own — its line id is absent from the draft, so
    // the id must be MATCHED, not merely present — and an add-mode pick has no
    // clicked row at all: both land on the Issue field.
    const rowId = () => {
      if (mode() !== 'update') return undefined;
      if (focusLineId == null) return sorted[0]?.id;
      return sorted.some(line => line.id === focusLineId)
        ? focusLineId
        : undefined;
    };
    const focusRow = rowId();
    if (focusRow) batchFields.focus(focusRow);
    else issueField.focus();
    setLoadingLines(false);

    // Auto-allocate on open (OMS-REG-DIST-03.26): a NEW shipment's *pure*
    // placeholder — an item carrying a requested quantity with nothing yet
    // allocated — is distributed against available stock the moment the editor
    // opens, the same FEFO run the Issue field performs (seeded with the
    // requested quantity), leaving the placeholder holding any remainder. A
    // notice shows only if stock was actually placed. Requisition-sourced and
    // manual-shortfall placeholders carry a quantity; master-list placeholders
    // are zero, so this no-ops for them. An item with stock already allocated
    // is left untouched.
    const allocatedPacks = sorted.reduce(
      (sum, line) => sum + line.numberOfPacks,
      0
    );
    if (props.isNew && placeholder > 0 && allocatedPacks === 0) {
      onIssueChange(placeholder);
      const placed = draft.reduce((sum, line) => sum + line.numberOfPacks, 0);
      if (placed > 0)
        setWarnings(prev => [t('messages.auto-allocated-lines'), ...prev]);
    }

    // Old-app lens-default parity (its OutboundLineEdit Allocation.tsx): an
    // item with exactly ONE distinct pack size opens in packs-of-that-size —
    // with the store's pack-to-one preference every batch is pack size 1, so
    // this reads "packs of 1" rather than the item's unit. Applied AFTER
    // auto-allocation so the distribution ran in units; the switch only
    // re-expresses the seeded quantity (a single-pack-size item's packs lens
    // fills the very same batches, so nothing moves). A vaccine on the doses
    // lens is left in units as before — the doses default is a separate parity
    // gap, not touched here.
    const sizes = distinctPackSizes();
    const onlySize = sizes.length === 1 ? sizes[0] : undefined;
    const vaccineInDoses = prefs().manageVaccinesInDoses && !!item()?.isVaccine;
    if (!vaccineInDoses && onlySize)
      switchLensTo({ kind: 'packs', size: onlySize });
  };

  // Back to the item-search state — add mode with no item picked. Reached by
  // "OK & next" in add mode, or when an update walk runs out of items.
  const backToSearch = () => {
    setMode('add');
    setItem(undefined);
    setDraft(reconcile([], { key: 'id' }));
    setPlaceholderUnits(0);
    setIssueValue(undefined);
    setWarnings([]);
    setErrorMessage(undefined);
    setDirty(false);
    setZeroConfirm(false);
    setVvmConfirm(false);
    setLoadingLines(false);
    itemSearch.focus();
  };

  onMount(() => {
    if (props.initialItem)
      void seedItem(props.initialItem, props.initialLineId);
    else itemSearch.focus();
  });

  // The shared barred-batch policy (spec/stock-allocation § barred batches,
  // AC-AL2/AL8), fed outbound's resolved preferences — the module owns no
  // preference fetch.
  const allocationPrefs = (): AllocationPreferences => ({
    expiredStockPreventIssue: prefs().expiredStockPreventIssue,
    expiredStockIssueThreshold: prefs().expiredStockIssueThreshold,
    manageVvmStatusForStock: prefs().manageVvmStatusForStock,
    sortByVvmStatusThenExpiry: prefs().sortByVvmStatusThenExpiry,
  });
  // TWO bar rules (rules.md § barred batches): the pref-gated ISSUE bar
  // (manual entry disabled, row dimmed — AC-AL8/AL9) vs the stricter,
  // unconditional AUTO bar (expired / unusable-VVM stock is never
  // auto-allocated, preference or not — AC-AL2/AL10).
  //
  // The manual bar's on-hold exception and the sunk non-allocatable rows
  // (AC-AL14/AL15) judge the allocation AS SEEDED at editor open — plain
  // (non-reactive) snapshots set by seedItem, so zeroing a held row mid-edit
  // doesn't lock it and rows don't reorder underneath the user.
  let seededPacksById = new Map<string, number>();
  // Each row's VVM status AS SEEDED — the save guard warns when a zero-packs
  // row's status differs from this (its change won't survive the set-save).
  let seededVvmIdById = new Map<string, string | null>();
  let nonAllocatableIds = new Set<string>();
  const isBarred = (line: DraftLine): boolean =>
    barReasons(
      {
        stockLineOnHold: line.stockLineOnHold,
        location: line.location,
        vvmStatus: line.vvmStatus,
        expiryDate: line.expiryDate,
        availablePacks: line.availablePacks,
        numberOfPacks: seededPacksById.get(line.id) ?? 0,
        isVaccineItem: item()?.isVaccine ?? true,
      },
      allocationPrefs()
    ).length > 0;
  // Nothing to allocate OR adjust here — sunk to the bottom, disabled
  // (AC-AL15), like the manual bar.
  const isNonAllocatable = (line: DraftLine): boolean =>
    nonAllocatableIds.has(line.id);
  const rowDisabled = (line: DraftLine): boolean =>
    isBarred(line) || isNonAllocatable(line);
  // Calendar-expired batch (D111) — the card's error tone + Expired badge.
  // Display-only; the bar predicates own the preference/threshold logic.
  const lineExpired = (line: DraftLine): boolean =>
    !!line.expiryDate && isExpired(line.expiryDate);
  const lineAutoBarReasons = (line: DraftLine) =>
    autoAllocateBarReasons(line, allocationPrefs());
  // The tick column's predicate ("will be used in auto-allocation"): auto-
  // fillable AND, under the packs lens, of the selected pack size (the old
  // app's canAutoAllocate contract).
  const willAutoAllocate = (line: DraftLine): boolean => {
    if (line.availablePacks <= 0) return false;
    if (lineAutoBarReasons(line).length > 0) return false;
    const lens = allocateIn();
    return lens.kind !== 'packs' || line.packSize === lens.size;
  };

  // Available = allocatable units, EXCLUDING on-hold batches (old-app parity;
  // the shared helper skips on-hold stock/location — kdd/allocation). On-hold
  // rows still render in the grid, disabled.
  const availableUnits = createMemo(() => sumAvailableUnits(draft));

  // A fresh array whenever the draft's SHAPE changes (rows added on load /
  // cleared on item switch). The DataTable/TanStack memoises its row model on
  // the `data` reference, so passing the store proxy directly (whose reference
  // survives an in-place `reconcile`) leaves the grid stuck on its initial
  // empty build. Spreading tracks the array's shape, not each row's nested
  // fields, so per-pack edits still mutate in place without rebuilding the grid
  // (no remount / focus loss — kdd/solid-reactivity-pitfalls).
  const draftRows = createMemo(() => [...draft]);
  const issuedUnits = createMemo(() => sumIssuedUnits(draft));
  const distinctPackSizes = createMemo(() => packSizesIn(draft));

  const unitName = () => item()?.unitName ?? t('label.unit');

  // The DOSES lens re-expresses the batch grid's stock columns (old-app
  // parity — its dosesView column variants): In store / Available / issued
  // switch to dose quantities, the helper column flips to packs, and
  // Doses-per-unit context appears.
  const dosesView = () => allocateIn().kind === 'doses';
  // Per-batch doses ⇔ packs uses the LINE's own pack size / doses-per-unit (a
  // variant may override the item's), so the grid converts row by row via the
  // shared domain helpers (packsToDoses / dosesToPacks).

  // The <Select> value string for the current allocate-in lens. Capture the
  // lens in a local so TS narrows the discriminated union without a cast (a
  // bare second allocateIn() call is not narrowed).
  const allocateInValue = () => {
    const lens = allocateIn();
    if (lens.kind === 'units') return 'units';
    if (lens.kind === 'doses') return 'doses';
    return `packs-${lens.size}`;
  };

  // Switch the display lens WITHOUT redistributing: re-express the current
  // Issue quantity in the new unit — the units equivalent is preserved and
  // nothing redistributes (spec S4 § issue field seed; re-running distribution
  // here would silently rewrite a seeded or hand-tuned allocation on a mere
  // display-unit switch). Shared by the lens <Select> and the on-open default.
  const switchLensTo = (next: AllocateUnit) => {
    const previous = allocateIn();
    setAllocateIn(next);
    const v = issueValue();
    if (v == null) return;
    const units = lensToUnits(v, previous) ?? 0;
    setIssueValue(Math.round(unitsToLens(units, next) * 100) / 100);
  };

  // FEFO auto-distribution across the grid (spec S4 issue field): the shared
  // routine fills usable batches oldest-expiry-first in whole packs
  // (src/domain/allocation distributeIssue — AC-AL1/AL3's client face); the
  // shortfall becomes the placeholder (NEW only), and each condition raises
  // its warning banner.
  const distribute = (units: number) => {
    const lens = allocateIn();
    const result = distributeIssue(
      draft.map(line => ({
        id: line.id,
        packSize: line.packSize,
        availablePacks: line.availablePacks,
        barred: lineAutoBarReasons(line),
      })),
      units,
      // The packs lens fills only batches of the selected size (AC-AL11).
      lens.kind === 'packs' ? { requiredPackSize: lens.size } : undefined
    );
    for (let index = 0; index < draft.length; index++) {
      const packs = result.packsById.get(draft[index]!.id) ?? 0;
      setDraft(index, 'numberOfPacks', packs);
    }
    setPlaceholderUnits(props.isNew ? result.shortfallUnits : 0);
    // Structured per-category + over-allocation warnings from the shared policy
    // (AC-AL2/AL3). Shortfall is surfaced separately as the placeholder notice,
    // so it is excluded here (reportShortfall:false).
    setWarnings(
      warningMessages(
        deriveIssueWarnings(result, { reportShortfall: false }),
        units
      )
    );
    setDirty(true);
    // The allocation just changed — any earlier zero-allocation / unsaved-VVM
    // confirmation no longer applies (spec S4 § save; it must be re-earned
    // against the current quantity, e.g. after raising it back above zero).
    setZeroConfirm(false);
    setVvmConfirm(false);
  };

  // NumberField hands us a committed number (already numeric-only and clamped
  // to min 0 — negatives and non-numeric input never reach here) or undefined
  // when the field is cleared.
  const onIssueChange = (value: number | undefined) => {
    setIssueValue(value);
    const units = lensToUnits(value ?? null, allocateIn());
    // Clearing (or blanking) the Issue field distributes 0 — resetting every
    // batch's packs and the placeholder, not leaving the last distribution
    // behind.
    distribute(units ?? 0);
  };

  // Direct per-batch edit (OMS-REG-DIST-03.19/AC-AL6): whole packs — a
  // fractional entry rounds UP, an entry beyond availability clamps DOWN to the
  // whole-pack floor (rules.md § whole-pack arithmetic). An adjusted entry is
  // reported (AC-AL13), and any earlier distribution banners are REPLACED —
  // they describe an allocation this edit just changed.
  const setPacks = (id: string, value: number | null) => {
    const index = draft.findIndex(line => line.id === id);
    if (index < 0) return;
    const line = draft[index]!;
    // Under the doses lens the cell's entry IS doses (the old app's issue()
    // with AllocateInType.Doses): convert through the line's doses-per-unit
    // before the shared whole-pack clamp, and report any adjustment in the
    // entered doses too.
    const inDoses = dosesView();
    const requestedPacks =
      inDoses && value != null
        ? dosesToPacks(value, line.packSize, line.dosesPerUnit)
        : value;
    const applied = clampManualPacks(requestedPacks, line.availablePacks);
    setDraft(index, 'numberOfPacks', applied);
    const appliedQuantity = inDoses
      ? packsToDoses(applied, line.packSize, line.dosesPerUnit)
      : applied;
    setWarnings(
      value != null && appliedQuantity !== value
        ? [
            t('messages.over-allocated-line', {
              quantity: formatNumber(appliedQuantity),
              issueQuantity: formatNumber(value),
            }),
          ]
        : []
    );
    setDirty(true);
    // As in distribute() — a direct per-batch edit also invalidates a stale
    // zero-allocation / unsaved-VVM confirmation.
    setZeroConfirm(false);
    setVvmConfirm(false);
  };

  // The received count (OMS-REG-DIST-03.21): the packs the destination
  // reported for this batch row — blank (null) until recorded, clearable back
  // to blank. The Difference column derives from it in place; nothing
  // re-distributes.
  const setReceived = (id: string, value: number | null) => {
    const index = draft.findIndex(line => line.id === id);
    if (index < 0) return;
    setDraft(index, 'receivedNumberOfPacks', value);
    setDirty(true);
  };

  // VVM status per batch (spec S4 § batch grid): the save writes the picked
  // status onto the BATCH itself — the stock line, with a status-log entry —
  // not just this shipment line (contract § issuing lines). An UNUSABLE pick
  // zeroes the row's issued packs (unusable stock is never issued —
  // stock-allocation § barred batches); the live bar then disables the row,
  // as in the old app.
  const setVvmStatus = (id: string, status: VvmStatus | null) => {
    const index = draft.findIndex(line => line.id === id);
    if (index < 0) return;
    setDraft(index, 'vvmStatus', status);
    if (status?.unusable) setDraft(index, 'numberOfPacks', 0);
    setDirty(true);
    // As in distribute()/setPacks() — the confirmations are re-earned against
    // the changed draft.
    setZeroConfirm(false);
    setVvmConfirm(false);
  };

  const save = async (): Promise<boolean> => {
    const current = item();
    if (!current) return false;
    setSaving(true);
    setErrorMessage(undefined);
    const result = await graphqlFetch(
      SaveOutboundItemLines,
      {
        storeId: props.storeId,
        input: {
          invoiceId: props.invoiceId,
          itemId: current.id,
          // The full set, zeros included — the item-set save replaces the
          // item's lines (zero packs removes an existing line), and the
          // explicit placeholder quantity creates/updates/deletes the
          // placeholder to match (OMS-REG-DIST-03.20). Received counts and
          // variance reasons are echoed through (see ./saveLineInputs).
          lines: toSaveLineInputs(draft),
          placeholderQuantity: placeholderUnits(),
        },
      },
      // Wire trap (contract § issuing lines): saveOutboundShipmentItemLines
      // has NO typed errors — everything arrives as a plain GraphQL error.
      { returnGraphqlErrors: true }
    );
    setSaving(false);
    if (result.kind === 'graphqlError') {
      setErrorMessage(t('error.cant-save'));
      return false;
    }
    if (result.kind !== 'success') return false;
    props.onCommitted();
    return true;
  };

  // Save guards (spec S4 § save), in the old app's precedence: a zero-packs
  // line whose VVM status changed warns FIRST — the set-save deletes
  // zero-pack lines, so that status change is silently dropped (a second OK
  // proceeds without it). The zero-allocation confirmation applies only when
  // no such VVM change is pending.
  const vvmChangeOnZeroPacksLine = () =>
    draft.some(
      line =>
        line.numberOfPacks === 0 &&
        (line.vvmStatus?.id ?? null) !== (seededVvmIdById.get(line.id) ?? null)
    );
  const confirmThen = (proceed: () => void) => {
    if (vvmChangeOnZeroPacksLine()) {
      if (!vvmConfirm()) {
        setVvmConfirm(true);
        return;
      }
    } else if (
      issuedUnits() === 0 &&
      placeholderUnits() === 0 &&
      !zeroConfirm()
    ) {
      setZeroConfirm(true);
      return;
    }
    proceed();
  };

  const onOk = () =>
    confirmThen(() => {
      void save().then(ok => {
        if (ok) props.onClose();
      });
    });

  // OK & next (spec S4, OMS-REG-DIST-03.32): save, then continue rapid entry —
  // never a dead end (matching the stocktake / inbound editors, so never
  // disabled):
  // - UPDATE mode: ask the parent for the next item in its sorted/paginated
  //   order (the covered set guards repeats) and seed it in place; when the
  //   walk is exhausted, drop into add mode (empty, picker focused). An
  //   unchanged item pages on WITHOUT a redundant save (outbound gates saves
  //   on a real change).
  // - ADD mode: reopen empty for rapid entry of the next item.
  // A failed save aborts the advance with the editor unchanged.
  // A walk advance in flight: gates the button (a double-click must not
  // start two concurrent walks — overlapping page advances and covered-set
  // writes) and survives in the button's loading face. `disposed` stops the
  // tail of an advance whose modal was closed mid-walk (the parent's walk
  // also aborts its own paging via its `aborted` dep).
  const [advancing, setAdvancing] = createSignal(false);
  let disposed = false;
  onCleanup(() => (disposed = true));
  const advance = async (currentId: string) => {
    if (advancing()) return;
    setAdvancing(true);
    try {
      const next = await props.nextItem(currentId, coveredItemIds);
      if (disposed) return;
      if (next) await seedItem(next);
      else backToSearch(); // exhausted → add mode
    } finally {
      setAdvancing(false);
    }
  };
  const onOkNext = () => {
    if (advancing()) return;
    const current = item();
    // Nothing changed → no redundant save (outbound gates saves on a real
    // change): update mode pages on, add mode just returns to the picker.
    if (current && !dirty()) {
      if (mode() === 'update') void advance(current.id);
      else backToSearch();
      return;
    }
    confirmThen(() => {
      void (async () => {
        if (!(await save())) return;
        if (mode() === 'add' || !current) {
          backToSearch();
          return;
        }
        await advance(current.id);
      })();
    });
  };

  const updateMode = () => mode() === 'update';

  // Working-size latch (#771): open small in add mode (just the search), grow
  // ONCE when the first item is picked, and never shrink back — clearing the
  // item or "OK & next" returning to the search keeps the working size, so the
  // add loop doesn't pulse. Update mode opens straight at the working size.
  const workingSize = createMemo<boolean>(
    prev => prev || updateMode() || item() !== undefined,
    false
  );

  const columns = (): Column<DraftLine, never, GroupKey>[] => [
    {
      // "Will be used in auto-allocation": the AUTO-fillable predicate
      // (unconditional expired/VVM exclusion + pack-size match under the
      // packs lens) — matches the old app's canAutoAllocate CheckCell;
      // hovering the tick shows the reason. Issue-barred rows are
      // additionally dimmed (rowState).
      //
      // Derived cells (this tick, {unit} issued, Difference) compute from the
      // draft store IN the cell render, never via a column accessor: TanStack
      // caches accessor values per row-model build, and per-batch edits
      // mutate rows in place without a rebuild — an accessor-computed cell
      // freezes at its first value.
      c: { id: 'canAllocate' },
      // getSize() is a min-width floor (auto layout) — without this the
      // header-less tick column gets the default and reads as a gap. Authored
      // in rem like the shared column config, converted for TanStack.
      size: remToPx(2.25),
      header: () => '',
      // Blank in the grid, but NAMED in the Columns popover (the old app's
      // header-string / empty-Header split). On a CARD it's a header badge, not
      // a body field: a bare marker with no label of its own.
      meta: {
        headerPosition: 'badge',
        columnSettingsLabel: () => t('description.used-in-auto-allocation'),
      },
      cell: info => (
        <Show when={willAutoAllocate(info.row.original)}>
          <Popover
            // data-flag/-label: bare check in the grid; on a card badge the
            // label shows beside it, or this tick and the On-hold flag read
            // as the same anonymous check (see DataTable.module.css § flag
            // cells).
            trigger={
              <span data-flag data-flag-tone="success">
                <CheckIcon />
                <span data-flag-label aria-hidden="true">
                  {t('description.used-in-auto-allocation')}
                </span>
              </span>
            }
            triggerLabel={t('description.used-in-auto-allocation')}
            openOnHover
            placement="top"
          >
            <p>{t('description.used-in-auto-allocation')}</p>
          </Popover>
        </Show>
      ),
    },
    {
      c: { key: 'batch' },
      header: () => t('label.batch'),
      // The card's identity field, captioned "Batch" — a header field is
      // unlabelled by default, so opt the label in. Structural (the card
      // identity), so keep it out of the Columns popover. Read-only here, unlike
      // the inbound editor's typed batch code: an outbound line issues from an
      // EXISTING stock batch, so the code is the batch's, not the user's.
      //
      // The meta rides as getCellDefinition's second argument, NOT a sibling
      // `meta:` key — the spread returns its own `meta` and would overwrite one
      // declared beside it (which is exactly how this card lost its header).
      ...getCellDefinition('batch', {
        headerPosition: 'primary',
        showLabel: true,
        hideFromColumnSettings: true,
      }),
      // A batch backed by an ITEM VARIANT carries an info marker beside its
      // name — click reveals the item's variants with this batch's marked
      // (spec S4 § batch grid), matching the old app's variant-info icon.
      cell: info => {
        const line = info.row.original;
        return (
          <span class={styles.batchCell}>
            {line.batch ?? '—'}
            <Show when={line.itemVariantId}>
              {variantId => (
                <Popover
                  trigger={<InfoIcon />}
                  triggerLabel={t('label.item-variant')}
                  triggerClass={styles.variantInfoTrigger}
                  class={styles.variantPanel}
                >
                  <VariantInfoTable
                    variants={variants()}
                    selectedId={variantId()}
                    isVaccine={!!item()?.isVaccine}
                  />
                </Popover>
              )}
            </Show>
          </span>
        );
      },
    },
    {
      c: { key: 'expiryDate' },
      header: () => t('label.expiry-date'),
      cardGroup: 'batch',
      ...getCellDefinition('expiryDate'),
    },
    // Vaccine items only, under either VVM preference (spec § S4 batch grid;
    // only vaccine stock carries a VVM status). An EDITABLE status picker —
    // unlike the prescriptions editor's read-only text — disabled on the same
    // rows as the Packs-issued cell; the value lives in the draft store, read
    // in the cell render (an accessor-computed cell freezes on in-place store
    // edits — see the canAllocate note above).
    ...(item()?.isVaccine &&
    (prefs().manageVvmStatusForStock || prefs().sortByVvmStatusThenExpiry)
      ? [
          {
            c: { id: 'vvmStatus' },
            header: () => t('label.vvm-status'),
            cardGroup: 'batch',
            // An editable picker, so wider than the read-only vvmStatus preset.
            size: remToPx(10.625),
            cell: info => {
              const line = info.row.original;
              return (
                <VvmStatusSelect
                  label={t('label.vvm-status')}
                  hideLabel
                  size="small"
                  disabled={rowDisabled(line)}
                  value={line.vvmStatus?.id}
                  onChange={status => setVvmStatus(line.id, status)}
                />
              );
            },
          } satisfies Column<DraftLine, never, GroupKey>,
        ]
      : []),
    {
      c: {
        accessor: line => line.campaign?.name ?? line.program?.name ?? '',
        id: 'campaign',
      },
      // Wide enough that the two-word header doesn't wrap mid-word.
      size: remToPx(12.5),
      header: () => t('label.campaign'),
      cardGroup: 'other',
    },
    {
      c: { accessor: line => line.location?.code ?? '', id: 'location' },
      header: () => t('label.location'),
      cardGroup: 'batch',
      ...getCellDefinition('location'),
    },
    ...(prefs().allowTrackingOfStockByDonor
      ? [
          {
            c: {
              accessor: (line: DraftLine) => line.donor?.name ?? '',
              id: 'donor',
            },
            header: () => t('label.donor'),
            cardGroup: 'other',
            // No CELL_DEF key — a donor name is free text like a manufacturer.
            ...getCellDefinition('manufacturer'),
          } satisfies Column<DraftLine, never, GroupKey>,
        ]
      : []),
    {
      c: {
        accessor: line => line.manufacturer?.name ?? '',
        id: 'manufacturer',
      },
      header: () => t('label.manufacturer'),
      cardGroup: 'other',
      ...getCellDefinition('manufacturer'),
    },
    {
      c: { key: 'sellPricePerPack' },
      header: () => t('label.pack-sell-price'),
      cardGroup: 'pricing',
      ...getCellDefinition('sellPricePerPack'),
    },
    // Foreign-currency pack price (old-app parity): external customers under
    // the issue-in-foreign-currency store preference — the home price
    // re-expressed at the shipment's currency rate (the side panel's
    // foreign-currency block), formatted in that currency. Blank while the
    // shipment has no currency set. Static per row, so an accessor is safe.
    ...(!props.customerIsStore && prefs().issueInForeignCurrency
      ? [
          {
            c: {
              accessor: (line: DraftLine) =>
                line.sellPricePerPack / (props.currencyRate || 1),
              id: 'foreignCurrencySellPricePerPack',
            },
            header: () => t('label.fc-sell-price'),
            cardGroup: 'pricing',
            meta: { align: 'right' },
            cell: info =>
              props.currencyCode
                ? formatNumber(info.getValue<number>(), {
                    style: 'currency',
                    currency: props.currencyCode,
                    currencyDisplay: 'narrowSymbol',
                    // formatNumber's max-digits default (10) beats Intl's own
                    // currency default of 2 — state both, as
                    // formatCurrencyCell does.
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '',
            size: remToPx(9),
          } satisfies Column<DraftLine, never, GroupKey>,
        ]
      : []),
    {
      c: { key: 'packSize' },
      header: () => t('label.pack-size'),
      cardGroup: 'batch',
      ...getCellDefinition('packSize'),
    },
    // Doses-per-unit context, under the DOSES lens only (the old app's
    // includeColumn: dosesView — the preference alone previously showed it
    // for non-vaccine items too). The header names the unit.
    ...(dosesView()
      ? [
          {
            c: { key: 'dosesPerUnit' },
            header: () => t('label.doses-per-unit-name', { unit: unitName() }),
            cardGroup: 'batch',
            ...getCellDefinition('dosesPerUnit'),
          } satisfies Column<DraftLine, never, GroupKey>,
        ]
      : []),
    {
      // In-store stock — re-expressed in doses under the doses lens (old-app
      // parity). Static per row, so an accessor is safe: a lens flip rebuilds
      // the whole column set (columns() reads the lens), unlike the in-place
      // per-batch edits the canAllocate note covers.
      c: {
        accessor: line =>
          dosesView()
            ? packsToDoses(line.inStorePacks, line.packSize, line.dosesPerUnit)
            : line.inStorePacks,
        id: 'inStorePacks',
      },
      header: () =>
        dosesView() ? t('label.in-store-doses') : t('label.in-store'),
      cardGroup: 'batch',
      ...getNumberCell(),
      // No CELL_DEF key — "In store (doses)" is the binding constraint.
      size: remToPx(7),
    },
    {
      // Allocatable stock — an ON-HOLD batch (stock line or location) shows 0
      // (old-app parity: nothing here may be issued); doses under the doses
      // lens.
      c: {
        accessor: line => {
          if (line.stockLineOnHold || line.location?.onHold) return 0;
          return dosesView()
            ? packsToDoses(
                line.availablePacks,
                line.packSize,
                line.dosesPerUnit
              )
            : line.availablePacks;
        },
        id: 'availablePacks',
      },
      header: () =>
        dosesView()
          ? t('label.available-doses')
          : t('label.available-in-packs'),
      cardGroup: 'batch',
      ...getCellDefinition('availablePacks'),
    },
    {
      // Packs issued from this batch (OMS-REG-DIST-03.19), bounded 0…available —
      // shown and ENTERED in doses under the doses lens (old-app parity;
      // setPacks converts through the line's doses-per-unit).
      c: { key: 'numberOfPacks' },
      header: () =>
        dosesView() ? t('label.doses-issued') : t('label.pack-quantity-issued'),
      cardGroup: 'batch',
      // The preset's width + right alignment; the editable cell overrides its
      // renderer below. "Pack quantity issued" needs more than the key's width.
      ...getCellDefinition('numberOfPacks'),
      size: remToPx(8),
      cell: info => {
        const line = info.row.original;
        const label = dosesView()
          ? t('label.doses-issued')
          : t('label.pack-quantity-issued');
        return (
          <NumberField
            ref={batchFields.ref(line.id)}
            label={label}
            hideLabel
            size="small"
            min={0}
            max={
              dosesView()
                ? packsToDoses(
                    line.availablePacks,
                    line.packSize,
                    line.dosesPerUnit
                  )
                : line.availablePacks
            }
            decimalLimit={2}
            disabled={rowDisabled(line)}
            value={
              (dosesView()
                ? packsToDoses(
                    line.numberOfPacks,
                    line.packSize,
                    line.dosesPerUnit
                  )
                : line.numberOfPacks) || undefined
            }
            onChange={value => setPacks(line.id, value ?? null)}
          />
        );
      },
    },
    {
      c: { id: 'unitsIssued' },
      // "Vials issued" — the unit pluralised as a category (old-app parity).
      // Under the doses lens the helpful counterpart flips to PACKS issued.
      header: () =>
        dosesView()
          ? t('label.pack-quantity-issued')
          : t('label.units-issued', { unit: getPlural(unitName(), 2) }),
      cardGroup: 'batch',
      meta: { align: 'right' },
      // No CELL_DEF key — the "{unit} issued" header is the binding constraint.
      size: remToPx(8),
      cell: info => {
        const line = info.row.original;
        return (
          <>
            {formatNumber(
              dosesView()
                ? line.numberOfPacks
                : line.numberOfPacks * line.packSize,
              { maximumFractionDigits: 2 }
            )}
          </>
        );
      },
    },
    // Received count + derived difference (OMS-REG-DIST-03.21) — non-store
    // customers only (a transfer's counts mirror back from the receiving side).
    // Blank until the destination's count is recorded; disabled on the same
    // rows the Packs-issued cell is.
    ...(props.customerIsStore
      ? []
      : [
          {
            c: { key: 'receivedNumberOfPacks' },
            header: () => t('label.packs-received'),
            cardGroup: 'other',
            ...getCellDefinition('receivedNumberOfPacks'),
            cell: info => {
              const line = info.row.original;
              return (
                <NumberField
                  label={t('label.packs-received')}
                  hideLabel
                  size="small"
                  min={0}
                  decimalLimit={2}
                  disabled={rowDisabled(line)}
                  value={line.receivedNumberOfPacks ?? undefined}
                  onChange={value => setReceived(line.id, value ?? null)}
                />
              );
            },
          } satisfies Column<DraftLine, never, GroupKey>,
          {
            c: { id: 'difference' },
            header: () => t('label.difference'),
            cardGroup: 'other',
            ...getCellDefinition('difference'),
            cell: info => {
              const line = info.row.original;
              return (
                <>
                  {/* Displayed to 2 dp (the old app's number-cell default) —
                      the raw subtraction carries float dust (2.34 − 3). */}
                  {line.receivedNumberOfPacks == null
                    ? ''
                    : formatNumber(
                        line.receivedNumberOfPacks - line.numberOfPacks,
                        { maximumFractionDigits: 2 }
                      )}
                </>
              );
            },
          } satisfies Column<DraftLine, never, GroupKey>,
        ]),
    {
      // Volume this batch's issue occupies (old-app parity): volume-per-pack
      // × packs issued. Computed in the CELL render — numberOfPacks mutates
      // in place (see the canAllocate note above).
      c: { id: 'volume' },
      header: () => t('label.volume'),
      cardGroup: 'other',
      meta: { align: 'right' },
      // No CELL_DEF key — the "Volume (m³)" header is the binding constraint.
      size: remToPx(6),
      cell: info => {
        const line = info.row.original;
        return (
          <>
            {formatNumber((line.volumePerPack ?? 0) * line.numberOfPacks, {
              maximumFractionDigits: 2,
            })}
          </>
        );
      },
    },
    {
      // On-hold flag (the stock line or its location) — the row is already
      // disabled and its Available shows 0; the check names WHY (old-app
      // parity).
      c: {
        accessor: line => line.stockLineOnHold || !!line.location?.onHold,
        id: 'onHold',
      },
      header: () => t('label.on-hold'),
      // A row-level status flag — the card's badge slot, like the inbound
      // editor's own status badge.
      ...getFlagCell(
        t('label.on-hold'),
        { headerPosition: 'badge' },
        'warning'
      ),
    },
    {
      // Expired flag, CARD-ONLY (D111): the grid already reddens the Expiry
      // date cell under its header, but a card buries that in the body — the
      // badge puts the word in the card corner, with the row's error tone.
      c: { accessor: lineExpired, id: 'expired' },
      header: () => t('label.expired'),
      ...getFlagCell(
        t('label.expired'),
        {
          headerPosition: 'badge',
          hideOnTable: true,
          hideFromColumnSettings: true,
        },
        'error'
      ),
    },
  ];

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size={workingSize() ? 'full' : 'auto'}
      // `full`, not `large`: this line table is 20 columns wide, so there is
      // no card width that fits it. #771's "~900px if the tables fit" does
      // NOT fit here — narrowing only pushes columns out of view, and the
      // empty space it was filed against is VERTICAL, which the workbench's
      // 60-80vh height band already answers. Recorded as a deliberate
      // deviation from the 900px modal standard in the DESIGN_STANDARDS
      // ledger.
      //
      // widthRem sizes the PRE-PICK state only (it is inert at `full`): a
      // command-palette-shaped card at the standard create-modal width (the
      // CreateStocktake/CreateInternalOrder family), with a body tall enough to
      // OWN the open suggestions list — the search takes initial focus and the
      // combobox opens on focus, so the list is this state's resting face, and
      // without the reserved height it would dangle past the card onto the
      // scrim. The popup itself matches its trigger's width. The reserved
      // height is likewise dropped once the latch flips — the body flexes to
      // fill the tall box instead.
      widthRem={44}
      minBodyHeightRem={28}
      testId="add-item-modal"
      // The heading stays the dialog's accessible name but paints nothing: as a
      // visible row it spent ~2.5rem of a modal whose working area is the batch
      // grid, restating a mode the header panel and footer buttons already carry.
      // The sibling line editors already read this way — requisitions and
      // internal orders hide theirs too, and inbound's / stocktakes' title slot
      // is the item selector itself, so none of them paints a text heading (#872).
      title={updateMode() ? t('heading.edit-line') : t('button.add-item')}
      titleHidden
      actionsLead={
        // The footer's message slot, sharing the buttons' row rather than
        // spending one of its own. It states the consequence of Save — the
        // running total and any placeholder — and yields to a save rejection
        // while there is one, which is the more urgent thing to read (#872).
        <Show
          when={errorMessage()}
          fallback={
            <Show when={item()}>
              <HStack gap="md">
                <span>
                  {t('label.placeholder')}: {formatNumber(placeholderUnits())}
                </span>
                <span>
                  {t('label.total-units')}:{' '}
                  {formatNumber(issuedUnits() + placeholderUnits())}
                </span>
              </HStack>
            </Show>
          }
        >
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
      }
      actions={
        <>
          <CancelButton
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          />
          <DialogSaveButton
            data-testid="dialog-button-ok"
            disabled={!item() || !dirty()}
            loading={saving()}
            onClick={onOk}
          />
          {/* Save & next (spec S4 § footer button matrix) — never disabled,
              like the stocktake / inbound editors:
               · add mode    — HIDDEN until the item carries a NON-ZERO
                 quantity (seeded from an existing allocation, or entered);
                 then saves any change + returns to the picker to add
                 another. A zero quantity keeps it hidden.
               · update mode — SHOWN throughout; saves any change, then
                 advances the parent-owned walk, or drops into add mode once
                 it is exhausted.
              Save stays visible-but-disabled as the always-discoverable
              confirm. */}
          <Show
            when={
              mode() === 'update'
                ? item()
                : item() && issuedUnits() + placeholderUnits() > 0
            }
          >
            <SaveAndNextButton
              data-testid="dialog-button-next-and-ok"
              // loadingLines too (the stocktake editor's busy()), and the
              // walk itself (advancing): the page-through is a fetch, so the
              // button must not accept clicks while one is in flight.
              loading={saving() || loadingLines() || advancing()}
              onClick={onOkNext}
            />
          </Show>
        </>
      }
    >
      {/* The header row (spec S4, D76): Item picker · Issue + Allocate-in ·
          Available · placeholder notice on ONE wrapping flex row — each piece
          drops to its own row as space runs out (see the module CSS). The
          registry's inset grouping panel holds them, so the cluster reads as one
          thing the modal acts on rather than four controls loose against the
          panel (#872). */}
      <InsetPanel class={styles.headerPanel}>
        <div class={styles.headerRow}>
          {/* The shared server-searched item lookup (spec S4 — the registry's
            async catalogue-lookup; no client-side cached cap), locked in
            update mode. `selectedItem` labels the current value when it isn't
            in the search's own paginated results (a row-click open / walk
            advance). Clearing (×) returns to the empty search state — like an
            add-mode item switch, unsaved edits are discarded (OMS-REG-DIST-03.33). */}
          <div class={styles.itemField}>
            <ItemSearch
              label={t('label.item')}
              storeId={props.storeId}
              disabled={updateMode() || saving()}
              focusTarget={itemSearch}
              value={item()?.id}
              selectedItem={item()}
              placeholder={t('placeholder.enter-an-item-code-or-name')}
              onSelect={option => {
                if (option)
                  void seedItem({
                    id: option.id,
                    code: option.code,
                    name: option.name,
                    unitName: option.unitName,
                    isVaccine: option.isVaccine,
                    doses: option.doses,
                  });
                else backToSearch();
              }}
            />
          </div>
          <Show when={item()}>
            {/* Issue + Allocate-in wrap as a unit. Both controls at the default
              height — NumberField's "small" (2.25rem) and Select's "sm"
              (1.75rem — the Pagination scale) don't align with each other. */}
            <div class={styles.issueGroup}>
              <NumberField
                label={t('label.issue')}
                min={0}
                data-testid="issue-quantity-input"
                ref={issueField.ref}
                value={issueValue()}
                disabled={saving()}
                onChange={onIssueChange}
              />
              <Select
                label={t('label.units')}
                value={allocateInValue()}
                options={[
                  // The unit option reads as a category — always plural
                  // ("Vials"), the old app's getPlural(unit, 2).
                  { value: 'units', label: getPlural(unitName(), 2) },
                  // The doses lens (AC-AL7): vaccine items under the
                  // manage-vaccines-in-doses preference only.
                  ...(prefs().manageVaccinesInDoses && item()?.isVaccine
                    ? [{ value: 'doses', label: t('label.doses') }]
                    : []),
                  ...distinctPackSizes().map(size => ({
                    value: `packs-${size}`,
                    label: t('label.packs-of-pack-size', { packSize: size }),
                  })),
                ]}
                onValueChange={value => {
                  const next: AllocateUnit =
                    value === 'units'
                      ? { kind: 'units' }
                      : value === 'doses'
                        ? { kind: 'doses', dosesPerUnit: item()?.doses ?? 1 }
                        : { kind: 'packs', size: Number(value.slice(6)) };
                  switchLensTo(next);
                }}
              />
            </div>
            {/* Available follows the two inputs, as the figure they're judged
              against rather than a preamble to them — set off by a hairline and
              presented as a labelled value so its label reads exactly like
              Issue's and Units' (the registry's read-only labelled value at
              variant="field": read-only reads from the ABSENCE of an input box,
              never from a different label treatment). #872, Ling's mockup. */}
            <div class={styles.availableStat}>
              <LabelledValue label={t('label.available')} variant="field">
                {/* The value takes an input's height so this label lands on the
                    same line as Issue's and Units': a labelled value is shorter
                    than a labelled input, and the row's end-alignment would
                    otherwise drop its label below theirs. */}
                <span class={styles.availableValue}>
                  {/* Unit name pluralised to the count (old-app parity —
                      English only; getPlural passes other languages through). */}
                  {formatNumber(availableUnits())}{' '}
                  {getPlural(unitName(), availableUnits())}
                </span>
              </LabelledValue>
            </div>
            {/* Placeholder notice (info) — fills the rest of the header row,
              matching the old app; shown when a shortfall became a placeholder. */}
            <Show when={placeholderUnits() > 0}>
              <div class={styles.placeholderNotice}>
                <Alert severity="info">
                  {t('messages.placeholder-allocated-units', {
                    requestedQuantity: formatNumber(
                      issuedUnits() + placeholderUnits()
                    ),
                    placeholderQuantity: formatNumber(placeholderUnits()),
                  })}
                </Alert>
              </div>
            </Show>
          </Show>
        </div>
      </InsetPanel>

      {/* The grid + footer + banners keep their own item gate — the header
          row above renders its picker item-less in add mode. Before a pick, a
          centred prompt says what the empty body is waiting for (as the
          stocktake editor's, #884) rather than leaving the modal blank. */}
      <Show
        when={item()}
        fallback={
          <EmptyState
            graphic={false}
            message={t('messages.select-item-to-issue')}
          />
        }
      >
        {/* Batch grid: one row per available batch, FEFO-ordered; barred rows
            disabled (AC-AL2 / AC-AL8). */}
        <div class={styles.batchGrid}>
          <DataTable
            columns={columns()}
            rows={draftRows()}
            rowKey={line => line.id}
            loading={loadingLines()}
            cardGroups={CARD_GROUPS}
            showCardToggle
            showFullScreen={false}
            rowState={line => (rowDisabled(line) ? 'disabled' : undefined)}
            // Row-STATUS background tints (OMS-REG-DIST-03.37–.39, D110):
            // a batch with packs issued tints green (allocated — even when
            // expired/held: it is already in the shipment, and the warning
            // banners cover the fact); otherwise expired red, then held
            // amber. The tint shows through the disabled grey (the status
            // is why the row is disabled); the flag badges and the bold
            // red expiry cell carry the words. Reads numberOfPacks from
            // the draft store in the prop function, so per-batch edits
            // reflow the tint live.
            rowTint={line =>
              line.numberOfPacks > 0
                ? 'success'
                : lineExpired(line)
                  ? 'error'
                  : line.stockLineOnHold || line.location?.onHold
                    ? 'warning'
                    : undefined
            }
            // Cards keep the held/expired treatment (title + border + badge
            // — D110/D111).
            cardTone={line =>
              line.stockLineOnHold || line.location?.onHold
                ? 'warning'
                : lineExpired(line)
                  ? 'error'
                  : undefined
            }
            emptyMessage={t('messages.no-stock-available')}
            config={tableConfig.config()}
            setConfig={tableConfig.setConfig}
          />
        </div>

        {/* Everything below the grid shares one vertical rhythm — the Stack's
            gap replaces the per-block margins. The running total that used to
            lead this stack now rides the footer's message slot. */}
        <Stack gap="sm">
          {/* Stacked warning banners (spec S4 § warnings). */}
          <For each={warnings()}>
            {message => <Alert severity="warning">{message}</Alert>}
          </For>

          {/* Zero-allocation second confirmation (spec S4 § save). */}
          <Show when={zeroConfirm()}>
            <Alert severity="info">{t('messages.confirm-zero-quantity')}</Alert>
          </Show>

          {/* A zero-packs line's VVM change won't survive the save — its own
              distinct confirmation, taking precedence (spec S4 § save). */}
          <Show when={vvmConfirm()}>
            <Alert severity="warning">
              {t('messages.unsaved-outbound-vvm-status')}
            </Alert>
          </Show>
        </Stack>
      </Show>
    </Dialog>
  );
};

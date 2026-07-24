import {
  createEffect,
  createMemo,
  createSignal,
  onMount,
  Show,
  type JSX,
} from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import { formatNumber } from '../../../../intl/formatNumber';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Popover } from '../../../../ui/elements/feedback/Popover';
import {
  CancelButton,
  DialogSaveButton,
  SaveAndNextButton,
} from '../../../../ui/elements/buttons/StandardButtons';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { Combobox } from '../../../../ui/elements/selectors/Combobox';
import { Select } from '../../../../ui/elements/selectors/Select';
import styles from './OutboundLineEditModal.module.css';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import {
  getExpiryDateCell,
  getNumberCell,
  getCurrencyCell,
} from '../../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../../api/createTableConfig';
import { CheckIcon } from '../../../../ui/icons';
import {
  DraftStockOutLines,
  SaveOutboundItemLines,
  type DraftStockOutLinesResult,
} from './outboundLineEdit.generated';
import { itemOptionsResource, type ItemOption } from './itemOptionsResource';
import {
  availableUnits as sumAvailableUnits,
  autoAllocateBarReasons,
  barReasons,
  deriveIssueWarnings,
  distributeIssue,
  fillOrderCompare,
  lensToUnits,
  unitsToLens,
  type AllocateUnit,
  type AllocationPreferences,
  type IssueWarning,
} from '../../../../domain/allocation';
import { outboundPrefs } from '../../outboundPreferencesResource';
import { issueWarningMessages } from './allocationWarnings';

// The line editor (spec S4): the SINGLE surface for issuing an item — set the
// quantity to issue and distribute it across batches. The batch grid is the
// server-computed draft (draftStockOutLines: one row per batch with
// available/in-store packs + the item's existing lines pre-filled); entry in
// the Issue field auto-distributes FEFO client-side (AC-AL1's manual-entry
// face), per-batch packs are directly editable bounded 0…available (AC-I5),
// and quantity beyond available becomes the placeholder while NEW (AC-P1/P3).
// Save is the item-set save (saveOutboundShipmentItemLines, AC-I6): lines +
// placeholder in one call; every rejection is a non-typed GraphQL error
// (contract wire trap) surfaced in the footer.
//
// Two modes (spec S4, AC-V6..V8): 'update' (opened from a row — the picker
// locks, the clicked batch is scrolled into view + focused, and "OK & next"
// walks the parent's sorted/paginated line list via the parent-owned
// nextItem) and 'add' ("Add item", or fallen into when the walk runs out —
// the picker is active + focused, and "OK & next" reopens empty). The picker
// shows EVERY item — items already on the shipment are NOT excluded; picking
// one loads its existing allocation (the draft pre-fills existing lines).

type DraftLine =
  DraftStockOutLinesResult['draftStockOutLines']['draftLines'][number];

export type LineEditItem = {
  id: string;
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
   * into view and focuses its packs input (AC-V6; draft rows built from
   * existing lines keep the invoice-line id). Omitted for "Add item"; a
   * clicked placeholder row has no batch row, so the Issue field is focused.
   */
  initialLineId?: string;
  /**
   * UPDATE mode "OK & next": resolve the next item to edit (parent-owned;
   * pages the detail table forward as needed). See ResolveNextItem.
   */
  nextItem: ResolveNextItem;
  /**
   * Whether the shipment's customer is itself a store (a transfer). Non-store
   * (external) customers additionally get the received-packs / difference columns.
   */
  customerIsStore: boolean;
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
  // What to focus once the next draft finishes loading (see the focus
  // effect): a batch row's packs input (row-click open / walk advance), or
  // the add-mode item search. Consumed (cleared) by the effect.
  const [pendingFocus, setPendingFocus] = createSignal<
    { row: string | undefined } | 'itemSelector' | undefined
  >();
  const [draft, setDraft] = createStore<DraftLine[]>([]);
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
  // Warnings raised by the last distribution (spec S4 § warnings).
  const [warnings, setWarnings] = createSignal<string[]>([]);
  // Dirty gate: OK is disabled until something changed (matches the e2e
  // expectation that OK saves a real change).
  const [dirty, setDirty] = createSignal(false);

  const tableConfig = createTableConfig({ tableId: 'outbound-line-edit' });
  const prefs = () => outboundPrefs()?.prefs;

  // Seed one item's draft (server-computed: existing lines + available
  // batches + placeholder). The ONE seed path — sequential imperative fetch,
  // not a resource (issue #428's "do things sequential"): on mount (update
  // mode), on item pick (add mode), and on an "OK & next" advance.
  // `focusLineId` is the clicked batch to scroll/focus once loaded (AC-V6);
  // omitted → the first batch row (an advance), undefined row → Issue field.
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
    // allocate's ordering.
    const sorted = [...data.draftLines].sort((a, b) =>
      fillOrderCompare(a, b, allocationPrefs())
    );
    setDraft(reconcile(sorted, { key: 'id' }));
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
    // Land ready to type: in update mode the clicked batch's packs input
    // (draft rows from existing lines keep the invoice-line id) or the first
    // row on an advance; after an add-mode pick, the Issue field (the
    // undefined row falls back to it).
    setPendingFocus(
      mode() === 'update'
        ? { row: focusLineId ?? sorted[0]?.id }
        : { row: undefined }
    );
    setLoadingLines(false);

    // Auto-allocate on open (AC-A5): a NEW shipment's *pure* placeholder — an
    // item carrying a requested quantity with nothing yet allocated — is
    // distributed against available stock the moment the editor opens, the
    // same FEFO run the Issue field performs (seeded with the requested
    // quantity), leaving the placeholder holding any remainder. A notice
    // shows only if stock was actually placed. Requisition-sourced and
    // manual-shortfall placeholders carry a quantity; master-list
    // placeholders are zero, so this no-ops for them. An item with stock
    // already allocated is left untouched.
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
    setLoadingLines(false);
    setPendingFocus('itemSelector');
  };

  onMount(() => {
    if (props.initialItem)
      void seedItem(props.initialItem, props.initialLineId);
    else setPendingFocus('itemSelector');
  });

  // Move focus once the target is in the DOM: the item search in add mode,
  // else the requested batch row (scrolled into view, its packs input
  // focused); a clicked PLACEHOLDER row has no batch row — fall back to the
  // Issue field (AC-V6). Runs after the load so the row exists; deferred a
  // frame so the table has painted.
  createEffect(() => {
    const target = pendingFocus();
    if (!target || loadingLines()) return;
    setPendingFocus(undefined);
    requestAnimationFrame(() => {
      const root = document.querySelector('[data-testid="add-item-modal"]');
      if (!root) return;
      if (target === 'itemSelector') {
        root
          .querySelector<HTMLElement>('[data-testid="item-search-input"]')
          ?.focus();
        return;
      }
      const row = target.row
        ? root.querySelector<HTMLElement>(`[data-row-key="${target.row}"]`)
        : null;
      if (!row) {
        root
          .querySelector<HTMLInputElement>(
            '[data-testid="issue-quantity-input"]'
          )
          ?.focus();
        return;
      }
      row.scrollIntoView({ block: 'nearest' });
      const packs = row.querySelector<HTMLInputElement>(
        '[data-testid="cell-numberOfPacks"] input'
      );
      if (packs && !packs.disabled) packs.focus();
    });
  });

  // The shared barred-batch policy (spec/stock-allocation § barred batches,
  // AC-AL2/AL8), fed outbound's resolved preferences — the module owns no
  // preference fetch.
  const allocationPrefs = (): AllocationPreferences => ({
    expiredStockPreventIssue: prefs()?.expiredStockPreventIssue ?? false,
    expiredStockIssueThreshold: prefs()?.expiredStockIssueThreshold ?? 0,
    manageVvmStatusForStock: prefs()?.manageVvmStatusForStock ?? false,
    sortByVvmStatusThenExpiry: prefs()?.sortByVvmStatusThenExpiry ?? false,
  });
  // TWO bar rules (rules.md § barred batches): the pref-gated ISSUE bar
  // (manual entry disabled, row dimmed — AC-AL8/AL9) vs the stricter,
  // unconditional AUTO bar (expired / unusable-VVM stock is never
  // auto-allocated, preference or not — AC-AL2/AL10).
  const isBarred = (line: DraftLine): boolean =>
    barReasons(line, allocationPrefs()).length > 0;
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
  const issuedUnits = createMemo(() =>
    draft.reduce((sum, line) => sum + line.numberOfPacks * line.packSize, 0)
  );
  const distinctPackSizes = createMemo(() => [
    ...new Set(draft.map(line => line.packSize)),
  ]);

  const unitName = () => item()?.unitName ?? t('label.unit');

  // The <Select> value string for the current allocate-in lens. Capture the
  // lens in a local so TS narrows the discriminated union without a cast (a
  // bare second allocateIn() call is not narrowed).
  const allocateInValue = () => {
    const lens = allocateIn();
    if (lens.kind === 'units') return 'units';
    if (lens.kind === 'doses') return 'doses';
    return `packs-${lens.size}`;
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
    // The allocation just changed — any earlier zero-allocation confirmation
    // no longer applies (spec S4 § save; it must be re-earned against the
    // current quantity, e.g. after raising it back above zero).
    setZeroConfirm(false);
  };

  // NumberField hands us a committed number (already numeric-only and clamped
  // to min 0 — negatives and non-numeric input never reach here) or undefined
  // when the field is cleared.
  const onIssueChange = (value: number | undefined) => {
    setIssueValue(value);
    const units = lensToUnits(value ?? null, allocateIn());
    // Clearing (or blanking) the Issue field distributes 0 — resetting every
    // batch's packs and the placeholder, not leaving the last distribution behind.
    distribute(units ?? 0);
  };

  // Direct per-batch edit, bounded 0…available (AC-I5 — the client bounds the
  // input; the server does not reject negatives while NEW).
  const setPacks = (id: string, value: number | null) => {
    const index = draft.findIndex(line => line.id === id);
    if (index < 0) return;
    const line = draft[index]!;
    const bounded = Math.max(0, Math.min(value ?? 0, line.availablePacks));
    setDraft(index, 'numberOfPacks', bounded);
    setDirty(true);
    // As in distribute() — a direct per-batch edit also invalidates a stale
    // zero-allocation confirmation.
    setZeroConfirm(false);
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
          // placeholder to match (AC-I6).
          lines: draft.map(line => ({
            id: line.id,
            numberOfPacks: line.numberOfPacks,
            stockLineId: line.stockLineId,
          })),
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

  // Zero allocated quantity requires a second confirmation (spec S4 § save).
  const confirmThen = (proceed: () => void) => {
    if (issuedUnits() === 0 && placeholderUnits() === 0 && !zeroConfirm()) {
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

  // OK & next (spec S4, AC-V7): save, then continue rapid entry — never a
  // dead end (matching the stocktake / inbound editors, so never disabled):
  // - UPDATE mode: ask the parent for the next item in its sorted/paginated
  //   order (the covered set guards repeats) and seed it in place; when the
  //   walk is exhausted, drop into add mode (empty, picker focused). An
  //   unchanged item pages on WITHOUT a redundant save (outbound gates saves
  //   on a real change).
  // - ADD mode: reopen empty for rapid entry of the next item.
  // A failed save aborts the advance with the editor unchanged.
  const advance = async (currentId: string) => {
    const next = await props.nextItem(currentId, coveredItemIds);
    if (next) await seedItem(next);
    else backToSearch(); // exhausted → add mode
  };
  const onOkNext = () => {
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

  // The picker shows EVERY visible stock item — items already on the shipment
  // are NOT excluded (spec S4; picking one loads its existing allocation).
  const pickerItems = () => itemOptionsResource.noSuspense();

  const updateMode = () => mode() === 'update';

  // The catalogue is a lazy resource, so in update mode (row open / walk
  // advance) the current item may not be resolvable from `items` yet. Supply
  // the selected option directly so the locked field always shows the name.
  const selectedItemOption = createMemo<ItemOption | undefined>(() => {
    const it = item();
    if (!updateMode() || !it) return undefined;
    return {
      id: it.id,
      code: '',
      name: it.name,
      unitName: it.unitName ?? null,
      isVaccine: it.isVaccine ?? false,
      doses: it.doses ?? 0,
      availableStockOnHand: 0,
    };
  });

  const columns = (): Column<DraftLine, never>[] => [
    {
      // "Will be used in auto-allocation": the AUTO-fillable predicate
      // (unconditional expired/VVM exclusion + pack-size match under the
      // packs lens) — matches the old app's canAutoAllocate CheckCell;
      // hovering the tick shows the reason. Issue-barred rows are
      // additionally dimmed (rowState).
      c: { accessor: line => willAutoAllocate(line), id: 'canAllocate' },
      // getSize() is a min-width floor (auto layout) — without this the
      // header-less tick column gets the 150px default and reads as a gap.
      size: 36,
      header: '',
      cell: info => (
        <Show when={info.getValue<boolean>()}>
          <Popover
            trigger={<CheckIcon />}
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
      header: t('label.batch'),
      cell: info => info.getValue<string | null>() ?? '—',
    },
    {
      c: { key: 'expiryDate' },
      header: t('label.expiry'),
      ...getExpiryDateCell(),
    },
    ...(prefs()?.manageVvmStatusForStock
      ? [
          {
            c: {
              accessor: (line: DraftLine) => line.vvmStatus?.description ?? '',
              id: 'vvmStatus',
            },
            header: t('label.vvm-status'),
          } as Column<DraftLine, never>,
        ]
      : []),
    {
      c: {
        accessor: line => line.campaign?.name ?? line.program?.name ?? '',
        id: 'campaign',
      },
      // Wide enough that the two-word header doesn't wrap mid-word.
      size: 200,
      header: t('label.campaign'),
    },
    {
      c: { accessor: line => line.location?.code ?? '', id: 'location' },
      header: t('label.location'),
    },
    ...(prefs()?.allowTrackingOfStockByDonor
      ? [
          {
            c: {
              accessor: (line: DraftLine) => line.donor?.name ?? '',
              id: 'donor',
            },
            header: t('label.donor'),
          } as Column<DraftLine, never>,
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
      c: { key: 'sellPricePerPack' },
      header: t('label.sell-price'),
      ...getCurrencyCell(),
    },
    {
      c: { key: 'packSize' },
      header: t('label.pack-size'),
      ...getNumberCell(),
    },
    ...(prefs()?.manageVaccinesInDoses
      ? [
          {
            c: { key: 'dosesPerUnit' },
            header: t('label.doses-per-unit'),
            ...getNumberCell(),
          } as Column<DraftLine, never>,
        ]
      : []),
    {
      c: { key: 'inStorePacks' },
      header: t('label.in-store'),
      ...getNumberCell(),
    },
    {
      c: { key: 'availablePacks' },
      header: t('label.available'),
      ...getNumberCell(),
    },
    {
      // The one editable cell: packs issued from this batch (AC-I5).
      c: { key: 'numberOfPacks' },
      header: t('label.issued'),
      meta: { align: 'right' },
      cell: info => {
        const line = info.row.original;
        return (
          <NumberField
            label={t('label.issued')}
            hideLabel
            size="small"
            min={0}
            max={line.availablePacks}
            decimalLimit={2}
            disabled={isBarred(line)}
            value={line.numberOfPacks || undefined}
            onChange={value => setPacks(line.id, value ?? null)}
          />
        );
      },
    },
    {
      c: {
        accessor: line => line.numberOfPacks * line.packSize,
        id: 'unitsIssued',
      },
      header: t('label.units-issued', { unit: unitName() }),
      ...getNumberCell(),
    },
    ...(props.customerIsStore
      ? []
      : [
          {
            c: {
              accessor: (line: DraftLine) =>
                line.receivedNumberOfPacks ?? line.numberOfPacks,
              id: 'receivedNumberOfPacks',
            },
            header: t('label.packs-received'),
            ...getNumberCell(),
          } as Column<DraftLine, never>,
          {
            c: {
              accessor: (line: DraftLine) =>
                (line.receivedNumberOfPacks ?? line.numberOfPacks) -
                line.numberOfPacks,
              id: 'difference',
            },
            header: t('label.difference'),
            ...getNumberCell(),
          } as Column<DraftLine, never>,
        ]),
  ];

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size="large"
      testId="add-item-modal"
      title={updateMode() ? t('heading.edit-line') : t('button.add-item')}
      actionsLead={
        <Show when={errorMessage()}>
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
              // loadingLines too (the stocktake editor's busy()): the no-save
              // page-through is a fetch with no stale-response guard, so the
              // button must not accept clicks while one is in flight.
              loading={saving() || loadingLines()}
              onClick={onOkNext}
            />
          </Show>
        </>
      }
    >
      {/* Item row: the catalogue lookup (locked in edit mode) + unit. */}
      <Combobox<ItemOption>
        label={t('label.item')}
        items={pickerItems()}
        loading={itemOptionsResource.loading()}
        itemToString={option => option.name}
        itemToValue={option => option.id}
        filter={(option, input) => {
          const needle = input.toLocaleLowerCase();
          return (
            option.name.toLocaleLowerCase().includes(needle) ||
            option.code.toLocaleLowerCase().includes(needle)
          );
        }}
        renderItem={option => (
          <span class={styles.itemOption}>
            <span class={styles.itemLabel}>
              <span data-testid="item-option-code">{option.code}</span>{' '}
              <span data-testid="item-option-name">{option.name}</span>
            </span>
            <span class={styles.itemStock}>
              {/* A fixed, localised "Units" label for every item — the item's
                  own unitName is untranslatable catalogue data, so the old app's
                  item search shows t('label.units') here for all items (the
                  specific unit is used on the Available line / lens, not here). */}
              {formatNumber(option.availableStockOnHand)} {t('label.units')}
            </span>
          </span>
        )}
        value={item()?.id ?? ''}
        selectedItem={selectedItemOption()}
        clearable={false}
        disabled={updateMode() || saving()}
        inputTestId="item-search-input"
        placeholder={t('placeholder.search-by-name')}
        onChange={option => {
          if (option)
            void seedItem({
              id: option.id,
              name: option.name,
              unitName: option.unitName,
              isVaccine: option.isVaccine,
              doses: option.doses,
            });
        }}
      />

      {/* Available on its own line, then the issue row: quantity + allocate-in. */}
      <Show when={item()}>
        <div style={{ 'margin-block': 'var(--space-3) var(--space-2)' }}>
          <span>
            {t('label.available')}: {formatNumber(availableUnits())}{' '}
            {unitName()}
          </span>
        </div>
        {/* One control per row below the compact breakpoint (the same cutoff
            where this large Dialog goes full-screen) — see the module CSS. */}
        <div class={styles.issueRow}>
          {/* Both controls at the default height — NumberField's "small"
              (2.25rem) and Select's "sm" (1.75rem — the Pagination scale)
              don't align with each other. */}
          <NumberField
            label={t('label.issue')}
            min={0}
            data-testid="issue-quantity-input"
            value={issueValue()}
            disabled={saving()}
            onChange={onIssueChange}
          />
          <Select
            label={t('label.units')}
            value={allocateInValue()}
            options={[
              { value: 'units', label: unitName() },
              // The doses lens (AC-AL7): vaccine items under the
              // manage-vaccines-in-doses preference only.
              ...(prefs()?.manageVaccinesInDoses && item()?.isVaccine
                ? [{ value: 'doses', label: t('label.doses') }]
                : []),
              ...distinctPackSizes().map(size => ({
                value: `packs-${size}`,
                label: t('label.packs-of-pack-size', { packSize: size }),
              })),
            ]}
            onValueChange={value => {
              const previous = allocateIn();
              const next: AllocateUnit =
                value === 'units'
                  ? { kind: 'units' }
                  : value === 'doses'
                    ? { kind: 'doses', dosesPerUnit: item()?.doses ?? 1 }
                    : { kind: 'packs', size: Number(value.slice(6)) };
              setAllocateIn(next);
              // Re-EXPRESS the current quantity in the new lens — the units
              // equivalent is preserved and NOTHING redistributes (matching
              // the old app; spec S4 § issue field seed). Re-running the
              // distribution here would silently rewrite the allocation —
              // seeded or hand-tuned — on a mere display-unit switch.
              const v = issueValue();
              if (v != null) {
                const units = lensToUnits(v, previous) ?? 0;
                setIssueValue(Math.round(unitsToLens(units, next) * 100) / 100);
              }
            }}
          />
          {/* Placeholder notice (info) — to the right of Issue / Allocate-in,
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
        </div>

        {/* Batch grid: one row per available batch, FEFO-ordered; barred rows
            disabled (AC-AL2 / AC-AL8). */}
        <DataTable
          columns={columns()}
          rows={draftRows()}
          rowKey={line => line.id}
          loading={loadingLines()}
          showFullScreen={false}
          rowState={line => (isBarred(line) ? 'disabled' : undefined)}
          emptyMessage={t('messages.no-stock-available')}
          config={tableConfig.config()}
          setConfig={tableConfig.setConfig}
        />

        {/* Grid footer: placeholder + running total (spec S4). */}
        <div
          style={{
            display: 'flex',
            'justify-content': 'end',
            gap: 'var(--space-4)',
            'margin-block-start': 'var(--space-2)',
          }}
        >
          <span>
            {t('label.placeholder')}: {formatNumber(placeholderUnits())}
          </span>
          <span>
            {t('label.total-units')}:{' '}
            {formatNumber(issuedUnits() + placeholderUnits())}
          </span>
        </div>

        {/* Stacked warning banners (spec S4 § warnings). */}
        <Show when={warnings().length > 0}>
          <div
            style={{
              display: 'flex',
              'flex-direction': 'column',
              gap: 'var(--space-2)',
              'margin-block-start': 'var(--space-2)',
            }}
          >
            {warnings().map(message => (
              <Alert severity="warning">{message}</Alert>
            ))}
          </div>
        </Show>

        {/* Zero-allocation second confirmation (spec S4 § save). */}
        <Show when={zeroConfirm()}>
          <Alert severity="info">{t('messages.confirm-zero-quantity')}</Alert>
        </Show>
      </Show>
    </Dialog>
  );
};

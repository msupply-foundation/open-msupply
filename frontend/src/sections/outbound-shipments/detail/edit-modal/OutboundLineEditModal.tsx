import { createMemo, createSignal, onMount, Show, type JSX } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import { formatNumber } from '../../../../intl/formatNumber';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Popover } from '../../../../ui/elements/feedback/Popover';
import { Button } from '../../../../ui/elements/buttons/Button';
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
import { ArrowRightIcon, CheckIcon, XCircleIcon } from '../../../../ui/icons';
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
  fefoCompare,
  lensToUnits,
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

type DraftLine =
  DraftStockOutLinesResult['draftStockOutLines']['draftLines'][number];

export type LineEditItem = {
  id: string;
  name: string;
  unitName?: string | null;
  isVaccine?: boolean;
  doses?: number;
};

interface OutboundLineEditModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  invoiceId: string;
  /** NEW shipments may create placeholders (rules.md § placeholder lines). */
  isNew: boolean;
  /** The item to open ON (edit mode — the picker locks); undefined = add. */
  initialItem?: LineEditItem;
  /**
   * The shipment's items in line-table order (distinct): excluded from the
   * picker in add mode (S4), and paged through by OK & next in edit mode.
   */
  existingItems: LineEditItem[];
  /**
   * Whether the shipment's customer is itself a store (a transfer). Non-store
   * (external) customers additionally get the received-packs / difference columns.
   */
  customerIsStore: boolean;
  /** A save committed — the view refetches the shipment. */
  onCommitted: () => void;
}

// Mount-while-open wrapper (kdd/explicit-composition): <Show> tears the
// content down on close so each open starts fresh.
export const OutboundLineEditModal = (
  props: OutboundLineEditModalProps
): JSX.Element => (
  <Show when={props.open}>
    <LineEditContent {...props} />
  </Show>
);

// Issue-entry lens (spec/stock-allocation § the allocate-in lens): units,
// packs-of-‹size›; doses stay display-only in this build (entry mode needs
// the doses preference, off on the dev store).

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
  // Snapshot of the shipment's items at open: OK & next in update mode pages
  // through them in table order, stable even as each save refetches the
  // shipment (outbound loads all lines, so this is client-side — the paginated
  // reference editors ask the parent for the next item instead).
  const [itemsAtOpen, setItemsAtOpen] = createSignal<LineEditItem[]>([]);
  // Add vs update, as a MUTABLE signal (matching the stocktake / inbound
  // editors): an update walk that runs out of items drops into add mode, which
  // unlocks the picker. Only ever flips update → add.
  const [mode, setMode] = createSignal<'add' | 'update'>(
    props.initialItem ? 'update' : 'add'
  );

  const tableConfig = createTableConfig({ tableId: 'outbound-line-edit' });
  const prefs = () => outboundPrefs()?.prefs;

  // Load one item's draft (server-computed: existing lines + available
  // batches + placeholder). The ONE seed path — on mount (edit mode) and on
  // item pick (add mode).
  const loadItem = async (picked: LineEditItem) => {
    setItem(picked);
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
    // FEFO order for display and distribution: the shared comparator
    // (spec/stock-allocation § ordering, AC-AL1; VVM-then-expiry stays with
    // the server-side allocation).
    const sorted = [...data.draftLines].sort(fefoCompare);
    setDraft(reconcile(sorted, { key: 'id' }));
    const placeholder = data.placeholderQuantity ?? 0;
    setPlaceholderUnits(placeholder);
    setLoadingLines(false);

    // Auto-allocate on open: a NEW shipment's *pure*
    // placeholder — an item carrying a requested quantity with nothing yet
    // allocated — is distributed against available stock the moment the editor
    // opens, the same FEFO run the Issue field performs (seeded with the
    // requested quantity), leaving the placeholder holding any remainder. A
    // notice shows only if stock was actually placed. Requisition-sourced and
    // manual-shortfall placeholders carry a quantity; master-list placeholders
    // are zero, so this no-ops for them. An item with stock already allocated
    // is left untouched (only a wholly-unallocated placeholder triggers it).
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

  onMount(() => {
    setItemsAtOpen(props.existingItems);
    if (props.initialItem) void loadItem(props.initialItem);
  });

  // The shared barred-batch policy (spec/stock-allocation § barred batches,
  // AC-AL2/AL8), fed outbound's resolved preferences — the module owns no
  // preference fetch.
  const allocationPrefs = (): AllocationPreferences => ({
    expiredStockPreventIssue: prefs()?.expiredStockPreventIssue ?? false,
    expiredStockIssueThreshold: prefs()?.expiredStockIssueThreshold ?? 0,
    manageVvmStatusForStock: prefs()?.manageVvmStatusForStock ?? false,
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
    return lens.kind === 'units' ? 'units' : `packs-${lens.size}`;
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

  // Reset to the empty item-search state (add mode) — the picker unlocks and
  // clears. Reached when an update walk runs out of items, or by OK & next in
  // add mode (add another). Matches the stocktake / inbound editors'
  // backToSearch; mode only ever flips update → add.
  const backToSearch = () => {
    setMode('add');
    setItem(undefined);
    setDraft(reconcile([], { key: 'id' }));
    setPlaceholderUnits(0);
    setIssueValue(undefined);
    setWarnings([]);
    setDirty(false);
    setZeroConfirm(false);
    setErrorMessage(undefined);
  };

  // OK & next (spec S4): save, then continue rapid entry — never a dead end
  // (matching the stocktake / inbound editors, so never disabled):
  //  · add mode    — return to the picker to add another (backToSearch).
  //  · update mode — advance to the next item on the shipment (open-time
  //    order); when the walk is exhausted, drop into add mode instead.
  const onOkNext = () => {
    // Update mode, unchanged: page on without a redundant save (outbound gates
    // saves on a real change — the reference editors re-save a harmless no-op).
    if (mode() === 'update' && !dirty()) {
      const next = nextItem();
      if (next) void loadItem(next);
      else backToSearch();
      return;
    }
    confirmThen(() => {
      void save().then(ok => {
        if (!ok) return;
        if (mode() === 'add') {
          backToSearch();
          return;
        }
        const next = nextItem();
        if (next) void loadItem(next);
        else backToSearch(); // exhausted → add mode
      });
    });
  };

  const pickerItems = () =>
    itemOptionsResource
      .noSuspense()
      .filter(option => !props.existingItems.some(it => it.id === option.id));

  // The item after the current one in the open-time order — OK & next's target
  // in update mode; undefined once the walk reaches the last item (then OK &
  // next drops into add mode instead of being a dead end).
  const nextItem = (): LineEditItem | undefined => {
    const currentId = item()?.id;
    if (currentId == null) return undefined;
    const items = itemsAtOpen();
    const index = items.findIndex(entry => entry.id === currentId);
    return index < 0 ? undefined : items[index + 1];
  };

  // In edit mode the item is excluded from `pickerItems` (it's already on the
  // shipment), so the combobox can't resolve its label from `items`. Supply the
  // selected option directly so the locked field shows the item name.
  const selectedItemOption = createMemo<ItemOption | undefined>(() => {
    const it = item();
    if (mode() !== 'update' || !it) return undefined;
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
      title={
        mode() === 'update' ? t('heading.edit-line') : t('button.add-item')
      }
      actionsLead={
        <Show when={errorMessage()}>
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Button
            icon={<CheckIcon />}
            data-testid="dialog-button-ok"
            disabled={!item() || !dirty()}
            loading={saving()}
            onClick={onOk}
          >
            {t('button.ok')}
          </Button>
          {/* OK & next (spec S4 § footer button matrix) — never disabled, like
              the stocktake / inbound editors:
               · add mode    — HIDDEN until an item is chosen and a change made;
                 then saves + returns to the picker to add another.
               · update mode — SHOWN throughout; saves then advances to the next
                 item on the shipment, or drops into add mode once the walk is
                 exhausted.
              OK stays visible-but-disabled as the always-discoverable confirm. */}
          <Show when={mode() === 'update' ? item() : item() && dirty()}>
            <Button
              icon={<ArrowRightIcon />}
              data-testid="dialog-button-next-and-ok"
              // loadingLines too (the stocktake editor's busy()): the no-save
              // page-through is a fetch with no stale-response guard, so the
              // button must not accept clicks while one is in flight.
              loading={saving() || loadingLines()}
              onClick={onOkNext}
            >
              {t('button.ok-and-next')}
            </Button>
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
        disabled={mode() === 'update' || saving()}
        inputTestId="item-search-input"
        placeholder={t('placeholder.search-by-name')}
        onChange={option => {
          if (option)
            void loadItem({
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
            value={issueValue()}
            disabled={saving()}
            onChange={onIssueChange}
          />
          <Select
            label={t('label.units')}
            value={allocateInValue()}
            options={[
              { value: 'units', label: unitName() },
              ...distinctPackSizes().map(size => ({
                value: `packs-${size}`,
                label: t('label.packs-of-pack-size', { packSize: size }),
              })),
            ]}
            onValueChange={value => {
              setAllocateIn(
                value === 'units'
                  ? { kind: 'units' }
                  : { kind: 'packs', size: Number(value.slice(6)) }
              );
              // Re-interpret the same requested quantity in the new lens.
              const v = issueValue();
              if (v != null) onIssueChange(v);
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

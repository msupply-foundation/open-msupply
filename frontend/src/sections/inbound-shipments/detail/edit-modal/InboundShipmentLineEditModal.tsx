import {
  createEffect,
  createSignal,
  onMount,
  Show,
  type Component,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { IconButton } from '../../../../ui/elements/buttons/IconButton';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { CurrencyField } from '../../../../ui/elements/inputs/CurrencyField';
import { DateField } from '../../../../ui/elements/inputs/DateField';
import { Spinner } from '../../../../ui/elements/feedback/Spinner';
import {
  DataTable,
  type Column,
  type CardGroup,
} from '../../../../ui/elements/table/DataTable';
import { getNumberCell } from '../../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../../api/createTableConfig';
import {
  CopyIcon,
  InfoIcon,
  MessageSquareIcon,
  PlusCircleIcon,
  StockIcon,
  TrashIcon,
  XCircleIcon,
} from '../../../../ui/icons';
import { ItemSearch, type ItemOption } from '../../../../domain/item';
import {
  LocationVolumeSelect,
  type LocationWithVolume,
} from '../../../../domain/location';
import { VvmStatusSelect } from '../../../../domain/vvmStatus';
import { NameSearch, type NameOption } from '../../../../domain/name';
import { CampaignOrProgramSelect } from '../../../../domain/campaign/CampaignOrProgramSelect';
import { Select } from '../../../../ui/elements/selectors/Select';
import {
  InboundShipmentLines,
  type InboundLineFragment,
  type BatchInboundShipmentVariables,
} from '../inboundShipmentDetail.generated';
import {
  PurchaseOrderLines,
  type PurchaseOrderLinesResult,
} from '../inboundShipmentLookups.generated';
import { runInboundBatch } from '../inboundShipmentUpdate';

// One line of the linked purchase order — the PO-line picker's options (derived
// from the generated result, not restated).
type PoLine =
  PurchaseOrderLinesResult['purchaseOrder']['lines']['nodes'][number];

export interface LineEditPrefs {
  vvm: boolean;
  donor: boolean;
  /** Vaccines-in-doses preference — gates the Doses-per-unit field (H5). */
  doses: boolean;
  /**
   * Authorisation-required preference — gates the per-batch Auth status field.
   * Authorisation is PO-linked-only, so the field also needs `isExternal`
   * (spec ui-surface col 16 / rules → authorisation is external-scope-only).
   */
  authorisation: boolean;
}

export interface InboundShipmentLineEditModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  invoiceId: string;
  isExternal: boolean;
  /**
   * The item this open STARTS on (a row click) → UPDATE mode. Omitted for "Add
   * item" → ADD mode (the item-search state). The modal tracks its own current
   * item as the user advances with "OK & next" — this prop is fixed for the
   * whole walk (it never re-keys the modal mid-walk).
   */
  initialItemId?: string;
  /**
   * The clicked BATCH (invoice-line id) for a row-click open — the editor
   * scrolls it into view and focuses its packs-received field on open. Omitted
   * for "Add item" (and unused after an "OK & next" advance, which focuses the
   * first row).
   */
  initialLineId?: string;
  /**
   * On a PO-linked shipment, add mode picks a purchase-order LINE (not an item
   * search) — a line insert must cite one (spec AC-E3). Set to the shipment's
   * purchaseOrderId to switch the add selector to the PO-line picker.
   */
  purchaseOrderId?: string;
  /** Cost price is read-only for a store-linked or PO-linked supplier. */
  costLocked: boolean;
  locations: LocationWithVolume[];
  prefs: LineEditPrefs;
  onSaved: () => void;
  /**
   * UPDATE mode "OK & next": after saving, ask the parent for the next item to
   * advance to — parent-owned because the line table is server-paginated, so
   * the next item may be on a later page (finding it pages the table forward).
   * Given the current item id and the covered-items set (items already stepped
   * through this walk), returns the next distinct uncovered item id, or
   * undefined when the list is exhausted (→ the modal drops into add mode).
   */
  onRequestNext?: (
    currentItemId: string,
    covered: Set<string>
  ) => Promise<string | undefined>;
}

// The inbound-shipment line editor (spec S4): the single surface for entering a
// batch's received detail. A modal over the detail view, editing ALL of one
// item's batches at once — each batch is one row / one card. Like the stocktake
// line editor (kdd/stocktake-line-editing), the body is the grouped DataTable:
// ONE column set gives two faces — tabs (Batch / Pricing / Other) in table
// view, sections in card view. Add mode opens on an item search (manual/
// transfer) or a purchase-order-line picker (PO-linked — a line must cite one);
// edit mode loads the item's existing lines. Each open is a fresh mount (keyed
// Show) so state never leaks between items. "OK & next" advances to the next
// item on the shipment (edit mode) or resets to add-another (add mode).
type DraftBatch = {
  id: string;
  isNew: boolean;
  deleted: boolean;
  numberOfPacks: number;
  packSize: number;
  batch: string;
  expiryDate: string | null;
  manufactureDate: string | null;
  locationId: string | null;
  costPricePerPack: number;
  sellPricePerPack: number;
  note: string;
  vvmStatusId: string | null;
  /** Line authorisation status (spec col 16); null on shipments without it. */
  status: InboundLineFragment['status'];
  donorId: string | null;
  donorName: string | null;
  shippedNumberOfPacks: number | undefined;
  shippedPackSize: number | undefined;
  volumePerPack: number;
  manufacturerId: string | null;
  manufacturerName: string | null;
  campaignId: string | null;
  programId: string | null;
  /**
   * Whether the user has hand-edited the cost / sell price (AC-H6): a prefilled
   * price the user hasn't touched clears to zero when the pack size moves off
   * the item default; an overridden one is left alone.
   */
  costOverridden: boolean;
  sellOverridden: boolean;
};

// The three authorisation states a line can hold (the fragment's non-null set).
type AuthStatus = NonNullable<DraftBatch['status']>;

// Each auth state's dot colour (spec col 16), tokens only: amber awaiting,
// green approved, red rejected. A leading dot lets the state read at a glance,
// the way the invoice-status Select does.
const AUTH_STATUS_COLOUR: Record<AuthStatus, string> = {
  PENDING: 'var(--color-warning)',
  PASSED: 'var(--success-main)',
  REJECTED: 'var(--error-main)',
};

// A small coloured status dot for a Select option adornment — rem-sized, token
// colour (mirrors the showcase's invoice-status dot).
const StatusDot = (props: { colour: string }) => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-block',
      width: '0.5rem',
      height: '0.5rem',
      'border-radius': '50%',
      background: props.colour,
    }}
  />
);

const emptyBatch = (): DraftBatch => ({
  id: crypto.randomUUID(),
  isNew: true,
  deleted: false,
  numberOfPacks: 0,
  packSize: 1,
  batch: '',
  expiryDate: null,
  manufactureDate: null,
  locationId: null,
  costPricePerPack: 0,
  sellPricePerPack: 0,
  note: '',
  vvmStatusId: null,
  // A new line can't carry a status on insert (the server assigns Pending when
  // authorisation is required); null here, shown read-only as Pending.
  status: null,
  donorId: null,
  donorName: null,
  shippedNumberOfPacks: undefined,
  shippedPackSize: undefined,
  volumePerPack: 0,
  manufacturerId: null,
  manufacturerName: null,
  campaignId: null,
  programId: null,
  costOverridden: false,
  sellOverridden: false,
});

const fromLine = (line: InboundLineFragment): DraftBatch => ({
  id: line.id,
  isNew: false,
  deleted: false,
  numberOfPacks: line.numberOfPacks,
  packSize: line.packSize,
  batch: line.batch ?? '',
  expiryDate: line.expiryDate ?? null,
  manufactureDate: line.manufactureDate ?? null,
  locationId: line.locationId ?? null,
  costPricePerPack: line.costPricePerPack,
  sellPricePerPack: line.sellPricePerPack,
  note: line.note ?? '',
  vvmStatusId: line.vvmStatusId ?? null,
  status: line.status,
  donorId: line.donor?.id ?? null,
  donorName: line.donor?.name ?? null,
  shippedNumberOfPacks: line.shippedNumberOfPacks ?? undefined,
  shippedPackSize: line.shippedPackSize ?? undefined,
  volumePerPack: line.volumePerPack,
  manufacturerId: line.manufacturer?.id ?? null,
  manufacturerName: line.manufacturer?.name ?? null,
  campaignId: line.campaign?.id ?? null,
  programId: line.program?.id ?? null,
  // Existing lines aren't subject to the prefill-clear (AC-H6 is about adding);
  // mark both overridden so a pack-size edit never wipes a saved price.
  costOverridden: true,
  sellOverridden: true,
});

// The card body groups (matching the stocktake editor). This modal is card-only
// (no table view — see the createTableConfig default below): batch is the
// always-shown primary panel; pricing and other are collapsed disclosures.
// Batch is the card HEADER identity (meta.headerPosition), so it isn't itself a
// body group.
type GroupKey = 'batch' | 'pricing' | 'other';
const CARD_GROUPS: CardGroup<DraftBatch, GroupKey>[] = [
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

export const InboundShipmentLineEditModal: Component<
  InboundShipmentLineEditModalProps
> = props => (
  // A fresh mount per open, keyed on the item (or 'add') so switching items
  // rebuilds the draft (kdd/solid-reactivity-pitfalls — no leaked state).
  <Show when={props.open && (props.initialItemId ?? 'add')} keyed>
    <Body {...props} />
  </Show>
);

// id/code/name for display + the insert itemId, plus the item attributes the
// editor surfaces read-only: unitName (the Unit field, H6), and isVaccine/doses
// (the Doses-per-unit field, gated by the vaccines-in-doses pref, H5).
type ChosenItem = {
  id: string;
  code: string;
  name: string;
  unitName: string | null;
  isVaccine: boolean;
  doses: number;
  /**
   * Item default pack size + store default sell price — the new-line price
   * prefill (AC-H6). defaultSellPricePerPack is 0 where unknown (the PO-line
   * picker and edit-mode line-load don't fetch it), so no price prefill there —
   * correct, since AC-H6 targets the manual add-item case.
   */
  defaultPackSize: number;
  defaultSellPricePerPack: number;
};

const Body: Component<InboundShipmentLineEditModalProps> = props => {
  const [item, setItem] = createSignal<ChosenItem | null>(null);
  const [batches, setBatches] = createStore<DraftBatch[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();
  // True while an item's existing lines are being fetched (mount, and each "OK
  // & next" advance) so the body shows a spinner instead of flashing its empty
  // state. Starts true; add mode clears it once the selector is ready.
  const [loadingLines, setLoadingLines] = createSignal(true);
  // Mode: 'update' (opened from a row — "OK & next" walks to the next item on
  // the shipment) or 'add' ("Add item", or fallen into when an update walk
  // runs out — "OK & next" then resets to add another). Only ever flips update
  // → add, never back; the item selector is locked in update mode. Not visible
  // (the selector IS the title; no Add/Edit label). Mirrors the stocktake
  // editor (kdd/stocktake-line-editing).
  const [mode, setMode] = createSignal<'add' | 'update'>(
    props.initialItemId ? 'update' : 'add'
  );

  // Items already stepped through THIS walk (since the modal opened on a row),
  // so the parent's next-item resolver never offers one twice — across page
  // advances too. Seeded as each item loads; not reactive.
  const coveredItemIds = new Set<string>();

  // What to focus once the batches are in the DOM (see the focus effect):
  // - 'itemSelector' → the add-mode top selector (item search, or PO-line
  //   picker on a PO-linked shipment).
  // - { row: id }    → that batch's packs-received field, scrolled into view.
  // Consumed (cleared) by the effect so it fires once per change.
  const [pendingFocus, setPendingFocus] = createSignal<
    { row: string } | 'itemSelector' | undefined
  >();

  // Card-only: default the view to card at every band (compact already forces
  // card; this extends it to desktop). No showCardToggle on the DataTable, so
  // there's no way to a table view — the batch grid is always cards.
  const tableConfig = createTableConfig({
    tableId: 'inbound-line-edit',
    defaultConfig: { base: { viewMode: 'card' } },
  });

  // Load one item's existing lines and seed the batch draft — a plain
  // SEQUENTIAL fetch, NOT a createResource (issue #428: draft state is built
  // from individual fetches). Advancing between items during a walk then
  // mutates the draft in place with no <Suspense> boundary to trip, so it never
  // remounts (kdd/solid-reactivity-pitfalls › No remounts on interaction).
  // `focusLineId` is the batch to focus once loaded (the clicked batch on a row
  // open); omitted → the first row. Records the item in the covered set for the
  // walk. Closes if the item has no lines left (it vanished).
  const loadItemById = async (id: string, focusLineId?: string) => {
    setLoadingLines(true);
    setErrorMessage(undefined);
    coveredItemIds.add(id);
    const result = await graphqlFetch(InboundShipmentLines, {
      storeId: props.storeId,
      filter: {
        invoiceId: { equalTo: props.invoiceId },
        itemId: { equalTo: id },
      },
      page: { first: 200 },
    });
    const lines =
      result.kind === 'success' &&
      result.data.invoiceLines.__typename === 'InvoiceLineConnector'
        ? result.data.invoiceLines.nodes
        : [];
    const first = lines[0];
    if (!first) {
      props.onClose();
      return;
    }
    setBatches(lines.map(fromLine));
    setItem({
      id: first.itemId,
      code: first.itemCode,
      name: first.itemName,
      unitName: first.item?.unitName ?? null,
      isVaccine: first.item?.isVaccine ?? false,
      doses: first.item?.doses ?? 0,
      defaultPackSize: first.item?.defaultPackSize ?? 1,
      defaultSellPricePerPack: 0,
    });
    // Focus the requested batch, else the first row.
    setPendingFocus({ row: focusLineId ?? first.id });
    setLoadingLines(false);
  };

  // A fresh batch for `chosen`, price-prefilled per AC-H6: starts at the item's
  // default pack size, with cost AND sell price seeded from the store default
  // sell price — but only when cost is editable (a manual shipment); on a
  // PO/transfer shipment cost derives from the source, so leave prices at zero.
  const prefillFromItem = (chosen: ChosenItem): DraftBatch => {
    const base = emptyBatch();
    const packSize = chosen.defaultPackSize > 0 ? chosen.defaultPackSize : 1;
    if (props.costLocked) return { ...base, packSize };
    const price = chosen.defaultSellPricePerPack;
    return {
      ...base,
      packSize,
      costPricePerPack: price,
      sellPricePerPack: price,
    };
  };

  // Picking from the item search is an ADD-flow action (update mode is entered
  // only by clicking a row, and locks the selector), so it keeps mode 'add'.
  // Items already on the shipment are NOT excluded — picking one loads a fresh
  // batch for it (issue #428, confirmed with Mark; matches the stocktake
  // editor). State for any item currently in the editor is lost, by design.
  const chooseItem = (option: ItemOption | null) => {
    setMode('add');
    if (!option) {
      setItem(null);
      setBatches([]);
      setPendingFocus('itemSelector');
      return;
    }
    const chosen: ChosenItem = {
      id: option.id,
      code: option.code,
      name: option.name,
      unitName: option.unitName,
      isVaccine: option.isVaccine,
      doses: option.doses,
      defaultPackSize: option.defaultPackSize,
      defaultSellPricePerPack: option.defaultSellPricePerPack,
    };
    const batch = prefillFromItem(chosen);
    setItem(chosen);
    setBatches([batch]);
    // Picking an item drops focus straight onto its first batch's packs field.
    setPendingFocus({ row: batch.id });
  };

  // PO-linked add mode: pick a purchase-order LINE instead of an item search
  // (spec AC-E3 — a PO-linked line insert must cite an order line). The order's
  // lines are fetched once (sequentially, on mount) into a plain signal — not a
  // createResource — so they're ready if/when the editor drops into add mode
  // (initial open, or after an update walk exhausts).
  const [poLineId, setPoLineId] = createSignal<string>();
  const [poLines, setPoLines] = createSignal<PoLine[]>([]);
  const loadPoLines = async () => {
    if (!props.purchaseOrderId) return;
    const result = await graphqlFetch(PurchaseOrderLines, {
      storeId: props.storeId,
      purchaseOrderId: props.purchaseOrderId,
    });
    if (
      result.kind === 'success' &&
      result.data.purchaseOrder.__typename === 'PurchaseOrderNode'
    )
      setPoLines(result.data.purchaseOrder.lines.nodes);
  };
  const choosePoLine = (id: string) => {
    const line = poLines().find(l => l.id === id);
    if (!line) return;
    setPoLineId(id);
    // The PO-line lookup carries only id/code/name for the item; unit/vaccine
    // attributes fill in once the line is saved and reloaded via the full line
    // fragment (edit mode). Default them for the pre-save PO-add view.
    setItem({
      id: line.item.id,
      code: line.item.code,
      name: line.item.name,
      unitName: null,
      isVaccine: false,
      doses: 0,
      defaultPackSize: line.requestedPackSize || 1,
      defaultSellPricePerPack: 0,
    });
    const batch = { ...emptyBatch(), packSize: line.requestedPackSize || 1 };
    setBatches([batch]);
    setPendingFocus({ row: batch.id });
  };

  // Draft edits are keyed by batch id (like the stocktake editor) so a filter/
  // splice can't desync a row from its store slot.
  const indexById = (id: string) => batches.findIndex(b => b.id === id);
  const updateBatch = <F extends keyof DraftBatch>(
    id: string,
    field: F,
    value: DraftBatch[F]
  ) => {
    const index = indexById(id);
    if (index >= 0) setBatches(index, field, value as never);
  };

  // A new batch prefills from the current item (AC-H6) just like the first one.
  const addBatch = () => {
    const chosen = item();
    const batch = chosen ? prefillFromItem(chosen) : emptyBatch();
    setBatches(produce(d => d.push(batch)));
    setPendingFocus({ row: batch.id });
  };

  // Pack-size / price edits (AC-H6): moving the pack size off the item default
  // clears a still-prefilled (non-overridden) price to zero; editing a price
  // marks it overridden so a later pack-size change leaves it alone.
  const changePackSize = (id: string, value: number) => {
    const chosen = item();
    setBatches(
      produce(d => {
        const b = d.find(x => x.id === id);
        if (!b) return;
        b.packSize = value;
        if (chosen && !props.costLocked && value !== chosen.defaultPackSize) {
          if (!b.costOverridden) b.costPricePerPack = 0;
          if (!b.sellOverridden) b.sellPricePerPack = 0;
        }
      })
    );
  };
  const changeCost = (id: string, value: number) =>
    setBatches(
      produce(d => {
        const b = d.find(x => x.id === id);
        if (b) {
          b.costPricePerPack = value;
          b.costOverridden = true;
        }
      })
    );
  const changeSell = (id: string, value: number) =>
    setBatches(
      produce(d => {
        const b = d.find(x => x.id === id);
        if (b) {
          b.sellPricePerPack = value;
          b.sellOverridden = true;
        }
      })
    );
  const duplicateBatch = (id: string) => {
    const newId = crypto.randomUUID();
    setBatches(
      produce(d => {
        const index = d.findIndex(b => b.id === id);
        if (index >= 0)
          d.splice(index + 1, 0, { ...d[index], id: newId, isNew: true });
      })
    );
    setPendingFocus({ row: newId });
  };
  const removeBatch = (id: string) => {
    const index = indexById(id);
    if (index < 0) return;
    // A new draft row splices out; an existing line is flagged for a delete op.
    if (batches[index].isNew) setBatches(produce(d => d.splice(index, 1)));
    else setBatches(index, 'deleted', true);
  };

  // The rows the table shows: the draft minus soft-deleted batches.
  const rows = (): DraftBatch[] => batches.filter(b => !b.deleted);

  // Seed on mount: a row open (update mode) loads its item — focusing the
  // clicked batch; an add open starts in the item-search state, focusing the
  // selector. On a PO-linked shipment the order's lines are fetched too (needed
  // whenever the editor is in add mode — the initial open, or after an update
  // walk exhausts). Matches the stocktake editor.
  onMount(() => {
    void loadPoLines();
    if (props.initialItemId)
      void loadItemById(props.initialItemId, props.initialLineId);
    else {
      setLoadingLines(false);
      setPendingFocus('itemSelector');
    }
  });

  // Move focus once the target is in the DOM: the add-mode selector, else the
  // requested batch's packs-received field (scrolled into view). Runs after the
  // load so the row exists; deferred a frame so the table has painted. This
  // overrides the Dialog's own initial-focus-to-panel default (which keeps a
  // combobox from popping open) — an intentional, per-editor affordance. A
  // disabled packs field (a locked line) can't take focus — we still scroll to
  // it. Gated on loadingLines so the row exists before we reach for it.
  createEffect(() => {
    const target = pendingFocus();
    if (!target || loadingLines()) return;
    setPendingFocus(undefined);
    requestAnimationFrame(() => {
      const root = document.querySelector('[data-testid="add-item-modal"]');
      if (!root) return;
      if (target === 'itemSelector') {
        // Manual/transfer shipments show the item search; a PO-linked shipment
        // shows the PO-line picker instead.
        (
          root.querySelector<HTMLElement>(
            '[data-testid="item-search-input"]'
          ) ??
          root.querySelector<HTMLElement>(
            '[data-testid="purchase-order-line-input"]'
          )
        )?.focus();
        return;
      }
      const row = root.querySelector<HTMLElement>(
        `[data-row-key="${target.row}"]`
      );
      if (!row) return;
      row.scrollIntoView({ block: 'nearest' });
      const packs = row.querySelector<HTMLInputElement>(
        '[data-testid="cell-numberOfPacks"] input'
      );
      if (packs && !packs.disabled) packs.focus();
    });
  });

  const buildBatch = (): BatchInboundShipmentVariables['input'] | null => {
    const chosen = item();
    if (!chosen) return null;
    const insert = batches
      .filter(b => b.isNew && !b.deleted)
      .map(b => ({
        id: b.id,
        invoiceId: props.invoiceId,
        itemId: chosen.id,
        packSize: b.packSize,
        numberOfPacks: b.numberOfPacks,
        costPricePerPack: b.costPricePerPack,
        sellPricePerPack: b.sellPricePerPack,
        batch: b.batch || undefined,
        location: { value: b.locationId },
        expiryDate: b.expiryDate ?? undefined,
        manufactureDate: b.manufactureDate ?? undefined,
        note: b.note || undefined,
        vvmStatusId: b.vvmStatusId ?? undefined,
        donorId: b.donorId ?? undefined,
        shippedNumberOfPacks: b.shippedNumberOfPacks,
        shippedPackSize: b.shippedPackSize,
        volumePerPack: b.volumePerPack,
        manufacturerId: b.manufacturerId ?? undefined,
        campaignId: b.campaignId ?? undefined,
        programId: b.programId ?? undefined,
        // A PO-linked line must cite the order line it fills.
        purchaseOrderLineId: props.purchaseOrderId ? poLineId() : undefined,
      }));
    const update = batches
      .filter(b => !b.isNew && !b.deleted)
      .map(b => ({
        id: b.id,
        packSize: b.packSize,
        numberOfPacks: b.numberOfPacks,
        // Cost price is only sent when editable — a store-linked / PO-linked
        // shipment locks it (server rejects a changed value; a no-op is fine).
        ...(props.costLocked ? {} : { costPricePerPack: b.costPricePerPack }),
        sellPricePerPack: b.sellPricePerPack,
        batch: b.batch || undefined,
        location: { value: b.locationId },
        expiryDate: { value: b.expiryDate },
        manufactureDate: { value: b.manufactureDate },
        note: { value: b.note || null },
        vvmStatusId: { value: b.vvmStatusId },
        // Line authorisation status — sent as a plain value (not a {value}
        // patch), only on a PO-linked shipment that requires authorisation.
        // The line's current value goes on every save: unchanged lines are a
        // no-op, an edited one is the real change (AC-E6 blocks a change once
        // Received but allows the no-op). Omitted elsewhere so a manual
        // shipment never carries it.
        ...(props.prefs.authorisation && props.isExternal
          ? { status: b.status ?? undefined }
          : {}),
        donorId: { value: b.donorId },
        shippedNumberOfPacks: b.shippedNumberOfPacks,
        shippedPackSize: b.shippedPackSize,
        volumePerPack: b.volumePerPack,
        manufacturerId: { value: b.manufacturerId },
        campaignId: { value: b.campaignId },
        programId: { value: b.programId },
      }));
    const del = batches
      .filter(b => !b.isNew && b.deleted)
      .map(b => ({ id: b.id }));
    return {
      insertInboundShipmentLines: insert,
      updateInboundShipmentLines: update,
      deleteInboundShipmentLines: del,
    };
  };

  const save = async (): Promise<boolean> => {
    const input = buildBatch();
    if (!input) return false;
    setSaving(true);
    setErrorMessage(undefined);
    const outcome = await runInboundBatch(
      props.storeId,
      props.isExternal,
      input
    );
    setSaving(false);
    if (!outcome) return false;
    // A batch-level (untyped, top-level) rejection wins over per-line errors —
    // it aborted the whole all-or-nothing batch. Show it in the modal banner,
    // keeping the modal open (S7: surfaced inline, never a toast).
    const message =
      outcome.message ??
      (outcome.errors.size > 0 ? [...outcome.errors.values()][0] : undefined);
    if (message) {
      setErrorMessage(message);
      return false;
    }
    if (outcome.applied) props.onSaved();
    return true;
  };

  const onOk = async () => {
    if (await save()) props.onClose();
  };
  // Back to the add-mode item-search state — no item picked. Reached when an
  // update walk exhausts, or by "OK & next" in add mode (add another). Always
  // add mode from here on, so the selector unlocks.
  const backToSearch = () => {
    setMode('add');
    setItem(null);
    setPoLineId(undefined);
    setBatches([]);
    setErrorMessage(undefined);
    // Focus the selector so the next item can be typed / picked.
    setPendingFocus('itemSelector');
  };

  // OK & next: save, then — on success only — advance. By mode:
  // - ADD: reset to the item-search state to add another (backToSearch).
  // - UPDATE: ask the parent for the next item (it pages the detail table
  //   forward as needed, guarding repeats with the covered set). Got one →
  //   load it (draft swaps in place, no remount). None left → the walk is
  //   exhausted, so drop into add mode's search state.
  // Reuses this open either way (no close/reopen). A failed save stays put.
  const onOkNext = async () => {
    if (!(await save())) return;
    if (mode() === 'add') {
      backToSearch();
      return;
    }
    const current = item();
    const next =
      current && props.onRequestNext
        ? await props.onRequestNext(current.id, coveredItemIds)
        : undefined;
    if (next) await loadItemById(next);
    else backToSearch(); // exhausted → add mode
  };

  const noItemYet = () => !item();

  // Mismatch warning (spec S4): a manual shipment records what the supplier
  // reported shipping (shippedNumberOfPacks/shippedPackSize) alongside what was
  // received — warn when any batch's received differs from shipped. Not a
  // blocker; the save still proceeds.
  const hasMismatch = () =>
    !props.purchaseOrderId &&
    rows().some(
      b =>
        b.shippedNumberOfPacks !== undefined &&
        (b.shippedNumberOfPacks !== b.numberOfPacks ||
          (b.shippedPackSize !== undefined && b.shippedPackSize !== b.packSize))
    );

  // ---- Columns: one set, split across groups; batch is the anchor. ----
  const columns = (): Column<DraftBatch, never, GroupKey>[] => [
    {
      c: { key: 'batch' },
      header: () => t('label.batch'),
      meta: { headerPosition: 'primary' },
      cell: info => {
        const b = info.row.original;
        return (
          <TextField
            label={t('label.batch')}
            hideLabel
            size="small"
            value={b.batch}
            onInput={e => updateBatch(b.id, 'batch', e.currentTarget.value)}
          />
        );
      },
    },
    {
      c: { key: 'numberOfPacks' },
      header: () => t('label.pack-quantity'),
      cardGroup: 'batch',
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <NumberField
            label={t('label.pack-quantity')}
            hideLabel
            size="small"
            value={b.numberOfPacks}
            min={0}
            // Packs are received in fractions (a part-full pack) —
            // numberOfPacks is Float on the wire; match the reference 2-dp room
            // (spec S4).
            decimalLimit={2}
            onChange={v => updateBatch(b.id, 'numberOfPacks', v ?? 0)}
          />
        );
      },
    },
    {
      c: { key: 'packSize' },
      header: () => t('label.pack-size'),
      cardGroup: 'batch',
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <NumberField
            label={t('label.pack-size')}
            hideLabel
            size="small"
            value={b.packSize}
            // Don't clamp below 1 — a pack size < 1 is a server rule
            // (PackSizeBelowOne, untyped); submit it and surface the rejection
            // inline rather than silently coercing to 1 (spec AC-E1 / M2).
            min={0}
            // Pack size is Float on the wire and may be fractional; 2-dp room
            // matches the reference (spec S4).
            decimalLimit={2}
            onChange={v => changePackSize(b.id, v ?? 1)}
          />
        );
      },
    },
    // Packs shipped / Shipped pack size — supplier-declared quantities (spec
    // S4, manual only). Feed the received-vs-shipped mismatch warning and the
    // detail table's Difference column (H6).
    ...(!props.purchaseOrderId
      ? [
          {
            c: { id: 'shippedNumberOfPacks' },
            header: () => t('label.shipped-number-of-packs'),
            cardGroup: 'batch',
            ...getNumberCell(),
            cell: info => {
              const b = info.row.original;
              return (
                <NumberField
                  label={t('label.shipped-number-of-packs')}
                  hideLabel
                  size="small"
                  value={b.shippedNumberOfPacks}
                  min={0}
                  decimalLimit={2}
                  onChange={v => updateBatch(b.id, 'shippedNumberOfPacks', v)}
                />
              );
            },
          } satisfies Column<DraftBatch, never, GroupKey>,
          {
            c: { id: 'shippedPackSize' },
            header: () => t('label.shipped-pack-size'),
            cardGroup: 'batch',
            ...getNumberCell(),
            cell: info => {
              const b = info.row.original;
              return (
                <NumberField
                  label={t('label.shipped-pack-size')}
                  hideLabel
                  size="small"
                  value={b.shippedPackSize}
                  min={0}
                  decimalLimit={2}
                  onChange={v => updateBatch(b.id, 'shippedPackSize', v)}
                />
              );
            },
          } satisfies Column<DraftBatch, never, GroupKey>,
        ]
      : []),
    // Units received (computed) — packs received × pack size (spec S4).
    {
      c: { id: 'unitsReceived' },
      header: () =>
        t('label.units-received', {
          unit: item()?.unitName ?? t('label.units'),
        }),
      cardGroup: 'batch',
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <NumberField
            label={t('label.units-received', {
              unit: item()?.unitName ?? t('label.units'),
            })}
            hideLabel
            size="small"
            value={b.numberOfPacks * b.packSize}
            // Fractional packs/sizes make the product fractional too; show 2 dp
            // rather than rounding the read-only units to a whole number.
            decimalLimit={2}
            disabled
          />
        );
      },
    },
    // Auth status (Batch tab) — the line's authorisation state, editable when
    // the store requires authorisation of PO-linked shipments (spec ui-surface
    // col 16 / S4 per-batch fields). The same change is available in bulk from
    // the detail table's row-selection Approve/Reject/Pending actions. AC-E6
    // governs when a change is allowed (blocked once Received, a no-op to the
    // same value excepted); we submit and surface any rejection inline rather
    // than pre-gating. A brand-new batch can't carry a status on insert (the
    // server assigns Pending), so it stays read-only (shown as Pending) until
    // saved.
    ...(props.prefs.authorisation && props.isExternal
      ? [
          {
            c: { id: 'authStatus' },
            header: () => t('label.auth-status'),
            cardGroup: 'batch',
            cell: info => {
              const b = info.row.original;
              // The styled Kobalte Select (not a Combobox — no point searching
              // a fixed three-value list). Default size + hideLabel keeps it in
              // line with the neighbouring per-batch fields, and the coloured
              // option dots — which a native <option> can't render — read the
              // state at a glance. A brand-new line can't carry a status on
              // insert (the server assigns Pending), so it stays read-only.
              return (
                <Select
                  label={t('label.auth-status')}
                  hideLabel
                  value={b.status ?? 'PENDING'}
                  disabled={b.isNew}
                  options={[
                    {
                      value: 'PENDING',
                      label: t('label.pending'),
                      adornment: (
                        <StatusDot colour={AUTH_STATUS_COLOUR.PENDING} />
                      ),
                    },
                    {
                      value: 'PASSED',
                      label: t('label.passed'),
                      adornment: (
                        <StatusDot colour={AUTH_STATUS_COLOUR.PASSED} />
                      ),
                    },
                    {
                      value: 'REJECTED',
                      label: t('label.rejected'),
                      adornment: (
                        <StatusDot colour={AUTH_STATUS_COLOUR.REJECTED} />
                      ),
                    },
                  ]}
                  // Fixed 3-option list ⇒ the string out is one of the union.
                  onValueChange={v =>
                    updateBatch(b.id, 'status', v as AuthStatus)
                  }
                />
              );
            },
          } satisfies Column<DraftBatch, never, GroupKey>,
        ]
      : []),
    // Doses per unit (H5) — read-only item attribute, gated by the vaccines-in-
    // doses preference and shown only for a vaccine item.
    ...(props.prefs.doses && item()?.isVaccine
      ? [
          {
            c: { id: 'dosesPerUnit' },
            header: () => t('label.doses-per-unit'),
            cardGroup: 'batch',
            ...getNumberCell(),
            cell: () => (
              <NumberField
                label={t('label.doses-per-unit')}
                hideLabel
                size="small"
                value={item()?.doses ?? 0}
                disabled
              />
            ),
          } satisfies Column<DraftBatch, never, GroupKey>,
        ]
      : []),
    {
      c: { key: 'expiryDate' },
      header: () => t('label.expiry'),
      cardGroup: 'batch',
      cell: info => {
        const b = info.row.original;
        return (
          <DateField
            label={t('label.expiry')}
            hideLabel
            value={b.expiryDate}
            onChange={v => updateBatch(b.id, 'expiryDate', v)}
          />
        );
      },
    },
    // VVM status (Batch tab) — gated by the manage-VVM preference AND a vaccine
    // item (VVM applies to vaccines only, spec AC-PG1 / M1).
    ...(props.prefs.vvm && item()?.isVaccine
      ? [
          {
            c: { id: 'vvmStatus' },
            header: () => t('label.vvm-status'),
            cardGroup: 'batch',
            cell: info => {
              const b = info.row.original;
              return (
                <VvmStatusSelect
                  label={t('label.vvm-status')}
                  hideLabel
                  value={b.vvmStatusId ?? undefined}
                  onChange={s =>
                    updateBatch(b.id, 'vvmStatusId', s?.id ?? null)
                  }
                />
              );
            },
          } satisfies Column<DraftBatch, never, GroupKey>,
        ]
      : []),
    {
      c: { key: 'costPricePerPack' },
      header: () => t('label.pack-cost-price'),
      cardGroup: 'pricing',
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <CurrencyField
            label={t('label.pack-cost-price')}
            hideLabel
            size="small"
            value={b.costPricePerPack}
            disabled={props.costLocked}
            onChange={v => changeCost(b.id, v ?? 0)}
          />
        );
      },
    },
    {
      c: { key: 'sellPricePerPack' },
      header: () => t('label.pack-sell-price'),
      cardGroup: 'pricing',
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <CurrencyField
            label={t('label.pack-sell-price')}
            hideLabel
            size="small"
            value={b.sellPricePerPack}
            onChange={v => changeSell(b.id, v ?? 0)}
          />
        );
      },
    },
    // Line total (computed) — packs received × pack cost price (spec S4).
    {
      c: { id: 'lineTotal' },
      header: () => t('label.line-total'),
      cardGroup: 'pricing',
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <CurrencyField
            label={t('label.line-total')}
            hideLabel
            size="small"
            value={b.numberOfPacks * b.costPricePerPack}
            disabled
          />
        );
      },
    },
    {
      c: { id: 'location' },
      header: () => t('label.location'),
      cardGroup: 'other',
      cell: info => {
        const b = info.row.original;
        return (
          <LocationVolumeSelect
            label={t('label.location')}
            hideLabel
            locations={props.locations}
            value={b.locationId ?? undefined}
            requiredVolume={b.volumePerPack * b.numberOfPacks}
            onChange={loc => updateBatch(b.id, 'locationId', loc?.id ?? null)}
          />
        );
      },
    },
    {
      c: { key: 'manufactureDate' },
      header: () => t('label.manufacture-date'),
      cardGroup: 'other',
      cell: info => {
        const b = info.row.original;
        return (
          <DateField
            label={t('label.manufacture-date')}
            hideLabel
            value={b.manufactureDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={v => updateBatch(b.id, 'manufactureDate', v)}
          />
        );
      },
    },
    // Donor (Other tab) — gated by the donor-tracking preference.
    ...(props.prefs.donor
      ? [
          {
            c: { id: 'donor' },
            header: () => t('label.donor'),
            cardGroup: 'other',
            cell: info => {
              const b = info.row.original;
              return (
                <NameSearch
                  label={t('label.donor')}
                  hideLabel
                  storeId={props.storeId}
                  role="donor"
                  selected={
                    b.donorId
                      ? ({
                          id: b.donorId,
                          name: b.donorName ?? '',
                          code: '',
                          isSupplier: false,
                          isDonor: true,
                          isOnHold: false,
                          isStore: false,
                        } satisfies NameOption)
                      : undefined
                  }
                  onSelect={d => {
                    updateBatch(b.id, 'donorId', d?.id ?? null);
                    updateBatch(b.id, 'donorName', d?.name ?? null);
                  }}
                />
              );
            },
          } satisfies Column<DraftBatch, never, GroupKey>,
        ]
      : []),
    // Manufacturer (Other tab, spec S4) — a name lookup, manufacturer role.
    {
      c: { id: 'manufacturer' },
      header: () => t('label.manufacturer'),
      cardGroup: 'other',
      cell: info => {
        const b = info.row.original;
        return (
          <NameSearch
            label={t('label.manufacturer')}
            hideLabel
            storeId={props.storeId}
            role="manufacturer"
            selected={
              b.manufacturerId
                ? ({
                    id: b.manufacturerId,
                    name: b.manufacturerName ?? '',
                    code: '',
                    isSupplier: false,
                    isDonor: false,
                    isOnHold: false,
                    isStore: false,
                  } satisfies NameOption)
                : undefined
            }
            onSelect={m => {
              updateBatch(b.id, 'manufacturerId', m?.id ?? null);
              updateBatch(b.id, 'manufacturerName', m?.name ?? null);
            }}
          />
        );
      },
    },
    // Campaign/program (Other tab, spec S4) — a single picker; a campaign and a
    // program are mutually exclusive on the line, so choosing one clears the
    // other (the select routes the choice to the right wire field).
    {
      c: { id: 'campaignOrProgram' },
      header: () => t('label.campaign'),
      cardGroup: 'other',
      cell: info => {
        const b = info.row.original;
        return (
          <CampaignOrProgramSelect
            label={t('label.campaign')}
            hideLabel
            storeId={props.storeId}
            itemId={item()?.id ?? ''}
            campaignId={b.campaignId ?? undefined}
            programId={b.programId ?? undefined}
            onChange={choice => {
              updateBatch(b.id, 'campaignId', choice?.campaign?.id ?? null);
              updateBatch(b.id, 'programId', choice?.program?.id ?? null);
            }}
          />
        );
      },
    },
    // Volume per pack (Other tab, spec S4).
    {
      c: { id: 'volumePerPack' },
      header: () => t('label.volume-per-pack'),
      cardGroup: 'other',
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <NumberField
            label={t('label.volume-per-pack')}
            hideLabel
            decimalLimit={10}
            size="small"
            value={b.volumePerPack}
            min={0}
            onChange={v => updateBatch(b.id, 'volumePerPack', v ?? 0)}
          />
        );
      },
    },
    {
      c: { key: 'note' },
      header: () => t('label.note'),
      cardGroup: 'other',
      cell: info => {
        const b = info.row.original;
        return (
          <TextField
            label={t('label.note')}
            hideLabel
            size="small"
            value={b.note}
            onInput={e => updateBatch(b.id, 'note', e.currentTarget.value)}
          />
        );
      },
    },
    {
      c: { id: 'actions' },
      header: () => t('label.actions'),
      meta: { headerPosition: 'badge', align: 'right' },
      cell: info => {
        const b = info.row.original;
        return (
          <>
            <IconButton
              bordered
              size="small"
              icon={<CopyIcon />}
              label={t('label.duplicate-batch')}
              disabled={saving()}
              onClick={() => duplicateBatch(b.id)}
            />
            <IconButton
              bordered
              size="small"
              variant="danger"
              icon={<TrashIcon />}
              label={t('label.delete-batch')}
              disabled={saving()}
              onClick={() => removeBatch(b.id)}
            />
          </>
        );
      },
    },
  ];

  return (
    <Dialog
      open
      dismissable={!saving()}
      onClose={props.onClose}
      size="large"
      testId="add-item-modal"
      title={
        // On a PO-linked shipment, add mode picks a purchase-order line; every
        // other case (manual add, and update mode) shows the item selector — in
        // update mode disabled, so add and edit read as the same surface. Items
        // already on the shipment are NOT filtered out (issue #428). The choice
        // keys off mode(), not the initial prop, so an exhausted update walk
        // that drops into add mode unlocks the selector / shows the PO picker.
        props.purchaseOrderId && mode() === 'add' ? (
          <Select
            label={t('label.purchase-order')}
            testId="purchase-order-line-input"
            value={poLineId()}
            onValueChange={choosePoLine}
            options={poLines().map(l => ({
              value: l.id,
              label: `#${l.lineNumber} ${l.item.name} (${l.item.code}) — ${t(
                'label.pack-size'
              ).toLowerCase()} ${l.requestedPackSize}`,
            }))}
          />
        ) : (
          <ItemSearch
            label={t('label.item')}
            hideLabel
            storeId={props.storeId}
            value={item()?.id}
            selectedItem={item() ?? undefined}
            disabled={mode() === 'update'}
            onSelect={chooseItem}
          />
        )
      }
      ariaLabel={
        mode() === 'update' ? t('label.edit-line') : t('button.add-item')
      }
      headerActions={
        <Show when={!noItemYet()}>
          <Button
            icon={<PlusCircleIcon />}
            data-testid="add-batch-button"
            onClick={addBatch}
          >
            {t('label.add-batch')}
          </Button>
        </Show>
      }
      actionsLead={
        <Show when={errorMessage()}>
          <Alert severity="error">{errorMessage()}</Alert>
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
          <Show when={!noItemYet()}>
            <Button
              variant="secondary"
              data-testid="dialog-button-next-and-ok"
              loading={saving()}
              onClick={() => void onOkNext()}
            >
              {t('button.ok-and-next')}
            </Button>
            <Button
              data-testid="dialog-button-ok"
              loading={saving()}
              onClick={() => void onOk()}
            >
              {t('button.ok')}
            </Button>
          </Show>
        </>
      }
    >
      <Show when={!loadingLines()} fallback={<Spinner center />}>
        <Show
          when={!noItemYet()}
          fallback={
            <Alert severity="info">
              {t('messages.select-item-to-receive')}
            </Alert>
          }
        >
          <>
            {/* Read-only Unit field, follows the selector (spec S4). */}
            <Show when={item()?.unitName}>
              <TextField
                label={t('label.unit')}
                value={item()?.unitName ?? ''}
                disabled
              />
            </Show>
            <Show when={hasMismatch()}>
              <Alert severity="warning">
                {t('messages.received-shipped-mismatch')}
              </Alert>
            </Show>
            <DataTable
              columns={columns()}
              rows={rows()}
              rowKey={b => b.id}
              cardGroups={CARD_GROUPS}
              showFullScreen={false}
              config={tableConfig.config()}
              setConfig={tableConfig.setConfig}
              emptyMessage={t('label.add-batch')}
            />
          </>
        </Show>
      </Show>
    </Dialog>
  );
};

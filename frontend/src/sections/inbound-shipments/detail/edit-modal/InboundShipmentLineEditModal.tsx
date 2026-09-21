import { generateUUID } from '../../../../uuid';
import {
  createMemo,
  createSignal,
  onMount,
  Show,
  type Component,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { formatNumber, getPlural, t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import {
  CancelButton,
  DialogSaveButton,
  SaveAndNextButton,
} from '../../../../ui/elements/buttons/StandardButtons';
import { IconButton } from '../../../../ui/elements/buttons/IconButton';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { CurrencyField } from '../../../../ui/elements/inputs/CurrencyField';
import { DateField } from '../../../../ui/elements/inputs/DateField';
import { localTodayIso } from '../../../../ui/elements/inputs/dateTimeConvert';
import { Spinner } from '../../../../ui/elements/feedback/Spinner';
import { HStack } from '@/ui/layout/Stack/HStack';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import {
  DataTable,
  type Column,
  type CardGroup,
} from '../../../../ui/elements/table/DataTable';
import {
  formatCurrencyCell,
  getNumberCell,
} from '../../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../../api/createTableConfig';
import { CopyIcon, PlusCircleIcon, TrashIcon } from '../../../../ui/icons';
import { ItemSearch, type ItemOption } from '../../../../domain/item';
import {
  createFocusTarget,
  createFocusTargets,
} from '../../../../ui/utils/createFocusTarget';
import {
  LocationVolumeSelect,
  type LocationWithVolume,
} from '../../../../domain/location';
import { VvmStatusSelect } from '../../../../domain/vvmStatus';
import { NameSearch } from '../../../../domain/name';
import { CampaignOrProgramSelect } from '../../../../domain/campaign/CampaignOrProgramSelect';
import { Select } from '../../../../ui/elements/selectors/Select';
import {
  InboundShipmentLines,
  type InboundLineFragment,
  type BatchInboundShipmentVariables,
} from '../inboundShipmentDetail.generated';
import {
  InternalOrderLines,
  type InternalOrderLineRowFragment,
  PurchaseOrderLines,
  type PurchaseOrderLinesResult,
} from '../inboundShipmentLookups.generated';
import { runInboundBatch } from '../inboundShipmentUpdate';
import { requestedQuantityForItem } from '../internalOrderContext';
import styles from './InboundShipmentLineEditModal.module.css';

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
  /**
   * The shipment's linked internal order. Presence alone gates the
   * internal-order banner (spec S4); undefined where there is no such link, or
   * where ./internalOrderContext rules the context out.
   */
  requisitionId?: string;
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
// ONE column set gives two faces — columns in table view, sections in card
// view (the primary receiving panel, then the "Pricing & additional info"
// disclosure). Add mode opens on an item search (manual/transfer) or a
// purchase-order-line picker (PO-linked — a line must cite one); edit
// mode loads the item's existing lines. Each open is a fresh mount (keyed
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
  /** Line authorisation status (spec col 18); null on shipments without it. */
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

// Each auth state's dot class (spec col 18): amber awaiting, green approved,
// red rejected — the colours live in the CSS module, one class per state.
const AUTH_STATUS_CLASS: Record<AuthStatus, string> = {
  PENDING: styles.statusPending,
  PASSED: styles.statusPassed,
  REJECTED: styles.statusRejected,
};

// A small coloured status dot for a Select option adornment. Decorative — the
// option's own text names the state (see the CSS module's note).
const StatusDot = (props: { status: AuthStatus }) => (
  <span
    aria-hidden="true"
    class={`${styles.statusDot} ${AUTH_STATUS_CLASS[props.status]}`}
  />
);

const emptyBatch = (): DraftBatch => ({
  id: generateUUID(),
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

// The card body groups. This modal is card-only (no table view — see the
// createTableConfig default below), and follows the reference design
// (ux-testing/inbound_shipments_modal.html): TWO groups, not three. `batch` is
// the always-shown primary receiving panel — carrying everything the receiver
// touches on arrival, Location included — and it is UNLABELLED (the reference's
// primary zone has no caption, and the card's own header field already reads
// "Batch"). Everything that arrives pre-filled or is confirm-only collapses
// into the single "Pricing & additional info" disclosure — the former separate
// Pricing and Other groups merged. Batch is the card HEADER identity
// (meta.headerPosition), so it isn't itself a body group.
type GroupKey = 'batch' | 'pricing';
const CARD_GROUPS: CardGroup<DraftBatch, GroupKey>[] = [
  {
    key: 'batch',
    panel: true,
    // No narrowLayout — nothing here forces a row count. The fields lay out as
    // the wrapping weighted row: as many to a line as fit at the widths they
    // declare, each free to grow between its own min and max, and whatever is
    // still left over passes to the fields with the most room to give (Location
    // at 1.2, against 1 for the scalars).
    //
    // It used to carry `{ columns: 6 }`, an equal-track grid the fields took
    // spans of. That gave even rows, and a span claims a FRACTION of the row
    // while a declared width does not scale, so the two only agree at one panel
    // width: at 6 tracks a third of a laptop's modal is ~27rem handed to a
    // field that asked for 7.5. Filling that track makes a two-digit count read
    // as a text box; capping it inside the track leaves the difference as a gap
    // between the fields. Both were shipped and both were wrong, because the
    // slack in such a row is `panel − Σ(declared widths)` however the tracks
    // are counted, and the only good place for it is the END of a line — which
    // is what a wrapping row does by construction.
    //
    // What that costs is the alignment the grid was chosen for: when a line
    // wraps, its right edge won't line up with the line above. Accepted
    // knowingly, and mitigated by the ranges above — a line fills by growing
    // its fields within their permitted widths before any slack is left at all.
  },
  {
    key: 'pricing',
    labelKey: 'label.pricing-additional-info',
    panel: true,
    disclosure: 'closed',
    // Likewise none. This group's spans had a second problem the batch panel's
    // did not: they tiled exactly with the track-by-donor preference ON and
    // left a row a quarter empty with it OFF, because one fixed set of spans
    // cannot suit two field counts. A wrapping row has nothing to re-tile.
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
  // The banner's two per-ITEM facts, read off the item's existing lines (every
  // batch carries the same pair, so the first answers for all). Null in add
  // mode: nothing has been supplied yet, so there is genuinely no comment, and
  // the requested quantity falls back to the order's own lines.
  const [loadedRequested, setLoadedRequested] = createSignal<number | null>(
    null
  );
  const [transferComment, setTransferComment] = createSignal<string | null>(
    null
  );
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

  // Each batch row's packs-received field, bound per row and addressed by draft
  // row id — where a row-click open, an advance, or a new batch lands focus.
  // The handle waits for the row to attach, so no load gate is needed here.
  const batchFields = createFocusTargets();

  // The dialog-header slot the DataTable portals its toolbar controls into
  // (DataTable.controlsMount). A ref SIGNAL, not a plain variable: the header
  // renders before the table, so the table must re-read this once the element
  // attaches.
  const [tableControls, setTableControls] = createSignal<HTMLDivElement>();

  // The add-mode top selector — the item search, or the PO-line picker on a
  // PO-linked shipment. ONE handle for both: only one of them is mounted at a
  // time, and the handle simply lands on whichever attaches
  // (ui/utils/createFocusTarget).
  const topSelector = createFocusTarget();

  // Cards by default at every band (compact already forces card; this extends
  // it to desktop). Above the compact breakpoint the DataTable's showCardToggle
  // offers the flip to a table for anyone who prefers it, and setConfig
  // persists that choice per user (#886) — so this seed is only the default.
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
    setLoadedRequested(first.requisitionLine?.requestedQuantity ?? null);
    setTransferComment(first.transferComment);
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
    // A PO-linked shipment's existing lines already cite the order line they
    // fill — inherit it so "Add batch" (another batch for this same item)
    // carries the link automatically, instead of requiring a re-pick that
    // update mode's locked selector doesn't even offer (new batches were
    // otherwise saving with purchaseOrderLineId undefined).
    setPoLineId(first.purchaseOrderLine?.id ?? undefined);
    // Focus the requested batch, else the first row.
    batchFields.focus(focusLineId ?? first.id);
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
    // A fresh item has no line on this shipment, so neither per-item fact
    // carries over from whatever was open before.
    setLoadedRequested(null);
    setTransferComment(null);
    if (!option) {
      setItem(null);
      setBatches([]);
      topSelector.focus();
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
    batchFields.focus(batch.id);
  };

  // The linked order's lines. Fetched once into a plain signal, like the
  // PO-line load below and for the same reason: no createResource, so an item
  // change mid-walk never suspends the open dialog
  // (kdd/solid-reactivity-pitfalls › No remounts on interaction). Needed even
  // though a loaded LINE carries its own `requisitionLine` — in add mode there
  // is no line yet, and this is what tells an item that isn't on the order
  // apart from one that is (OMS-REG-ISH-01.16).
  const [orderLines, setOrderLines] = createSignal<
    InternalOrderLineRowFragment[]
  >([]);
  const loadOrderLines = async () => {
    if (!props.requisitionId) return;
    const result = await graphqlFetch(InternalOrderLines, {
      storeId: props.storeId,
      requisitionId: props.requisitionId,
    });
    if (
      result.kind === 'success' &&
      result.data.requisition.__typename === 'RequisitionNode'
    )
      setOrderLines(result.data.requisition.lines.nodes);
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
    setLoadedRequested(null);
    setTransferComment(null);
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
    batchFields.focus(batch.id);
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
    batchFields.focus(batch.id);
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
    const newId = generateUUID();
    setBatches(
      produce(d => {
        const index = d.findIndex(b => b.id === id);
        if (index >= 0)
          d.splice(index + 1, 0, { ...d[index], id: newId, isNew: true });
      })
    );
    batchFields.focus(newId);
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

  // "2,000 Tablets" — the units the entered packs come to, shown under Packs
  // received. Empty (not "0") when there is nothing to say yet, so a fresh
  // batch carries no noise; the unit name inflects with the count the way every
  // other line editor does (getPlural — English only by design, intlUtils).
  const unitsHint = (b: DraftBatch): string => {
    const units = b.numberOfPacks * b.packSize;
    if (!units) return '';
    const unit = item()?.unitName;
    return unit
      ? `${formatNumber(units, { maximumFractionDigits: 2 })} ${getPlural(unit, units)}`
      : formatNumber(units, { maximumFractionDigits: 2 });
  };

  // Seed on mount: a row open (update mode) loads its item — focusing the
  // clicked batch; an add open starts in the item-search state, focusing the
  // selector. On a PO-linked shipment the order's lines are fetched too (needed
  // whenever the editor is in add mode — the initial open, or after an update
  // walk exhausts). Matches the stocktake editor.
  onMount(() => {
    void loadPoLines();
    void loadOrderLines();
    if (props.initialItemId)
      void loadItemById(props.initialItemId, props.initialLineId);
    else {
      setLoadingLines(false);
      topSelector.focus();
    }
  });

  // Internal-order context (spec S4). Both facts are per ITEM, so they don't
  // move as batches are added or edited, and both are always stated — a dash
  // where there is no value — rather than hidden (OMS-REG-ISH-01.15).
  const requestedQuantity = (): number | undefined =>
    props.requisitionId
      ? requestedQuantityForItem(item()?.id, loadedRequested(), orderLines())
      : undefined;

  // The requested quantity's content, or undefined when the item has no line
  // on the linked order — which gets the neutral notice in its place, the
  // supplier comment staying put beside it (OMS-REG-ISH-01.16). Wrapped rather
  // than handed to `<Show>` bare: a genuine requested quantity of ZERO is a
  // figure, and `<Show when={0}>` would render the not-on-the-order fallback
  // for it.
  const orderContext = () => {
    const requested = requestedQuantity();
    return requested == null ? undefined : { requested };
  };

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
    topSelector.focus();
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

  // Working-size latch (#771): open small in add mode (just the search), grow
  // ONCE when the first item is picked, and never shrink back — clearing the
  // item or "OK & next" returning to the search keeps the working size, so the
  // add loop doesn't pulse. Update mode opens straight at the working size.
  const workingSize = createMemo<boolean>(
    prev => prev || mode() === 'update' || !noItemYet(),
    false
  );

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
      // The card's identity field, captioned "Batch" — a header field is
      // unlabelled by default, so opt the label in. Structural (the card
      // identity): keep it out of the Columns popover.
      meta: {
        headerPosition: 'primary',
        showLabel: true,
        hideFromColumnSettings: true,
      },
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
      header: () => t('label.packs-received'),
      cardGroup: 'batch',
      ...getNumberCell({ cardWidth: { min: 7.5, max: 9, weight: 1 } }),
      cell: info => {
        const b = info.row.original;
        return (
          <>
            <NumberField
              ref={batchFields.ref(b.id)}
              label={t('label.packs-received')}
              hideLabel
              size="small"
              value={b.numberOfPacks}
              min={0}
              // Packs are received in fractions (a part-full pack) —
              // numberOfPacks is Float on the wire; match the reference 2-dp
              // room (spec S4).
              decimalLimit={2}
              onChange={v => updateBatch(b.id, 'numberOfPacks', v ?? 0)}
            />
            {/* Units received, as a HINT under the packs figure rather than a
                field of its own (reference design). It is packs × pack size —
                derived, never typed — so a whole labelled input for it cost the
                row ~140px that the fields either side of it needed.
                Rendered only when there IS a figure. It used to render always,
                empty, so the card's height never changed as the user typed —
                but a flex line is as tall as its tallest cell, so an empty hint
                reserved 20px (1rem + its margin) on every line holding this
                field. Against a 12px row gap that made the space between the
                first and second row of fields read as ~32px: nearly three times
                the gap, and the reason the card looked loosely spaced. The cost
                is a one-time shift of the rows below when the first pack count
                is entered. */}
            <Show when={unitsHint(b)}>
              {hint => <span class={styles.unitsHint}>{hint()}</span>}
            </Show>
          </>
        );
      },
    },
    // Packs shipped, and the Difference it implies, sit immediately beside
    // Packs received — the comparison the receiver is actually making
    // (reference design). Supplier-declared quantities are manual-shipment only
    // (spec S4); they also feed the received-vs-shipped mismatch warning.
    ...(!props.purchaseOrderId
      ? [
          {
            c: { id: 'shippedNumberOfPacks' },
            header: () => t('label.shipped-number-of-packs'),
            cardGroup: 'batch',
            ...getNumberCell({ cardWidth: { min: 7.5, max: 9, weight: 1 } }),
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
          // Difference (computed) — shipped minus received, the SAME direction
          // the detail table's Difference column reports (H6), so the two never
          // disagree in sign. Blank until the supplier's shipped figure is
          // entered; there is nothing to compare against before that.
          {
            c: { id: 'difference' },
            header: () => t('label.difference'),
            cardGroup: 'batch',
            // A read-only VALUE, not a disabled input — the absence of a box
            // is what says read-only (kdd/form-layout, and the outbound line
            // editor's Available figure does the same beside its Issue
            // fields). `disabled` means "an input you can't use right now",
            // which is what a locked Cost price is; a difference is arithmetic
            // and is never typed, so greying it conflates the two. Sized to the
            // input row so the columns still line up.
            ...getNumberCell({ cardWidth: { min: 5, max: 6, weight: 1 } }),
            cell: info => {
              const b = info.row.original;
              // A getter, not a hoisted const: read inside JSX it stays
              // tracked, so the figure and its tone follow the draft store as
              // the receiver types (kdd/solid-reactivity-pitfalls).
              const diff = () =>
                b.shippedNumberOfPacks === undefined
                  ? undefined
                  : b.shippedNumberOfPacks - b.numberOfPacks;
              return (
                <span
                  class={styles.statValue}
                  // Weight, and only when there IS a discrepancy. The card
                  // already says "computed, not typed" by having no box, so a
                  // permanent emphasis would restate that; what nothing else
                  // says per-batch is WHICH batch is out — the mismatch Alert
                  // sits above all the cards and can't name one. Zero and "no
                  // figure yet" stay regular, because they are non-events.
                  data-signal={diff() ? '' : undefined}
                >
                  {/* Nothing shipped recorded yet ⇒ nothing to compare
                      against. An em dash rather than blank, matching every
                      other read-only "no value" in the vertical (the side
                      panel's Currency / Shipping method / Transport ref). */}
                  {diff() === undefined
                    ? '—'
                    : // An explicit + on an over-receipt (a negative
                      // already carries its own sign), so the direction of the
                      // discrepancy reads without any colour doing the work.
                      // The mismatch Alert above the cards carries the alarm;
                      // this stays a figure among figures.
                      `${diff()! > 0 ? '+' : ''}${formatNumber(diff()!, {
                        maximumFractionDigits: 2,
                      })}`}
                </span>
              );
            },
          } satisfies Column<DraftBatch, never, GroupKey>,
        ]
      : []),
    {
      c: { key: 'packSize' },
      header: () => t('label.received-pack-size'),
      cardGroup: 'batch',
      ...getNumberCell({ cardWidth: { min: 8.75, max: 10.5, weight: 1 } }),
      cell: info => {
        const b = info.row.original;
        return (
          <NumberField
            label={t('label.received-pack-size')}
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
    // Shipped pack size follows the received one so the two pack sizes read as
    // a pair (manual shipments only, like Packs shipped above).
    ...(!props.purchaseOrderId
      ? [
          {
            c: { id: 'shippedPackSize' },
            header: () => t('label.shipped-pack-size'),
            cardGroup: 'batch',
            ...getNumberCell({
              cardWidth: { min: 8.75, max: 10.5, weight: 1 },
            }),
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
    // Units received (spec S4) is NOT a field — it rides as the hint under
    // Packs received (see that column). It stays a TABLE column, though: table
    // view has no room for a hint under a cell, and a column there costs the
    // card nothing.
    {
      c: {
        accessor: b => b.numberOfPacks * b.packSize,
        id: 'unitsReceived',
      },
      header: () =>
        t('label.units-received', {
          unit: item()?.unitName ?? t('label.units'),
        }),
      // hideOnCard rides INSIDE getNumberCell's meta argument — a `meta:` field
      // of our own would be overwritten by the spread that follows it, which is
      // exactly what put a stray "Tab received" above the card's panel.
      ...getNumberCell({ hideOnCard: true }),
    },
    {
      c: { key: 'expiryDate' },
      header: () => t('label.expiry'),
      cardGroup: 'batch',
      meta: { cardWidth: { min: 10, max: 11.5, weight: 1 } },
      cell: info => {
        const b = info.row.original;
        return (
          <DateField
            label={t('label.expiry')}
            hideLabel
            size="small"
            value={b.expiryDate}
            onChange={v => updateBatch(b.id, 'expiryDate', v)}
          />
        );
      },
    },
    // Location rides the PRIMARY panel, not the disclosure (reference design):
    // where the stock is put away is decided at the moment of receipt, so the
    // receiver needs it in front of them alongside expiry — not one click down.
    {
      c: { id: 'location' },
      header: () => t('label.location'),
      cardGroup: 'batch',
      // 12.5–36rem, weight 2 (ui-standards § Field Widths by Content Type).
      // The WEIGHT is what decides its width on a line it shares: with
      // flex-basis 0 each field takes weight/Σweights of the line, so at the
      // 1.2 it used to carry it got barely more of a shared line than a date
      // field did, and a `code — name` value came out ~15rem while its ceiling
      // sat unused at 36. Two says what is true — a lookup's value runs several
      // times longer than any scalar beside it. A location renders as
      // `code — name` ("fr — Central
      // Regional Medical Logistics & …"), so its length is UNPREDICTABLE, which
      // is what puts a field in that group — it is not the short pick from a
      // fixed list that VVM and Auth status are. The 8rem floor it carried left
      // ~4.5rem of text once the picker's own clear and chevron were paid for,
      // about nine characters, and a browser narrowed a little took it there.
      meta: { cardWidth: { min: 12.5, max: 36, weight: 2 } },
      cell: info => {
        const b = info.row.original;
        return (
          <LocationVolumeSelect
            label={t('label.location')}
            hideLabel
            size="small"
            locations={props.locations}
            value={b.locationId ?? undefined}
            requiredVolume={b.volumePerPack * b.numberOfPacks}
            onChange={loc => updateBatch(b.id, 'locationId', loc?.id ?? null)}
          />
        );
      },
    },
    // Auth status — the line's authorisation state, editable when
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
            // A pick from a fixed list, so its longest value is known — a
            // tight scalar range at weight 1, not the lookup range (see
            // Location for the distinction).
            meta: { cardWidth: { min: 10, max: 12, weight: 1 } },
            cell: info => {
              const b = info.row.original;
              // The styled Kobalte Select (not a Combobox — no point searching
              // a fixed three-value list). size="small" matches the neighbouring
              // per-batch fields' height, and the coloured option dots — which a
              // native <option> can't render — read the state at a glance. A
              // brand-new line can't carry a status on insert (the server
              // assigns Pending), so it stays read-only.
              return (
                <Select
                  label={t('label.auth-status')}
                  hideLabel
                  size="small"
                  value={b.status ?? 'PENDING'}
                  disabled={b.isNew}
                  options={[
                    {
                      value: 'PENDING',
                      label: t('label.pending'),
                      adornment: <StatusDot status="PENDING" />,
                    },
                    {
                      value: 'PASSED',
                      label: t('label.passed'),
                      adornment: <StatusDot status="PASSED" />,
                    },
                    {
                      value: 'REJECTED',
                      label: t('label.rejected'),
                      adornment: <StatusDot status="REJECTED" />,
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
            ...getNumberCell({ cardWidth: { min: 7.5, max: 9, weight: 1 } }),
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
    // VVM status — gated by the manage-VVM preference AND a vaccine
    // item (VVM applies to vaccines only, spec AC-PG1 / M1).
    ...(props.prefs.vvm && item()?.isVaccine
      ? [
          {
            c: { id: 'vvmStatus' },
            header: () => t('label.vvm-status'),
            cardGroup: 'batch',
            // A pick from a fixed list, like Auth status: the longest value is
            // known, so a tight scalar range at weight 1 rather than the
            // lookup range.
            meta: { cardWidth: { min: 10, max: 12, weight: 1 } },
            cell: info => {
              const b = info.row.original;
              return (
                <VvmStatusSelect
                  label={t('label.vvm-status')}
                  hideLabel
                  size="small"
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
      ...getNumberCell({ cardWidth: { min: 10, max: 12, weight: 1 } }),
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
      ...getNumberCell({ cardWidth: { min: 10, max: 12, weight: 1 } }),
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
      // A read-only value, like Difference — packs × cost price is derived,
      // never typed.
      // 8, not the 5 a small count takes: this is a CURRENCY total, and at 5rem
      // (80px) "$19,536,000.00" wrapped onto a second line in the wide template,
      // where the track is fixed and cannot grow. The 3rem comes out of Note's
      // floor below rather than being added, so the group's minima — and with
      // them the width at which it drops to the narrow grid — do not move; Note
      // is weighted and grows past its floor anyway, so it loses nothing.
      ...getNumberCell({ cardWidth: { min: 8, max: 10, weight: 1 } }),
      cell: info => {
        const b = info.row.original;
        return (
          <span class={styles.statValue}>
            {formatCurrencyCell(b.numberOfPacks * b.costPricePerPack)}
          </span>
        );
      },
    },
    // Donor — gated by the donor-tracking preference.
    ...(props.prefs.donor
      ? [
          {
            c: { id: 'donor' },
            header: () => t('label.donor'),
            cardGroup: 'pricing',
            meta: { cardWidth: { min: 12.5, max: 36, weight: 2 } },
            cell: info => {
              const b = info.row.original;
              return (
                <NameSearch
                  label={t('label.donor')}
                  hideLabel
                  size="small"
                  storeId={props.storeId}
                  role="donor"
                  selected={
                    b.donorId
                      ? {
                          id: b.donorId,
                          name: b.donorName ?? '',
                        }
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
    // Campaign/program (spec S4) — a single picker; a campaign and a
    // program are mutually exclusive on the line, so choosing one clears the
    // other (the select routes the choice to the right wire field).
    {
      c: { id: 'campaignOrProgram' },
      header: () => t('label.campaign'),
      cardGroup: 'pricing',
      meta: { cardWidth: { min: 12.5, max: 36, weight: 2 } },
      cell: info => {
        const b = info.row.original;
        return (
          <CampaignOrProgramSelect
            label={t('label.campaign')}
            hideLabel
            size="small"
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
    {
      c: { key: 'manufactureDate' },
      header: () => t('label.manufacture-date'),
      cardGroup: 'pricing',
      meta: { cardWidth: { min: 10, max: 11.5, weight: 1 } },
      cell: info => {
        const b = info.row.original;
        return (
          <DateField
            label={t('label.manufacture-date')}
            hideLabel
            size="small"
            value={b.manufactureDate}
            max={localTodayIso()}
            onChange={v => updateBatch(b.id, 'manufactureDate', v)}
          />
        );
      },
    },
    // Manufacturer (spec S4) — a name lookup, manufacturer role. In the
    // "Pricing & additional info" disclosure, not the primary receiving panel.
    // It sits on the group's own stated line — "everything that arrives
    // pre-filled or is confirm-only" (see CARD_GROUPS) — which is exactly what
    // its own note used to say while claiming the primary panel anyway: it
    // arrives pre-filled and is confirm-only.
    //
    // The move is a WIDTH decision as much as a grouping one. The primary
    // panel's floors are what decide whether it holds its declared-width
    // template, and at eight fields they came to ~72.5rem — more than a
    // full-screen modal has on a narrower laptop, so the panel dropped to the
    // equal-track fallback and its fields either filled tracks several times
    // their size or (capped) left the leftover as a gap. Taking Manufacturer
    // out drops the panel to seven fields and ~61.5rem, which a ~1000px panel
    // can pay, so the fields it leaves behind are sized by their data again.
    // The reference design (ux-testing/inbound_shipments_modal.html) keeps its
    // own primary zone to about this count for the same reason.
    {
      c: { id: 'manufacturer' },
      header: () => t('label.manufacturer'),
      cardGroup: 'pricing',
      // A name lookup of unpredictable length ("Serum Institute of India
      // Pvt. Ltd.") — the lookup range, as Donor and Campaign carry above; see
      // Location for the range's reasoning.
      meta: { cardWidth: { min: 12.5, max: 36, weight: 2 } },
      cell: info => {
        const b = info.row.original;
        return (
          <NameSearch
            label={t('label.manufacturer')}
            hideLabel
            size="small"
            storeId={props.storeId}
            role="manufacturer"
            selected={
              b.manufacturerId
                ? {
                    id: b.manufacturerId,
                    name: b.manufacturerName ?? '',
                  }
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
    // Volume per pack (spec S4).
    {
      c: { id: 'volumePerPack' },
      header: () => t('label.volume-per-pack'),
      cardGroup: 'pricing',
      ...getNumberCell({ cardWidth: { min: 10, max: 12, weight: 1 } }),
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
      cardGroup: 'pricing',
      meta: { cardWidth: { min: 12.5, weight: 3 } },
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
      // Structural row-actions column — not user-configurable, so keep it out
      // of the Columns popover.
      meta: {
        headerPosition: 'badge',
        align: 'right',
        hideFromColumnSettings: true,
      },
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
      size={workingSize() ? 'full' : 'auto'}
      // `full`, not `large`: this line table is the app's widest at 21
      // columns, so there is no card width that fits it. #771's "~900px if
      // the tables fit" does NOT fit here — narrowing only pushes columns out
      // of view, and the empty space it was filed against is VERTICAL, which
      // the workbench's 60-80vh height band already answers. Recorded as a
      // deliberate deviation from the 900px modal standard in the
      // DESIGN_STANDARDS ledger.
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
      title={
        // The selector, and the item's unit beside it — the registry's dialog
        // context row (a read-only labelled fact stating what the dialog acts
        // on, sized to itself and hugged to the inline-start).
        <HStack gap="md" align="center">
          {/* On a PO-linked shipment, add mode picks a purchase-order line;
              every other case (manual add, and update mode) shows the item
              selector — in update mode disabled, so add and edit read as the
              same surface. Items already on the shipment are NOT filtered out
              (issue #428). The choice keys off mode(), not the initial prop, so
              an exhausted update walk that drops into add mode unlocks the
              selector / shows the PO picker. */}
          <div
            class={styles.headerPicker}
            classList={{
              [styles.headerPickerBounded ?? '']: workingSize(),
            }}
          >
            {props.purchaseOrderId && mode() === 'add' ? (
              <Select
                label={t('label.purchase-order')}
                testId="purchase-order-line-input"
                focusTarget={topSelector}
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
                focusTarget={topSelector}
                value={item()?.id}
                selectedItem={item() ?? undefined}
                disabled={mode() === 'update'}
                // No clear affordance: a shipment line always HAS an item, so
                // the field is never nullable — it is changed by picking
                // another, never emptied (D5, clearability follows optionality
                // — spec/DIVERGENCES.md; as prescriptions' patient picker).
                clearable={false}
                onSelect={chooseItem}
              />
            )}
          </div>
          {/* Unit is item master data and the denominator for every quantity in
              the cards below, so it rides the header rather than spending a
              whole field row of the batch area on one word (#872). Laid out
              INLINE: stacked, "Unit" over a one-word value cost the header a
              second line for a single word, which pushed the whole card down. */}
          <Show when={item()?.unitName}>
            {unitName => (
              <LabelledValue
                class={styles.headerUnit}
                label={t('label.unit')}
                variant="field"
                layout="inline"
                size="small"
              >
                {unitName()}
              </LabelledValue>
            )}
          </Show>
        </HStack>
      }
      ariaLabel={
        mode() === 'update' ? t('label.edit-line') : t('button.add-item')
      }
      headerActions={
        <>
          {/* The table's own controls (card/table view · Columns · Settings),
              lifted onto this row by DataTable's controlsMount — they sat in a
              toolbar of their own a few pixels above the cards, spending a
              whole row of a modal whose vertical space is the scarce axis.
              Inline-start of Add batch: view/column plumbing before the action
              that changes the data. Empty (and invisible) until an item is
              picked, since the table only exists then. */}
          <div ref={setTableControls} class={styles.headerTableControls} />
          <Show when={!noItemYet()}>
            <Button
              icon={<PlusCircleIcon />}
              data-testid="add-batch-button"
              onClick={addBatch}
            >
              {t('label.add-batch')}
            </Button>
          </Show>
        </>
      }
      actionsLead={
        <Show when={errorMessage()}>
          <Alert severity="error">{errorMessage()}</Alert>
        </Show>
      }
      actions={
        // The standard dialog three, in spec S4's order: Cancel · Save ·
        // Save & next. Icon-less verbs (D55) — never OK / OK & next.
        <>
          <CancelButton
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          />
          <Show when={!noItemYet()}>
            <DialogSaveButton
              data-testid="dialog-button-ok"
              loading={saving()}
              onClick={() => void onOk()}
            />
            <SaveAndNextButton
              data-testid="dialog-button-next-and-ok"
              loading={saving()}
              onClick={() => void onOkNext()}
            />
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
          {/* Unit is a labelled fact in the header now, not a field row here. */}
          <>
            {/* Internal-order context (spec S4). An item with no line on the
                order swaps the requested quantity for the neutral notice but
                KEEPS the supplier comment: the supplying store often uses it to
                say why an unordered item was included, which is exactly the
                case where the reader has no other explanation. Absent on a
                shipment with no internal-order link, and — via the enclosing
                no-item fallback — until an item is chosen in add mode. */}
            <Show when={props.requisitionId}>
              <div class={styles.orderContext}>
                <Alert severity={orderContext() ? 'info' : 'neutral'}>
                  <HStack gap="lg" align="center" wrap>
                    <Show
                      when={orderContext()}
                      fallback={t('messages.item-not-on-internal-order')}
                    >
                      {context => (
                        <LabelledValue
                          label={t('label.requested-quantity')}
                          variant="field"
                          layout="inline"
                          size="small"
                          data-testid="requested-quantity-value"
                        >
                          {/* Unit name after the figure, inflected with the
                              count (getPlural, as unitsHint) — so the banner
                              reads like the requisition editors' quantities. */}
                          {(() => {
                            const unit = item()?.unitName;
                            const requested = context().requested;
                            return unit
                              ? `${formatNumber(requested)} ${getPlural(unit, requested)}`
                              : formatNumber(requested);
                          })()}
                        </LabelledValue>
                      )}
                    </Show>
                    <LabelledValue
                      label={t('label.supplier-comment')}
                      variant="field"
                      layout="inline"
                      size="small"
                      data-testid="supplier-comment-value"
                    >
                      {/* Always stated, dash and all: an empty comment on a
                          short supply is itself worth seeing. */}
                      {transferComment() || '—'}
                    </LabelledValue>
                  </HStack>
                </Alert>
              </div>
            </Show>
            <Show when={hasMismatch()}>
              <Alert severity="warning">
                {t('messages.received-shipped-mismatch')}
              </Alert>
            </Show>
            <div class={styles.cards}>
              <DataTable
                columns={columns()}
                rows={rows()}
                rowKey={b => b.id}
                cardGroups={CARD_GROUPS}
                showCardToggle
                showFullScreen={false}
                config={tableConfig.config()}
                setConfig={tableConfig.setConfig}
                controlsMount={tableControls()}
                emptyMessage={t('label.add-batch')}
              />
            </div>
          </>
        </Show>
      </Show>
    </Dialog>
  );
};

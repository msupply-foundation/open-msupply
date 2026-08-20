import { generateUUID } from '@/uuid';
import { createMemo, createSignal, onMount, Show, type JSX } from 'solid-js';
import { createStore, produce, reconcile, unwrap } from 'solid-js/store';
import { graphqlFetch } from '@/api/graphql';
import { t, tPlural } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import {
  createFocusTarget,
  createFocusTargets,
} from '@/ui/utils/createFocusTarget';
import { createAction } from '@/ui/utils/keyActions';
import { PLUS } from '@/ui/utils/shortcuts';
import { Alert } from '@/ui/elements/feedback/Alert';
import { EmptyState } from '@/ui/elements/feedback/EmptyState';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import {
  CancelButton,
  DialogSaveButton,
  SaveAndNextButton,
} from '@/ui/elements/buttons/StandardButtons';
import { HStack } from '@/ui/layout/Stack/HStack';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { TextField } from '@/ui/elements/inputs/TextField';
import { DateField } from '@/ui/elements/inputs/DateField';
import { localTodayIso } from '@/ui/elements/inputs/dateTimeConvert';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { CurrencyField } from '@/ui/elements/inputs/CurrencyField';
import { BareCheckbox } from '@/ui/elements/inputs/BareCheckbox';
import {
  DataTable,
  type Column,
  type CardGroup,
} from '@/ui/elements/table/DataTable';
import { getNumberCell } from '@/ui/elements/table/tableHelpers';
import { createTableConfig } from '@/api/createTableConfig';
import {
  LocationVolumeSelect,
  type LocationWithVolume,
} from '@/domain/location';
import { ReasonSelect, reasonMatchesKind } from '@/domain/reasonOptions';
import { ItemSearch } from '@/domain/item';
import { VvmStatusSelect } from '@/domain/vvmStatus';
import { NameSearch } from '@/domain/name';
import { CampaignOrProgramSelect } from '@/domain/campaign';
import { stocktakePreferences } from '@/store/storeContext';
import { dosesCounted } from '../lines/doses';
import { defaultedPackSize, packSizeEditable } from '../lines/stocktakeLine';
import { PlusCircleIcon, TrashIcon, CopyIcon } from '@/ui/icons';
import {
  StockLinesByItem,
  StocktakeLines,
  type StocktakeLineFragment,
  type StockLinesByItemResult,
} from '../lines/stocktakeDetail.generated';
import {
  runBatchStocktakeLines,
  type BatchStocktakeLinesInput,
  type LineEditCommit,
} from '../lines/stocktakeLineUpdate';
import type { LineErrors } from '../lines/stocktakeLineErrors';
import styles from './StocktakeLineEditModal.module.css';

// The stocktake line-edit modal (kdd/edit-line-card-table +
// kdd/stocktake-line-editing). It edits ALL of one ITEM's lines (batches) at
// once — each batch is one row / one card. The grouped DataTable gives two
// faces from ONE column set: columns in table view, sections in card view (the
// primary counting panel, then the "Pricing & additional info" disclosure —
// matching the inbound-shipment line editor). Edits live in a local draft
// STORE; Save partitions the draft into one batchStocktake mutation and — on
// success — asks the detail view to refetch the current lines page (onSaved).
// No splice-in-place: the page re-pulls.
//
// COMBINED add/edit (no mode flag): the item selector lives in the title the
// whole time. Picking an item loads THAT item's data from the API — its
// existing stocktake lines (stocktakeLines filtered by itemId) PLUS its other
// stock lines (stockLinesByItem) — so the modal self-queries rather than being
// fed lines as props. An item already on the stocktake loads its counted lines;
// a brand-new item starts a fresh count. The search shows EVERY item (no
// exclusion).
//
// The parent tells the modal only which item to OPEN on (initialItemId, from a
// row click) or none (Add item → start in the search state), plus the current
// list filter/sort so "OK & next" can step through the SAME server order the
// table shows.

// LineEditCommit is re-exported (imported above) so existing importers keep
// resolving it from this module.
export type { LineEditCommit };

export type StocktakeLineEditItem = {
  id: string;
  code: string;
  name: string;
  // The vaccine flag + doses-per-unit the doses display needs (spec/stocktakes
  // › store-preference gates). Carried on the descriptor so a fresh blank batch
  // (addBatch) and a new-item pick both know them without a re-fetch.
  isVaccine: boolean;
  doses: number;
  /** Read-only, shown beside the header item picker (inbound's Unit field). */
  unitName: string | null;
  /**
   * Seeds an editable batch's pack size (OMS-REG-INV-03.79/.80): a fresh blank
   * batch starts at it, and a zero-stock item's generated line with no pack
   * size is prefilled with it on load (defaultedPackSize).
   */
  defaultPackSize: number;
};

// One of the item's stock lines (from stockLinesByItem).
type ItemStockLine = Extract<
  StockLinesByItemResult['stockLines'],
  { __typename: 'StockLineConnector' }
>['nodes'][number];

// A draft row: the line fragment plus client-only bookkeeping (see the original
// notes) — isNew / stockLineId / countThisLine / deleted.
type DraftLine = Omit<StocktakeLineFragment, 'volumePerPack'> & {
  isNew?: boolean;
  stockLineId?: string;
  countThisLine: boolean;
  deleted?: boolean;
  // The wire fragment types volumePerPack non-null (defaults 0 on the server),
  // but the editor lets the user CLEAR it — an empty input persists no volume.
  // So the draft widens it to nullable; the input types accept null too.
  volumePerPack: number | null;
};

// The adjustment DIRECTION of a line's count: counted MORE than snapshot is a
// positive adjustment, FEWER is negative, and equal (or not yet counted) is no
// adjustment (null). This drives which reason options the picker offers and
// whether it's enabled — a UI mirror of the server's direction rule
// (spec/stocktakes/rules.md §adjustment-reason rules). The reason itself stays
// server-validated; this only narrows the choices to help the user.
const adjustmentDirection = (
  line: DraftLine
): 'positive' | 'negative' | null => {
  const counted = line.countedNumberOfPacks;
  if (counted == null) return null;
  const delta = counted - (line.snapshotNumberOfPacks ?? 0);
  if (delta > 0) return 'positive';
  if (delta < 0) return 'negative';
  return null;
};

// How many lines/stock lines to pull for one item (a single item never has many
// batches — one page covers it).
const ITEM_LINES_PAGE = 500;

// Fetch one item's EXISTING stocktake lines (server-filtered by itemId). The
// modal self-queries these rather than receiving them as props. Returns [] on a
// failed/empty fetch.
const fetchExistingLines = async (
  storeId: string,
  stocktakeId: string,
  itemId: string
): Promise<StocktakeLineFragment[]> => {
  const result = await graphqlFetch(StocktakeLines, {
    storeId,
    stocktakeId,
    filter: { itemId: { equalTo: itemId } },
    page: { first: ITEM_LINES_PAGE },
  });
  return result.kind === 'success' ? result.data.stocktakeLines.nodes : [];
};

// How many lines one presence probe may return: a page of search results is
// ~30 items at a handful of batches each, so this is never expected to bind.
const PRESENCE_PROBE_PAGE = 1000;

// The add-item search's already-on-stocktake probe (the "In stocktake"
// option badge): one membership query per fetched page of options — the same
// stocktakeLines query the editor loads items with, filtered to that page's
// item ids; the distinct item ids of the returned lines are the hits.
// undefined on a failed fetch → that page just goes unmarked (graphqlFetch
// already surfaced the error).
const probePresentItems = async (
  storeId: string,
  stocktakeId: string,
  itemIds: string[]
): Promise<string[] | undefined> => {
  const result = await graphqlFetch(StocktakeLines, {
    storeId,
    stocktakeId,
    filter: { itemId: { equalAny: itemIds } },
    page: { first: PRESENCE_PROBE_PAGE },
  });
  if (result.kind !== 'success') return undefined;
  return [
    ...new Set(result.data.stocktakeLines.nodes.map(line => line.item.id)),
  ];
};

// Fetch the item's other batches (stock lines NOT already on the stocktake) and
// build the draft rows: the existing lines (counted-in → countThisLine true)
// PLUS those stock lines (linked to their stockLineId — ticking one inserts
// it). countThisLine for the stock lines is `countByDefault`: opt-in (false)
// when the item already has lines on the stocktake, all-counted (true) for a
// brand-new item (adding it means counting all its batches) — matching OMS.
const buildDraft = async (
  storeId: string,
  item: StocktakeLineEditItem,
  existing: StocktakeLineFragment[],
  countByDefault: boolean
): Promise<DraftLine[]> => {
  const result = await graphqlFetch(StockLinesByItem, {
    storeId,
    itemId: item.id,
    excludeStockLineIds: existing
      .map(line => line.stockLine?.id)
      .filter((id): id is string => id != null),
  });
  const stockLines: ItemStockLine[] =
    result.kind === 'success' &&
    result.data.stockLines.__typename === 'StockLineConnector'
      ? result.data.stockLines.nodes
      : [];

  const fromExisting: DraftLine[] = existing.map(line => ({
    ...line,
    countThisLine: true,
    // A line with no stock behind it and no pack size yet — a zero-stock
    // item's generated line — is prefilled with the item's default pack size
    // (OMS-REG-INV-03.80), so an ordinary count-and-save persists a usable
    // pack size instead of the empty one finalise chokes on (issue #1173).
    // Stock-backed lines keep their stock's pack size untouched.
    packSize: packSizeEditable(line)
      ? defaultedPackSize(item, line.packSize)
      : line.packSize,
  }));
  const fromStock: DraftLine[] = stockLines.map(sl => ({
    id: generateUUID(),
    isNew: true,
    stockLineId: sl.id,
    countThisLine: countByDefault,
    stockLine: { id: sl.id },
    itemName: item.name,
    item: {
      id: item.id,
      code: item.code,
      // A draft batch opted in from stock has no persisted unit yet; the Unit
      // column reads it off saved lines (the server fills it on save).
      unitName: null,
      isVaccine: item.isVaccine,
      doses: item.doses,
      defaultPackSize: item.defaultPackSize,
    },
    batch: sl.batch,
    expiryDate: sl.expiryDate,
    manufactureDate: sl.manufactureDate,
    snapshotNumberOfPacks: sl.totalNumberOfPacks,
    countedNumberOfPacks: null,
    packSize: sl.packSize,
    sellPricePerPack: sl.sellPricePerPack,
    costPricePerPack: sl.costPricePerPack,
    comment: null,
    note: sl.note,
    volumePerPack: sl.volumePerPack,
    location: sl.location,
    reasonOption: null,
    // Seed VVM / donor (preference-gated) and manufacturer / campaign / program
    // (ungated) from the stock line the batch opts in, so ticking an existing
    // batch pre-fills them.
    vvmStatus: sl.vvmStatus,
    donorId: sl.donor?.id ?? null,
    donorName: sl.donor?.name ?? null,
    manufacturer: sl.manufacturer,
    campaign: sl.campaign,
    program: sl.program,
  }));
  return [...fromExisting, ...fromStock];
};

// The card body groups. This modal is card-only (no table view — see the
// createTableConfig default below), and matches the inbound-shipment line
// editor: TWO groups, not three, and no group icons. `batch` is the
// always-shown primary counting panel and is UNLABELLED — the card's own header
// field already reads "Batch", so a "Batch" caption directly above it was the
// same word twice. Everything that isn't part of the count itself collapses
// into the single "Pricing & additional info" disclosure — the former separate
// Pricing and Other groups merged. Batch is the card HEADER identity
// (meta.headerPosition), so it isn't itself a body group.
type GroupKey = 'batch' | 'pricing';
const CARD_GROUPS: CardGroup<DraftLine, GroupKey>[] = [
  {
    key: 'batch',
    panel: true,
    // TWELVE tracks, not the inbound editor's six — worked out from THIS group's
    // fields (see CardGroup.narrowLayout). Six cannot express the split these six
    // fields want at all: a date needs 2 of 6 (13rem), and a row of four with a
    // date in it then overflows. Twelve is finer than the ten that first fit,
    // because the counting fields do NOT all want the same box — Packs counted is
    // the one field on the card the user actually types into, and Pack size is
    // read-only on existing stock and holds "1". So the counting row is 3/3/2/4
    // rather than an even 2/2/2/4 — the two packs figures MATCHED, because they
    // are read against each other and a mismatched pair reads as a mistake, with
    // the pack size beside them at two — and the row under it is 8+4, which also
    // buys Location its widest yet (~27rem).
    narrowLayout: { columns: 12 },
  },
  {
    key: 'pricing',
    labelKey: 'label.pricing-additional-info',
    panel: true,
    disclosure: 'closed',
    // Twelve, as the batch panel above — one card should not read as two
    // different grids. Its own fields happen to want the same count: the three
    // money/volume figures at 4 each, then the four long lookups and text fields
    // in pairs at 6. Donor pairs like the rest; Comment takes the full row, which
    // is what absorbs the PARITY Donor changes — an extra 6-span field flips
    // whether the 6s pair off evenly, and Comment is the one field here that
    // reads fine at either width. So the rows tile exactly with the donor
    // preference ON (the pairs run Donor+Campaign, Manufacturer+Note, then
    // Comment); with it off, the Note row is left half empty.
    narrowLayout: { columns: 12 },
  },
];

// Resolve the next item to step to in UPDATE mode ("OK & next"). Owned by the
// PARENT (the list is server-paginated — the next item may be on a later page,
// and finding it advances the detail table forward): given the current item id
// and the set of items already covered THIS iteration, it returns the next
// distinct uncovered item in the parent's filtered/sorted order, or undefined
// when the list is exhausted (→ the modal drops into add mode).
export type ResolveNextItem = (
  currentId: string,
  covered: Set<string>
) => Promise<StocktakeLineEditItem | undefined>;

interface StocktakeLineEditModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  stocktakeId: string;
  /**
   * The item this open STARTS on (a row click) → UPDATE mode. Omitted for "Add
   * item" → the modal opens in add mode (item-search state). The modal tracks
   * its own current item as the user advances with "OK & next".
   */
  initialItemId?: string;
  /**
   * The clicked BATCH (stocktake-line id) for a row-click open — the editor
   * scrolls it into view and focuses its count on open. Omitted for "Add item"
   * (and irrelevant after an "OK & next" advance, which focuses the first row).
   */
  initialLineId?: string;
  /**
   * UPDATE mode "OK & next": resolve the next item to edit (parent-owned; pages
   * the detail table forward as needed). See ResolveNextItem.
   */
  nextItem: ResolveNextItem;
  /**
   * The store's locations WITH capacity, fetched by the detail view and passed
   * down (the picker owns no cache — volumeUsed goes stale, so the view
   * re-reads it after every save). The line editor's location field is
   * volume-aware.
   */
  locations: LocationWithVolume[];
  /** True while the view's location fetch is in flight. */
  locationsLoading?: boolean;
  /**
   * Fired after a successful save so the detail view refetches the current
   * lines page (no splice-in-place).
   */
  onSaved: () => void;
}

// The parent-facing wrapper: mount the editor ONLY while open. `<Show keyed>`
// tears the content down on close and rebuilds it on the next open, so each
// OPEN starts fresh. Within one open the content owns its current item
// (advancing via "OK & next" is imperative — see loadItemById/selectItem — not
// a prop change).
//
// The keyed `when` is the OPEN identity: the initial item id when opened from a
// row, or the literal 'add' when opened from "Add item" (no initial item). A
// stale close leaves `open` false, so the key is falsy and the content
// unmounts.
export const StocktakeLineEditModal = (
  props: StocktakeLineEditModalProps
): JSX.Element => (
  <Show when={props.open && (props.initialItemId ?? 'add')} keyed>
    {openKey => (
      <StocktakeLineEditContent
        onClose={props.onClose}
        storeId={props.storeId}
        stocktakeId={props.stocktakeId}
        // 'add' sentinel → no initial item (start in add mode); otherwise the
        // id.
        initialItemId={openKey === 'add' ? undefined : openKey}
        initialLineId={props.initialLineId}
        nextItem={props.nextItem}
        locations={props.locations}
        locationsLoading={props.locationsLoading}
        onSaved={props.onSaved}
      />
    )}
  </Show>
);

interface StocktakeLineEditContentProps {
  onClose: () => void;
  storeId: string;
  stocktakeId: string;
  initialItemId?: string;
  initialLineId?: string;
  nextItem: ResolveNextItem;
  locations: LocationWithVolume[];
  locationsLoading?: boolean;
  onSaved: () => void;
}

const StocktakeLineEditContent = (
  props: StocktakeLineEditContentProps
): JSX.Element => {
  // Draft state as a STORE (fine-grained per-cell updates — see the original
  // notes). Soft-deleted rows carry a `deleted` flag; isNew rows splice out.
  const [draft, setDraft] = createStore<DraftLine[]>([]);
  const [saving, setSaving] = createSignal(false);
  // True while an item's data is being fetched (mount + item switch), so the
  // table shows a spinner instead of flashing its empty state.
  const [loadingLines, setLoadingLines] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal<string | undefined>();
  // Per-line save errors (lineId → typename), same shape as the detail view.
  const [lineErrors, setLineErrors] = createSignal<LineErrors>(new Map());
  // The item currently being edited; undefined = add mode with no item picked
  // yet (the search state).
  const [currentItem, setCurrentItem] = createSignal<StocktakeLineEditItem>();
  // Mode: 'update' (opened from a row — "OK & next" steps to the next item) or
  // 'add' ("Add item", or fallen into when an update walk runs out — "OK &
  // next" clears the selector to add another). Only ever flips update → add,
  // never back. Not user-visible (no Add/Edit label).
  const [mode, setMode] = createSignal<'add' | 'update'>(
    props.initialItemId ? 'update' : 'add'
  );

  // Items already stepped through THIS iteration (since the modal opened on a
  // row), so the parent's next-item walk never offers one twice — across page
  // advances too. Seeded with each item as it loads; not reactive.
  const coveredItemIds = new Set<string>();

  // Each batch row's counted-packs field, bound per row and addressed by draft
  // row id — where a row-click open or an advance lands focus. The handle waits
  // for the row to attach, so no load gate is needed here.
  const batchFields = createFocusTargets();

  // The add-mode item search. Named target, so entering the search state just
  // calls focus() — the handle waits for the control and defers the frame
  // (ui/utils/createFocusTarget).
  const itemSearch = createFocusTarget();

  // The header slot the DataTable portals its toolbar controls into
  // (DataTable.controlsMount) — a ref SIGNAL, not a plain variable: the header
  // renders before the table, so the table must re-read this once the element
  // attaches.
  const [tableControls, setTableControls] = createSignal<HTMLDivElement>();

  // Store-preference display gates (spec/stocktakes › store-preference gates),
  // read reactively. Each gated column is built into the column set only when
  // its preference is on. The VVM/doses cells additionally render only for a
  // vaccine item's rows (isVaccine off → blank).
  const prefs = () => stocktakePreferences();

  // Blind stocktake (spec/stocktakes › store-preference gates): the editor is
  // only ever open on a NEW stocktake (the detail view blocks the row-click
  // that opens it once finalised/locked), so Snapshot hides unconditionally
  // on the preference, with no separate status check. Reason hides the same
  // way, for the same reason no reason is ever required under this preference.
  const hideSnapshotStock = () => prefs().blindStocktake;
  const hideReason = () => prefs().blindStocktake;

  // No item picked yet → the search state (Cancel-only footer, prompt in place
  // of the table, no Add batch / OK / OK & next).
  const noItemYet = () => currentItem() === undefined;

  // Working-size latch (#771): the dialog opens small in add mode (it reads as
  // "pick an item", not an empty workbench) and grows ONCE, when the first item
  // is picked. That growth is the only size change in the modal's life — the
  // latch (a reducing memo) never resets, so clearing the item (×) or
  // "OK & next" returning to the search leaves the box at the working size and
  // the add loop doesn't pulse. Update mode opens straight at the working size.
  const workingSize = createMemo<boolean>(
    prev => prev || mode() === 'update' || !noItemYet(),
    false
  );

  // Cards by default at every band (compact already forces card; this extends
  // it to desktop). Above the compact breakpoint the DataTable's showCardToggle
  // offers the flip to a table for anyone who prefers it, and setConfig
  // persists that choice per user (#886) — so this seed is only the default.
  const tableConfig = createTableConfig({
    tableId: 'stocktake-line-edit',
    defaultConfig: { base: { viewMode: 'card' } },
  });

  // Seed the draft for one item. Replaces the store (reconcile by id) so no
  // rows from the previous item linger, and resets per-item UI. countByDefault:
  // opt-in (unchecked) when the item already has stocktake lines, all-counted
  // for a brand-new item. Records the item in the covered set for the walk.
  // `focusLineId` is the batch to focus once loaded (a row-click open focuses
  // the clicked line); omitted → focus the first row. `knownExisting` lets a
  // caller that already fetched this item's existing lines (loadItemById, to
  // resolve the item descriptor) pass them straight through instead of this
  // function re-fetching the identical stocktakeLines query a moment later.
  const seedItem = async (
    item: StocktakeLineEditItem,
    focusLineId?: string,
    knownExisting?: StocktakeLineFragment[]
  ) => {
    setCurrentItem(item);
    coveredItemIds.add(item.id);
    setLineErrors(new Map());
    setErrorMessage(undefined);
    setLoadingLines(true);
    const existing =
      knownExisting ??
      (await fetchExistingLines(props.storeId, props.stocktakeId, item.id));
    const seeded = await buildDraft(
      props.storeId,
      item,
      existing,
      existing.length === 0
    );
    setDraft(reconcile(seeded, { key: 'id' }));
    // Focus the requested batch, else the first row — the focus effect runs
    // when loadingLines flips false below.
    batchFields.focus(focusLineId ?? seeded[0]?.id ?? '');
    setLoadingLines(false);
  };

  // The user picked an item in the search (or a row opened one). We only have
  // its id from a row open; the descriptor (code/name) comes from the search
  // selection OR, for a row open, from the item's own existing lines.
  //
  // Picking from the selector is an ADD-flow action: update mode is entered
  // ONLY by clicking a row, so a manual pick switches to add mode (its "OK &
  // next" then adds another rather than stepping the original row-walk).
  const selectItem = (item: StocktakeLineEditItem) => {
    setMode('add');
    void seedItem(item);
  };

  // Row-open path: resolve the item descriptor from its existing lines (the
  // fetch we need for the draft anyway), then seed. If the item has no lines
  // (vanished), close. Passes `existing` straight through to seedItem (its
  // `knownExisting`) rather than letting it re-run the identical
  // stocktakeLines query it would otherwise fetch for itself.
  const loadItemById = async (id: string) => {
    setLoadingLines(true);
    const existing = await fetchExistingLines(
      props.storeId,
      props.stocktakeId,
      id
    );
    const first = existing[0];
    if (!first) {
      props.onClose();
      return;
    }
    await seedItem(
      {
        id,
        code: first.item.code,
        name: first.itemName,
        isVaccine: first.item.isVaccine,
        doses: first.item.doses,
        unitName: first.item.unitName,
        defaultPackSize: first.item.defaultPackSize,
      },
      // Focus the clicked batch (falls back to the first row if it's not among
      // this item's lines, e.g. the id went stale).
      props.initialLineId,
      existing
    );
  };

  // Back to the item-search state — add mode with no item picked. Reached by
  // the × clear, by "OK & next" in add mode, or when an update walk runs out of
  // items. Always add mode from here on.
  const backToSearch = () => {
    setMode('add');
    setCurrentItem(undefined);
    setLineErrors(new Map());
    setErrorMessage(undefined);
    setDraft(reconcile([], { key: 'id' }));
    itemSearch.focus();
  };

  // Seed on mount: a row open starts on its item (focusing the clicked batch);
  // an add open starts in the search state, focusing the item selector.
  onMount(() => {
    if (props.initialItemId) void loadItemById(props.initialItemId);
    else {
      setLoadingLines(false);
      itemSearch.focus();
    }
  });

  // The rows the table shows: the draft minus soft-deleted lines.
  const rows = (): DraftLine[] => draft.filter(line => !line.deleted);

  // Edit ONE field of ONE line (fine-grained store write); clears the line's
  // stale server error.
  const update = <F extends keyof DraftLine>(
    id: string,
    field: F,
    value: DraftLine[F]
  ) => {
    const index = draft.findIndex(line => line.id === id);
    if (index >= 0) setDraft(index, field, value as never);
    if (lineErrors().has(id)) {
      setLineErrors(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Update a line's counted packs AND drop a now-mismatched reason: recounting
  // the other way (or back to the snapshot) can leave a reason that no longer
  // matches the new adjustment direction, which the picker would then hide. We
  // clear it so a stale, wrong-direction reason can't survive unseen (the
  // server would reject it as AdjustmentReasonNotValid anyway).
  const setCounted = (line: DraftLine, value: number | null) => {
    update(line.id, 'countedNumberOfPacks', value);
    const direction = adjustmentDirection({
      ...line,
      countedNumberOfPacks: value,
    });
    const reason = line.reasonOption;
    if (
      reason &&
      (direction === null || !reasonMatchesKind(reason, direction))
    ) {
      update(line.id, 'reasonOption', null);
    }
  };

  // Add a new batch (a fresh draft line) — prepended, count blank.
  /*
   * `+` adds a batch (spec/keyboard KB-L1/KB-L2) — the app's one BARE-CHARACTER
   * binding, and the only member of the `always` tier.
   *
   * KB-L2: such a binding "fires wherever it is pressed within its surface,
   * INCLUDING while a text field holds focus… A surface MAY claim a bare
   * character only where that character is not itself valid input to its fields;
   * `+` is safe among quantity, price, and date fields for exactly that reason."
   * That safety is a property of THIS surface's fields, not a general one, which
   * is why the binding is declared here and nowhere else (AC-KB45).
   *
   * Unlisted: the palette already offers the action under its own name via the
   * header control, so a second entry would be noise. Disabled until an item is
   * picked, matching the button's own `<Show>` — the key must not add a batch
   * to nothing.
   */
  createAction({
    unlisted: true,
    shortcut: PLUS,
    run: () => addBatch(),
    disabled: noItemYet,
  });

  const addBatch = () => {
    const item = currentItem();
    if (!item) return;
    setDraft(
      produce(lines =>
        lines.unshift({
          id: generateUUID(),
          isNew: true,
          countThisLine: true,
          stockLine: null,
          itemName: item.name,
          item: {
            id: item.id,
            code: item.code,
            // A fresh blank batch has no persisted unit yet (see fromStock).
            unitName: null,
            isVaccine: item.isVaccine,
            doses: item.doses,
            defaultPackSize: item.defaultPackSize,
          },
          batch: null,
          expiryDate: null,
          manufactureDate: null,
          snapshotNumberOfPacks: 0,
          countedNumberOfPacks: null,
          // Starts at the item's default pack size, not empty
          // (OMS-REG-INV-03.79) — see defaultedPackSize.
          packSize: defaultedPackSize(item),
          sellPricePerPack: null,
          costPricePerPack: null,
          comment: null,
          note: null,
          volumePerPack: null,
          location: null,
          reasonOption: null,
          // A fresh batch has no VVM / donor / manufacturer / campaign /
          // program yet — the user fills them in via the VVM / donor
          // (preference-gated) and manufacturer / campaign-or-program (ungated)
          // fields on the batch panel and the Pricing & additional info group.
          vvmStatus: null,
          donorId: null,
          donorName: null,
          manufacturer: null,
          campaign: null,
          program: null,
        })
      )
    );
  };

  // Soft-delete a row (isNew splices out; existing flagged deleted → sent as a
  // delete on save).
  const removeLine = (line: DraftLine) => {
    if (line.isNew) {
      setDraft(
        produce(lines => {
          const index = lines.findIndex(l => l.id === line.id);
          if (index >= 0) lines.splice(index, 1);
        })
      );
    } else {
      const index = draft.findIndex(l => l.id === line.id);
      if (index >= 0) setDraft(index, 'deleted', true);
    }
  };

  // Duplicate a row — clone into a fresh isNew draft (new id + blank count),
  // inserted right after the source.
  const duplicateLine = (line: DraftLine) => {
    const copy: DraftLine = {
      ...unwrap(line),
      id: generateUUID(),
      isNew: true,
      snapshotNumberOfPacks: 0,
      countedNumberOfPacks: null,
      // The duplicate carries a stock link only when the source was itself
      // opting a stock line in (stockLineId — buildBatch then inserts against
      // that stock). A copy of an existing line inserts by item, with no stock
      // behind it, so the source's stockLine node must not ride along — it
      // would misreport the link and read-only the copy's pack size
      // (packSizeEditable keys off it).
      stockLine: line.stockLineId ? unwrap(line).stockLine : null,
    };
    setDraft(
      produce(lines => {
        const index = lines.findIndex(l => l.id === line.id);
        lines.splice(index + 1, 0, copy);
      })
    );
  };

  // Partition the draft into the batch-mutation input arrays (unchanged from
  // the original — the routing rules for insert/update/delete + countThisLine
  // are identical). See the wrapped-nullable-field note.
  const buildBatch = (): BatchStocktakeLinesInput => {
    const insert: NonNullable<BatchStocktakeLinesInput['insert']> = [];
    const update: NonNullable<BatchStocktakeLinesInput['update']> = [];
    const deletes: string[] = [];
    for (const line of draft) {
      if (line.deleted) {
        if (!line.isNew) deletes.push(line.id);
        continue;
      }
      if (!line.countThisLine) {
        if (!line.isNew) deletes.push(line.id);
        continue;
      }
      if (line.isNew) {
        insert.push({
          id: line.id,
          stocktakeId: props.stocktakeId,
          ...(line.stockLineId
            ? { stockLineId: line.stockLineId }
            : { itemId: line.item.id }),
          batch: line.batch,
          expiryDate: line.expiryDate,
          manufactureDate: line.manufactureDate,
          countedNumberOfPacks: line.countedNumberOfPacks,
          packSize: line.packSize,
          sellPricePerPack: line.sellPricePerPack,
          costPricePerPack: line.costPricePerPack,
          comment: line.comment,
          note: line.note,
          location: { value: line.location?.id ?? null },
          volumePerPack: line.volumePerPack,
          reasonOptionId: line.reasonOption?.id ?? null,
          // VVM / donor (preference-gated) + manufacturer (ungated). Plain
          // scalars on INSERT (contract: InsertStocktakeLineInput). Gated
          // fields are sent regardless of the preference — the server accepts
          // the data either way; the preference only decides whether the field
          // was editable.
          vvmStatusId: line.vvmStatus?.id ?? null,
          donorId: line.donorId ?? null,
          manufacturerId: line.manufacturer?.id ?? null,
          // Campaign / program (ungated) — plain scalars on INSERT, mutually
          // exclusive (only one is ever set; the picker clears the other).
          campaignId: line.campaign?.id ?? null,
          programId: line.program?.id ?? null,
        });
        continue;
      }
      update.push({
        id: line.id,
        batch: line.batch,
        expiryDate: { value: line.expiryDate },
        manufactureDate: { value: line.manufactureDate },
        location: { value: line.location?.id ?? null },
        countedNumberOfPacks: line.countedNumberOfPacks,
        packSize: line.packSize,
        sellPricePerPack: line.sellPricePerPack,
        costPricePerPack: line.costPricePerPack,
        comment: line.comment,
        note: line.note,
        volumePerPack: line.volumePerPack,
        reasonOptionId: line.reasonOption?.id ?? null,
        // VVM / donor (preference-gated) + manufacturer (ungated) —
        // NullableStringUpdate wrapper on UPDATE (contract:
        // UpdateStocktakeLineInput): { value: id | null } sets/clears.
        vvmStatusId: { value: line.vvmStatus?.id ?? null },
        donorId: { value: line.donorId ?? null },
        manufacturerId: { value: line.manufacturer?.id ?? null },
        // Campaign / program (ungated) — NullableStringUpdate wrapper on
        // UPDATE: { value: id | null } sets/clears. Mutually exclusive: setting
        // one sends the other as null so a stale opposite value is cleared.
        campaignId: { value: line.campaign?.id ?? null },
        programId: { value: line.program?.id ?? null },
      });
    }
    return { insert, update, delete: deletes.map(id => ({ id })) };
  };

  // Save (no client-side validation — the server decides; per-line errors
  // surface on failure). Returns whether it fully succeeded. On any commit we
  // notify the parent so it refetches the page (partial success still reflects
  // the committed lines).
  const save = async (): Promise<boolean> => {
    setSaving(true);
    setErrorMessage(undefined);
    const outcome = await runBatchStocktakeLines(props.storeId, buildBatch());
    setSaving(false);
    if (!outcome) return false; // transport/NodeError → global modal showed it

    const { commit, errors } = outcome;
    if (
      commit.inserted.length ||
      commit.updated.length ||
      commit.deletedIds.length
    ) {
      props.onSaved();
    }

    if (errors.size > 0) {
      setLineErrors(new Map(errors));
      setErrorMessage(tPlural('messages.line-errors', errors.size));
      return false; // keep the modal open on the failed lines
    }
    return true;
  };

  // OK: save, then close on success (stay open on error).
  const onOk = async () => {
    if (await save()) props.onClose();
  };

  // OK & next: save, then — on success only — advance. Behaviour by mode:
  // - ADD: return to the search state to add another (backToSearch).
  // - UPDATE: ask the parent for the next item (it pages the detail table
  //   forward as needed). Got one → seed it (draft swaps in place, no remount).
  //   None left → the walk is exhausted, so drop into add mode's search state.
  // Reuses this open either way (no close/reopen). A failed save stays put.
  const onOkNext = async () => {
    if (!(await save())) return;
    if (mode() === 'add') {
      backToSearch();
      return;
    }
    const current = currentItem();
    const next = current
      ? await props.nextItem(current.id, coveredItemIds)
      : undefined;
    if (next) await seedItem(next);
    else backToSearch(); // exhausted → add mode
  };

  // ---- Columns: one set, split across groups; batch is the anchor. ----
  // (Unchanged from the original — each cell edits the draft store via
  // update().)
  const columns = createMemo((): Column<DraftLine, never, GroupKey>[] => [
    {
      c: { id: 'countThisLine' },
      header: () => t('label.count-this-line'),
      // TABLE view width. Left to TanStack's default the column took ~150px to
      // hold "Count this line" on one line, for content that is an 18px box —
      // the widest thing in it was its own caption. size is the min-width floor
      // and maxSize the growth cap (auto table layout), so setting both pins it
      // near the caption's two-line width: .thText clamps headers to 2 lines and
      // breaks on word boundaries, so it reads "Count this / line" rather than
      // ellipsising. The freed width goes to the value columns beside it.
      size: 88,
      maxSize: 88,
      // Card view: the count toggle LEADS the card header — 'primary', not the
      // badge slot, so it sits inline-start immediately before Batch (multiple
      // primaries render in column order, and this column is declared first).
      // Whether the batch is being counted governs every other field on the
      // card (they all disable with it), so it reads as the switch on the row
      // rather than a chip trailing at the far end.
      //
      // UNCAPTIONED there — the header default, which this column no longer
      // opts out of. "Count this line" spent a third of the header row saying
      // what a ticked box at the head of a batch card already says, and it
      // crowded the one field the row exists to show. The checkbox keeps its
      // aria-label, so the accessible name is unchanged, and TABLE view still
      // carries the full phrase as its column header (showLabel is card-only).
      // Structural — keep it out of the Columns popover.
      //
      // TABLE view is centred: the column's width is set by the header phrase
      // "Count this line", but its content is a single checkbox, so left-
      // aligning dumped the whole surplus on the checkbox's right and read as
      // a gap before Batch. Centring splits it either side of the control, the
      // same treatment getBooleanCell / getCommentCell give a column whose
      // entire content is one glyph. `align` is table-only, so the card is
      // untouched — and it centres the HEADER label; the box itself needs
      // .countBox, because meta.align resolves to text-align, which cannot
      // move a block-level control (see the CSS module).
      meta: {
        headerPosition: 'primary',
        hideFromColumnSettings: true,
        align: 'center',
      },
      cell: info => {
        const line = info.row.original;
        return (
          <BareCheckbox
            // Centres the box in the table cell — meta.align alone cannot,
            // since this root is block-level (see .countBox).
            class={styles.countBox}
            aria-label={t('label.count-this-line')}
            checked={line.countThisLine}
            onChange={e =>
              update(line.id, 'countThisLine', e.currentTarget.checked)
            }
          />
        );
      },
    },
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
        const line = info.row.original;
        return (
          <TextField
            label={t('label.batch')}
            hideLabel
            size="small"
            disabled={!line.countThisLine}
            value={line.batch ?? ''}
            onInput={e =>
              update(line.id, 'batch', e.currentTarget.value || null)
            }
          />
        );
      },
    },
    // Snapshot — omitted entirely under blind stocktake (see hideSnapshotStock
    // above; the editor is only ever open on a NEW stocktake).
    ...(hideSnapshotStock()
      ? []
      : [
          {
            c: { key: 'snapshotNumberOfPacks' },
            header: () => t('label.snapshot-num-of-packs'),
            cardGroup: 'batch',
            ...getNumberCell({ cardWidth: 7.5, cardSpan: 3 }),
            cell: info => {
              const line = info.row.original;
              return (
                <NumberField
                  label={t('label.snapshot-num-of-packs')}
                  hideLabel
                  size="small"
                  decimalLimit={2}
                  disabled
                  value={line.snapshotNumberOfPacks ?? undefined}
                  error={
                    lineErrors().get(line.id) ===
                    'SnapshotCountCurrentCountMismatchLine'
                      ? t('error.snapshot-total-mismatch')
                      : undefined
                  }
                  errorTestId="stocktake-line-error"
                />
              );
            },
          } satisfies Column<DraftLine, never, GroupKey>,
        ]),
    {
      c: { key: 'countedNumberOfPacks' },
      header: () => t('label.counted-num-of-packs'),
      cardGroup: 'batch',
      ...getNumberCell({ cardWidth: 7.5, cardSpan: 3 }),
      cell: info => {
        const line = info.row.original;
        return (
          <NumberField
            ref={batchFields.ref(line.id)}
            label={t('label.counted-num-of-packs')}
            hideLabel
            size="small"
            // Packs can be counted in fractions (a part-full pack); the doses
            // formula multiplies packSize by this, so keep the same 2-dp room.
            decimalLimit={2}
            disabled={!line.countThisLine}
            value={line.countedNumberOfPacks ?? undefined}
            error={
              lineErrors().get(line.id) === 'StockLineReducedBelowZero'
                ? t('error.reduced-below-zero')
                : undefined
            }
            errorTestId="stocktake-line-error"
            // NumberField commits a real number (or undefined when cleared);
            // the draft stores null for empty, so map undefined → null.
            // setCounted also drops a now-mismatched reason when the count
            // changes adjustment direction.
            onChange={value => setCounted(line, value ?? null)}
          />
        );
      },
    },
    {
      c: { key: 'packSize' },
      header: () => t('label.pack-size'),
      cardGroup: 'batch',
      // 7.5 = the house figure for a numeric quantity (CARD_TABLE_MODEL.md §
      // Field widths). It was 8.75, which a pack size has no use for — and the
      // 1.25rem it gives back is what keeps the four counting fields on one
      // wrapped row once the dates widen below.
      ...getNumberCell({ cardWidth: 7.5, cardSpan: 2 }),
      cell: info => {
        const line = info.row.original;
        return (
          <NumberField
            label={t('label.pack-size')}
            hideLabel
            size="small"
            decimalLimit={2}
            // Pack size is fixed for stock-backed batches — editable only
            // where no stock stands behind the row (packSizeEditable).
            disabled={!line.countThisLine || !packSizeEditable(line)}
            value={line.packSize ?? undefined}
            onChange={value => update(line.id, 'packSize', value ?? null)}
          />
        );
      },
    },
    // Doses counted (batch panel) — display-only, computed client-side (see
    // ../lines/doses); nothing stored per line. It sits directly after Pack
    // size because it is that row's arithmetic — counted packs × pack size ×
    // doses per unit — so it reads as the total the two figures above it
    // produce, rather than trailing the panel far from either.
    //
    // Gated on the preference AND the item being a vaccine (spec S4: "only if
    // manageVaccinesInDoses, vaccine items"), the same two-part gate inbound
    // uses. The item gate has to live HERE, at the column, not in the cell: a
    // cell returning null still leaves the card's caption behind it, so a
    // non-vaccine item got a "Doses counted" label over an empty disabled box.
    // The modal edits one item at a time, so currentItem() answers for every
    // row — the per-row item.isVaccine that dosesCounted() checks is the same
    // flag, carried on each draft line from this descriptor.
    ...(prefs().manageVaccinesInDoses && currentItem()?.isVaccine
      ? [
          {
            c: { id: 'dosesCounted' },
            header: () => t('label.doses-counted'),
            cardGroup: 'batch',
            ...getNumberCell({ cardWidth: 7.5, cardSpan: 2 }),
            cell: info => {
              const doses = dosesCounted(info.row.original);
              return (
                <NumberField
                  label={t('label.doses-counted')}
                  hideLabel
                  size="small"
                  decimalLimit={2}
                  disabled
                  value={doses ?? undefined}
                />
              );
            },
          } satisfies Column<DraftLine, never, GroupKey>,
        ]
      : []),
    // Expiry (batch panel) — after the count figures rather than leading them:
    // the panel opens on what is being counted, and expiry is the batch fact
    // checked alongside put-away and VVM. It pairs with Manufacture date at the
    // panel's end; both are the shared DateField, never a native date input.
    {
      c: { key: 'expiryDate' },
      header: () => t('label.expiry-date'),
      cardGroup: 'batch',
      // 11, not the 10 the width table lists for a date: 10rem was measured
      // against a rendered VALUE ("11 Sep 2026", 74px in English), but an empty
      // DateField shows the `DD MMM YYYY` placeholder, and all-caps is wider
      // than the digits it stands for — at 10rem it clipped to "DD MMM YYY".
      meta: { cardWidth: 11, cardSpan: 4 },
      cell: info => {
        const line = info.row.original;
        return (
          <DateField
            label={t('label.expiry-date')}
            hideLabel
            size="small"
            disabled={!line.countThisLine}
            value={line.expiryDate}
            onChange={v => update(line.id, 'expiryDate', v)}
          />
        );
      },
    },
    // Location (batch panel, D57) — the field the user is most likely to set
    // while actively counting sits in the always-open panel, not one click down
    // in the disclosure.
    {
      c: { key: 'location' },
      header: () => t('label.location'),
      cardGroup: 'batch',
      // max 24.5 lands this field exactly on a COLUMN EDGE, so the wrapped row
      // still reads as a grid instead of a ragged second line. The counting row
      // above is 7.5 + 7.5 + 7.5 + 11 with 1rem (--space-4) gaps, i.e. edges at
      // 0 / 8.5 / 17 / 25.5, ending at 36.5. Capped at 24.5 the location stops
      // level with Pack size's right edge — it occupies columns 1–3 — so the
      // manufacture date after it starts at 25.5 (under Expiry) and ends at 36.5
      // (level with the row above). The cap, not a span, is what buys that: it's
      // the only reason a lone weighted field on a wrapped row stops anywhere
      // predictable.
      //
      // NB it is arithmetic against THIS field set. A vaccine item's extra
      // fields (doses counted, VVM status) change the counting row's
      // composition, and the wrapped row's edges move with it.
      meta: { cardWidth: { min: 8, max: 24.5, weight: 1.2 }, cardSpan: 8 },
      cell: info => {
        const line = info.row.original;
        return (
          <LocationVolumeSelect
            size="small"
            label={t('label.location')}
            hideLabel
            locations={props.locations}
            loading={props.locationsLoading}
            disabled={!line.countThisLine}
            value={line.location?.id}
            requiredVolume={
              (line.volumePerPack ?? 0) *
              (line.countedNumberOfPacks ?? line.snapshotNumberOfPacks ?? 0)
            }
            placeholder={t('label.none')}
            onChange={l =>
              update(
                line.id,
                'location',
                l ? { id: l.id, code: l.code, name: l.name } : null
              )
            }
          />
        );
      },
    },
    // VVM status (batch panel) — a VvmStatusSelect editing the draft's
    // vvmStatus node. Gated on manageVvmStatusForStock AND the item being a
    // vaccine (spec S4: "only if manageVvmStatusForStock, vaccine items"),
    // matching inbound. As with Doses counted, the item gate belongs at the
    // COLUMN: a cell that returned null for a non-vaccine still left the card's
    // "VVM status" caption standing over empty space.
    ...(prefs().manageVvmStatusForStock && currentItem()?.isVaccine
      ? [
          {
            c: { id: 'vvmStatus' },
            header: () => t('label.vvm-status'),
            cardGroup: 'batch',
            meta: { cardWidth: 10, cardSpan: 4 },
            cell: info => {
              const line = info.row.original;
              return (
                <VvmStatusSelect
                  size="small"
                  label={t('label.vvm-status')}
                  hideLabel
                  disabled={!line.countThisLine}
                  value={line.vvmStatus?.id}
                  placeholder={t('label.none')}
                  onChange={s =>
                    update(
                      line.id,
                      'vvmStatus',
                      s
                        ? { id: s.id, code: s.code, description: s.description }
                        : null
                    )
                  }
                />
              );
            },
          } satisfies Column<DraftLine, never, GroupKey>,
        ]
      : []),
    // Manufacture date (batch panel) — last of the counting fields, after the
    // preference-gated VVM status. It is a batch fact the receiver confirms
    // rather than part of the count itself, so it trails the figures and the
    // put-away/VVM checks rather than sitting up beside Expiry.
    {
      c: { key: 'manufactureDate' },
      header: () => t('label.manufacture-date'),
      cardGroup: 'batch',
      // 11 for the placeholder, as the expiry date above — and this is the field
      // where it showed, since it is usually the empty one.
      meta: { cardWidth: 11, cardSpan: 4 },
      cell: info => {
        const line = info.row.original;
        return (
          <DateField
            label={t('label.manufacture-date')}
            hideLabel
            size="small"
            max={localTodayIso()}
            disabled={!line.countThisLine}
            value={line.manufactureDate}
            onChange={v => update(line.id, 'manufactureDate', v)}
          />
        );
      },
    },
    {
      c: { key: 'sellPricePerPack' },
      header: () => t('label.pack-sell-price'),
      cardGroup: 'pricing',
      ...getNumberCell({ cardWidth: 10, cardSpan: 4 }),
      cell: info => {
        const line = info.row.original;
        return (
          <CurrencyField
            label={t('label.pack-sell-price')}
            hideLabel
            size="small"
            disabled={!line.countThisLine}
            value={line.sellPricePerPack ?? undefined}
            onChange={value =>
              update(line.id, 'sellPricePerPack', value ?? null)
            }
          />
        );
      },
    },
    {
      c: { key: 'costPricePerPack' },
      header: () => t('label.pack-cost-price'),
      cardGroup: 'pricing',
      ...getNumberCell({ cardWidth: 10, cardSpan: 4 }),
      cell: info => {
        const line = info.row.original;
        return (
          <CurrencyField
            label={t('label.pack-cost-price')}
            hideLabel
            size="small"
            disabled={!line.countThisLine}
            value={line.costPricePerPack ?? undefined}
            onChange={value =>
              update(line.id, 'costPricePerPack', value ?? null)
            }
          />
        );
      },
    },
    {
      c: { key: 'volumePerPack' },
      header: () => t('label.volume-per-pack'),
      cardGroup: 'pricing',
      ...getNumberCell({ cardWidth: 10, cardSpan: 4 }),
      cell: info => {
        const line = info.row.original;
        return (
          <NumberField
            label={t('label.volume-per-pack')}
            hideLabel
            size="small"
            // Volume per pack is a fine measure (m³); match OMS's 10-dp room.
            decimalLimit={10}
            disabled={!line.countThisLine}
            value={line.volumePerPack ?? undefined}
            // NumberField commits a real number (or undefined when cleared);
            // the draft stores null for empty, so map undefined → null.
            onChange={value => update(line.id, 'volumePerPack', value ?? null)}
          />
        );
      },
    },
    // Donor (Pricing & additional info) — gated by allowTrackingOfStockByDonor.
    // An async donor picker (NameSearch role="donor") over the draft's
    // donorId/donorName. The
    // line stores only id+name, so `selected` is a minimal NameOption (like
    // ItemSearch's fallback) — enough to label the current value.
    ...(prefs().allowTrackingOfStockByDonor
      ? [
          {
            c: { id: 'donor' },
            header: () => t('label.donor'),
            cardGroup: 'pricing',
            meta: { cardWidth: { min: 9, max: 18, weight: 1 }, cardSpan: 6 },
            cell: info => {
              const line = info.row.original;
              return (
                <NameSearch
                  size="small"
                  label={t('label.donor')}
                  hideLabel
                  storeId={props.storeId}
                  role="donor"
                  disabled={!line.countThisLine}
                  selected={
                    line.donorId
                      ? {
                          id: line.donorId,
                          name: line.donorName ?? '',
                          code: '',
                          isSupplier: false,
                          isDonor: true,
                          isOnHold: false,
                          isStore: false,
                        }
                      : undefined
                  }
                  placeholder={t('label.none')}
                  onSelect={name => {
                    update(line.id, 'donorId', name?.id ?? null);
                    update(line.id, 'donorName', name?.name ?? null);
                  }}
                />
              );
            },
          } satisfies Column<DraftLine, never, GroupKey>,
        ]
      : []),
    // Campaign / program (Pricing & additional info) — UNGATED (spec S4 lists
    // it alongside donor and manufacturer, no store-preference gate). ONE
    // combined picker
    // over the store's campaigns + this item's programs; the two are mutually
    // exclusive on the line, so a choice sets one of campaign/program and
    // clears the other. buildBatch sends campaignId/programId accordingly.
    {
      c: { id: 'campaignOrProgram' },
      header: () => t('label.campaign'),
      cardGroup: 'pricing',
      meta: { cardWidth: { min: 9.5, max: 20, weight: 1.2 }, cardSpan: 6 },
      cell: info => {
        const line = info.row.original;
        return (
          <CampaignOrProgramSelect
            size="small"
            label={t('label.campaign')}
            hideLabel
            storeId={props.storeId}
            itemId={line.item.id}
            disabled={!line.countThisLine}
            campaignId={line.campaign?.id}
            programId={line.program?.id}
            placeholder={t('label.none')}
            onChange={choice => {
              update(line.id, 'campaign', choice?.campaign ?? null);
              update(line.id, 'program', choice?.program ?? null);
            }}
          />
        );
      },
    },
    // Manufacturer (Pricing & additional info) — UNGATED (no store preference;
    // spec S4 lists it alongside donor but without a gate). An async
    // manufacturer picker
    // (NameSearch role="manufacturer") over the draft's manufacturer NameNode;
    // saved via manufacturerId in buildBatch.
    {
      c: { id: 'manufacturer' },
      header: () => t('label.manufacturer'),
      cardGroup: 'pricing',
      meta: { cardWidth: { min: 10, max: 20, weight: 1.4 }, cardSpan: 6 },
      cell: info => {
        const line = info.row.original;
        return (
          <NameSearch
            size="small"
            label={t('label.manufacturer')}
            hideLabel
            storeId={props.storeId}
            role="manufacturer"
            disabled={!line.countThisLine}
            selected={
              line.manufacturer
                ? {
                    id: line.manufacturer.id,
                    name: line.manufacturer.name,
                    code: '',
                    isSupplier: false,
                    isDonor: false,
                    isOnHold: false,
                    isStore: false,
                  }
                : undefined
            }
            placeholder={t('label.none')}
            onSelect={name =>
              update(
                line.id,
                'manufacturer',
                name ? { id: name.id, name: name.name } : null
              )
            }
          />
        );
      },
    },
    // Reason — omitted entirely under blind stocktake, since no reason is
    // ever required (see hideReason above).
    ...(hideReason()
      ? []
      : [
          {
            c: { id: 'inventoryAdjustmentReasonInput' },
            header: () => t('label.reason'),
            cardGroup: 'batch',
            meta: {
              cardWidth: { min: 9, max: 20, weight: 1.2 },
              // A whole row of the ten when it appears. Reason comes and goes
              // per BATCH (hideOnCardWhen below), not per table, so it's the one
              // field here that can change a card's packing while the modal is
              // open — a full row is the only span that leaves the rows above it
              // untouched when it does.
              cardSpan: 12,
              // The card shows Reason only on a batch that can actually take
              // one: counted, and counted to something other than its
              // snapshot. A level batch takes no reason at all (rules.md
              // §reason rules — "a zero adjustment never requires a reason"),
              // and an uncounted line has no direction yet, so the field is
              // withdrawn rather than shown inert. It reappears the moment the
              // count moves off the snapshot, because the predicate reads the
              // draft store.
              //
              // Card-only. TABLE view keeps the column on every row (below:
              // `disabled` when there is no direction) — a column is a
              // property of the grid there, and blanking one row's cell is
              // what keeps the rows aligned.
              hideOnCardWhen: (line: DraftLine) =>
                !line.countThisLine || adjustmentDirection(line) === null,
            },
            cell: info => {
              const line = info.row.original;
              const error = () => {
                const err = lineErrors().get(line.id);
                if (err === 'AdjustmentReasonNotProvided')
                  return t('error.provide-reason');
                if (err === 'AdjustmentReasonNotValid')
                  return t('error.provide-valid-reason');
                return undefined;
              };
              // Offer only reasons valid for the line's adjustment direction.
              // A zero-variance (or uncounted) line has no direction: the CARD
              // drops the field entirely (meta.hideOnCardWhen above), and the
              // TABLE — which keeps its columns row-invariant — shows it
              // disabled. setCounted clears a now-mismatched reason when the
              // count changes direction, so the fallback 'positive' kind is
              // never read for a real selection.
              const direction = () => adjustmentDirection(line);
              return (
                <ReasonSelect
                  kind={direction() ?? 'positive'}
                  label={t('label.reason')}
                  hideLabel
                  disabled={!line.countThisLine || direction() === null}
                  value={line.reasonOption?.id}
                  error={error()}
                  errorTestId="stocktake-line-error"
                  placeholder={t('label.select-reason')}
                  onChange={r =>
                    update(
                      line.id,
                      'reasonOption',
                      r ? { id: r.id, type: r.type, reason: r.reason } : null
                    )
                  }
                />
              );
            },
          } satisfies Column<DraftLine, never, GroupKey>,
        ]),
    {
      c: { key: 'note' },
      header: () => t('label.note'),
      cardGroup: 'pricing',
      meta: { cardWidth: { min: 8, max: 24, weight: 1.4 }, cardSpan: 6 },
      cell: info => {
        const line = info.row.original;
        return (
          <TextField
            label={t('label.note')}
            hideLabel
            size="small"
            disabled={!line.countThisLine}
            value={line.note ?? ''}
            onInput={e =>
              update(line.id, 'note', e.currentTarget.value || null)
            }
          />
        );
      },
    },
    {
      c: { key: 'comment' },
      header: () => t('label.stocktake-comment'),
      cardGroup: 'pricing',
      meta: { cardWidth: { min: 8, max: 24, weight: 1.4 }, cardSpan: 12 },
      cell: info => {
        const line = info.row.original;
        return (
          <TextField
            label={t('label.stocktake-comment')}
            hideLabel
            size="small"
            disabled={!line.countThisLine}
            value={line.comment ?? ''}
            onInput={e =>
              update(line.id, 'comment', e.currentTarget.value || null)
            }
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
        const line = info.row.original;
        return (
          <>
            <IconButton
              bordered
              size="small"
              icon={<CopyIcon />}
              label={t('label.duplicate-batch')}
              onClick={() => duplicateLine(line)}
            />
            <IconButton
              bordered
              size="small"
              variant="danger"
              icon={<TrashIcon />}
              label={t('button.delete')}
              onClick={() => removeLine(line)}
            />
          </>
        );
      },
    },
  ]);

  const footerError = () => errorMessage();

  // OK / OK & next show a loading state while the modal is busy — both while
  // SAVING and while the item's table content is being fetched (mount, item
  // switch, or an "OK & next" step): there's nothing to act on until the draft
  // has loaded, so the buttons spin rather than acting on an empty/stale draft.
  const busy = () => saving() || loadingLines();

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size={workingSize() ? 'full' : 'auto'}
      // `full`, not `large`: this line table is 20 columns wide — and the one
      // #771 named ("wider if the stocktake column set forces it"), so there
      // is no card width that fits it. #771's "~900px if the tables fit" does
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
      // Title: JUST the item selector (no "Add"/"Edit" label — the modal is one
      // combined flow). A component title can't be the a11y name, so pass
      // ariaLabel.
      //
      // DISABLED in update mode (opened from a row): the selector then just
      // shows the item being edited, read-only — switching item is an add-flow
      // action, and a disabled input can't steal the dialog's initial focus
      // (which would otherwise open the combobox for a frame, then close as the
      // focus effect moves to the clicked batch — a flicker). Add mode keeps it
      // enabled: that IS how you pick an item.
      //
      // `selectedItem` gives the combobox the current item's label directly, so
      // it displays even in update mode where the row-opened item isn't in the
      // search's own paginated result list.
      //
      // Bounded, not full-width (inbound's treatment): once picked, an item's
      // "code - name" label doesn't need the whole header row, and the Unit
      // fact reads better grouped beside the picker than stranded at the far
      // edge. Keyed off the size latch (not "an item is picked"), so the
      // header doesn't resize under the user mid-walk.
      title={
        <HStack gap="md" align="center">
          <div
            class={styles.headerPicker}
            classList={{
              [styles.headerPickerBounded ?? '']: workingSize(),
            }}
          >
            <ItemSearch
              label={t('heading.add-item')}
              hideLabel
              storeId={props.storeId}
              disabled={mode() === 'update'}
              focusTarget={itemSearch}
              value={currentItem()?.id}
              selectedItem={currentItem()}
              // Mark items already on this stocktake in the results
              // (OMS-REG-INV-03.78) — picking one still loads its existing count.
              presentInDocument={{
                probe: ids =>
                  probePresentItems(props.storeId, props.stocktakeId, ids),
                label: t('label.in-stocktake'),
              }}
              // Pick an item → load it; clear (×) → back to the search state.
              onSelect={item => (item ? selectItem(item) : backToSearch())}
              placeholder={t('placeholder.enter-an-item-code-or-name')}
            />
          </div>
          <Show when={currentItem()?.unitName}>
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
      ariaLabel={t('heading.add-item')}
      // Add batch lives at the inline-end of the header row. Hidden until an
      // item is picked.
      headerActions={
        <>
          {/* The table's own controls (Columns · Settings), lifted onto this
              row by DataTable's controlsMount — they sat in a toolbar of their
              own a few pixels above the cards, spending a whole row of a
              modal whose vertical space is the scarce axis. Inline-start of
              Add batch: view/column plumbing before the action that changes
              the data. Empty (and invisible) until an item is picked, since
              the table only exists then. */}
          <div ref={setTableControls} class={styles.headerTableControls} />
          <Show when={!noItemYet()}>
            {/* Default (primary) variant, as inbound's Add batch has: adding a
                batch is the header's one data action, and the two line editors
                present it identically. Previously outlined (secondary), which
                made the same control read as the lesser of the two. */}
            <Button
              icon={<PlusCircleIcon />}
              data-testid="add-batch-button"
              onClick={addBatch}
            >
              {/* Label matches inbound's exactly — no inline "(+)". The `+`
                  binding still works (createAction above); it is simply not
                  advertised on the control any more, so the key is now
                  undiscoverable from the UI. Naming it inline was one of the two
                  presentations spec/keyboard ui-surface S2 allows; the other is a
                  `shortcut` badge, which is the way to bring it back if the
                  binding should be visible again. AC-KB15 forbids only having
                  BOTH, so neither is also permitted. */}
              {t('label.add-batch')}
            </Button>
          </Show>
        </>
      }
      actionsLead={
        <Show when={footerError()}>
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
      }
      actions={
        <>
          <CancelButton
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          />
          {/* Before an item is picked: nothing to save, so only Cancel shows.
              Once an item is chosen, Save / Save & next appear. */}
          <Show when={!noItemYet()}>
            <DialogSaveButton
              loading={busy()}
              data-testid="dialog-button-ok"
              onClick={() => void onOk()}
            />
            {/* Save & next: ALWAYS shown once an item is loaded (both modes).
                In update mode it advances to the next item, or — when the
                walk is exhausted — saves and drops into add mode. In add mode
                it saves and returns to the search to add another. */}
            <SaveAndNextButton
              loading={busy()}
              data-testid="dialog-button-next-and-ok"
              onClick={() => void onOkNext()}
            />
          </Show>
        </>
      }
    >
      {/* Before an item is picked (the selector lives in the title): a prompt in
          place of the empty table. Otherwise the batch-edit table. */}
      <Show
        when={!noItemYet()}
        fallback={
          <EmptyState
            graphic={false}
            message={t('messages.select-item-to-count')}
          />
        }
      >
        <DataTable
          columns={columns()}
          rows={rows()}
          rowKey={line => line.id}
          loading={loadingLines()}
          cardGroups={CARD_GROUPS}
          showCardToggle
          showFullScreen={false}
          config={tableConfig.config()}
          setConfig={tableConfig.setConfig}
          controlsMount={tableControls()}
          emptyMessage={t('label.add-new-line')}
        />
      </Show>
    </Dialog>
  );
};

import { createSignal, onMount, Show, type JSX } from 'solid-js';
import { createStore, produce, reconcile, unwrap } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { toNumberOrNull } from '../../../../typeHelpers';
import { t, tPlural } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { IconButton } from '../../../../ui/elements/buttons/IconButton';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import {
  DataTable,
  type Column,
  type TabAndCardGroup,
  ALL_TABS,
} from '../../../../ui/elements/table/DataTable';
import { getNumberCell } from '../../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../../api/createTableConfig';
import { LocationSelect } from '../../../../domain/location';
import { ReasonSelect } from '../../../../domain/reasonOptions';
import { ItemSearch } from '../../../../domain/item';
import {
  PlusCircleIcon,
  StockIcon,
  InfoIcon,
  MessageSquareIcon,
  XCircleIcon,
  TrashIcon,
  CopyIcon,
  CheckIcon,
  ArrowRightIcon,
} from '../../../../ui/icons';
import {
  StockLinesByItem,
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
// kdd/stocktake-line-editing). Opened from a detail-view row; it edits ALL of
// that ITEM's lines (batches) at once — the item is fixed (shown read-only at
// the top), each batch is one row / one card. The grouped DataTable gives the
// two faces from ONE column set: tabs (Batch / Pricing / Other) in table view,
// sections in card view. Edits live in a local draft STORE; Save partitions the
// draft into one batchStocktake mutation and hands the result back so the
// detail view can splice the returned nodes into its rows with no refetch.
//
// Editable, matching Open mSupply: batch, expiry + manufacture date, counted
// packs, pack size, sell/cost price, location, adjustment reason (required once
// counted differs from snapshot), note + comment. Snapshot packs is the system
// count (read-only).

// LineEditCommit (what the detail view applies in place) now lives with the
// shared batch layer (stocktakeLineUpdate) — it's the common return of every
// batchStocktake call, not modal-specific. Re-exported (imported above) so
// existing importers keep resolving it from this module.
export type { LineEditCommit };

export type StocktakeLineEditItem = { id: string; code: string; name: string };

// What the parent resolves for one item, from its current filtered/sorted list,
// and hands to the modal THROUGH the itemInfo(id) call: the item descriptor,
// that item's lines (to seed the draft), and the next item to advance to on
// "OK & next" (undefined = this is the last item → no OK & next). The parent
// owns the list and the ordering; the modal is told only the answer per item.
export type StocktakeItemInfo = {
  item: StocktakeLineEditItem;
  lines: StocktakeLineFragment[];
  nextItem?: StocktakeLineEditItem;
};

// A draft row: the line fragment plus client-only bookkeeping.
// - isNew        an added batch not yet on the stocktake (→ insert when
// counted). - stockLineId  when isNew, the stock line this draft came from (the
// item's existing batches offered for counting — e.g. batches in OTHER
// locations a location-filtered stocktake didn't auto-include). Links the
// insert back to its stock line. - countThisLine  whether the user wants this
// line IN the stocktake. Existing lines start true; the item's not-yet-counted
// batches start false (opt-in). It's the routing gate (see buildBatch) and
// gates the row's other editable cells — matching OMS's client-only
// countThisLine flag (never sent to the server). - deleted      soft-delete
// flag: the row is hidden from the table and, if it's an existing line, sent as
// a delete on save. (isNew rows splice out of the store instead — they never
// reach the server, so they leave no trace to flag.)
type DraftLine = StocktakeLineFragment & {
  isNew?: boolean;
  stockLineId?: string;
  countThisLine: boolean;
  deleted?: boolean;
};

// One of the item's stock lines (from stockLinesByItem).
type ItemStockLine = Extract<
  StockLinesByItemResult['stockLines'],
  { __typename: 'StockLineConnector' }
>['nodes'][number];

// Fetch the item's other batches (not already on the stocktake) and build the
// draft rows. The draft is the stocktake's EXISTING lines for this item
// (already counted-in → countThisLine true), PLUS those fetched stock lines,
// linked to their stockLineId (ticking one inserts it, matching OMS). The fetch
// excludes batches already on the stocktake server-side (excludeStockLineIds =
// the existing lines' stockLine ids), so a stock line isn't offered twice.
//
// countThisLine for the fetched stock lines is `countByDefault`: in UPDATE mode
// (the item is already on the stocktake) they're offered opt-in (false) — you
// choose which other batches to add; in ADD mode (a brand-new item, existing
// empty) they're all counted (true), matching OMS, since adding the item means
// counting all its batches.
//
// Called by loadItem (on mount and on each item change). A failed/empty fetch
// just yields the existing lines.
const fetchAndSeed = async (
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
  }));
  const fromStock: DraftLine[] = stockLines.map(sl => ({
    id: crypto.randomUUID(),
    isNew: true,
    stockLineId: sl.id,
    countThisLine: countByDefault,
    stockLine: { id: sl.id },
    itemName: item.name,
    item: { id: item.id, code: item.code },
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
    location: sl.location,
    reasonOption: null,
  }));
  return [...fromExisting, ...fromStock];
};

// The tabs / card-groups for the grouped table. Batch is NOT a group — it's an
// ALL_TABS anchor (shows in every tab, ungrouped in card view), see its column
// below.
type GroupKey = 'batch' | 'pricing' | 'other';
const TABS_AND_CARD_GROUPS: TabAndCardGroup<GroupKey>[] = [
  {
    key: 'batch',
    labelKey: 'label.batch',
    icon: () => <StockIcon />,
  },
  {
    key: 'pricing',
    labelKey: 'label.pricing',
    icon: () => <InfoIcon />,
  },
  {
    key: 'other',
    labelKey: 'heading.other',
    icon: () => <MessageSquareIcon />,
  },
];

// Which flow the modal is in:
// - 'update': edit an EXISTING item's lines (opened from a row). Header shows
//   the item read-only; advancing steps through the list via "OK & next".
// - 'add': ADD an item not yet on the stocktake (opened from "Add item"). Two
//   states — search for an item, then edit its (auto-counted) stock lines;
//   "OK & next" saves and returns to search to add another.
export type StocktakeLineEditMode = 'add' | 'update';

interface StocktakeLineEditModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  stocktakeId: string;
  /** Which flow (add vs update). See StocktakeLineEditMode. */
  mode: StocktakeLineEditMode;
  /**
   * UPDATE mode: the item the modal OPENS on. The modal then tracks its own
   * current item as the user advances with "OK & next", resolving each through
   * itemInfo. Unused in add mode (no initial item — the user searches).
   */
  initialItemId?: string;
  /**
   * UPDATE mode: resolve one item from the parent's current filtered/sorted
   * list — its descriptor, its lines (to seed the draft), and the next item to
   * advance to. Called on open and on each "OK & next". undefined = the item is
   * gone from the list (e.g. the filter changed) → the modal closes.
   */
  itemInfo: (id: string) => StocktakeItemInfo | undefined;
  /**
   * ADD mode: item ids already on the stocktake, hidden from the item search so
   * they can't be added twice. Read live (an accessor) so an item added via
   * "OK & next" drops out of the next search.
   */
  excludeItemIds: () => string[];
  /**
   * Fired after a successful save so the detail view reflects it in place (no
   * refetch).
   */
  onCommitted: (commit: LineEditCommit) => void;
}

// The parent-facing wrapper: mount the editor ONLY while open. `<Show>` tears
// the content down on close and rebuilds it on the next open, so the content
// starts each OPEN fresh. Within one open the content owns its current item
// (advancing via "OK & next" is imperative — see loadItem/selectItem — not a
// prop change), keeping the driving explicit (kdd/explicit-composition).
//
// The keyed `when` is the OPEN identity: in update mode it's the initial item
// id (a fresh id reopens on a new item); in add mode there's no item yet, so we
// key on the literal 'add' — the content mounts once per open and drives its
// own search → edit-lines states. (A stale close leaves `open` false, so the
// key is falsy and the content unmounts either way.)
export const StocktakeLineEditModal = (
  props: StocktakeLineEditModalProps
): JSX.Element => (
  <Show
    when={props.open && (props.mode === 'add' ? 'add' : props.initialItemId)}
    keyed
  >
    {openKey => (
      <StocktakeLineEditContent
        onClose={props.onClose}
        storeId={props.storeId}
        stocktakeId={props.stocktakeId}
        mode={props.mode}
        // In update mode the key IS the initial item id; in add mode it's the
        // 'add' sentinel and there's no initial item.
        initialItemId={props.mode === 'update' ? openKey : undefined}
        itemInfo={props.itemInfo}
        excludeItemIds={props.excludeItemIds}
        onCommitted={props.onCommitted}
      />
    )}
  </Show>
);

interface StocktakeLineEditContentProps {
  onClose: () => void;
  storeId: string;
  stocktakeId: string;
  mode: StocktakeLineEditMode;
  /** UPDATE mode: the item this open STARTS on; content advances from here. */
  initialItemId?: string;
  /** UPDATE mode: resolve an item's descriptor + lines + next (see wrapper). */
  itemInfo: (id: string) => StocktakeItemInfo | undefined;
  /** ADD mode: item ids already on the stocktake, hidden from the search. */
  excludeItemIds: () => string[];
  /**
   * Fired after a successful save so the detail view reflects it in place (no
   * refetch).
   */
  onCommitted: (commit: LineEditCommit) => void;
}

const StocktakeLineEditContent = (
  props: StocktakeLineEditContentProps
): JSX.Element => {
  // Draft state as a STORE (not a signal), so editing one field of one line
  // writes just that path — setDraft(index, field, value) — and only that
  // cell's subscribers update, rather than rebuilding the whole array on every
  // keystroke (kdd/state-management). A soft-deleted row carries a `deleted`
  // flag on the line itself (no separate id set); the store holds the full
  // draft (incl. isNew and deleted lines).
  const [draft, setDraft] = createStore<DraftLine[]>([]);
  const [saving, setSaving] = createSignal(false);
  // True while an item's lines are being fetched (mount + item switch), so the
  // table shows a spinner instead of flashing its empty state (#160/#196).
  const [loadingLines, setLoadingLines] = createSignal(true);
  const [errorMessage, setErrorMessage] = createSignal<string | undefined>();
  // Per-line save errors from the server, keyed by line id → the error's
  // __typename (the shared LineErrors shape, kept raw — same as the detail
  // view). Each COLUMN renders its own error inline — <Show
  // when={lineErrors().get(id) === 'ThatTypename'}>{t(…)}</Show> — so message +
  // placement live at the column, not here. Set on a failed save, cleared for a
  // line when it's edited. Only changes on save (not per-keystroke), so a plain
  // Map signal is enough — no store needed.
  const [lineErrors, setLineErrors] = createSignal<LineErrors>(new Map());
  // The item currently being edited and the one to advance to. The content
  // starts on props.initialItemId and moves through items itself (OK & next) —
  // currentItem is set by loadItem, never watched. nextItem drives whether the
  // OK & next button shows; undefined = current is the last item in the list.
  const [currentItem, setCurrentItem] = createSignal<StocktakeLineEditItem>();
  const [nextItem, setNextItem] = createSignal<StocktakeLineEditItem>();

  // Add mode with no item picked yet. In add mode the item selector lives
  // permanently in the title (so you can change item any time); when nothing is
  // picked yet there's nothing to count — the footer is Cancel-only, Add batch
  // is hidden, and the body shows a prompt instead of the (empty) table.
  const noItemYet = () => props.mode === 'add' && currentItem() === undefined;

  // Column config → lights up the toolbar's card-switch + column-settings
  // controls. Card view renders the batches as cards (grouped into sections),
  // the dual of the tabs.
  const tableConfig = createTableConfig({ tableId: 'stocktake-line-edit' });

  // The one seed path: make `item` the current item and REPLACE the draft with
  // its lines. Called imperatively (never from an effect that tracks the
  // current item): update mode calls it on mount and on "OK & next"; add mode
  // calls it when an item is picked from the search. setDraft(reconcile(...))
  // swaps the store's contents so no rows from the previous item linger, and we
  // reset the per-item UI (server errors, footer message) so each item starts
  // clean. countThisLine for the fetched stock lines is `countByDefault` —
  // opt-in (false) in update mode, all-counted (true) in add mode (see
  // fetchAndSeed).
  const seedDraft = async (
    item: StocktakeLineEditItem,
    existing: StocktakeLineFragment[],
    next: StocktakeLineEditItem | undefined,
    countByDefault: boolean
  ) => {
    setCurrentItem(item);
    setNextItem(next);
    setLineErrors(new Map());
    setErrorMessage(undefined);
    setLoadingLines(true);
    const seeded = await fetchAndSeed(
      props.storeId,
      item,
      existing,
      countByDefault
    );
    setDraft(reconcile(seeded, { key: 'id' }));
    setLoadingLines(false);
  };

  // UPDATE mode: resolve the item via itemInfo (item + its lines + next item),
  // then seed. If the item has vanished from the list (undefined), close.
  const loadItem = async (id: string) => {
    const info = props.itemInfo(id);
    if (!info) {
      props.onClose();
      return;
    }
    await seedDraft(info.item, info.lines, info.nextItem, false);
  };

  // ADD mode: the user picked an item in the search. Seed with NO existing
  // lines (a brand-new item) and all stock lines auto-counted. No next item —
  // add-mode "OK & next" returns to the search instead of advancing.
  const selectItem = (item: StocktakeLineEditItem) =>
    void seedDraft(item, [], undefined, true);

  // ADD mode: drop back to the item-search state (after "OK & next", or if the
  // user clears the picked item). Clears the current item and empties the
  // draft.
  const backToSearch = () => {
    setCurrentItem(undefined);
    setNextItem(undefined);
    setLineErrors(new Map());
    setErrorMessage(undefined);
    setDraft(reconcile([], { key: 'id' }));
  };

  // Seed on mount: update mode starts on its initial item; add mode starts in
  // the search state (no item yet), so there's nothing to seed.
  onMount(() => {
    if (props.mode === 'update' && props.initialItemId)
      void loadItem(props.initialItemId);
  });

  // The rows the table shows: the draft minus soft-deleted lines.
  const rows = (): DraftLine[] => draft.filter(line => !line.deleted);

  // Edit ONE field of ONE line: locate it by id, write just that path in the
  // store. Fine-grained — only that cell reacts (the whole point of the store,
  // vs. a map-the-array signal update). Editing a line clears its stale server
  // error (the user is fixing it) — mirrors OMS.
  const update = <F extends keyof DraftLine>(
    id: string,
    field: F,
    value: DraftLine[F]
  ) => {
    const index = draft.findIndex(line => line.id === id);
    if (index >= 0) setDraft(index, field, value as never);
    // Clear this line's stale server error (a fresh Map without it) so the
    // cell stops flagging.
    if (lineErrors().has(id)) {
      setLineErrors(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Add a new batch (a fresh draft line for the item) — prepended, count blank.
  const addBatch = () => {
    const item = currentItem();
    if (!item) return;
    setDraft(
      produce(lines =>
        lines.unshift({
          id: crypto.randomUUID(),
          isNew: true,
          countThisLine: true, // a manually-added batch is intended to be counted
          stockLine: null,
          itemName: item.name,
          item: { id: item.id, code: item.code },
          batch: null,
          expiryDate: null,
          manufactureDate: null,
          snapshotNumberOfPacks: 0,
          countedNumberOfPacks: null,
          packSize: null,
          sellPricePerPack: null,
          costPricePerPack: null,
          comment: null,
          note: null,
          location: null,
          reasonOption: null,
        })
      )
    );
  };

  // Soft-delete a row. A never-saved (isNew) line splices out of the store; an
  // existing line is flagged deleted (hidden from the table; the save sends a
  // delete for it).
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

  // Duplicate a row — clone its editable fields into a fresh isNew draft (new
  // id + blank count), inserted right after the source. Always an INSERT.
  // unwrap() clones plain data out of the store.
  const duplicateLine = (line: DraftLine) => {
    const copy: DraftLine = {
      ...unwrap(line),
      id: crypto.randomUUID(),
      isNew: true,
      snapshotNumberOfPacks: 0,
      countedNumberOfPacks: null,
    };
    setDraft(
      produce(lines => {
        const index = lines.findIndex(l => l.id === line.id);
        lines.splice(index + 1, 0, copy);
      })
    );
  };

  // --- Save: partition the draft into the three batch-mutation input arrays
  // --------------------- NB the UPDATE input wraps nullable date/string fields
  // as `{ value }` (NullableDateUpdate / NullableStringUpdate) — sending the
  // key means "set to value", omitting it means "leave unchanged". INSERT takes
  // the same fields UNWRAPPED. Getting this right is why expiry/location edits
  // to existing lines actually persist.
  const buildBatch = (): BatchStocktakeLinesInput => {
    const insert: NonNullable<BatchStocktakeLinesInput['insert']> = [];
    const update: NonNullable<BatchStocktakeLinesInput['update']> = [];
    // Deletes = soft-deleted existing rows (the trash action) + existing rows
    // the user unchecked (countThisLine off). Both remove an existing stocktake
    // line; never delete an isNew draft (those splice out of the store and
    // never reached the server).
    const deletes: string[] = [];
    for (const line of draft) {
      // Soft-deleted: an existing row → delete it; an isNew row shouldn't be
      // here (it splices out).
      if (line.deleted) {
        if (!line.isNew) deletes.push(line.id);
        continue;
      }

      // countThisLine is the routing gate (matching OMS):
      // - unchecked + NEW (an opt-in batch or a fresh add) → drop (never on
      // the stocktake). - unchecked + EXISTING → delete (untick removes the
      // line from the stocktake).
      if (!line.countThisLine) {
        if (!line.isNew) deletes.push(line.id);
        continue;
      }

      if (line.isNew) {
        // Checked + new → insert. The ONLY difference between an opt-in batch
        // and a manually-added one is which identity it carries: the server
        // requires EXACTLY ONE of stockLineId / itemId (StockLineXOrItem). Both
        // carry the full set of entered fields — an opt-in batch's batch/
        // expiry/pack/price/location/note edits must persist too (AC-F7: a
        // counted line can update those in place), so we send them either way
        // rather than letting the stock line's originals stand.
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
          reasonOptionId: line.reasonOption?.id ?? null,
        });
        continue;
      }
      // Checked + existing → update. We always send it (no dirty-check): the
      // server applies the full field set and returns the line, so a no-op
      // update is harmless.
      update.push({
        id: line.id,
        batch: line.batch,
        // Wrapped nullable fields ({ value }): set-or-clear on update.
        expiryDate: { value: line.expiryDate },
        manufactureDate: { value: line.manufactureDate },
        location: { value: line.location?.id ?? null },
        countedNumberOfPacks: line.countedNumberOfPacks,
        packSize: line.packSize,
        sellPricePerPack: line.sellPricePerPack,
        costPricePerPack: line.costPricePerPack,
        comment: line.comment,
        note: line.note,
        reasonOptionId: line.reasonOption?.id ?? null,
      });
    }
    return { insert, update, delete: deletes.map(id => ({ id })) };
  };

  // No pre-emptive client-side validation — we let the server decide (e.g.
  // reason-required, below-zero) and surface its per-line errors on save (see
  // below). This keeps one source of truth for what's valid.
  //
  // Returns whether the save fully succeeded (everything committed, no per-line
  // errors) — the caller decides what to do next: OK closes, OK & next
  // advances. save() itself never navigates, so both buttons share one path.
  const save = async (): Promise<boolean> => {
    setSaving(true);
    setErrorMessage(undefined);
    const outcome = await runBatchStocktakeLines(props.storeId, buildBatch());
    setSaving(false);
    if (!outcome) return false; // transport/NodeError → global modal showed it

    // Reflect the lines that DID save (partial success), even when others
    // errored — the detail view splices these in; the failed ones stay in the
    // modal for the user to fix.
    const { commit, errors } = outcome;
    if (
      commit.inserted.length ||
      commit.updated.length ||
      commit.deletedIds.length
    ) {
      props.onCommitted(commit);
    }

    if (errors.size > 0) {
      // Holds RAW typenames (lineId → typename); each column renders its own
      // inline. errors is already the shared LineErrors Map — copy it so the
      // signal owns its own instance.
      setLineErrors(new Map(errors));
      setErrorMessage(tPlural('messages.line-errors', errors.size));
      return false; // keep the modal open on the failed lines
    }
    return true;
  };

  // OK: save, then close on success (stay open on error, to fix the lines).
  const onOk = async () => {
    if (await save()) props.onClose();
  };

  // OK & next: save, then — on success — go to the "next" thing without
  // closing. UPDATE mode: advance to the stashed next item (loadItem swaps the
  // draft in place, no remount). ADD mode: return to the item-search state to
  // add another (the just-added item drops out of the search via the parent's
  // live excludeItemIds). Reuses this open either way.
  const onOkNext = async () => {
    if (!(await save())) return;
    if (props.mode === 'add') {
      backToSearch();
      return;
    }
    const next = nextItem();
    if (next) await loadItem(next.id);
  };

  // ---- Columns: one set, split across groups; batch is the anchor (every
  // tab). ---- Each identity `c` carries a `key` (a real DraftLine field, typed
  // keyof) so it's a data column; the custom `cell` overrides display (an
  // editable input). Editing flows through the cell's own onInput → update()
  // into the draft store. The final column's `c` is `{ id: 'actions' }`.
  const columns = (): Column<DraftLine, never, GroupKey>[] => [
    {
      // "Count this line" — the leading checkbox (OMS). It decides whether the
      // row is IN the stocktake: the item's other batches (e.g. in other
      // locations) start unchecked and are opted in by ticking; unticking an
      // existing line removes it. All the row's other editable cells are
      // disabled when it's off (you don't edit a line you're not counting).
      // ALL_TABS anchor so it's the first column in every tab.
      c: { id: 'countThisLine' },
      header: t('label.count-this-line'),
      tabsAndCardGroups: ALL_TABS,
      meta: { align: 'center' },
      cell: info => {
        const line = info.row.original;
        return (
          <input
            type="checkbox"
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
      header: t('label.batch'),
      tabsAndCardGroups: ALL_TABS,
      meta: { card: { region: 'primary', showLabel: true } },
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
    {
      c: { key: 'expiryDate' },
      header: t('label.expiry-date'),
      tabsAndCardGroups: ['batch'],
      cell: info => {
        const line = info.row.original;
        return (
          <TextField
            label={t('label.expiry-date')}
            hideLabel
            size="small"
            type="date"
            disabled={!line.countThisLine}
            value={line.expiryDate ?? ''}
            onInput={e =>
              update(line.id, 'expiryDate', e.currentTarget.value || null)
            }
          />
        );
      },
    },
    {
      c: { key: 'manufactureDate' },
      header: t('label.manufacture-date'),
      tabsAndCardGroups: ['other'],
      cell: info => {
        const line = info.row.original;
        return (
          <TextField
            label={t('label.manufacture-date')}
            hideLabel
            size="small"
            type="date"
            disabled={!line.countThisLine}
            value={line.manufactureDate ?? ''}
            onInput={e =>
              update(line.id, 'manufactureDate', e.currentTarget.value || null)
            }
          />
        );
      },
    },
    {
      c: { key: 'snapshotNumberOfPacks' },
      header: t('label.snapshot-num-of-packs'),
      tabsAndCardGroups: ['batch'],
      ...getNumberCell(),
      // Snapshot is the system count — read-only — but it also carries a
      // snapshot/current-count mismatch error inline beneath it (same placement
      // as the detail list). Section owns no stylesheet, so the dynamic error
      // sub-text is styled inline from the design tokens.
      cell: info => {
        const line = info.row.original;
        return (
          <span
            style={{
              display: 'inline-flex',
              'flex-direction': 'column',
              'align-items': 'flex-end',
            }}
          >
            <span>{line.snapshotNumberOfPacks ?? '—'}</span>
            <Show
              when={
                lineErrors().get(line.id) ===
                'SnapshotCountCurrentCountMismatchLine'
              }
            >
              <span
                data-testid="stocktake-line-error"
                style={{
                  color: 'var(--error-main)',
                  'font-size': 'var(--text-xs)',
                  'white-space': 'normal',
                  'text-align': 'end',
                }}
              >
                {t('error.snapshot-total-mismatch')}
              </span>
            </Show>
          </span>
        );
      },
    },
    {
      c: { key: 'countedNumberOfPacks' },
      header: t('label.counted-num-of-packs'),
      tabsAndCardGroups: ['batch'],
      ...getNumberCell(),
      cell: info => {
        const line = info.row.original;
        return (
          <TextField
            label={t('label.counted-num-of-packs')}
            hideLabel
            size="small"
            type="number"
            min="0"
            disabled={!line.countThisLine}
            value={line.countedNumberOfPacks ?? ''}
            error={
              lineErrors().get(line.id) === 'StockLineReducedBelowZero'
                ? t('error.reduced-below-zero')
                : undefined
            }
            errorTestId="stocktake-line-error"
            onInput={e =>
              update(
                line.id,
                'countedNumberOfPacks',
                toNumberOrNull(e.currentTarget.value)
              )
            }
          />
        );
      },
    },
    {
      c: { key: 'packSize' },
      header: t('label.pack-size'),
      tabsAndCardGroups: ['batch'],
      ...getNumberCell(),
      cell: info => {
        const line = info.row.original;
        return (
          <TextField
            label={t('label.pack-size')}
            hideLabel
            size="small"
            type="number"
            min="0"
            disabled={!line.countThisLine}
            value={line.packSize ?? ''}
            onInput={e =>
              update(line.id, 'packSize', toNumberOrNull(e.currentTarget.value))
            }
          />
        );
      },
    },
    {
      c: { key: 'sellPricePerPack' },
      header: t('label.pack-sell-price'),
      tabsAndCardGroups: ['pricing'],
      ...getNumberCell(),
      cell: info => {
        const line = info.row.original;
        return (
          <TextField
            label={t('label.pack-sell-price')}
            hideLabel
            size="small"
            type="number"
            min="0"
            disabled={!line.countThisLine}
            value={line.sellPricePerPack ?? ''}
            onInput={e =>
              update(
                line.id,
                'sellPricePerPack',
                toNumberOrNull(e.currentTarget.value)
              )
            }
          />
        );
      },
    },
    {
      c: { key: 'costPricePerPack' },
      header: t('label.pack-cost-price'),
      tabsAndCardGroups: ['pricing'],
      ...getNumberCell(),
      cell: info => {
        const line = info.row.original;
        return (
          <TextField
            label={t('label.pack-cost-price')}
            hideLabel
            size="small"
            type="number"
            min="0"
            disabled={!line.countThisLine}
            value={line.costPricePerPack ?? ''}
            onInput={e =>
              update(
                line.id,
                'costPricePerPack',
                toNumberOrNull(e.currentTarget.value)
              )
            }
          />
        );
      },
    },
    {
      c: { key: 'location' },
      header: t('label.location'),
      tabsAndCardGroups: ['other'],
      cell: info => {
        const line = info.row.original;
        return (
          <LocationSelect
            label={t('label.location')}
            hideLabel
            disabled={!line.countThisLine}
            value={line.location?.id}
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
    {
      // The adjustment reason. The backend decides when it's required (counted
      // differs from snapshot) and rejects the save with a per-line error,
      // surfaced inline on this column below. A display column: the custom
      // cell reads row.original, and the id is the e2e/TESTIDS.md contract's
      // `cell-inventoryAdjustmentReasonInput` (shared with OMS), not the
      // fragment field name.
      c: { id: 'inventoryAdjustmentReasonInput' },
      header: t('label.reason'),
      tabsAndCardGroups: ['batch'],
      cell: info => {
        const line = info.row.original;
        // The reason column owns two error typenames — required vs. invalid —
        // each its own message.
        const error = () => {
          const err = lineErrors().get(line.id);
          if (err === 'AdjustmentReasonNotProvided')
            return t('error.provide-reason');
          if (err === 'AdjustmentReasonNotValid')
            return t('error.provide-valid-reason');
          return undefined;
        };
        return (
          <ReasonSelect
            kind="adjustment"
            label={t('label.reason')}
            hideLabel
            disabled={!line.countThisLine}
            value={line.reasonOption?.id}
            error={error()}
            errorTestId="stocktake-line-error"
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
    },
    {
      c: { key: 'note' },
      header: t('label.note'),
      tabsAndCardGroups: ['other'],
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
      header: t('label.stocktake-comment'),
      tabsAndCardGroups: ['other'],
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
      // A DISPLAY column (buttons, no data value): identity `c` is `{ id }`
      // only — no key/accessor.
      c: { id: 'actions' },
      header: t('label.actions'),
      // Row actions (duplicate + delete). ALL_TABS anchor → the LAST column in
      // every tab in table view; card: 'badge' puts it in the card header's
      // top-right chip area in card view.
      tabsAndCardGroups: ALL_TABS,
      meta: { card: { region: 'badge' }, align: 'right' },
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
  ];

  const footerError = () => errorMessage();

  return (
    // Always open: the wrapper mounts this content only while the modal should
    // be open, and unmounting it (on close) cleanly closes the underlying
    // <dialog> (see Dialog's onCleanup).
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size="large"
      testId="add-item-modal"
      // Title, matching the reference app (StocktakeLineEditModal.tsx):
      // - UPDATE: the plain string "Edit line" (also the a11y name).
      // - ADD: an inline item selector, kept in the title the WHOLE time so the
      //   user can switch item even after picking (which discards the current
      //   item's unsaved edits — seedDraft replaces the draft). A component
      //   title can't be the a11y name, so we pass ariaLabel ("Add item").
      title={
        props.mode === 'add' ? (
          <span class={styles.addTitle}>
            <span class={styles.addPrefix}>{t('button.add')}</span>
            <ItemSearch
              label={t('button.add-item')}
              hideLabel
              class={styles.addSelect}
              storeId={props.storeId}
              excludeItemIds={props.excludeItemIds()}
              value={currentItem()?.id}
              // Pick an item → load it; clear the selection (×) → back to the
              // no-item state (empty draft, prompt, Cancel-only footer).
              onSelect={item => (item ? selectItem(item) : backToSearch())}
              placeholder={t('placeholder.enter-an-item-code-or-name')}
            />
          </span>
        ) : (
          t('heading.edit-line')
        )
      }
      ariaLabel={props.mode === 'add' ? t('heading.add-item') : undefined}
      // Add batch lives at the inline-end of the header row (beside the
      // heading), not in the footer — it's an editing affordance for the item,
      // grouped with the item it acts on. Hidden until an item is picked.
      headerActions={
        <Show when={!noItemYet()}>
          <Button
            variant="secondary"
            icon={<PlusCircleIcon />}
            data-testid="add-batch-button"
            onClick={addBatch}
          >
            {t('label.add-batch')}
          </Button>
        </Show>
      }
      // The save/validation message sits at the inline-start of the actions
      // row (beside the buttons), so it doesn't eat the table's vertical space.
      actionsLead={
        <Show when={footerError()}>
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
          {/* Add mode before an item is picked: nothing to save yet, so only
              Cancel shows. Once an item is chosen (add) or in update mode,
              OK / OK & next appear. */}
          <Show when={!noItemYet()}>
            <Button
              icon={<CheckIcon />}
              loading={saving()}
              data-testid="dialog-button-ok"
              onClick={() => void onOk()}
            >
              {t('button.ok')}
            </Button>
            {/* OK & next: add mode always offers it (save, then clear the item
                to add another); update mode only when there's a next item to
                advance to (the last item shows just OK). */}
            <Show when={props.mode === 'add' || nextItem()}>
              <Button
                icon={<ArrowRightIcon />}
                loading={saving()}
                data-testid="dialog-button-next-and-ok"
                onClick={() => void onOkNext()}
              >
                {t('button.ok-and-next')}
              </Button>
            </Show>
          </Show>
        </>
      }
    >
      {/* Add mode before an item is picked (the selector lives in the title):
          a prompt in place of the empty table. Otherwise the batch-edit table
          for the chosen item. */}
      <Show
        when={!noItemYet()}
        fallback={
          <div class={styles.selectPrompt}>
            {/* {t('placeholder.enter-an-item-code-or-name')} */}
            {/* "stocktake.line-edit.select-item-prompt": "Select an item
              // to count its stock lines.", */}
          </div>
        }
      >
        <DataTable
          columns={columns()}
          rows={rows()}
          rowKey={line => line.id}
          loading={loadingLines()}
          tabsAndCardGroups={TABS_AND_CARD_GROUPS}
          showFullScreen={false}
          config={tableConfig.config()}
          setConfig={tableConfig.setConfig}
          emptyMessage={t('label.add-new-line')}
        />
      </Show>
    </Dialog>
  );
};

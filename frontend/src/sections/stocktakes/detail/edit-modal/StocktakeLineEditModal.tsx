import { createSignal, onMount, Show, type JSX } from 'solid-js';
import { createStore, produce, reconcile, unwrap } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { t, tPlural } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { IconButton } from '../../../../ui/elements/buttons/IconButton';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { CurrencyField } from '../../../../ui/elements/inputs/CurrencyField';
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
import { VvmStatusSelect } from '../../../../domain/vvmStatus';
import { NameSearch } from '../../../../domain/name';
import { stocktakePreferences } from '../../../../store/storeContext';
import { dosesCounted } from '../lines/doses';
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
// once — each batch is one row / one card. The grouped DataTable gives two faces
// from ONE column set: tabs (Batch / Pricing / Other) in table view, sections in
// card view. Edits live in a local draft STORE; Save partitions the draft into
// one batchStocktake mutation and — on success — asks the detail view to refetch
// the current lines page (onSaved). No splice-in-place: the page re-pulls.
//
// COMBINED add/edit (no mode flag): the item selector lives in the title the
// whole time. Picking an item loads THAT item's data from the API — its existing
// stocktake lines (stocktakeLines filtered by itemId) PLUS its other stock lines
// (stockLinesByItem) — so the modal self-queries rather than being fed lines as
// props. An item already on the stocktake loads its counted lines; a brand-new
// item starts a fresh count. The search shows EVERY item (no exclusion).
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
  // The vaccine flag + doses-per-unit the doses display needs (spec/stocktakes ›
  // store-preference gates). Carried on the descriptor so a fresh blank batch
  // (addBatch) and a new-item pick both know them without a re-fetch.
  isVaccine: boolean;
  doses: number;
};

// One of the item's stock lines (from stockLinesByItem).
type ItemStockLine = Extract<
  StockLinesByItemResult['stockLines'],
  { __typename: 'StockLineConnector' }
>['nodes'][number];

// A draft row: the line fragment plus client-only bookkeeping (see the original
// notes) — isNew / stockLineId / countThisLine / deleted.
type DraftLine = StocktakeLineFragment & {
  isNew?: boolean;
  stockLineId?: string;
  countThisLine: boolean;
  deleted?: boolean;
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

// Fetch the item's other batches (stock lines NOT already on the stocktake) and
// build the draft rows: the existing lines (counted-in → countThisLine true)
// PLUS those stock lines (linked to their stockLineId — ticking one inserts it).
// countThisLine for the stock lines is `countByDefault`: opt-in (false) when the
// item already has lines on the stocktake, all-counted (true) for a brand-new
// item (adding it means counting all its batches) — matching OMS.
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
  }));
  const fromStock: DraftLine[] = stockLines.map(sl => ({
    id: crypto.randomUUID(),
    isNew: true,
    stockLineId: sl.id,
    countThisLine: countByDefault,
    stockLine: { id: sl.id },
    itemName: item.name,
    item: {
      id: item.id,
      code: item.code,
      isVaccine: item.isVaccine,
      doses: item.doses,
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
    location: sl.location,
    reasonOption: null,
    // Seed VVM / donor (preference-gated) and manufacturer (ungated) from the
    // stock line the batch opts in, so ticking an existing batch pre-fills them.
    vvmStatus: sl.vvmStatus,
    donorId: sl.donor?.id ?? null,
    donorName: sl.donor?.name ?? null,
    manufacturer: sl.manufacturer,
  }));
  return [...fromExisting, ...fromStock];
};

// The tabs / card-groups for the grouped table (unchanged). Batch is an ALL_TABS
// anchor (shows in every tab), not its own group.
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
   * UPDATE mode "OK & next": resolve the next item to edit (parent-owned; pages
   * the detail table forward as needed). See ResolveNextItem.
   */
  nextItem: ResolveNextItem;
  /**
   * Fired after a successful save so the detail view refetches the current lines
   * page (no splice-in-place).
   */
  onSaved: () => void;
}

// The parent-facing wrapper: mount the editor ONLY while open. `<Show keyed>`
// tears the content down on close and rebuilds it on the next open, so each OPEN
// starts fresh. Within one open the content owns its current item (advancing via
// "OK & next" is imperative — see loadItemById/selectItem — not a prop change).
//
// The keyed `when` is the OPEN identity: the initial item id when opened from a
// row, or the literal 'add' when opened from "Add item" (no initial item). A
// stale close leaves `open` false, so the key is falsy and the content unmounts.
export const StocktakeLineEditModal = (
  props: StocktakeLineEditModalProps
): JSX.Element => (
  <Show when={props.open && (props.initialItemId ?? 'add')} keyed>
    {openKey => (
      <StocktakeLineEditContent
        onClose={props.onClose}
        storeId={props.storeId}
        stocktakeId={props.stocktakeId}
        // 'add' sentinel → no initial item (start in add mode); otherwise the id.
        initialItemId={openKey === 'add' ? undefined : openKey}
        nextItem={props.nextItem}
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
  nextItem: ResolveNextItem;
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
  // 'add' ("Add item", or fallen into when an update walk runs out — "OK & next"
  // clears the selector to add another). Only ever flips update → add, never
  // back. Not user-visible (no Add/Edit label).
  const [mode, setMode] = createSignal<'add' | 'update'>(
    props.initialItemId ? 'update' : 'add'
  );

  // Items already stepped through THIS iteration (since the modal opened on a
  // row), so the parent's next-item walk never offers one twice — across page
  // advances too. Seeded with each item as it loads; not reactive.
  const coveredItemIds = new Set<string>();

  // Store-preference display gates (spec/stocktakes › store-preference gates),
  // read reactively. Each gated column is built into the column set only when
  // its preference is on. The VVM/doses cells additionally render only for a
  // vaccine item's rows (isVaccine off → blank).
  const prefs = () => stocktakePreferences();

  // No item picked yet → the search state (Cancel-only footer, prompt in place
  // of the table, no Add batch / OK / OK & next).
  const noItemYet = () => currentItem() === undefined;

  const tableConfig = createTableConfig({ tableId: 'stocktake-line-edit' });

  // Seed the draft for one item. Replaces the store (reconcile by id) so no rows
  // from the previous item linger, and resets per-item UI. countByDefault:
  // opt-in (unchecked) when the item already has stocktake lines, all-counted
  // for a brand-new item. Records the item in the covered set for the walk.
  const seedItem = async (item: StocktakeLineEditItem) => {
    setCurrentItem(item);
    coveredItemIds.add(item.id);
    setLineErrors(new Map());
    setErrorMessage(undefined);
    setLoadingLines(true);
    const existing = await fetchExistingLines(
      props.storeId,
      props.stocktakeId,
      item.id
    );
    const seeded = await buildDraft(
      props.storeId,
      item,
      existing,
      existing.length === 0
    );
    setDraft(reconcile(seeded, { key: 'id' }));
    setLoadingLines(false);
  };

  // The user picked an item in the search (or a row opened one). We only have
  // its id from a row open; the descriptor (code/name) comes from the search
  // selection OR, for a row open, from the item's own existing lines.
  //
  // Picking from the selector is an ADD-flow action: update mode is entered ONLY
  // by clicking a row, so a manual pick switches to add mode (its "OK & next"
  // then adds another rather than stepping the original row-walk).
  const selectItem = (item: StocktakeLineEditItem) => {
    setMode('add');
    void seedItem(item);
  };

  // Row-open path: resolve the item descriptor from its existing lines (the
  // fetch we need for the draft anyway), then seed. If the item has no lines
  // (vanished), close.
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
    await seedItem({
      id,
      code: first.item.code,
      name: first.itemName,
      isVaccine: first.item.isVaccine,
      doses: first.item.doses,
    });
  };

  // Back to the item-search state — add mode with no item picked. Reached by the
  // × clear, by "OK & next" in add mode, or when an update walk runs out of
  // items. Always add mode from here on.
  const backToSearch = () => {
    setMode('add');
    setCurrentItem(undefined);
    setLineErrors(new Map());
    setErrorMessage(undefined);
    setDraft(reconcile([], { key: 'id' }));
  };

  // Seed on mount: a row open starts on its item; an add open starts in the
  // search state (nothing to seed).
  onMount(() => {
    if (props.initialItemId) void loadItemById(props.initialItemId);
    else setLoadingLines(false);
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

  // Add a new batch (a fresh draft line) — prepended, count blank.
  const addBatch = () => {
    const item = currentItem();
    if (!item) return;
    setDraft(
      produce(lines =>
        lines.unshift({
          id: crypto.randomUUID(),
          isNew: true,
          countThisLine: true,
          stockLine: null,
          itemName: item.name,
          item: {
            id: item.id,
            code: item.code,
            isVaccine: item.isVaccine,
            doses: item.doses,
          },
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
          // A fresh batch has no VVM / donor / manufacturer yet — the user fills
          // them in via the VVM / donor (preference-gated) and manufacturer
          // (ungated) fields on the Batch / Other tabs.
          vvmStatus: null,
          donorId: null,
          donorName: null,
          manufacturer: null,
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

  // Partition the draft into the batch-mutation input arrays (unchanged from the
  // original — the routing rules for insert/update/delete + countThisLine are
  // identical). See the wrapped-nullable-field note.
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
          reasonOptionId: line.reasonOption?.id ?? null,
          // VVM / donor (preference-gated) + manufacturer (ungated). Plain
          // scalars on INSERT (contract: InsertStocktakeLineInput). Gated fields
          // are sent regardless of the preference — the server accepts the data
          // either way; the preference only decides whether the field was
          // editable.
          vvmStatusId: line.vvmStatus?.id ?? null,
          donorId: line.donorId ?? null,
          manufacturerId: line.manufacturer?.id ?? null,
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
        reasonOptionId: line.reasonOption?.id ?? null,
        // VVM / donor (preference-gated) + manufacturer (ungated) —
        // NullableStringUpdate wrapper on UPDATE (contract:
        // UpdateStocktakeLineInput): { value: id | null } sets/clears.
        vvmStatusId: { value: line.vvmStatus?.id ?? null },
        donorId: { value: line.donorId ?? null },
        manufacturerId: { value: line.manufacturer?.id ?? null },
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
  // (Unchanged from the original — each cell edits the draft store via update().)
  const columns = (): Column<DraftLine, never, GroupKey>[] => [
    {
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
          <NumberField
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
            onChange={value =>
              update(line.id, 'countedNumberOfPacks', value ?? null)
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
          <NumberField
            label={t('label.pack-size')}
            hideLabel
            size="small"
            decimalLimit={2}
            disabled={!line.countThisLine}
            value={line.packSize ?? undefined}
            onChange={value => update(line.id, 'packSize', value ?? null)}
          />
        );
      },
    },
    // VVM status (Batch tab) — gated by manageVvmStatusForStock, vaccine rows
    // only. A VvmStatusSelect editing the draft's vvmStatus node.
    ...(prefs().manageVvmStatusForStock
      ? [
          {
            c: { id: 'vvmStatus' },
            header: t('label.vvm-status'),
            tabsAndCardGroups: ['batch'],
            cell: info => {
              const line = info.row.original;
              // Non-vaccine rows leave the cell blank (the display is vaccine-
              // only even when the preference is on).
              if (!line.item.isVaccine) return null;
              return (
                <VvmStatusSelect
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
    // Doses counted (Batch tab) — gated by manageVaccinesInDoses, display-only,
    // vaccine rows only (blank otherwise). Computed client-side (see ../lines/
    // doses); nothing stored per line.
    ...(prefs().manageVaccinesInDoses
      ? [
          {
            c: { id: 'dosesCounted' },
            header: t('label.doses-counted'),
            tabsAndCardGroups: ['batch'],
            ...getNumberCell(),
            cell: info => {
              const doses = dosesCounted(info.row.original);
              return <span>{doses ?? ''}</span>;
            },
          } satisfies Column<DraftLine, never, GroupKey>,
        ]
      : []),
    {
      c: { key: 'sellPricePerPack' },
      header: t('label.pack-sell-price'),
      tabsAndCardGroups: ['pricing'],
      ...getNumberCell(),
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
      header: t('label.pack-cost-price'),
      tabsAndCardGroups: ['pricing'],
      ...getNumberCell(),
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
    // Donor (Other tab) — gated by allowTrackingOfStockByDonor. An async donor
    // picker (NameSearch role="donor") over the draft's donorId/donorName. The
    // line stores only id+name, so `selected` is a minimal NameOption (like
    // ItemSearch's fallback) — enough to label the current value.
    ...(prefs().allowTrackingOfStockByDonor
      ? [
          {
            c: { id: 'donor' },
            header: t('label.donor'),
            tabsAndCardGroups: ['other'],
            cell: info => {
              const line = info.row.original;
              return (
                <NameSearch
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
    // Manufacturer (Other tab) — UNGATED (no store preference; spec S4 lists it
    // alongside donor but without a gate). An async manufacturer picker
    // (NameSearch role="manufacturer") over the draft's manufacturer NameNode;
    // saved via manufacturerId in buildBatch.
    {
      c: { id: 'manufacturer' },
      header: t('label.manufacturer'),
      tabsAndCardGroups: ['other'],
      cell: info => {
        const line = info.row.original;
        return (
          <NameSearch
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
    {
      c: { id: 'inventoryAdjustmentReasonInput' },
      header: t('label.reason'),
      tabsAndCardGroups: ['batch'],
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
        return (
          <ReasonSelect
            kind="adjustment"
            label={t('label.reason')}
            hideLabel
            disabled={!line.countThisLine}
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
      c: { id: 'actions' },
      header: t('label.actions'),
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
      size="large"
      testId="add-item-modal"
      // Title: JUST the item selector (no "Add"/"Edit" label — the modal is one
      // combined flow). Kept in the title the WHOLE time so the user can switch
      // item any time — picking one loads its lines (discarding the current
      // item's unsaved edits — seedItem replaces the draft). A component title
      // can't be the a11y name, so pass ariaLabel.
      //
      // `selectedItem` gives the combobox the current item's label directly, so
      // it displays even in update mode where the row-opened item isn't in the
      // search's own paginated result list.
      title={
        <span class={styles.addTitle}>
          <ItemSearch
            label={t('heading.add-item')}
            hideLabel
            class={styles.addSelect}
            storeId={props.storeId}
            value={currentItem()?.id}
            selectedItem={currentItem()}
            // Pick an item → load it; clear (×) → back to the search state.
            onSelect={item => (item ? selectItem(item) : backToSearch())}
            placeholder={t('placeholder.enter-an-item-code-or-name')}
          />
        </span>
      }
      ariaLabel={t('heading.add-item')}
      // Add batch lives at the inline-end of the header row. Hidden until an
      // item is picked.
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
          {/* Before an item is picked: nothing to save, so only Cancel shows.
              Once an item is chosen, OK / OK & next appear. */}
          <Show when={!noItemYet()}>
            <Button
              icon={<CheckIcon />}
              loading={busy()}
              data-testid="dialog-button-ok"
              onClick={() => void onOk()}
            >
              {t('button.ok')}
            </Button>
            {/* OK & next: ALWAYS shown once an item is loaded (both modes). In
                update mode it advances to the next item, or — when the walk is
                exhausted — saves and drops into add mode. In add mode it saves
                and returns to the search to add another. */}
            <Button
              icon={<ArrowRightIcon />}
              loading={busy()}
              data-testid="dialog-button-next-and-ok"
              onClick={() => void onOkNext()}
            >
              {t('button.ok-and-next')}
            </Button>
          </Show>
        </>
      }
    >
      {/* Before an item is picked (the selector lives in the title): a prompt in
          place of the empty table. Otherwise the batch-edit table. */}
      <Show
        when={!noItemYet()}
        fallback={
          <div class={styles.selectPrompt}>
            {t('messages.select-item-to-count')}
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

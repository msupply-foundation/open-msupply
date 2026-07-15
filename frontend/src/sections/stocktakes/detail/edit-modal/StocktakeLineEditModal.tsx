import { createSignal, onMount, Show, type JSX } from 'solid-js';
import { createStore, produce, reconcile, unwrap } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { toNumberOrNull } from '../../../../typeHelpers';
import { t } from '../../../../intl';
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
import {
  PlusCircleIcon,
  StockIcon,
  InfoIcon,
  MessageSquareIcon,
  XCircleIcon,
  TrashIcon,
  CopyIcon,
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
import {
  stocktakeLineErrorMessage,
  stocktakeLineErrorField,
  type LineErrorField,
} from '../lines/stocktakeLineErrors';

// The stocktake line-edit modal (kdd/edit-line-card-table + kdd/stocktake-line-editing). Opened
// from a detail-view row; it edits ALL of that ITEM's lines (batches) at once — the item is fixed
// (shown read-only at the top), each batch is one row / one card. The grouped DataTable gives the
// two faces from ONE column set: tabs (Batch / Pricing / Other) in table view, sections in card
// view. Edits live in a local draft STORE; Save partitions the draft into one batchStocktake
// mutation and hands the result back so the detail view can splice the returned nodes into its
// rows with no refetch.
//
// Editable, matching Open mSupply: batch, expiry + manufacture date, counted packs, pack size,
// sell/cost price, location, adjustment reason (required once counted differs from snapshot),
// note + comment. Snapshot packs is the system count (read-only).

// LineEditCommit (what the detail view applies in place) now lives with the shared batch layer
// (stocktakeLineUpdate) — it's the common return of every batchStocktake call, not modal-specific.
// Re-exported (imported above) so existing importers keep resolving it from this module.
export type { LineEditCommit };

export type StocktakeLineEditItem = { id: string; code: string; name: string };

// A draft row: the line fragment plus client-only bookkeeping.
//  - isNew        an added batch not yet on the stocktake (→ insert when counted).
//  - stockLineId  when isNew, the stock line this draft came from (the item's existing batches
//                 offered for counting — e.g. batches in OTHER locations a location-filtered
//                 stocktake didn't auto-include). Links the insert back to its stock line.
//  - countThisLine  whether the user wants this line IN the stocktake. Existing lines start true;
//                 the item's not-yet-counted batches start false (opt-in). It's the routing gate
//                 (see buildBatch) and gates the row's other editable cells — matching OMS's
//                 client-only countThisLine flag (never sent to the server).
//  - deleted      soft-delete flag: the row is hidden from the table and, if it's an existing
//                 line, sent as a delete on save. (isNew rows splice out of the store instead —
//                 they never reach the server, so they leave no trace to flag.)
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

// Fetch the item's other batches (not already on the stocktake) and build the draft rows. The
// draft is the stocktake's EXISTING lines for this item (already counted-in → countThisLine true),
// PLUS those fetched stock lines (offered for opt-in → countThisLine false, isNew, linked to their
// stockLineId; ticking one inserts it, matching OMS). The fetch excludes batches already on the
// stocktake server-side (excludeStockLineIds = the existing lines' stockLine ids), so a stock line
// isn't offered twice. Called once when the modal mounts (see the content component's onMount);
// in future also when the selected lines change. A failed/empty fetch just yields the existing
// lines. This is the ONE place the draft is seeded — no reactive reseeding to track.
const fetchAndSeed = async (
  storeId: string,
  item: StocktakeLineEditItem,
  existing: StocktakeLineFragment[],
): Promise<DraftLine[]> => {
  const result = await graphqlFetch(StockLinesByItem, {
    storeId,
    itemId: item.id,
    excludeStockLineIds: existing
      .map((line) => line.stockLine?.id)
      .filter((id): id is string => id != null),
  });
  const stockLines: ItemStockLine[] =
    result.kind === 'success' && result.data.stockLines.__typename === 'StockLineConnector'
      ? result.data.stockLines.nodes
      : [];

  const fromExisting: DraftLine[] = existing.map((line) => ({ ...line, countThisLine: true }));
  const fromStock: DraftLine[] = stockLines.map((sl) => ({
    id: crypto.randomUUID(),
    isNew: true,
    stockLineId: sl.id,
    countThisLine: false,
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

// The tabs / card-groups for the grouped table. Batch is NOT a group — it's an ALL_TABS anchor
// (shows in every tab, ungrouped in card view), see its column below.
type GroupKey = 'batch' | 'pricing' | 'other';
const TABS_AND_CARD_GROUPS: TabAndCardGroup<GroupKey>[] = [
  { key: 'batch', labelKey: 'stocktake.line-edit.tab-batch', icon: () => <StockIcon /> },
  { key: 'pricing', labelKey: 'stocktake.line-edit.tab-pricing', icon: () => <InfoIcon /> },
  { key: 'other', labelKey: 'stocktake.line-edit.tab-other', icon: () => <MessageSquareIcon /> },
];

interface StocktakeLineEditModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  stocktakeId: string;
  /** The item whose lines are edited (fixed for the modal's lifetime). */
  item?: StocktakeLineEditItem;
  /** That item's existing lines, to seed the draft. */
  lines: StocktakeLineFragment[];
  /** Fired after a successful save so the detail view reflects it in place (no refetch). */
  onCommitted: (commit: LineEditCommit) => void;
}

// The parent-facing wrapper: mount the editor ONLY while open, and only with an item. `<Show>`
// tears the content down on close and rebuilds it on the next open, so the content component owns
// no open/closed state — it fetches + seeds once, on mount (kdd/explicit-composition). This keeps
// the driving of the editor explicit (open by passing an item, close via onClose) rather than the
// content reacting to prop changes.
export const StocktakeLineEditModal = (props: StocktakeLineEditModalProps): JSX.Element => (
  <Show when={props.open && props.item} keyed>
    {(item) => (
      <StocktakeLineEditContent
        onClose={props.onClose}
        storeId={props.storeId}
        stocktakeId={props.stocktakeId}
        item={item}
        lines={props.lines}
        onCommitted={props.onCommitted}
      />
    )}
  </Show>
);

interface StocktakeLineEditContentProps {
  onClose: () => void;
  storeId: string;
  stocktakeId: string;
  /** The item whose lines are edited (fixed for the content's lifetime — it remounts per open). */
  item: StocktakeLineEditItem;
  /** That item's existing lines, to seed the draft. */
  lines: StocktakeLineFragment[];
  /** Fired after a successful save so the detail view reflects it in place (no refetch). */
  onCommitted: (commit: LineEditCommit) => void;
}

const StocktakeLineEditContent = (props: StocktakeLineEditContentProps): JSX.Element => {
  // Draft state as a STORE (not a signal), so editing one field of one line writes just that
  // path — setDraft(index, field, value) — and only that cell's subscribers update, rather than
  // rebuilding the whole array on every keystroke (kdd/state-management). A soft-deleted row
  // carries a `deleted` flag on the line itself (no separate id set); the store holds the full
  // draft (incl. isNew and deleted lines).
  const [draft, setDraft] = createStore<DraftLine[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | undefined>();
  // Per-line save errors from the server, keyed by line id → the error's __typename (the shared
  // LineErrors shape, kept raw). The COLUMN renders it (message + which cell to mark) via
  // stocktakeLineError* — this store holds no pre-rendered text. Set on a failed save, cleared for
  // a line when it's edited. A store (not a signal) so each cell's error reacts independently.
  const [lineErrors, setLineErrors] = createStore<Record<string, string>>({});

  // Column config → lights up the toolbar's card-switch + column-settings controls. Card view
  // renders the batches as cards (grouped into sections), the dual of the tabs.
  const tableConfig = createTableConfig({ tableId: 'stocktake-line-edit' });

  // Seed once, on mount: fetch the item's opt-in batches and build the draft (fetchAndSeed). The
  // modal only mounts while open (see the wrapper), so this replaces the old open/item-keyed
  // resource + reseed machinery — the draft starts empty and fills when the fetch resolves. In
  // future this same call re-runs when the selected lines change.
  onMount(() => {
    void fetchAndSeed(props.storeId, props.item, props.lines).then((seeded) => setDraft(seeded));
  });

  // The rows the table shows: the draft minus soft-deleted lines.
  const rows = (): DraftLine[] => draft.filter((line) => !line.deleted);

  // Edit ONE field of ONE line: locate it by id, write just that path in the store. Fine-grained
  // — only that cell reacts (the whole point of the store, vs. a map-the-array signal update).
  // Editing a line clears its stale server error (the user is fixing it) — mirrors OMS.
  const update = <F extends keyof DraftLine>(id: string, field: F, value: DraftLine[F]) => {
    const index = draft.findIndex((line) => line.id === id);
    if (index >= 0) setDraft(index, field, value as never);
    if (lineErrors[id]) setLineErrors(id, undefined!);
  };

  // The server error message to show on a given line's given field, or undefined — the COLUMN's
  // render-time view of the raw typename store. The typename maps to the field it's about (counted /
  // snapshot / reason); an error with no specific field (e.g. CannotEditStocktake) shows on
  // `counted` as the row's general anchor. The message maps the typename (server description as
  // fallback); we have no per-line description here, so the fallback is the typename itself.
  const fieldError = (id: string, field: LineErrorField): string | undefined => {
    const typename = lineErrors[id];
    if (!typename) return undefined;
    const errorField = stocktakeLineErrorField(typename);
    return errorField === field || (errorField === undefined && field === 'counted')
      ? stocktakeLineErrorMessage(typename, typename)
      : undefined;
  };

  // Add a new batch (a fresh draft line for the item) — prepended, count blank.
  const addBatch = () => {
    const item = props.item;
    setDraft(
      produce((lines) =>
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
        }),
      ),
    );
  };

  // Soft-delete a row. A never-saved (isNew) line splices out of the store; an existing line is
  // flagged deleted (hidden from the table; the save sends a delete for it).
  const removeLine = (line: DraftLine) => {
    if (line.isNew) {
      setDraft(
        produce((lines) => {
          const index = lines.findIndex((l) => l.id === line.id);
          if (index >= 0) lines.splice(index, 1);
        }),
      );
    } else {
      const index = draft.findIndex((l) => l.id === line.id);
      if (index >= 0) setDraft(index, 'deleted', true);
    }
  };

  // Duplicate a row — clone its editable fields into a fresh isNew draft (new id + blank count),
  // inserted right after the source. Always an INSERT. unwrap() clones plain data out of the store.
  const duplicateLine = (line: DraftLine) => {
    const copy: DraftLine = {
      ...unwrap(line),
      id: crypto.randomUUID(),
      isNew: true,
      snapshotNumberOfPacks: 0,
      countedNumberOfPacks: null,
    };
    setDraft(
      produce((lines) => {
        const index = lines.findIndex((l) => l.id === line.id);
        lines.splice(index + 1, 0, copy);
      }),
    );
  };

  // --- Save: partition the draft into the three batch-mutation input arrays ---------------------
  // NB the UPDATE input wraps nullable date/string fields as `{ value }` (NullableDateUpdate /
  // NullableStringUpdate) — sending the key means "set to value", omitting it means "leave
  // unchanged". INSERT takes the same fields UNWRAPPED. Getting this right is why expiry/location
  // edits to existing lines actually persist.
  const buildBatch = (): BatchStocktakeLinesInput => {
    const insert: NonNullable<BatchStocktakeLinesInput['insert']> = [];
    const update: NonNullable<BatchStocktakeLinesInput['update']> = [];
    // Deletes = soft-deleted existing rows (the trash action) + existing rows the user unchecked
    // (countThisLine off). Both remove an existing stocktake line; never delete an isNew draft
    // (those splice out of the store and never reached the server).
    const deletes: string[] = [];
    for (const line of draft) {
      // Soft-deleted: an existing row → delete it; an isNew row shouldn't be here (it splices out).
      if (line.deleted) {
        if (!line.isNew) deletes.push(line.id);
        continue;
      }

      // countThisLine is the routing gate (matching OMS):
      //  - unchecked + NEW (an opt-in batch or a fresh add) → drop (never on the stocktake).
      //  - unchecked + EXISTING → delete (untick removes the line from the stocktake).
      if (!line.countThisLine) {
        if (!line.isNew) deletes.push(line.id);
        continue;
      }

      if (line.isNew) {
        // Checked + new → insert. The ONLY difference between an opt-in batch and a manually-added
        // one is which identity it carries: the server requires EXACTLY ONE of stockLineId / itemId
        // (StockLineXOrItem). Both carry the full set of entered fields — an opt-in batch's batch/
        // expiry/pack/price/location/note edits must persist too (AC-F7: a counted line can update
        // those in place), so we send them either way rather than letting the stock line's originals
        // stand.
        insert.push({
          id: line.id,
          stocktakeId: props.stocktakeId,
          ...(line.stockLineId ? { stockLineId: line.stockLineId } : { itemId: line.item.id }),
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
      // Checked + existing → update. We always send it (no dirty-check): the server applies the
      // full field set and returns the line, so a no-op update is harmless.
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
    return { insert, update, delete: deletes.map((id) => ({ id })) };
  };

  // No pre-emptive client-side validation — we let the server decide (e.g. reason-required,
  // below-zero) and surface its per-line errors on save (see below). This keeps one source of
  // truth for what's valid.
  const save = async () => {
    setSaving(true);
    setErrorMessage(undefined);
    const outcome = await runBatchStocktakeLines(props.storeId, buildBatch());
    setSaving(false);
    if (!outcome) return; // transport/NodeError → global modal already showed it

    // Reflect the lines that DID save (partial success), even when others errored — the detail view
    // splices these in; the failed ones stay in the modal for the user to fix.
    const { commit, errors } = outcome;
    if (commit.inserted.length || commit.updated.length || commit.deletedIds.length) {
      props.onCommitted(commit);
    }

    if (errors.size > 0) {
      // The store holds RAW typenames (lineId → typename); the columns render them (see fieldError).
      setLineErrors(reconcile(Object.fromEntries(errors)));
      setErrorMessage(t('stocktake.line-edit.save-errors'));
      return; // keep the modal open on the failed lines
    }
    props.onClose();
  };

  // ---- Columns: one set, split across groups; batch is the anchor (every tab). ----
  // Each identity `c` carries a `key` (a real DraftLine field, typed keyof) so it's a data column;
  // the custom `cell` overrides display (an editable input). Editing flows through the cell's own
  // onInput → update() into the draft store. The final column's `c` is `{ id: 'actions' }`.
  const columns = (): Column<DraftLine, never, GroupKey>[] => [
    {
      // "Count this line" — the leading checkbox (OMS). It decides whether the row is IN the
      // stocktake: the item's other batches (e.g. in other locations) start unchecked and are
      // opted in by ticking; unticking an existing line removes it. All the row's other editable
      // cells are disabled when it's off (you don't edit a line you're not counting). ALL_TABS
      // anchor so it's the first column in every tab.
      c: { id: 'countThisLine' },
      header: t('stocktake.line-edit.count-this-line'),
      tabsAndCardGroups: ALL_TABS,
      meta: { align: 'center' },
      cell: (info) => {
        const line = info.row.original;
        return (
          <input
            type="checkbox"
            aria-label={t('stocktake.line-edit.count-this-line')}
            checked={line.countThisLine}
            onChange={(e) => update(line.id, 'countThisLine', e.currentTarget.checked)}
          />
        );
      },
    },
    {
      c: { key: 'batch' },
      header: t('stocktake.column.batch'),
      tabsAndCardGroups: ALL_TABS,
      meta: { card: { region: 'primary', showLabel: true } },
      cell: (info) => {
        const line = info.row.original;
        return (
          <TextField
            label={t('stocktake.column.batch')}
            hideLabel
            size="small"
            disabled={!line.countThisLine}
            value={line.batch ?? ''}
            onInput={(e) => update(line.id, 'batch', e.currentTarget.value || null)}
          />
        );
      },
    },
    {
      c: { key: 'expiryDate' },
      header: t('stocktake.column.expiry'),
      tabsAndCardGroups: ['batch'],
      cell: (info) => {
        const line = info.row.original;
        return (
          <TextField
            label={t('stocktake.column.expiry')}
            hideLabel
            size="small"
            type="date"
            disabled={!line.countThisLine}
            value={line.expiryDate ?? ''}
            onInput={(e) => update(line.id, 'expiryDate', e.currentTarget.value || null)}
          />
        );
      },
    },
    {
      c: { key: 'manufactureDate' },
      header: t('stocktake.line-edit.manufacture-date'),
      tabsAndCardGroups: ['other'],
      cell: (info) => {
        const line = info.row.original;
        return (
          <TextField
            label={t('stocktake.line-edit.manufacture-date')}
            hideLabel
            size="small"
            type="date"
            disabled={!line.countThisLine}
            value={line.manufactureDate ?? ''}
            onInput={(e) => update(line.id, 'manufactureDate', e.currentTarget.value || null)}
          />
        );
      },
    },
    {
      c: { key: 'snapshotNumberOfPacks' },
      header: t('stocktake.column.snapshot'),
      tabsAndCardGroups: ['batch'],
      ...getNumberCell(),
      // Snapshot is the system count — read-only — but it also carries a snapshot/current-count
      // mismatch error inline beneath it (same placement as the detail list). Section owns no
      // stylesheet, so the dynamic error sub-text is styled inline from the design tokens.
      cell: (info) => {
        const line = info.row.original;
        const error = fieldError(line.id, 'snapshot');
        return (
          <span style={{ display: 'inline-flex', 'flex-direction': 'column', 'align-items': 'flex-end' }}>
            <span>{line.snapshotNumberOfPacks ?? '—'}</span>
            <Show when={error}>
              <span
                style={{
                  color: 'var(--error-main)',
                  'font-size': 'var(--text-xs)',
                  'white-space': 'normal',
                  'text-align': 'end',
                }}
              >
                {error}
              </span>
            </Show>
          </span>
        );
      },
    },
    {
      c: { key: 'countedNumberOfPacks' },
      header: t('stocktake.column.counted'),
      tabsAndCardGroups: ['batch'],
      ...getNumberCell(),
      cell: (info) => {
        const line = info.row.original;
        return (
          <TextField
            label={t('stocktake.column.counted')}
            hideLabel
            size="small"
            type="number"
            min="0"
            disabled={!line.countThisLine}
            value={line.countedNumberOfPacks ?? ''}
            error={fieldError(line.id, 'counted')}
            onInput={(e) =>
              update(line.id, 'countedNumberOfPacks', toNumberOrNull(e.currentTarget.value))
            }
          />
        );
      },
    },
    {
      c: { key: 'packSize' },
      header: t('stocktake.line-edit.pack-size'),
      tabsAndCardGroups: ['batch'],
      ...getNumberCell(),
      cell: (info) => {
        const line = info.row.original;
        return (
          <TextField
            label={t('stocktake.line-edit.pack-size')}
            hideLabel
            size="small"
            type="number"
            min="0"
            disabled={!line.countThisLine}
            value={line.packSize ?? ''}
            onInput={(e) => update(line.id, 'packSize', toNumberOrNull(e.currentTarget.value))}
          />
        );
      },
    },
    {
      c: { key: 'sellPricePerPack' },
      header: t('stocktake.line-edit.sell-price'),
      tabsAndCardGroups: ['pricing'],
      ...getNumberCell(),
      cell: (info) => {
        const line = info.row.original;
        return (
          <TextField
            label={t('stocktake.line-edit.sell-price')}
            hideLabel
            size="small"
            type="number"
            min="0"
            disabled={!line.countThisLine}
            value={line.sellPricePerPack ?? ''}
            onInput={(e) =>
              update(line.id, 'sellPricePerPack', toNumberOrNull(e.currentTarget.value))
            }
          />
        );
      },
    },
    {
      c: { key: 'costPricePerPack' },
      header: t('stocktake.line-edit.cost-price'),
      tabsAndCardGroups: ['pricing'],
      ...getNumberCell(),
      cell: (info) => {
        const line = info.row.original;
        return (
          <TextField
            label={t('stocktake.line-edit.cost-price')}
            hideLabel
            size="small"
            type="number"
            min="0"
            disabled={!line.countThisLine}
            value={line.costPricePerPack ?? ''}
            onInput={(e) =>
              update(line.id, 'costPricePerPack', toNumberOrNull(e.currentTarget.value))
            }
          />
        );
      },
    },
    {
      c: { key: 'location' },
      header: t('stocktake.line-edit.location'),
      tabsAndCardGroups: ['other'],
      cell: (info) => {
        const line = info.row.original;
        return (
          <LocationSelect
            label={t('stocktake.line-edit.location')}
            hideLabel
            disabled={!line.countThisLine}
            value={line.location?.id}
            placeholder={t('stocktake.line-edit.location-none')}
            onChange={(l) =>
              update(line.id, 'location', l ? { id: l.id, code: l.code, name: l.name } : null)
            }
          />
        );
      },
    },
    {
      // The adjustment reason. The backend decides when it's required (counted differs from
      // snapshot) and rejects the save with a field error, which we surface via `fieldError`.
      c: { key: 'reasonOption' },
      header: t('stocktake.line-edit.reason'),
      tabsAndCardGroups: ['batch'],
      cell: (info) => {
        const line = info.row.original;
        return (
          <ReasonSelect
            kind="adjustment"
            label={t('stocktake.line-edit.reason')}
            hideLabel
            disabled={!line.countThisLine}
            value={line.reasonOption?.id}
            error={fieldError(line.id, 'reason')}
            placeholder={t('stocktake.line-edit.reason-select')}
            onChange={(r) =>
              update(
                line.id,
                'reasonOption',
                r ? { id: r.id, type: r.type, reason: r.reason } : null,
              )
            }
          />
        );
      },
    },
    {
      c: { key: 'note' },
      header: t('stocktake.line-edit.note'),
      tabsAndCardGroups: ['other'],
      cell: (info) => {
        const line = info.row.original;
        return (
          <TextField
            label={t('stocktake.line-edit.note')}
            hideLabel
            size="small"
            disabled={!line.countThisLine}
            value={line.note ?? ''}
            onInput={(e) => update(line.id, 'note', e.currentTarget.value || null)}
          />
        );
      },
    },
    {
      c: { key: 'comment' },
      header: t('stocktake.detail.comment'),
      tabsAndCardGroups: ['other'],
      cell: (info) => {
        const line = info.row.original;
        return (
          <TextField
            label={t('stocktake.detail.comment')}
            hideLabel
            size="small"
            disabled={!line.countThisLine}
            value={line.comment ?? ''}
            onInput={(e) => update(line.id, 'comment', e.currentTarget.value || null)}
          />
        );
      },
    },
    {
      // A DISPLAY column (buttons, no data value): identity `c` is `{ id }` only — no key/accessor.
      c: { id: 'actions' },
      header: t('common.action'),
      // Row actions (duplicate + delete). ALL_TABS anchor → the LAST column in every tab in table
      // view; card: 'badge' puts it in the card header's top-right chip area in card view.
      tabsAndCardGroups: ALL_TABS,
      meta: { card: { region: 'badge' }, align: 'right' },
      cell: (info) => {
        const line = info.row.original;
        return (
          <>
            <IconButton
              bordered
              size="small"
              icon={<CopyIcon />}
              label={t('stocktake.line-edit.duplicate')}
              onClick={() => duplicateLine(line)}
            />
            <IconButton
              bordered
              size="small"
              variant="danger"
              icon={<TrashIcon />}
              label={t('common.delete')}
              onClick={() => removeLine(line)}
            />
          </>
        );
      },
    },
  ];

  const footerError = () => errorMessage();

  return (
    // Always open: the wrapper mounts this content only while the modal should be open, and
    // unmounting it (on close) cleanly closes the underlying <dialog> (see Dialog's onCleanup).
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size="large"
      title={props.item.name}
      description={props.item.code}
      // The save/validation message sits at the inline-start of the actions row (beside the
      // buttons), so it doesn't eat the table's vertical space.
      actionsLead={
        <Show when={footerError()}>{(message) => <Alert severity="error">{message()}</Alert>}</Show>
      }
      actions={
        <>
          <Button variant="secondary" icon={<PlusCircleIcon />} onClick={addBatch}>
            {t('stocktake.line-edit.add-batch')}
          </Button>
          <Button variant="secondary" icon={<XCircleIcon />} onClick={props.onClose}>
            {t('common.cancel')}
          </Button>
          <Button icon={<StockIcon />} loading={saving()} onClick={() => void save()}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={(line) => line.id}
        tabsAndCardGroups={TABS_AND_CARD_GROUPS}
        showFullScreen={false}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        emptyMessage={t('stocktake.line-edit.empty')}
      />
    </Dialog>
  );
};

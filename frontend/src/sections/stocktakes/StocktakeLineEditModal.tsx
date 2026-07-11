import { createMemo, createSignal, Show, type JSX } from 'solid-js';
import { createStore, produce, reconcile, unwrap } from 'solid-js/store';
import { graphqlFetch } from '../../api/graphql';
import { t } from '../../intl';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Button } from '../../ui/elements/buttons/Button';
import { IconButton } from '../../ui/elements/buttons/IconButton';
import { TextField } from '../../ui/elements/inputs/TextField';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import {
  DataTable,
  type Column,
  type TabAndCardGroup,
  ALL_TABS,
} from '../../ui/elements/table/DataTable';
import { getNumberCell } from '../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../api/createTableConfig';
import { locationsResource, type Location } from '../../api/locationsResource';
import { reasonOptionsResource, type ReasonOption } from '../../api/reasonOptionsResource';
import {
  PlusCircleIcon,
  StockIcon,
  InfoIcon,
  MessageSquareIcon,
  XCircleIcon,
  TrashIcon,
  CopyIcon,
} from '../../ui/icons';
import {
  BatchStocktakeLines,
  type StocktakeLineFragment,
  type BatchStocktakeLinesVariables,
} from './stocktakeDetail.generated';
import {
  stocktakeLineErrorMessage,
  stocktakeLineErrorField,
  type LineErrorField,
} from './stocktakeLineErrors';

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

// The outcome the detail view applies in place (no refetch): the server's own inserted/updated
// nodes (same StocktakeLineFragment as a detail row) + the ids that were deleted.
export type LineEditCommit = {
  inserted: StocktakeLineFragment[];
  updated: StocktakeLineFragment[];
  deletedIds: string[];
};

export type StocktakeLineEditItem = { id: string; code: string; name: string };

// A draft row: the line fragment plus dirty-tracking. isNew = an added batch (→ insert);
// otherwise a fetched line (→ update if changed). Deletes are tracked separately (below).
type DraftLine = StocktakeLineFragment & { isNew?: boolean };

// The tabs / card-groups for the grouped table. Batch is NOT a group — it's an ALL_TABS anchor
// (shows in every tab, ungrouped in card view), see its column below.
type GroupKey = 'batch' | 'pricing' | 'other';
const TABS_AND_CARD_GROUPS: TabAndCardGroup<GroupKey>[] = [
  { key: 'batch', labelKey: 'stocktake.line-edit.tab-batch', icon: () => <StockIcon /> },
  { key: 'pricing', labelKey: 'stocktake.line-edit.tab-pricing', icon: () => <InfoIcon /> },
  { key: 'other', labelKey: 'stocktake.line-edit.tab-other', icon: () => <MessageSquareIcon /> },
];

// The inventory-adjustment reason types the stocktake editor offers (a stocktake only ever makes
// an inventory adjustment — positive when counted > snapshot, negative when <). Other reason
// types (wastage, returns…) don't apply here, so we filter the global list to these.
const ADJUSTMENT_REASON_TYPES = new Set<ReasonOption['type']>([
  'POSITIVE_INVENTORY_ADJUSTMENT',
  'NEGATIVE_INVENTORY_ADJUSTMENT',
]);

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

// Parse a number input's string to Float | null (blank → null), leaving other fields intact.
const toNumberOrNull = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};

// A line needs an adjustment reason once its counted differs from the snapshot (the count changed
// stock, so the backend requires a reason). Uncounted (null) or equal → no reason needed.
const needsReason = (line: DraftLine): boolean =>
  line.countedNumberOfPacks != null && line.countedNumberOfPacks !== line.snapshotNumberOfPacks;

export const StocktakeLineEditModal = (props: StocktakeLineEditModalProps): JSX.Element => {
  // Draft state as a STORE (not a signal), so editing one field of one line writes just that
  // path — setDraft(index, field, value) — and only that cell's subscribers update, rather than
  // rebuilding the whole array on every keystroke (kdd/state-management). Soft-deleted ids are a
  // separate signal; the store holds the full draft (incl. isNew lines).
  const [draft, setDraft] = createStore<DraftLine[]>([]);
  const [deletedIds, setDeletedIds] = createSignal<string[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | undefined>();
  const [seededFor, setSeededFor] = createSignal<string>('');
  // Per-line save errors from the server, keyed by line id: the mapped message + which field it
  // touches (to highlight the cell). Set on a failed save, cleared for a line when it's edited.
  const [lineErrors, setLineErrors] = createStore<
    Record<string, { message: string; field: LineErrorField | undefined }>
  >({});

  // Store-scoped reference data for the pickers — read without suspending (no remount).
  const locations = (): Location[] => locationsResource.noSuspense();
  const reasons = (): ReasonOption[] =>
    reasonOptionsResource.noSuspense().filter((r) => ADJUSTMENT_REASON_TYPES.has(r.type));

  // Column config → lights up the toolbar's card-switch + column-settings controls. Card view
  // renders the batches as cards (grouped into sections), the dual of the tabs.
  const tableConfig = createTableConfig({ tableId: 'stocktake-line-edit' });

  // Seed on open / item change. A plain derived reseed (not an effect): reading `open`
  // recomputes the seed key, and we reset the draft when it changes. Replace the whole store on
  // reseed (a new array); per-field writes below keep subsequent edits fine-grained.
  const ensureSeeded = () => {
    const key = props.open ? (props.item?.id ?? '') : '';
    if (key !== seededFor()) {
      setSeededFor(key);
      setDraft(props.lines.map((line) => ({ ...line })));
      setDeletedIds([]);
      setErrorMessage(undefined);
      setLineErrors(reconcile({}));
    }
  };

  // The rows the table shows: the draft minus soft-deleted lines. ensureSeeded() runs here so
  // opening the modal seeds before the first render reads rows.
  const rows = createMemo<DraftLine[]>(() => {
    ensureSeeded();
    const deleted = new Set(deletedIds());
    return draft.filter((line) => !deleted.has(line.id));
  });

  // Edit ONE field of ONE line: locate it by id, write just that path in the store. Fine-grained
  // — only that cell reacts (the whole point of the store, vs. a map-the-array signal update).
  // Editing a line clears its stale server error (the user is fixing it) — mirrors OMS.
  const update = <F extends keyof DraftLine>(id: string, field: F, value: DraftLine[F]) => {
    const index = draft.findIndex((line) => line.id === id);
    if (index >= 0) setDraft(index, field, value as never);
    if (lineErrors[id]) setLineErrors(id, undefined!);
  };

  // The server error message to show on a given line's given field, or undefined. A line's error
  // shows on the field it's about (counted / snapshot / reason); an error with no specific field
  // (e.g. CannotEditStocktake) shows on `counted` as the row's general anchor.
  const fieldError = (id: string, field: LineErrorField): string | undefined => {
    const err = lineErrors[id];
    if (!err) return undefined;
    return err.field === field || (err.field === undefined && field === 'counted')
      ? err.message
      : undefined;
  };

  // Add a new batch (a fresh draft line for the item) — prepended, count blank.
  const addBatch = () => {
    const item = props.item;
    if (!item) return;
    setDraft(
      produce((lines) =>
        lines.unshift({
          id: crypto.randomUUID(),
          isNew: true,
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

  // Soft-delete a row. A never-saved (isNew) line splices out of the store; an existing line goes
  // to the deleted set (so the save sends a delete for it).
  const removeLine = (line: DraftLine) => {
    if (line.isNew) {
      setDraft(
        produce((lines) => {
          const index = lines.findIndex((l) => l.id === line.id);
          if (index >= 0) lines.splice(index, 1);
        }),
      );
    } else {
      setDeletedIds((current) => [...current, line.id]);
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
  const buildBatch = (): Omit<BatchStocktakeLinesVariables, 'storeId'> => {
    const seedById = new Map(props.lines.map((line) => [line.id, line]));
    const insert: NonNullable<BatchStocktakeLinesVariables['insert']> = [];
    const update: NonNullable<BatchStocktakeLinesVariables['update']> = [];
    for (const line of draft) {
      if (deletedIds().includes(line.id)) continue;
      if (line.isNew) {
        insert.push({
          id: line.id,
          stocktakeId: props.stocktakeId,
          itemId: line.item.id,
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
      // Existing: only include if a field actually changed (don't send no-op updates).
      const seed = seedById.get(line.id);
      const changed =
        !seed ||
        seed.batch !== line.batch ||
        seed.expiryDate !== line.expiryDate ||
        seed.manufactureDate !== line.manufactureDate ||
        seed.countedNumberOfPacks !== line.countedNumberOfPacks ||
        seed.packSize !== line.packSize ||
        seed.sellPricePerPack !== line.sellPricePerPack ||
        seed.costPricePerPack !== line.costPricePerPack ||
        seed.comment !== line.comment ||
        seed.note !== line.note ||
        (seed.location?.id ?? null) !== (line.location?.id ?? null) ||
        (seed.reasonOption?.id ?? null) !== (line.reasonOption?.id ?? null);
      if (changed) {
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
    }
    const del = deletedIds()
      .filter((id) => !draft.find((l) => l.id === id)?.isNew)
      .map((id) => ({ id }));
    return { insert, update, delete: del };
  };

  const hasChanges = () => {
    const b = buildBatch();
    return (b.insert?.length ?? 0) + (b.update?.length ?? 0) + (b.delete?.length ?? 0) > 0;
  };

  // Client-side validation: every line whose count changed stock must name a reason. Returns the
  // first offending line's message (or undefined = ok) — surfaced in the footer, blocks Save.
  const validationError = (): string | undefined => {
    const missing = draft.some(
      (line) => !deletedIds().includes(line.id) && needsReason(line) && !line.reasonOption,
    );
    return missing ? t('stocktake.line-edit.reason-required') : undefined;
  };

  const save = async () => {
    const invalid = validationError();
    if (invalid) {
      setErrorMessage(invalid);
      return;
    }
    setSaving(true);
    setErrorMessage(undefined);
    const result = await graphqlFetch(BatchStocktakeLines, {
      storeId: props.storeId,
      ...buildBatch(),
    });
    setSaving(false);
    if (result.kind !== 'success') return; // transport/NodeError → global modal already showed it

    const batch = result.data.batchStocktake;

    // Collect EVERY per-line error (not just the first) → a map keyed by line id, each with a
    // friendly mapped message + the field it touches. insert/update rows whose response isn't a
    // StocktakeLineNode, and delete rows that aren't a DeleteResponse, carry an `error`.
    const errors: Record<string, { message: string; field: LineErrorField | undefined }> = {};
    for (const r of [...(batch.insertStocktakeLines ?? []), ...(batch.updateStocktakeLines ?? [])]) {
      if (r.response.__typename !== 'StocktakeLineNode' && 'error' in r.response) {
        const typename = r.response.error.__typename;
        errors[r.id] = {
          message: stocktakeLineErrorMessage(typename, r.response.error.description),
          field: stocktakeLineErrorField(typename),
        };
      }
    }
    for (const r of batch.deleteStocktakeLines ?? []) {
      if (r.response.__typename !== 'DeleteResponse' && 'error' in r.response) {
        const typename = r.response.error.__typename;
        errors[r.id] = {
          message: stocktakeLineErrorMessage(typename, r.response.error.description),
          field: undefined,
        };
      }
    }

    // Both insert + update arrays carry a per-row `response` that is a StocktakeLineNode on
    // success; pull out the success nodes. Typed structurally so it takes either array.
    const successNodes = (
      arr: { response: { __typename: string } }[],
    ): StocktakeLineFragment[] =>
      arr
        .map((r) => r.response)
        .filter((r): r is StocktakeLineFragment & { __typename: 'StocktakeLineNode' } =>
          r.__typename === 'StocktakeLineNode',
        ) as StocktakeLineFragment[];
    const inserted = successNodes(batch.insertStocktakeLines ?? []);
    const updated = successNodes(batch.updateStocktakeLines ?? []);
    const deleted = (batch.deleteStocktakeLines ?? [])
      .filter((r) => r.response.__typename === 'DeleteResponse')
      .map((r) => r.id);

    // Reflect the lines that DID save (partial success), even when others errored — the detail
    // view splices these in; the failed ones stay in the modal for the user to fix.
    if (inserted.length || updated.length || deleted.length) {
      props.onCommitted({ inserted, updated, deletedIds: deleted });
    }

    if (Object.keys(errors).length > 0) {
      setLineErrors(reconcile(errors));
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
            value={line.expiryDate ?? ''}
            onInput={(e) => update(line.id, 'expiryDate', e.currentTarget.value || null)}
          />
        );
      },
    },
    {
      c: { key: 'manufactureDate' },
      header: t('stocktake.line-edit.manufacture-date'),
      tabsAndCardGroups: ['batch'],
      cell: (info) => {
        const line = info.row.original;
        return (
          <TextField
            label={t('stocktake.line-edit.manufacture-date')}
            hideLabel
            size="small"
            type="date"
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
      // Snapshot is the system count — read-only.
      cell: (info) => info.row.original.snapshotNumberOfPacks ?? '—',
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
          <Combobox
            label={t('stocktake.line-edit.location')}
            hideLabel
            items={locations()}
            itemToString={(l) => l.code}
            itemToValue={(l) => l.id}
            value={line.location?.id}
            placeholder={t('stocktake.line-edit.location-none')}
            onChange={(l) =>
              update(
                line.id,
                'location',
                l ? { id: l.id, code: l.code, name: l.name } : null,
              )
            }
          />
        );
      },
    },
    {
      // The adjustment reason — required once counted differs from snapshot. Shown always (so a
      // user can pre-set it); a red hint is surfaced in the footer if it's missing when needed.
      c: { key: 'reasonOption' },
      header: t('stocktake.line-edit.reason'),
      tabsAndCardGroups: ['other'],
      cell: (info) => {
        const line = info.row.original;
        return (
          <Combobox
            label={t('stocktake.line-edit.reason')}
            hideLabel
            items={reasons()}
            itemToString={(r) => r.reason}
            itemToValue={(r) => r.id}
            value={line.reasonOption?.id}
            helperText={fieldError(line.id, 'reason')}
            placeholder={
              needsReason(line)
                ? t('stocktake.line-edit.reason-select')
                : t('stocktake.line-edit.reason-na')
            }
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

  const footerError = () => errorMessage() ?? validationError();

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      dismissable={!saving()}
      size="large"
      title={props.item?.name ?? t('stocktake.line-edit.title')}
      description={props.item?.code}
      footer={
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
          <Button
            icon={<StockIcon />}
            loading={saving()}
            disabled={!hasChanges()}
            onClick={() => void save()}
          >
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

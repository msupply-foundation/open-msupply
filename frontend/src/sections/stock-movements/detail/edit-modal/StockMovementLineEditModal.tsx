import {
  createMemo,
  createResource,
  createSignal,
  Show,
  type Component,
} from 'solid-js';
import { t } from '@/intl';
import { formatNumber } from '@/intl/formatNumber';
import { generateUUID } from '@/uuid';
import { graphqlFetch } from '@/api/graphql';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import {
  CancelButton,
  DialogSaveButton,
  SaveAndNextButton,
} from '@/ui/elements/buttons/StandardButtons';
import { Combobox } from '@/ui/elements/selectors/Combobox';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { ArrowRightIcon } from '@/ui/icons';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import { ItemSearch } from '@/domain/item';
import { LocationVolumeSelect } from '@/domain/location';
import type { LocationWithVolume } from '@/domain/location';
import {
  StockMovementDraftLines,
  type DraftStockMovementLineFragment,
  type StockMovementDraftLinesVariables,
} from './stockMovementDraftLines.generated';
import { BatchStockMovementLine } from './batchStockMovementLine.generated';
import {
  candidateLabel,
  canSaveLine,
  excludeAddedBatches,
  isCandidateDisabled,
} from './stockMovementLineEdit';
import type { StockMovementLineFragment } from '../stockMovementDetail.generated';

// The line editor (spec/stock-movements/ui-surface.md S3): one move per line —
// item → batch → destination → quantity, progressively disclosed. Add mode
// starts on the item search (auto-focused); update mode opens read-only on
// the line's item + batch with its saved destination and quantity
// (OMS-REG-SMV-09.16). Save & next (add mode only — .32) saves and resets for
// another entry.
//
// The batch CANDIDATES resource first fetches on an interaction (picking an
// item, inside this open dialog), so it is read through the `.state` gate —
// never a bare resource()/.latest read (kdd/solid-reactivity-pitfalls › No
// remounts on interaction, rule 1).

export interface StockMovementLineEditModalProps {
  storeId: string;
  movementId: string;
  /** The line being edited — undefined = add mode. */
  line?: StockMovementLineFragment;
  /** Stock-line ids already on the movement (the exclusion — rules § lines). */
  addedStockLineIds: () => string[];
  /** Parent-fetched volume-bearing locations (the destination picker's set). */
  locations: () => LocationWithVolume[];
  locationsLoading: () => boolean;
  /** A line saved — the view refetches the document. */
  onSaved: () => void;
  onClose: () => void;
}

export const StockMovementLineEditModal: Component<
  StockMovementLineEditModalProps
> = props => {
  const isUpdate = () => props.line !== undefined;

  // --- item ----------------------------------------------------------------
  const [pickedItemId, setPickedItemId] = createSignal<string | undefined>();
  const itemId = () => pickedItemId() ?? props.line?.stockLine?.itemId;
  const selectedItemSeed = () => {
    const stockLine = props.line?.stockLine;
    if (!stockLine || pickedItemId()) return undefined;
    return {
      id: stockLine.itemId,
      code: stockLine.item.code,
      name: stockLine.itemName,
    };
  };
  const itemFocus = createFocusTarget();

  // --- batch candidates ------------------------------------------------------
  // Keyed on the serialised variables; fetches per picked item. Read via the
  // `.state` gate below — this resource FIRST fetches on an interaction
  // inside the open dialog, the exact case `.latest` alone would suspend on.
  const [candidatesData] = createResource(
    () => {
      const id = itemId();
      if (!id) return undefined;
      const variables: StockMovementDraftLinesVariables = {
        storeId: props.storeId,
        input: { itemId: id },
      };
      return JSON.stringify(variables);
    },
    async serialised => {
      const result = await graphqlFetch(
        StockMovementDraftLines,
        JSON.parse(serialised) as StockMovementDraftLinesVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.stockRelocationDraftLines;
    }
  );
  const candidates = (): DraftStockMovementLineFragment[] =>
    candidatesData.state === 'ready' || candidatesData.state === 'refreshing'
      ? (candidatesData.latest ?? [])
      : [];

  // The options: candidates minus batches already on the movement, keeping
  // the edited line's own batch offerable (OMS-REG-SMV-09.8).
  const options = createMemo(() =>
    excludeAddedBatches(
      candidates(),
      props.addedStockLineIds(),
      props.line?.stockLineId
    )
  );

  // --- batch selection -------------------------------------------------------
  const [pickedBatchId, setPickedBatchId] = createSignal<string | undefined>();
  // Derived selection: an explicit pick wins; update mode falls back to the
  // line's own batch; add mode pre-selects a SOLE candidate (ui-surface S3).
  const selectedBatch = createMemo<DraftStockMovementLineFragment | undefined>(
    () => {
      const picked = pickedBatchId();
      const opts = options();
      if (picked) return opts.find(o => o.stockLineId === picked);
      if (props.line)
        return opts.find(o => o.stockLineId === props.line?.stockLineId);
      return opts.length === 1 ? opts[0] : undefined;
    }
  );

  // --- destination + quantity ------------------------------------------------
  // undefined = untouched (seed applies); null = cleared by the user.
  const [pickedDestinationId, setPickedDestinationId] = createSignal<
    string | null | undefined
  >();
  const destinationId = (): string | undefined => {
    const picked = pickedDestinationId();
    if (picked !== undefined) return picked ?? undefined;
    return props.line?.destinationLocation?.id;
  };

  const [enteredPacks, setEnteredPacks] = createSignal<
    number | null | undefined
  >();
  // Seeded with the batch's FULL available packs (ui-surface S3;
  // OMS-REG-SMV-09.11); update mode with the line's saved quantity.
  const packs = (): number | undefined => {
    const entered = enteredPacks();
    if (entered !== undefined) return entered ?? undefined;
    if (props.line && selectedBatch()?.stockLineId === props.line.stockLineId)
      return props.line.numberOfPacks;
    return selectedBatch()?.availableNumberOfPacks;
  };

  const onPickItem = (id: string | undefined) => {
    setPickedItemId(id);
    setPickedBatchId(undefined);
    setPickedDestinationId(undefined);
    setEnteredPacks(undefined);
  };
  const onPickBatch = (batch: DraftStockMovementLineFragment | null) => {
    setPickedBatchId(batch?.stockLineId);
    setPickedDestinationId(undefined);
    setEnteredPacks(undefined);
  };

  // Destination options honour the item's restricted storage type when set
  // (rules § lines) — a hard narrowing, while the source location and held
  // locations stay VISIBLE but disabled in place, labelled with the reason
  // (ui-surface S3; OMS-REG-SMV-09.10).
  const destinationOptions = createMemo(() => {
    const restrictedType = selectedBatch()?.restrictedLocationTypeId;
    const all = props.locations();
    return restrictedType
      ? all.filter(l => l.locationType?.id === restrictedType)
      : all;
  });
  const destinationDisabledReason = (
    l: LocationWithVolume
  ): string | undefined => {
    if (l.id === selectedBatch()?.sourceLocation?.id)
      return t('label.source-location');
    if (l.onHold) return t('label.on-hold');
    return undefined;
  };

  const valid = () =>
    canSaveLine({
      candidate: selectedBatch(),
      destinationId: destinationId(),
      packs: packs(),
    });

  // --- save ------------------------------------------------------------------
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string>();

  const save = async (): Promise<boolean> => {
    const batch = selectedBatch();
    const destination = destinationId();
    const quantity = packs();
    if (!batch || !destination || quantity === undefined) return false;
    setSaving(true);
    setError(undefined);
    const result = await graphqlFetch(BatchStockMovementLine, {
      storeId: props.storeId,
      input: {
        upsert: [
          {
            id: props.line?.id ?? generateUUID(),
            stockRelocationId: props.movementId,
            stockLineId: batch.stockLineId,
            numberOfPacks: quantity,
            destinationLocationId: destination,
          },
        ],
      },
    });
    setSaving(false);
    if (result.kind !== 'success') return false; // global modal showed it
    const response = result.data.batchStockRelocationLine.upsert?.[0]?.response;
    if (response?.__typename === 'UpsertStockRelocationLineError') {
      // The typed pair (NotEnoughStock / LocationOnHold — contract § lines)
      // shows its description in place; the client gate makes them rare
      // (a concurrent change while the dialog is open).
      setError(response.error.description);
      return false;
    }
    props.onSaved();
    return true;
  };

  const onSave = async () => {
    if (await save()) props.onClose();
  };

  // Save & next (add mode only — OMS-REG-SMV-09.32): saves, then resets to a
  // fresh add with the item search focused for the next entry.
  const onSaveAndNext = async () => {
    if (!(await save())) return;
    onPickItem(undefined);
    itemFocus.focus();
  };

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size="large"
      testId="stock-movement-line-modal"
      title={isUpdate() ? t('heading.edit-line') : t('heading.add-line')}
      actionsLead={
        <Show when={error()}>
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
      }
      actions={
        <>
          <CancelButton
            data-testid="dialog-button-cancel"
            disabled={saving()}
            onClick={props.onClose}
          />
          <Show when={!isUpdate()}>
            <SaveAndNextButton
              data-testid="dialog-button-save-and-next"
              disabled={!valid() || saving()}
              onClick={() => void onSaveAndNext()}
            />
          </Show>
          <DialogSaveButton
            data-testid="dialog-button-save"
            disabled={!valid()}
            loading={saving()}
            onClick={() => void onSave()}
          />
        </>
      }
    >
      {/* Item — items with stock on hand only (ui-surface S3); read-only in
          update mode. */}
      <FieldRow label={t('label.item')}>
        <ItemSearch
          label={t('label.item')}
          hideLabel
          storeId={props.storeId}
          hasStockOnHand
          width="full"
          disabled={isUpdate()}
          value={itemId()}
          selectedItem={selectedItemSeed()}
          focusTarget={itemFocus}
          onSelect={item => onPickItem(item?.id ?? undefined)}
        />
      </FieldRow>

      {/* Batch — appears once an item is chosen; location-held candidates
          disabled in place, labelled (OMS-REG-SMV-09.9); read-only in update
          mode. */}
      <Show when={itemId()}>
        <FieldRow label={t('label.batch')}>
          <Combobox<DraftStockMovementLineFragment>
            label={t('label.batch')}
            hideLabel
            inputTestId="stock-movement-batch-input"
            items={options()}
            loading={candidatesData.loading}
            disabled={isUpdate()}
            itemToString={candidateLabel}
            itemToValue={o => o.stockLineId}
            itemDisabled={isCandidateDisabled}
            renderItem={o => <span>{candidateLabel(o)}</span>}
            value={selectedBatch()?.stockLineId}
            onChange={onPickBatch}
            // The two empty-state messages belong to the EMPTY DROPDOWN, not
            // the input's placeholder (ui-surface S3 — "no candidates"):
            // every candidate already added vs. the item having no available
            // stock at all. The Combobox shows them only when the list is
            // actually empty.
            emptyQueryMessage={
              candidates().length && !options().length
                ? t('messages.all-batches-added')
                : t('messages.no-stock-available')
            }
            noResultsMessage={
              candidates().length && !options().length
                ? t('messages.all-batches-added')
                : t('messages.no-stock-available')
            }
          />
        </FieldRow>
      </Show>

      {/* The move row — source (read-only snapshot-to-be) → destination
          (volume-aware; source + held disabled with the reason) — then the
          reference figures and the quantity (seeded full-available, bounds
          1…available, fractions above one accepted). */}
      <Show when={selectedBatch()}>
        {batch => (
          <>
            <FieldRow label={t('label.source-location')}>
              <span
                data-testid="source-location-field"
                style={{
                  display: 'inline-flex',
                  'align-items': 'center',
                  gap: 'var(--space-2)',
                }}
              >
                {batch().sourceLocation?.code ?? '—'}
                <ArrowRightIcon
                  aria-hidden="true"
                  style={{ color: 'var(--text-secondary)' }}
                />
              </span>
            </FieldRow>
            <FieldRow label={t('label.destination-location')}>
              <LocationVolumeSelect
                label={t('label.destination-location')}
                hideLabel
                locations={destinationOptions()}
                loading={props.locationsLoading()}
                value={destinationId()}
                itemDisabledReason={destinationDisabledReason}
                onChange={l => setPickedDestinationId(l?.id ?? null)}
              />
            </FieldRow>
            <FieldRow label={t('label.for-reference')}>
              <span data-testid="for-reference-field">
                {t('label.pack-size')} {formatNumber(batch().packSize)}
                {' · '}
                {t('label.packs-in-stock')}{' '}
                {formatNumber(batch().totalNumberOfPacks)}
              </span>
            </FieldRow>
            <FieldRow label={t('label.packs-to-move')}>
              <NumberField
                label={t('label.packs-to-move')}
                hideLabel
                data-testid="packs-to-move-input"
                min={1}
                max={batch().availableNumberOfPacks}
                // Pack counts carry the batch's own precision (OMS f64), so a
                // tighter cap here would round the seeded full-available value
                // and make the upper bound unreachable — 1.003 available could
                // only ever be typed as 1.00, so a whole line couldn't move
                // (OMS-REG-SMV-09.11). Match OMS's 10-dp room.
                decimalLimit={10}
                value={packs()}
                helperText={t('messages.move-all-or-partial', {
                  max: formatNumber(batch().availableNumberOfPacks),
                })}
                onChange={value => setEnteredPacks(value ?? null)}
              />
            </FieldRow>
          </>
        )}
      </Show>
    </Dialog>
  );
};

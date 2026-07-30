import { createResource, createSignal, Show, type JSX } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { formatNumber } from '../../../intl/formatNumber';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { Select } from '../../../ui/elements/selectors/Select';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { DateField } from '../../../ui/elements/inputs/DateField';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { StatComparisonTile } from '../../../ui/elements/display/StatComparisonTile';
import { ReasonSelect, reasonsOfKind } from '../../../domain/reasonOptions';
import { XCircleIcon, CheckIcon } from '../../../ui/icons';
import { stockPreferences } from '../../../store/storeContext';
import { runCreateInventoryAdjustment } from '../stockApi';
import {
  adjustedQuantity,
  wouldGoBelowZero,
  backdatedDatetime as computeBackdatedDatetime,
} from '../stockCalc';
import {
  localTodayIso,
  localIsoDaysAgo,
} from '../../../ui/elements/inputs/dateTimeConvert';
import {
  HistoricalStockLines,
  type StockLineDetailFragment,
  type CreateInventoryAdjustmentVariables,
} from './stockLine.generated';

// The stock adjustment modal (spec/stock S4, FL4). Correct one line's quantity
// by a direction + amount, with an optional reason and (when the backdating
// preference allows) a past date. Two stat tiles preview current → adjusted
// available packs / packs on hand (historical values when backdated). OK stays
// disabled while the amount is zero or the reduction would take available packs
// below zero. Follows the shared dialog lifecycle (busy OK, close on success,
// in-dialog error, no toast). Mechanically a finalised addition/reduction.

type Direction = 'ADDITION' | 'REDUCTION';

export interface AdjustModalProps {
  open: boolean;
  storeId: string;
  line: StockLineDetailFragment;
  onClose: () => void;
  /**
   * Fired after a successful adjustment so the detail view refetches the line.
   */
  onAdjusted: () => void;
}

export const AdjustModal = (props: AdjustModalProps): JSX.Element => (
  <Show when={props.open} keyed>
    <AdjustContent
      storeId={props.storeId}
      line={props.line}
      onClose={props.onClose}
      onAdjusted={props.onAdjusted}
    />
  </Show>
);

const AdjustContent = (props: {
  storeId: string;
  line: StockLineDetailFragment;
  onClose: () => void;
  onAdjusted: () => void;
}): JSX.Element => {
  const [direction, setDirection] = createSignal<Direction>('ADDITION');
  const [amount, setAmount] = createSignal<number | undefined>();
  const [reasonId, setReasonId] = createSignal<string | undefined>();
  const [date, setDate] = createSignal<string | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | undefined>();

  const prefs = () => stockPreferences();
  const backdating = () => prefs().backdating;
  // Local (wall-clock) today, not UTC — so a store whose date differs from UTC
  // never treats its own today as backdated (spec/stock S4).
  const today = localTodayIso();
  const minDate = () => {
    const maxDays = backdating().maxDays;
    return maxDays <= 0 ? undefined : localIsoDaysAgo(maxDays);
  };

  // A chosen date earlier than today means "backdated"; today (or unset) is
  // not.
  const isBackdated = () => !!date() && date() !== today;

  // The backdated instant: a reduction is stamped at the day's end, an addition
  // at its start (spec/stock S4).
  const backdatedDatetime = (): string | undefined =>
    computeBackdatedDatetime(date(), today, direction());

  // Historical availability at the backdated moment (spec/stock contract ›
  // backdating): drives the "current" side of the tiles when backdated.
  const [historical] = createResource(
    () => (isBackdated() ? backdatedDatetime() : false),
    async datetime => {
      const result = await graphqlFetch(HistoricalStockLines, {
        storeId: props.storeId,
        itemId: props.line.itemId,
        datetime,
      });
      if (result.kind !== 'success') return undefined;
      const node =
        result.data.historicalStockLines.__typename === 'StockLineConnector'
          ? result.data.historicalStockLines.nodes.find(
              n => n.id === props.line.id
            )
          : undefined;
      return node;
    }
  );

  // Read the historical line WITHOUT ever suspending. This resource first
  // fetches on an INTERACTION (picking a past date) while the dialog is already
  // open — and `.latest` alone still suspends on that first pending read, which
  // collapses the detail view's <Suspense> boundary and detaches the open
  // <dialog>: it loses the top layer, so the backdrop vanishes and the modal
  // re-renders in normal flow further down the page (#469 / #601). Gating on
  // `.state` never suspends (kdd/solid-reactivity-pitfalls › No remounts on
  // interaction); `historical.loading` is still free to drive a spinner.
  const historicalLine = () =>
    historical.state === 'ready' || historical.state === 'refreshing'
      ? historical.latest
      : undefined;

  // Current quantities: the historical values when backdated (once loaded),
  // otherwise the line's live quantities.
  const currentAvail = () =>
    (isBackdated() ? historicalLine()?.availableNumberOfPacks : undefined) ??
    props.line.availableNumberOfPacks;
  const currentTotal = () =>
    (isBackdated() ? historicalLine()?.totalNumberOfPacks : undefined) ??
    props.line.totalNumberOfPacks;

  const adjustedAvail = () =>
    adjustedQuantity(currentAvail(), direction(), amount() ?? 0);
  const adjustedTotal = () =>
    adjustedQuantity(currentTotal(), direction(), amount() ?? 0);

  const belowZero = () =>
    wouldGoBelowZero(currentAvail(), direction(), amount() ?? 0);
  const hasAmount = () => (amount() ?? 0) > 0;

  const isVaccine = () => props.line.item.isVaccine;
  const doses = () => props.line.item.doses;
  const showDoses = () => prefs().manageVaccinesInDoses && isVaccine();
  const packSize = () => props.line.packSize;
  const doseNote = (packs: number): string | undefined =>
    showDoses() ? `${formatNumber(packs * packSize() * doses())}` : undefined;

  const previewOf = (value: number) =>
    hasAmount() ? formatNumber(value) : undefined;
  const previewDoseNote = (value: number) =>
    hasAmount() ? doseNote(value) : undefined;

  const canConfirm = () => hasAmount() && !belowZero() && !saving();

  // The reason is required exactly when active reasons exist for the current
  // direction (spec/stock rules › adjustment reasons). Marked on the field so
  // the requirement is visible up front; the server still owns the rejection
  // (ui-standards › validation — don't pre-validate an action), which lands in
  // the banner beside the actions.
  const reasonRequired = () =>
    reasonsOfKind(direction() === 'ADDITION' ? 'positive' : 'negative').length >
    0;

  const onOk = async () => {
    if (!canConfirm()) return;
    setSaving(true);
    setError(undefined);
    const input: CreateInventoryAdjustmentVariables['input'] = {
      stockLineId: props.line.id,
      adjustment: amount() ?? 0,
      adjustmentType: direction(),
      reasonOptionId: reasonId() ?? null,
      backdatedDatetime: backdatedDatetime() ?? null,
    };
    const outcome = await runCreateInventoryAdjustment(props.storeId, input);
    setSaving(false);
    if (!outcome) return;
    if (outcome.kind === 'error') {
      setError(outcome.message);
      return;
    }
    props.onAdjusted();
    props.onClose();
  };

  const directionOptions = [
    { value: 'ADDITION', label: t('label.increase') },
    { value: 'REDUCTION', label: t('label.decrease') },
  ];

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      widthRem={34}
      testId="adjust-modal"
      title={t('heading.stock-adjustment')}
      actionsLead={
        <Show when={error() || belowZero()}>
          <Alert severity="error">
            {error() ?? t('error.stock-reduced-below-zero')}
          </Alert>
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            disabled={saving()}
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Button
            icon={<CheckIcon />}
            loading={saving()}
            disabled={!canConfirm()}
            data-testid="dialog-button-ok"
            onClick={() => void onOk()}
          >
            {t('button.ok')}
          </Button>
        </>
      }
    >
      <div
        style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: 'var(--space-4)',
        }}
      >
        {/* Context card: item code · pack size · name. */}
        <div
          style={{
            display: 'flex',
            'flex-direction': 'column',
            gap: 'var(--space-1)',
          }}
        >
          <strong>{props.line.itemName}</strong>
          <span
            style={{
              color: 'var(--text-secondary)',
              'font-size': 'var(--text-sm)',
            }}
          >
            {props.line.item.code} · {t('label.pack-size')}{' '}
            {formatNumber(packSize())}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            'grid-template-columns': '1fr 1fr',
            gap: 'var(--space-3)',
          }}
        >
          <StatComparisonTile
            label={t('label.available-packs')}
            testId="adjust-tile-available"
            current={formatNumber(currentAvail())}
            currentNote={doseNote(currentAvail())}
            adjusted={previewOf(adjustedAvail())}
            adjustedNote={previewDoseNote(adjustedAvail())}
          />
          <StatComparisonTile
            label={t('label.packs-on-hand')}
            testId="adjust-tile-total"
            current={formatNumber(currentTotal())}
            currentNote={doseNote(currentTotal())}
            adjusted={previewOf(adjustedTotal())}
            adjustedNote={previewDoseNote(adjustedTotal())}
          />
        </div>

        {/* Adjust packs: direction · by · amount. */}
        <FieldRow label={t('label.adjust-packs')} required>
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              'align-items': 'center',
            }}
          >
            <Select
              label={t('label.adjust-packs')}
              hideLabel
              testId="adjust-direction"
              value={direction()}
              options={directionOptions}
              onValueChange={value => {
                setDirection(value as Direction);
                // Switching direction resets the chosen reason (spec/stock S4).
                setReasonId(undefined);
              }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>
              {t('label.by')}
            </span>
            <NumberField
              label={t('label.by')}
              hideLabel
              data-testid="adjust-amount"
              decimalLimit={2}
              value={amount()}
              onChange={setAmount}
            />
          </div>
        </FieldRow>

        {/* Reason: filtered to the direction; disabled while amount is zero. */}
        <FieldRow label={t('label.reason')} required={reasonRequired()}>
          <ReasonSelect
            kind={direction() === 'ADDITION' ? 'positive' : 'negative'}
            label={t('label.reason')}
            hideLabel
            disabled={!hasAmount()}
            value={reasonId()}
            placeholder={t('label.select-reason')}
            onChange={r => setReasonId(r?.id)}
          />
        </FieldRow>

        {/* Date: only when the backdating preference allows inventory
            adjustments, bounded to the max-days window. */}
        <Show when={backdating().inventoryAdjustmentsEnabled}>
          <FieldRow label={t('label.adjustment-date')}>
            <DateField
              label={t('label.adjustment-date')}
              hideLabel
              min={minDate()}
              max={today}
              value={date()}
              onChange={setDate}
            />
          </FieldRow>
        </Show>
      </div>
    </Dialog>
  );
};

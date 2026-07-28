import { generateUUID } from '../../../../uuid';
import {
  createMemo,
  createResource,
  createSignal,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from 'solid-js';
import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import { formatNumber } from '../../../../intl/formatNumber';
import { homeCurrency } from '../../../../intl/currency';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { InsetPanel } from '../../../../ui/layout/InsetPanel/InsetPanel';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { TextArea } from '../../../../ui/elements/inputs/TextArea';
import { Select } from '../../../../ui/elements/selectors/Select';
import {
  CancelButton,
  DialogSaveButton,
  SaveAndNextButton,
} from '../../../../ui/elements/buttons/StandardButtons';
import {
  TargetQuantityBreakdown,
  ConsumptionHistoryChart,
  StockEvolutionChart,
} from '../../../../ui/elements/charts';
import { ItemSearch } from '../../../../domain/item';
import { ReasonSelect } from '../../../../domain/reasonOptions';
import { RequisitionLineChart } from './lineChart.generated';
import type { InternalOrderLineFragment } from '../internalOrderDetail.generated';
import {
  buildAddPreview,
  editorLineFromLine,
  defaultEntryMode,
  modeToUnits,
  unitsToMode,
  statInMode,
  modeWord,
  saveNewLine,
  saveExistingLine,
  type EditorLine,
  type EntryMode,
} from './internalOrderLineEdit';
import styles from './InternalOrderLineEditModal.module.css';

// The internal-order line editor (spec/internal-orders S4): add an item (add
// mode, general orders only — AC-LN1) or fill one line (edit mode, any status;
// read-only opens with every control disabled). Panels: the item's statistics,
// its stock movements (extended gate), the edits, and below them the read-only
// context charts (target-quantity breakdown + consumption / stock-evolution).
// The population-forecast calculation display is a later cut.

const money = (value: number): string =>
  formatNumber(value, {
    style: 'currency',
    currency: homeCurrency(),
    currencyDisplay: 'narrowSymbol',
  });

export interface InternalOrderLineEditModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  requisitionId: string;
  minMonths: number;
  maxMonths: number;
  /** Read-only order → every control disabled (reads still shown). */
  editable: boolean;
  /** General order → add mode reachable; program orders can't add (AC-LN1). */
  canAdd: boolean;
  // Preference gates (spec S4 — the extra rows/columns).
  showDoses: boolean;
  showPricing: boolean;
  showForecast: boolean;
  showExcess: boolean;
  /** Customer-statistics program order → the movements panel + reason (AC-R1). */
  showExtended: boolean;
  orderInPacks: boolean;
  /** An existing line → edit mode; omitted → add mode. */
  initialLine?: InternalOrderLineFragment;
  /**
   * Save & next (edit mode): the next line to step to in the table's current
   * sort/filter order, skipping ones already visited this run; undefined when
   * the list is exhausted (→ add mode on a general order, else close).
   */
  nextLine: (
    currentLineId: string,
    covered: Set<string>
  ) => InternalOrderLineFragment | undefined;
  /**
   * The order's existing line for an item, if any — so add mode loads that
   * line to edit rather than starting a duplicate (AC-LN2/LN6, the
   * one-line-per-item rule).
   */
  findLineForItem: (itemId: string) => InternalOrderLineFragment | undefined;
  /** A save committed — the parent refetches the line table (AC-LN21). */
  onCommitted: () => void;
}

// Mount the content only while open, keyed on the OPEN identity (the line id,
// or 'add'), so each open starts fresh and advancing within one open is
// imperative (seedLine), not a prop change — the outbound editor's pattern.
export const InternalOrderLineEditModal = (
  props: InternalOrderLineEditModalProps
): JSX.Element => (
  <Show when={props.open && (props.initialLine?.id ?? 'add')} keyed>
    {_openKey => <LineEditContent {...props} />}
  </Show>
);

const LineEditContent = (
  props: InternalOrderLineEditModalProps
): JSX.Element => {
  const [line, setLine] = createSignal<EditorLine | undefined>(
    props.initialLine ? editorLineFromLine(props.initialLine) : undefined
  );
  const [mode, setMode] = createSignal<'add' | 'update'>(
    props.initialLine ? 'update' : 'add'
  );
  const [entryMode, setEntryMode] = createSignal<EntryMode>('units');
  // The requested quantity always in UNITS; the entry mode only re-expresses
  // its display (AC-LN12).
  const [requestedUnits, setRequestedUnits] = createSignal(0);
  const [comment, setComment] = createSignal('');
  const [reasonId, setReasonId] = createSignal<string | null>(null);
  const [dirty, setDirty] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [advancing, setAdvancing] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();
  // Items stepped through this run, so the walk never offers one twice.
  const covered = new Set<string>();

  let disposed = false;
  onCleanup(() => (disposed = true));

  // The context charts' server data (spec S4 § charts): the consumption-history
  // and stock-evolution series, keyed by a SAVED line's id — so it fetches only
  // once a real line exists (edit mode, or an on-order item loaded in add
  // mode), never for an unsaved add draft. The target-quantity breakdown is
  // derived client-side from the line's stats, so it needs no read. Read
  // NON-suspending (the `.state` gate) — the resource first-fetches on the
  // interaction of opening/advancing, so a direct read would remount the modal
  // (kdd/solid-reactivity-pitfalls § no remounts).
  const chartKey = () => {
    const editorLine = line();
    return editorLine && !editorLine.isNew
      ? { storeId: props.storeId, lineId: editorLine.lineId }
      : false;
  };
  const [chart] = createResource(chartKey, async variables => {
    const result = await graphqlFetch(RequisitionLineChart, variables);
    if (result.kind !== 'success') return undefined;
    const response = result.data.requisitionLineChart;
    return response.__typename === 'ItemChartNode' ? response : undefined;
  });
  const chartData = () =>
    chart.state === 'ready' || chart.state === 'refreshing'
      ? chart.latest
      : undefined;
  // The history/evolution pair shows only when the server returned series (an
  // order with no expected-delivery-date returns both null — then only the
  // target-quantity breakdown shows, spec S4 § charts).
  const hasSeries = () => {
    const data = chartData();
    return !!(
      data?.consumptionHistory?.nodes.length ||
      data?.stockEvolution?.nodes.length
    );
  };

  // Land the editor on a line — an existing line (edit) or an add-mode
  // preview. Seeds the entry mode from the store preference (AC-LN18) and the
  // draft from the line's current values.
  const seedLine = (editorLine: EditorLine) => {
    setLine(editorLine);
    covered.add(editorLine.lineId);
    setEntryMode(
      defaultEntryMode(
        props.orderInPacks,
        props.showDoses,
        editorLine.isVaccine,
        editorLine.doses
      )
    );
    setRequestedUnits(editorLine.requestedQuantity);
    setComment(editorLine.comment);
    setReasonId(editorLine.reasonId);
    setDirty(false);
    setErrorMessage(undefined);
  };

  const pickItem = async (itemId: string) => {
    // An item already on the order loads its EXISTING line to edit — no
    // duplicate (AC-LN2/LN6). The picker stays live (mode stays 'add'), but
    // the loaded line's isNew=false makes the save an update, not an insert.
    const existing = props.findLineForItem(itemId);
    if (existing) {
      seedLine(editorLineFromLine(existing));
      return;
    }
    setLoading(true);
    setErrorMessage(undefined);
    const preview = await buildAddPreview(
      props.storeId,
      itemId,
      props.minMonths,
      props.maxMonths,
      generateUUID()
    );
    if (disposed) return;
    setLoading(false);
    if (preview) seedLine(preview);
  };

  // Back to the empty add state — add mode, no item (AC-LN5: switching items or
  // returning discards any unsaved draft with nothing created).
  const backToSearch = () => {
    setMode('add');
    setLine(undefined);
    setRequestedUnits(0);
    setComment('');
    setReasonId(null);
    setDirty(false);
    setErrorMessage(undefined);
  };

  onMount(() => {
    if (props.initialLine) seedLine(editorLineFromLine(props.initialLine));
    // Add mode opens on the item search, focused (spec S4). Deferred a frame so
    // the dialog + input have painted.
    else
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLInputElement>(
            '[data-testid="internal-order-line-edit-modal"] [data-testid="item-search-input"]'
          )
          ?.focus()
      );
  });

  const updateMode = () => mode() === 'update';
  const disabled = () => !props.editable;

  const current = () => line();
  const packSize = () => current()?.defaultPackSize ?? 1;
  const doses = () => current()?.doses ?? 0;
  const suggested = () => current()?.suggestedQuantity ?? 0;
  // Doses surfaces demand a POSITIVE doses-per-unit (AC-LN20).
  const dosesApply = () =>
    props.showDoses && (current()?.isVaccine ?? false) && doses() > 0;

  // The requested quantity in the active entry mode (display), and its commit
  // back to stored units.
  const requestedDisplay = () => {
    const raw = unitsToMode(requestedUnits(), entryMode(), packSize(), doses());
    return Math.round(raw * 100) / 100;
  };
  const onRequestedChange = (value: number | undefined) => {
    setRequestedUnits(
      value === undefined
        ? 0
        : modeToUnits(value, entryMode(), packSize(), doses())
    );
    setDirty(true);
  };

  // A variance from the suggestion demands a reason on a customer-statistics
  // program order (AC-R1); at equality the reason control is disabled and the
  // stored reason is cleared (AC-R2).
  const variance = () => requestedUnits() !== suggested();
  const excess = () => props.showExcess && requestedUnits() - suggested() >= 1;

  // A statistic (units) rendered in the active mode with its measure word.
  const stat = (units: number, roundUp = false): string =>
    `${formatNumber(statInMode(units, entryMode(), packSize(), doses(), roundUp))} ${modeWord(entryMode(), current()?.unitName ?? null)}`;

  // The dose caption beneath the requested number (AC-LN20): units when doses
  // is the active mode, the dose equivalent otherwise — rounded whole.
  const requestedCaption = () => {
    if (!dosesApply()) return undefined;
    const units = requestedUnits();
    return entryMode() === 'doses'
      ? `${formatNumber(Math.round(units))} ${current()?.unitName ?? t('label.unit')}`
      : `${formatNumber(Math.round(units * doses()))} ${t('label.doses-plural', { count: 2 })}`;
  };

  // The draft's reason, per the order's surface: omitted where there's no
  // reason control; the chosen id where there's a variance; null (clear) at
  // equality (D30).
  const draftOptionId = (): string | null | undefined => {
    if (!props.showExtended) return undefined;
    return variance() ? reasonId() : null;
  };

  const save = async (): Promise<boolean> => {
    const editorLine = current();
    if (!editorLine) return false;
    setSaving(true);
    setErrorMessage(undefined);
    const draft = {
      requestedQuantity: requestedUnits(),
      comment: comment(),
      optionId: draftOptionId(),
    };
    const result = editorLine.isNew
      ? await saveNewLine(props.storeId, props.requisitionId, editorLine, draft)
      : await saveExistingLine(props.storeId, editorLine, draft);
    setSaving(false);
    if (result.kind === 'saved') {
      props.onCommitted();
      return true;
    }
    if (result.kind === 'error') setErrorMessage(result.message);
    else setErrorMessage(t('error.cant-save'));
    return false;
  };

  const onOk = () =>
    void save().then(ok => {
      if (ok) props.onClose();
    });

  // Save & next (AC-LN22/LN23): save, then continue. Add mode reopens the empty
  // picker; update mode advances the walk (skipping covered), dropping into add
  // mode when exhausted on a general order, else closing.
  const advance = (fromLineId: string) => {
    const next = props.nextLine(fromLineId, covered);
    if (next) seedLine(editorLineFromLine(next));
    else if (props.canAdd) backToSearch();
    else props.onClose();
  };
  const onOkNext = () => {
    if (advancing()) return;
    setAdvancing(true);
    void (async () => {
      const editorLine = current();
      const ok = await save();
      setAdvancing(false);
      if (!ok || !editorLine) return;
      if (mode() === 'add') backToSearch();
      else advance(editorLine.lineId);
    })();
  };

  const entryOptions = createMemo(() => {
    const unit = current()?.unitName ?? t('label.unit');
    const options = [{ value: 'units', label: unit }];
    if (packSize() > 0)
      options.push({ value: 'packs', label: t('label.pack') });
    if (dosesApply()) options.push({ value: 'doses', label: t('label.dose') });
    return options;
  });

  // A read-only statistics row: bold label, right-aligned value. `highlight`
  // tints the row like the edits inset panel (the middle-panel Suggested — the
  // requested block it is read against, spec S4), the tint bleeding slightly
  // past both sides while the text stays aligned with the column.
  const StatRow = (rowProps: {
    label: string;
    value: string;
    highlight?: boolean;
  }): JSX.Element => (
    <FieldRow
      label={rowProps.label}
      class={rowProps.highlight ? styles.highlight : undefined}
    >
      <span class={styles.statValue}>{rowProps.value}</span>
    </FieldRow>
  );

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size="large"
      testId="internal-order-line-edit-modal"
      title={updateMode() ? t('heading.edit-line') : t('button.add-item')}
      actionsLead={
        <Show when={errorMessage()}>
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
      }
      actions={
        <>
          <CancelButton
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          />
          <DialogSaveButton
            data-testid="dialog-button-ok"
            disabled={!current() || !dirty() || saving() || !props.editable}
            loading={saving()}
            onClick={onOk}
          />
          {/* Save & next — never a dead end (add mode reopens the picker,
              update mode walks the list). Shown once an item is chosen. */}
          <Show when={current() && props.editable}>
            <SaveAndNextButton
              data-testid="dialog-button-next-and-ok"
              loading={saving() || advancing()}
              onClick={onOkNext}
            />
          </Show>
        </>
      }
    >
      {/* Top — the item. Add mode: a live search picker (switching items
          discards the unsaved draft, AC-LN5). Update mode: fixed, disabled. */}
      <Show
        when={updateMode()}
        fallback={
          <ItemSearch
            label={t('label.item')}
            class={styles.itemField}
            storeId={props.storeId}
            placeholder={t('placeholder.enter-an-item-code-or-name')}
            value={current()?.itemId}
            selectedItem={
              current()
                ? {
                    id: current()!.itemId,
                    code: current()!.itemCode,
                    name: current()!.itemName,
                  }
                : undefined
            }
            disabled={saving() || loading()}
            onSelect={option => {
              if (option) void pickItem(option.id);
              else backToSearch();
            }}
          />
        }
      >
        <TextField
          label={t('label.item')}
          width="full"
          disabled
          value={`${current()?.itemCode ?? ''} - ${current()?.itemName ?? ''}`}
        />
      </Show>

      <Show when={current()}>
        {editorLine => (
          <>
            <div class={styles.panels}>
              {/* Left — the line's statistics (AC-LN19: every stock quantity in
                the active entry mode; time quantities exempt). */}
              <div class={styles.column}>
                <Show when={editorLine().unitName}>
                  <StatRow
                    label={t('label.unit')}
                    value={editorLine().unitName!}
                  />
                </Show>
                <Show when={editorLine().defaultPackSize > 0}>
                  <StatRow
                    label={t('label.default-pack-size')}
                    value={formatNumber(editorLine().defaultPackSize)}
                  />
                </Show>
                <Show when={dosesApply()}>
                  <StatRow
                    label={t('label.doses-per-unit')}
                    value={formatNumber(editorLine().doses)}
                  />
                </Show>
                <StatRow
                  label={t('label.our-soh')}
                  value={stat(editorLine().availableStockOnHand)}
                />
                <StatRow
                  label={
                    props.showExtended
                      ? t('label.area-amc')
                      : t('label.amc/amd')
                  }
                  value={stat(editorLine().averageMonthlyConsumption, true)}
                />
                <StatRow
                  label={t('label.months-of-stock')}
                  value={`${editorLine().monthsOfStock.toFixed(1)} ${t('label.months')}`}
                />
                <Show
                  when={
                    props.showForecast &&
                    editorLine().forecastTotalUnits != null
                  }
                >
                  <StatRow
                    label={t('label.target-stock-population')}
                    value={stat(
                      Math.ceil(editorLine().forecastTotalUnits ?? 0)
                    )}
                  />
                </Show>
                <Show when={props.showExtended}>
                  <StatRow
                    label={t('label.short-expiry')}
                    value={stat(editorLine().expiringUnits)}
                  />
                </Show>
              </div>

              {/* Middle — stock movements (extended gate only). */}
              <Show when={props.showExtended}>
                <div class={styles.column}>
                  <StatRow
                    label={t('label.suggested')}
                    value={stat(editorLine().suggestedQuantity, true)}
                    highlight
                  />
                  <StatRow
                    label={t('label.incoming-stock')}
                    value={stat(editorLine().incomingUnits)}
                  />
                  <StatRow
                    label={t('label.outgoing')}
                    value={stat(editorLine().outgoingUnits)}
                  />
                  <StatRow
                    label={t('label.losses')}
                    value={stat(editorLine().lossInUnits)}
                  />
                  <StatRow
                    label={t('label.additions')}
                    value={stat(editorLine().additionInUnits)}
                  />
                  <StatRow
                    label={t('label.days-out-of-stock')}
                    value={`${formatNumber(Math.round(editorLine().daysOutOfStock))} ${t('label.days')}`}
                  />
                </div>
              </Show>

              {/* Right — the edits, on a recessed inset panel. */}
              <InsetPanel class={styles.edits}>
                {/* Suggested here only when the movements panel is absent. */}
                <Show when={!props.showExtended}>
                  <StatRow
                    label={t('label.suggested')}
                    value={stat(editorLine().suggestedQuantity, true)}
                  />
                </Show>

                <FieldRow label={t('label.requested')}>
                  <div class={styles.requestedRow}>
                    <NumberField
                      label={t('label.requested')}
                      hideLabel
                      width="full"
                      min={0}
                      decimalLimit={2}
                      data-testid="requested-quantity-input"
                      disabled={disabled() || saving()}
                      value={requestedDisplay()}
                      onChange={onRequestedChange}
                    />
                    <Select
                      label={t('label.units')}
                      hideLabel
                      width="full"
                      value={entryMode()}
                      options={entryOptions()}
                      disabled={disabled() || saving()}
                      onValueChange={value => setEntryMode(value as EntryMode)}
                    />
                  </div>
                </FieldRow>
                <Show when={requestedCaption()}>
                  {caption => <div class={styles.caption}>{caption()}</div>}
                </Show>

                {/* Excess-request warning (AC-LN13). */}
                <Show when={excess()}>
                  <Alert severity="warning">
                    {t('warning.requested-exceeds-suggested')}
                  </Alert>
                </Show>

                {/* Indicative price rows (AC-IP6) — never re-expressed by the
                  entry mode; the total tracks the requested units live. */}
                <Show when={props.showPricing}>
                  <StatRow
                    label={t('label.indicative-price-per-unit')}
                    value={
                      editorLine().pricePerUnit == null
                        ? '-'
                        : money(editorLine().pricePerUnit!)
                    }
                  />
                  <StatRow
                    label={t('label.indicative-price')}
                    value={money(
                      (editorLine().pricePerUnit ?? 0) * requestedUnits()
                    )}
                  />
                </Show>

                {/* Reason (extended gate) — disabled/empty at equality (AC-R2). */}
                <Show when={props.showExtended}>
                  <FieldRow label={t('label.reason')}>
                    <ReasonSelect
                      kind="requisition"
                      label={t('label.reason')}
                      hideLabel
                      disabled={disabled() || saving() || !variance()}
                      value={variance() ? (reasonId() ?? undefined) : undefined}
                      onChange={reason => {
                        setReasonId(reason?.id ?? null);
                        setDirty(true);
                      }}
                    />
                  </FieldRow>
                </Show>

                <FieldRow label={t('label.comment')}>
                  <TextArea
                    label={t('label.comment')}
                    hideLabel
                    rows={3}
                    disabled={disabled() || saving()}
                    value={comment()}
                    onInput={e => {
                      setComment(e.currentTarget.value);
                      setDirty(true);
                    }}
                  />
                </FieldRow>
              </InsetPanel>
            </div>

            {/* Below — the read-only context charts (spec S4 § charts): the
              target-quantity breakdown (client-side from the line's stats)
              atop the consumption-history + stock-evolution pair. The pair
              needs a saved line's server series (chartData); absent it — an
              add-mode draft, or an order with no expected-delivery-date — only
              the breakdown shows. The population-forecast calculation display
              is a later cut. */}
            <div class={styles.charts}>
              <div class={styles.breakdown}>
                <h3 class={styles.chartHeading}>
                  {t('heading.target-quantity')}
                </h3>
                <TargetQuantityBreakdown
                  averageMonthlyConsumption={
                    editorLine().averageMonthlyConsumption
                  }
                  availableStockOnHand={editorLine().availableStockOnHand}
                  suggestedQuantity={editorLine().suggestedQuantity}
                  thresholdMonths={props.minMonths}
                  targetMonths={props.maxMonths}
                />
              </div>
              <Show when={hasSeries() && chartData()}>
                {data => (
                  <div class={styles.chartPair}>
                    <div class={styles.chartSection}>
                      <h3 class={styles.chartHeading}>
                        {t('heading.consumption-history')}
                      </h3>
                      <ConsumptionHistoryChart
                        data={data().consumptionHistory?.nodes ?? []}
                      />
                    </div>
                    <div class={styles.chartSection}>
                      <h3 class={styles.chartHeading}>
                        {t('heading.stock-evolution')}
                      </h3>
                      <StockEvolutionChart
                        data={data().stockEvolution?.nodes ?? []}
                      />
                    </div>
                  </div>
                )}
              </Show>
            </div>
          </>
        )}
      </Show>
    </Dialog>
  );
};

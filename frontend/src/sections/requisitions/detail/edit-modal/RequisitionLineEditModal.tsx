import { generateUUID } from '../../../../uuid';
import {
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { formatNumber } from '../../../../intl/formatNumber';
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
import { ItemSearch } from '../../../../domain/item';
import { createFocusTarget } from '../../../../ui/utils/createFocusTarget';
import { ReasonSelect } from '../../../../domain/reasonOptions';
import type { RequisitionDetailLineFragment } from '../requisitionDetail.generated';
import {
  buildAddPreview,
  editorLineFromLine,
  figureInMode,
  modeToUnits,
  modeWord,
  saveExistingLine,
  saveNewLine,
  unitsToMode,
  type EditorLine,
  type EntryMode,
  type LineDraft,
} from './requisitionLineEdit';
import styles from './RequisitionLineEditModal.module.css';

// The requisition line editor (spec/requisitions S4): add an item (add mode —
// manual non-program requisitions only) or fill one line (edit mode, any
// status; read-only opens with every control disabled). The stats tabs
// (My store · Customer, with the volume block and the forecast calculation
// display) are a later slice — this is the entry surface: item header, the
// figure grid, and the Save / Save & next walk.

export interface RequisitionLineEditModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  requisitionId: string;
  /** Read-only requisition → every control disabled (reads still shown). */
  editable: boolean;
  /** Manual non-program requisition → add mode reachable (rules › line editing). */
  canAdd: boolean;
  /**
   * Transfer-linked → only Supply and the comment editable; the customer's
   * demand figures are their record (AC-LE10).
   */
  transferred: boolean;
  /** Extra-fields program requisition → the three-column layout + Reason. */
  showExtended: boolean;
  /** Approved figure: the authorisation preference with an Approved status. */
  showApproved: boolean;
  // Preference gates (spec S4).
  showDoses: boolean;
  showForecast: boolean;
  showExcess: boolean;
  /** An existing line → edit mode; omitted → add mode. */
  initialLine?: RequisitionDetailLineFragment;
  /**
   * Save & next (edit mode): the next line to step to in the table's current
   * sort/filter order, skipping ones already visited this run; undefined when
   * the set is exhausted (→ add mode where adding is offered, else close).
   */
  nextLine: (
    currentLineId: string,
    covered: Set<string>
  ) => RequisitionDetailLineFragment | undefined;
  /**
   * The requisition's existing line for an item, if any — add mode loads it
   * for editing rather than starting a duplicate (D74, AC-LE3).
   */
  findLineForItem: (
    itemId: string
  ) => RequisitionDetailLineFragment | undefined;
  /** A save committed — the parent re-reads the line list (rules › drafts). */
  onCommitted: () => void;
}

// Mount the content only while open, keyed on the OPEN identity (the line id,
// or 'add'), so each open starts fresh and advancing within one open is
// imperative (seedLine), not a prop change — the internal-order editor's
// pattern.
export const RequisitionLineEditModal = (
  props: RequisitionLineEditModalProps
): JSX.Element => (
  <Show when={props.open && (props.initialLine?.id ?? 'add')} keyed>
    {_openKey => <LineEditContent {...props} />}
  </Show>
);

// The editable draft: every figure the save sends, all in stored UNITS. One
// signal object — field writes go through patchDraft.
type Draft = {
  supplyQuantity: number;
  requestedQuantity: number;
  availableStockOnHand: number;
  averageMonthlyConsumption: number;
  initialStockOnHandUnits: number;
  incomingUnits: number;
  outgoingUnits: number;
  lossInUnits: number;
  additionInUnits: number;
  expiringUnits: number;
  daysOutOfStock: number;
  comment: string;
  reasonId: string | null;
};

const draftFromLine = (line: EditorLine): Draft => ({
  supplyQuantity: line.supplyQuantity,
  requestedQuantity: line.requestedQuantity,
  availableStockOnHand: line.availableStockOnHand,
  averageMonthlyConsumption: line.averageMonthlyConsumption,
  initialStockOnHandUnits: line.initialStockOnHandUnits,
  incomingUnits: line.incomingUnits,
  outgoingUnits: line.outgoingUnits,
  lossInUnits: line.lossInUnits,
  additionInUnits: line.additionInUnits,
  expiringUnits: line.expiringUnits,
  daysOutOfStock: line.daysOutOfStock,
  comment: line.comment,
  reasonId: line.reasonId,
});

const LineEditContent = (
  props: RequisitionLineEditModalProps
): JSX.Element => {
  const [line, setLine] = createSignal<EditorLine | undefined>(
    props.initialLine ? editorLineFromLine(props.initialLine) : undefined
  );
  const [mode, setMode] = createSignal<'add' | 'update'>(
    props.initialLine ? 'update' : 'add'
  );
  const [entryMode, setEntryMode] = createSignal<EntryMode>('units');
  const [draft, setDraft] = createSignal<Draft | undefined>(
    props.initialLine
      ? draftFromLine(editorLineFromLine(props.initialLine))
      : undefined
  );
  const [dirty, setDirty] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [advancing, setAdvancing] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();
  // A reasons rejection flags the Reason field (AC-LE8) until the next save.
  const [reasonFlagged, setReasonFlagged] = createSignal(false);
  // Items stepped through this run, so the walk never offers one twice.
  const covered = new Set<string>();

  // The add-mode item search — where focus lands on an add-mode open and
  // whenever the editor returns to the empty add state.
  const itemSearch = createFocusTarget();
  // The Supply field — where focus lands on an edit-mode open (AC-LE1).
  let supplyInput: HTMLInputElement | undefined;

  let disposed = false;
  onCleanup(() => (disposed = true));

  const patchDraft = (patch: Partial<Draft>) => {
    const current = draft();
    if (!current) return;
    setDraft({ ...current, ...patch });
    setDirty(true);
  };

  const focusSupply = () => {
    // After the dialog's showModal() has parked focus on the panel — the same
    // one-frame deferral createFocusTarget applies (AC-LE1: focus Supply and
    // scroll it into view).
    requestAnimationFrame(() => {
      supplyInput?.focus();
      supplyInput?.scrollIntoView({ block: 'center' });
    });
  };

  // Land the editor on a line — an existing line (edit) or an add-mode
  // preview — seeding the draft from its stored values.
  const seedLine = (editorLine: EditorLine, focus: boolean) => {
    setLine(editorLine);
    covered.add(editorLine.lineId);
    setDraft(draftFromLine(editorLine));
    setDirty(false);
    setErrorMessage(undefined);
    setReasonFlagged(false);
    if (focus) focusSupply();
  };

  const pickItem = async (itemId: string) => {
    // An item already on the requisition loads its EXISTING line to edit — no
    // duplicate (D74, AC-LE3). The picker stays live (mode stays 'add'), but
    // the loaded line's isNew=false makes the save an update, not an insert.
    const existing = props.findLineForItem(itemId);
    if (existing) {
      seedLine(editorLineFromLine(existing), false);
      return;
    }
    setLoading(true);
    setErrorMessage(undefined);
    const preview = await buildAddPreview(
      props.storeId,
      itemId,
      generateUUID()
    );
    if (disposed) return;
    setLoading(false);
    if (preview) seedLine(preview, false);
  };

  // Back to the empty add state (AC-LE7: switching items or returning
  // discards any unsaved draft with nothing created). Focus returns to the
  // item search, as on an add-mode open.
  const backToSearch = () => {
    itemSearch.focus();
    setMode('add');
    setLine(undefined);
    setDraft(undefined);
    setDirty(false);
    setErrorMessage(undefined);
    setReasonFlagged(false);
  };

  onMount(() => {
    if (props.initialLine) {
      // The signal initializers seeded the line/draft; the walk still needs
      // the opened line marked visited (AC-LE5 — never offered twice), and
      // focus lands on Supply (AC-LE1).
      covered.add(props.initialLine.id);
      focusSupply();
    } else itemSearch.focus();
  });

  const updateMode = () => mode() === 'update';
  const disabled = () => !props.editable || saving();
  // The transferred lock (AC-LE10): the demand side is the customer's record.
  const demandDisabled = () => disabled() || props.transferred;

  const current = () => line();
  const packSize = () => current()?.defaultPackSize ?? 1;
  const doses = () => current()?.doses ?? 0;
  const suggested = () => current()?.suggestedQuantity ?? 0;
  const dosesApply = () =>
    props.showDoses && (current()?.isVaccine ?? false) && doses() > 0;

  const requestedUnits = () => draft()?.requestedQuantity ?? 0;
  const supplyUnits = () => draft()?.supplyQuantity ?? 0;

  // Derived read-only figures over the LIVE draft: available (the same
  // arithmetic as the line table's column) and the customer's months of
  // stock — a time quantity, exempt from re-expression.
  const available = () => {
    const d = draft();
    if (!d) return 0;
    return (
      d.initialStockOnHandUnits +
      d.incomingUnits +
      d.additionInUnits -
      d.lossInUnits -
      d.outgoingUnits
    );
  };
  const customerMos = () => {
    const amc = draft()?.averageMonthlyConsumption ?? 0;
    return amc > 0 ? available() / amc : 0;
  };

  // The reason is offered only at a variance (rules › line editing): at
  // equality the control disables and the stored reason clears on save.
  // Unlike the rest of the demand side it stays editable on a TRANSFERRED
  // line (D86) — the reason guard rejects every save of an unreasoned
  // variance line, so the supplying store must be able to satisfy it.
  const variance = () => requestedUnits() !== suggested();
  const excess = () =>
    props.showExcess && requestedUnits() - suggested() >= 1;

  // The customer AMC/AMD + MOS rows show only on a transfer-linked or
  // extra-fields requisition; AMC is editable only under extra-fields.
  const showCustomerConsumption = () => props.transferred || props.showExtended;

  // Target stock (population): the forecasting preference AND a forecast-
  // carrying line (contract: non-null, non-zero forecastTotalUnits).
  const showTargetPopulation = () =>
    props.showForecast && !!current()?.forecastTotalUnits;

  // The dose-equivalent caption under the Supply entry (spec S4 § supply
  // entry): the supply as typed, re-expressed in doses.
  const supplyDoseCaption = (): string | undefined => {
    if (!dosesApply()) return undefined;
    const doseCount = Math.round(supplyUnits() * doses());
    return `${formatNumber(doseCount)} ${tPlural('label.doses-plural', doseCount)}`;
  };

  // The draft's reason on the wire: where the editor offers the reason
  // control, the chosen id at a variance and null (clear) at equality; where
  // it does not (non-extended), the STORED id is resent verbatim — an
  // omitted or null optionId clears the stored reason (contract › line
  // editing).
  const draftOptionId = (): string | null => {
    const reasonEditable = props.showExtended && props.editable;
    if (reasonEditable) return variance() ? (draft()?.reasonId ?? null) : null;
    return line()?.reasonId ?? null;
  };

  const save = async (): Promise<boolean> => {
    const editorLine = current();
    const d = draft();
    if (!editorLine || !d) return false;
    setSaving(true);
    setErrorMessage(undefined);
    setReasonFlagged(false);
    // The WHOLE draft, every save (contract › line editing).
    const wireDraft: LineDraft = {
      supplyQuantity: d.supplyQuantity,
      requestedQuantity: d.requestedQuantity,
      stockOnHand: d.availableStockOnHand,
      initialStockOnHand: d.initialStockOnHandUnits,
      averageMonthlyConsumption: d.averageMonthlyConsumption,
      incomingUnits: d.incomingUnits,
      outgoingUnits: d.outgoingUnits,
      lossInUnits: d.lossInUnits,
      additionInUnits: d.additionInUnits,
      expiringUnits: d.expiringUnits,
      daysOutOfStock: d.daysOutOfStock,
      comment: d.comment,
      optionId: draftOptionId(),
    };
    const result = editorLine.isNew
      ? await saveNewLine(
          props.storeId,
          props.requisitionId,
          editorLine,
          wireDraft
        )
      : await saveExistingLine(props.storeId, editorLine, wireDraft);
    setSaving(false);
    if (result.kind === 'saved') {
      props.onCommitted();
      return true;
    }
    if (result.kind === 'error') {
      setErrorMessage(result.message);
      if (result.reasonRejected) setReasonFlagged(true);
    } else setErrorMessage(t('error.cant-save'));
    return false;
  };

  const onOk = () =>
    void save().then(ok => {
      if (ok) props.onClose();
    });

  // Save & next (AC-LE5/LE6): save, then continue. Add mode reopens the empty
  // picker; edit mode advances the walk (skipping covered), dropping into add
  // mode when exhausted where adding is offered, else closing.
  const advance = (fromLineId: string) => {
    const next = props.nextLine(fromLineId, covered);
    if (next) seedLine(editorLineFromLine(next), true);
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

  // The representation select's options (spec S4 § supply entry): the item's
  // unit name (falling back to "unit") and pack — the pack option offered
  // where the item has a default pack size. Always rendered, disabling with
  // the field.
  const entryOptions = createMemo(() => {
    const unit = current()?.unitName ?? t('label.unit');
    const options = [{ value: 'units', label: unit }];
    if (packSize() > 0) options.push({ value: 'packs', label: t('label.pack') });
    return options;
  });

  // A labelled figure row (spec S4 § layout): bold inline-start label, a
  // same-width right-aligned figure box at the inline-end carrying the active
  // representation's measure word. Editable rows show two decimals and commit
  // back stored units; read-only rows render disabled, rounded UP. `fixed`
  // marks a time quantity — no re-expression, its own suffix.
  const FigureRow = (rowProps: {
    label: string;
    units: number;
    onChange?: (units: number) => void;
    disabled?: boolean;
    fixed?: 'days' | 'months';
    decimals?: number;
    testId?: string;
    ref?: (el: HTMLInputElement) => void;
  }): JSX.Element => {
    const editable = () => !!rowProps.onChange && !rowProps.disabled;
    const suffix = () =>
      rowProps.fixed === 'days'
        ? t('label.days')
        : rowProps.fixed === 'months'
          ? t('label.months')
          : modeWord(entryMode(), current()?.unitName ?? null);
    const shown = () => {
      if (rowProps.fixed)
        return Math.round(rowProps.units * 10) / 10;
      if (editable()) {
        const raw = unitsToMode(rowProps.units, entryMode(), packSize());
        return Math.round(raw * 100) / 100;
      }
      return figureInMode(rowProps.units, entryMode(), packSize());
    };
    return (
      <FieldRow label={rowProps.label}>
        <div class={styles.figure}>
          <NumberField
            label={rowProps.label}
            hideLabel
            min={0}
            decimalLimit={rowProps.fixed ? 1 : (rowProps.decimals ?? 2)}
            endAdornment={suffix()}
            data-testid={rowProps.testId}
            ref={rowProps.ref}
            disabled={!editable()}
            value={shown()}
            onChange={value => {
              if (!rowProps.onChange) return;
              const entered = value ?? 0;
              rowProps.onChange(
                rowProps.fixed
                  ? entered
                  : modeToUnits(entered, entryMode(), packSize())
              );
            }}
          />
        </div>
      </FieldRow>
    );
  };

  // The plain caption figures at the head of the first column (spec S4 §
  // layout): default pack size, and doses per unit under the doses gate.
  const Captions = (): JSX.Element => (
    <>
      <Show when={packSize() > 0}>
        <div class={styles.caption}>
          <span>{t('label.default-pack-size')}</span>
          <span class={styles.captionValue}>{formatNumber(packSize())}</span>
        </div>
      </Show>
      <Show when={dosesApply()}>
        <div class={styles.caption}>
          <span>{t('label.doses-per-unit')}</span>
          <span class={styles.captionValue}>{formatNumber(doses())}</span>
        </div>
      </Show>
    </>
  );

  // The customer-demand panel (spec S4 § layout, columns one/two): requested,
  // their available stock, our stock on hand, suggested — and the variance
  // reason on the extra-fields layout.
  const DemandPanel = (): JSX.Element => (
    <InsetPanel class={styles.panel}>
      <FigureRow
        label={t('label.customer-requested')}
        units={requestedUnits()}
        disabled={demandDisabled()}
        onChange={units => patchDraft({ requestedQuantity: units })}
        testId="requested-quantity-input"
      />
      <FigureRow
        label={t('label.customer-soh')}
        units={draft()?.availableStockOnHand ?? 0}
        disabled={demandDisabled()}
        onChange={units => patchDraft({ availableStockOnHand: units })}
      />
      <FigureRow label={t('label.our-soh')} units={current()?.ourStockOnHand ?? 0} />
      <FigureRow label={t('label.suggested')} units={suggested()} />
      <Show when={props.showExtended}>
        <FieldRow label={t('label.reason')}>
          <ReasonSelect
            kind="requisition"
            label={t('label.reason')}
            hideLabel
            disabled={disabled() || !variance()}
            error={
              reasonFlagged()
                ? t('error.provide-reason-requisition')
                : undefined
            }
            errorTestId="reason-field-error"
            value={
              variance() ? (draft()?.reasonId ?? undefined) : undefined
            }
            onChange={reason => patchDraft({ reasonId: reason?.id ?? null })}
          />
        </FieldRow>
      </Show>
    </InsetPanel>
  );

  // The supply panel (spec S4 § layout, the last column): approved (gated),
  // the Supply entry beside the representation select, remaining, issued.
  const SupplyPanel = (): JSX.Element => (
    <InsetPanel class={styles.panel}>
      <Show when={props.showApproved}>
        <FigureRow
          label={t('label.approved')}
          units={current()?.approvedQuantity ?? 0}
        />
      </Show>
      <FieldRow label={t('label.supply')}>
        <div class={styles.supplyRow}>
          <NumberField
            label={t('label.supply')}
            hideLabel
            width="full"
            min={0}
            decimalLimit={2}
            data-testid="supply-quantity-input"
            ref={el => (supplyInput = el)}
            disabled={disabled()}
            value={
              Math.round(
                unitsToMode(supplyUnits(), entryMode(), packSize()) * 100
              ) / 100
            }
            onChange={value =>
              patchDraft({
                supplyQuantity: modeToUnits(
                  value ?? 0,
                  entryMode(),
                  packSize()
                ),
              })
            }
          />
          <Select
            label={t('label.units')}
            hideLabel
            width="full"
            value={entryMode()}
            options={entryOptions()}
            disabled={disabled()}
            onValueChange={value => setEntryMode(value as EntryMode)}
          />
        </div>
      </FieldRow>
      <Show when={supplyDoseCaption()}>
        {caption => <div class={styles.doseCaption}>{caption()}</div>}
      </Show>
      <FigureRow
        label={t('label.remaining-to-supply')}
        units={current()?.remainingQuantityToSupply ?? 0}
      />
      <FigureRow
        label={t('label.already-issued')}
        units={current()?.alreadyIssued ?? 0}
      />
    </InsetPanel>
  );

  // Beneath the supply panel: the customer's consumption context (gated), the
  // forecast total (gated), then the comment.
  const SupplyContext = (): JSX.Element => (
    <>
      <Show when={showCustomerConsumption()}>
        <FigureRow
          label={t('label.customer-amc/amd')}
          units={draft()?.averageMonthlyConsumption ?? 0}
          disabled={demandDisabled() || !props.showExtended}
          onChange={
            props.showExtended
              ? units => patchDraft({ averageMonthlyConsumption: units })
              : undefined
          }
        />
        <FigureRow
          label={t('label.customer-months-of-stock')}
          units={customerMos()}
          fixed="months"
        />
      </Show>
      <Show when={showTargetPopulation()}>
        {/* Rounded to the NEAREST whole unit — not up (spec S4 § read-only
            figures), so it bypasses FigureRow's ceil. */}
        <FieldRow label={t('label.target-stock-population')}>
          <div class={styles.figure}>
            <NumberField
              label={t('label.target-stock-population')}
              hideLabel
              disabled
              endAdornment={modeWord(entryMode(), current()?.unitName ?? null)}
              value={Math.round(
                unitsToMode(
                  current()?.forecastTotalUnits ?? 0,
                  entryMode(),
                  packSize()
                )
              )}
            />
          </div>
        </FieldRow>
      </Show>
      <FieldRow label={t('label.comment')}>
        <TextArea
          label={t('label.comment')}
          hideLabel
          rows={3}
          data-testid="line-comment-input"
          disabled={disabled()}
          value={draft()?.comment ?? ''}
          onInput={e => patchDraft({ comment: e.currentTarget.value })}
        />
      </FieldRow>
    </>
  );

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size="large"
      testId="requisition-line-edit-modal"
      // Untitled per the reference — the title stays as the accessible name.
      title={updateMode() ? t('heading.edit-line') : t('button.add-item')}
      titleHidden
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
          {/* Save · Save & next — disabled on a read-only requisition and
              while a save is in flight (spec S4 § layout › footer). */}
          <DialogSaveButton
            data-testid="dialog-button-ok"
            disabled={!current() || !dirty() || saving() || !props.editable}
            loading={saving()}
            onClick={onOk}
          />
          <SaveAndNextButton
            data-testid="dialog-button-next-and-ok"
            disabled={!current() || saving() || !props.editable}
            loading={saving() || advancing()}
            onClick={onOkNext}
          />
        </>
      }
    >
      {/* Item header (spec S4 § layout): the catalogue lookup in add mode —
          offering EVERY visible item, an already-present pick loading its
          line (D74) — or the item read-only in edit mode. */}
      <Show
        when={updateMode()}
        fallback={
          <ItemSearch
            label={t('label.item')}
            class={styles.itemField}
            storeId={props.storeId}
            focusTarget={itemSearch}
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
        <div class={styles.grid}>
          <Show
            when={props.showExtended}
            fallback={
              <>
                {/* General requisition — two columns (spec S4 § layout). */}
                <div class={styles.column}>
                  <Captions />
                  <DemandPanel />
                  <Show when={excess()}>
                    <Alert severity="warning">
                      {t('messages.requested-exceeds-suggested')}
                    </Alert>
                  </Show>
                </div>
                <div class={styles.column}>
                  <SupplyPanel />
                  <SupplyContext />
                </div>
              </>
            }
          >
            {/* Extra-fields program requisition — three columns. */}
            <div class={styles.column}>
              <Captions />
              <FigureRow
                label={t('label.initial-stock-on-hand')}
                units={draft()?.initialStockOnHandUnits ?? 0}
                disabled={demandDisabled()}
                onChange={units =>
                  patchDraft({ initialStockOnHandUnits: units })
                }
              />
              <FigureRow
                label={t('label.incoming-stock')}
                units={draft()?.incomingUnits ?? 0}
                disabled={demandDisabled()}
                onChange={units => patchDraft({ incomingUnits: units })}
              />
              <FigureRow
                label={t('label.outgoing')}
                units={draft()?.outgoingUnits ?? 0}
                disabled={demandDisabled()}
                onChange={units => patchDraft({ outgoingUnits: units })}
              />
              <FigureRow
                label={t('label.losses')}
                units={draft()?.lossInUnits ?? 0}
                disabled={demandDisabled()}
                onChange={units => patchDraft({ lossInUnits: units })}
              />
              <FigureRow
                label={t('label.additions')}
                units={draft()?.additionInUnits ?? 0}
                disabled={demandDisabled()}
                onChange={units => patchDraft({ additionInUnits: units })}
              />
              <FigureRow
                label={t('label.days-out-of-stock')}
                units={draft()?.daysOutOfStock ?? 0}
                fixed="days"
                disabled={demandDisabled()}
                onChange={units => patchDraft({ daysOutOfStock: units })}
              />
            </div>
            <div class={styles.column}>
              <DemandPanel />
              <Show when={excess()}>
                <Alert severity="warning">
                  {t('messages.requested-exceeds-suggested')}
                </Alert>
              </Show>
              <FigureRow label={t('label.available')} units={available()} />
              <FigureRow
                label={t('label.short-expiry')}
                units={draft()?.expiringUnits ?? 0}
                disabled={demandDisabled()}
                onChange={units => patchDraft({ expiringUnits: units })}
              />
            </div>
            <div class={styles.column}>
              <SupplyPanel />
              <SupplyContext />
            </div>
          </Show>
        </div>
      </Show>
    </Dialog>
  );
};

import {
  createMemo,
  createResource,
  createSignal,
  For,
  Show,
  type Component,
} from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { getPlural, t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../../ui/utils/createFocusTarget';
import { createDebounced } from '../../../../ui/utils/createDebounced';
import { FormRow } from '../../../../ui/layout/Form/FormRow';
import { FormSection } from '../../../../ui/layout/Form/FormSection';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { TextArea } from '../../../../ui/elements/inputs/TextArea';
import { Select } from '../../../../ui/elements/selectors/Select';
import { Text } from '../../../../ui/elements/typography/Text';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  useAccordionItemExpanded,
} from '../../../../ui/elements/accordion/Accordion';
import styles from './PrescriptionLineEditModal.module.css';
import {
  getExpiryDateCell,
  getNumberCell,
} from '../../../../ui/elements/table/tableHelpers';
import { getBooleanCell } from '../../../../ui/elements/table/BooleanCell';
import { ItemSearch } from '../../../../domain/item';
import { prescriptionPreferences } from '../../../../store/storeContext';
import { formatNumber, round } from '../../../../intl';
import {
  clampManualPacks,
  issuedUnits,
  lensToUnits,
  round9,
  unitsToLens,
  type AllocateUnit,
} from '@/domain/allocation';
import {
  allocateUnits,
  buildSaveInput,
  canSave,
  draftAvailableUnits,
  seedDraftLines,
  type DraftLine,
} from './lineEditLogic';
import {
  issueWarningMessages,
  manualEntryMessages,
  type PrescriptionWarningMessage,
} from './allocationWarnings';
import { expandAbbreviations } from './directions';
import {
  Abbreviations,
  PrescriptionEditLines,
  SavePrescriptionItemLines,
  type PrescriptionEditLinesResult,
} from './prescriptionLineEdit.generated';

// The prescription line editor (spec/prescriptions/ui-surface.md S4 — the
// D53 modal replacing the real app's full-page route): item lookup (locked in
// edit mode, existing items excluded in add mode), the allocation editor body
// with the prescription deltas — partial packs (AC-A1), no placeholder,
// nothing allocated on open (AC-A2) — the preference-gated prescribed
// quantity (AC-Q1–Q3), and the directions block (AC-R1–R3). Save is the item
// set-save (AC-I7): every rejection is non-typed (contract wire trap), shown
// in-dialog. OK & next (add mode) saves then reopens on a fresh item.

export interface PrescriptionLineEditModalProps {
  storeId: string;
  invoiceId: string;
  /** The item to open on (edit mode); undefined = add mode (item search). */
  initialItemId?: string;
  /**
   * The opened item's label (code + name) from the row — so the locked item
   * search shows its name IMMEDIATELY on re-open, before the batch-grid fetch
   * (which carries the full item info) resolves.
   */
  initialItem?: { id: string; code: string; name: string };
  /** Items already dispensed — excluded from the add-mode picker (FL3). */
  existingItemIds: string[];
  /**
   * The prescription's assigned program, if any — scopes the add-mode item
   * picker to the program's master list (rules.md: choosing a program scopes
   * the item catalogue offered when dispensing). A program shares its master
   * list's id, so it feeds the picker's masterListId filter directly.
   */
  programId?: string;
  onClose: () => void;
  /** A save landed — the detail refetches. */
  onSaved: () => void;
}

export const PrescriptionLineEditModal: Component<
  PrescriptionLineEditModalProps
> = props => (
  // Mounted fresh per open (the stocktakes modal shape): state seeds once.
  <Body {...props} />
);

// Resolve a pure report descriptor (./allocationWarnings) to the banner the
// editor renders: its text, its testid, and its severity.
//
// Severity follows whether the user must act (spec/stock-allocation
// § the allocation editor body): INFO where allocation handled the situation
// and is explaining itself — stock it declined to draw from — and WARNING
// where the outcome differs from what was asked and only the user can resolve
// it (a broken pack, an adjusted entry).
const banner = (
  message: PrescriptionWarningMessage
): { text: string; testId: string; severity: 'info' | 'warning' } => {
  switch (message.key) {
    case 'messages.stock-on-hold':
      return {
        text: t(message.key),
        testId: 'prescription-skipped-stock-warning-on-hold',
        severity: 'info',
      };
    case 'messages.stock-expired':
      return {
        text: t(message.key),
        testId: 'prescription-skipped-stock-warning-expired',
        severity: 'info',
      };
    case 'messages.stock-unusable-vvm':
      return {
        text: t(message.key),
        testId: 'prescription-skipped-stock-warning-unusable-vvm',
        severity: 'info',
      };
    case 'messages.over-allocated-line':
      return {
        text: t(message.key, {
          quantity: formatNumber(message.quantity),
          issueQuantity: formatNumber(message.issueQuantity),
        }),
        testId: 'prescription-adjusted-entry-warning',
        severity: 'warning',
      };
    case 'messages.partial-pack-warning-units':
    case 'messages.partial-pack-warning-doses':
      return {
        text: t(message.key, {
          nearestAbove: formatNumber(message.nearestAbove),
        }),
        testId: 'prescription-partial-pack-warning',
        severity: 'warning',
      };
  }
};

type ItemInfo = NonNullable<
  PrescriptionEditLinesResult['items']['nodes']
>[number];

const Body = (props: PrescriptionLineEditModalProps) => {
  const prefs = prescriptionPreferences;

  const [itemId, setItemId] = createSignal(props.initialItemId);
  const isEdit = props.initialItemId != null;

  // Working-size latch (#771): open small in add mode (just the item lookup),
  // grow ONCE when the first item is picked, and never shrink back — "OK &
  // next" returning to the search keeps the working size, so the add loop
  // doesn't pulse. Edit mode opens straight at the working size.
  const workingSize = createMemo<boolean>(
    prev => prev || itemId() !== undefined,
    false
  );
  // Add mode opens on the item lookup — the editor's starting control. In edit
  // mode the lookup is locked to the row's item and the dialog keeps the panel
  // default (ui-standards › accessibility › keyboard) — unless the prescribed-
  // quantity preference is on, which makes that field the first entry point.
  const itemSearch = createFocusTarget();
  // The prescribed-quantity field (.61): focused once an item is chosen (add
  // mode) and on opening an existing line, when the preference shows it.
  const prescribedQuantityFocus = createFocusTarget();
  // Issue Quantity (.62): the focus if prescribed quantity is disabled
  const issueQuantityFocus = createFocusTarget();

  const [lines, setLines] = createStore<DraftLine[]>([]);
  const [itemInfo, setItemInfo] = createSignal<ItemInfo>();
  const [prescribedQuantity, setPrescribedQuantity] = createSignal<number>();
  const [note, setNote] = createSignal('');
  const [abbrevEntry, setAbbrevEntry] = createSignal('');
  const [issueUnits, setIssueUnits] = createSignal<number>();
  const [shortfall, setShortfall] = createSignal(0);
  // The other distribution/manual-entry reports (stock-allocation §
  // reporting): barred stock skipped (.59), the split-pack warning (.58), an
  // adjusted manual entry (.19). Each entry renders as its own banner.
  const [warnings, setWarnings] = createSignal<PrescriptionWarningMessage[]>(
    []
  );
  const [dirty, setDirty] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string>();
  // The allocate-in lens: units, or doses for a vaccine item under the
  // preference (AC-AL7 via stock-allocation; prescriptions has no pack lens).
  const [lens, setLens] = createSignal<'units' | 'doses'>('units');

  // The item's draft grid + info, fetched when an item is chosen — nothing
  // allocates on open (AC-A2); the grid just renders. Read non-suspending so
  // the open modal never remounts (kdd/solid-reactivity-pitfalls).
  const [gridData] = createResource(itemId, async id => {
    const result = await graphqlFetch(PrescriptionEditLines, {
      storeId: props.storeId,
      itemId: id,
      invoiceId: props.invoiceId,
    });
    // The item changed again mid-flight (add mode re-pick): this response is
    // stale — landing its grid would leave `lines` from one item under
    // another's itemId, and a save would dispense the wrong item's stock.
    if (id !== itemId()) return undefined;
    if (result.kind !== 'success') return undefined;
    const draft = result.data.draftStockOutLines;
    const item = result.data.items.nodes[0];
    setItemInfo(item);
    // A vaccine under the doses preference opens in the doses lens (.63);
    // everything else in units. State stays unit-denominated either way —
    // the lens only shapes the fields' entry/display.
    setLens(
      (item?.isVaccine ?? false) && prefs().manageVaccinesInDoses
        ? 'doses'
        : 'units'
    );
    const seeded = seedDraftLines(draft.draftLines, prefs(), new Date());
    setLines(reconcile(seeded, { key: 'id' }));
    setPrescribedQuantity(draft.prescribedQuantity ?? undefined);
    setNote(draft.note ?? '');
    // Re-opening a dispensed line shows its saved state: the issue field
    // seeds to the existing allocation's unit total (displayed through the
    // lens). A fresh item has nothing allocated, so it stays empty (.32).
    const existingUnits = issuedUnits(seeded);
    setIssueUnits(existingUnits > 0 ? round9(existingUnits) : undefined);
    setShortfall(0);
    setWarnings([]);
    setDirty(false);
    // Land ready to type: with the item's grid in hand, Issue is the next
    // field. Armed here rather than gated on a load flag — Issue is inert
    // while the fetch is in flight, and the handle's frame runs after this
    // promise settles and Solid has re-rendered the enabled field.

    if (prefs().editPrescribedQuantity) {
      prescribedQuantityFocus.focus();
    } else {
      issueQuantityFocus.focus();
    }
    // A distribution still pending from the previous item must not land on
    // this one's freshly-seeded grid (also cancelled at pick time — this
    // covers a keystroke that raced the fetch).
    cancelAllocate();
    return result.data;
  });

  // The abbreviation dictionary (AC-R1), fetched once per open.
  const [abbrevData] = createResource(async () => {
    const result = await graphqlFetch(Abbreviations, {});
    return result.kind === 'success' ? result.data.abbreviations : undefined;
  });

  const unitName = () => itemInfo()?.unitName ?? t('label.unit');
  const dosesMode = () =>
    lens() === 'doses' && (itemInfo()?.isVaccine ?? false);
  const dosesPerUnit = () => Math.max(itemInfo()?.doses ?? 1, 1);
  const showDosesLens = () =>
    (itemInfo()?.isVaccine ?? false) && prefs().manageVaccinesInDoses;

  // The lens boundary (.63, rules § prescribed quantity): state and the wire
  // are ALWAYS units — both quantity fields enter and display through the
  // shared allocate-in lens (domain/allocation lensToUnits/unitsToLens), so
  // flipping it rescales the figures without touching the allocation.
  // Prescriptions has no packs lens; the shape is units or doses.
  const allocateLens = (): AllocateUnit =>
    dosesMode()
      ? { kind: 'doses', dosesPerUnit: dosesPerUnit() }
      : { kind: 'units' };
  const lensValue = (units: number | undefined): number | undefined =>
    units == null ? undefined : unitsToLens(units, allocateLens());

  const allocatedUnits = () => issuedUnits(lines);
  const availableUnits = () => draftAvailableUnits(lines);
  /** The available total AS DISPLAYED — read twice (figure + unit name). */
  const availableInLens = () => unitsToLens(availableUnits(), allocateLens());

  // Who owns the distribution waiting behind the debounce. Clearing a field
  // drops only ITS OWN pending call — never the sibling's (the two fields sit
  // on one row and are edited in quick succession) — while a manual row edit
  // or an item switch supersedes any pending call outright.
  let pendingAllocator: 'issue' | 'prescribed' | undefined;

  // Distribute FEFO with partial packs (AC-A1); callers hand in UNITS — the
  // lens converts at the field boundary (AC-AL7/.63). Runs DEBOUNCED behind
  // both quantity fields (the current app's AutoAllocate fields — their
  // #2727/#3532: distributing per keystroke rewrites the entry under the
  // user's fingers). Once the entry settles, the issue field snaps to what
  // was ACTUALLY allocated — a request stock can't cover reads as the
  // allocated 10, not the typed 20 (.62); the shortfall banner carries the
  // full request.
  const runAllocation = (requestedUnits: number) => {
    pendingAllocator = undefined;
    const {
      packsById,
      shortfallUnits,
      warnings: derived,
    } = allocateUnits(lines, requestedUnits);
    setLines(
      reconcile(
        lines.map(line => ({
          ...line,
          numberOfPacks: packsById.get(line.id) ?? line.numberOfPacks,
        })),
        { key: 'id' }
      )
    );
    setShortfall(shortfallUnits);
    setWarnings(
      issueWarningMessages(derived, {
        doses: dosesMode(),
        dosesPerUnit: dosesPerUnit(),
      })
    );
    setIssueUnits(round9(issuedUnits(lines)));
    setDirty(true);
  };
  const allocate = createDebounced(runAllocation, 500);

  const scheduleAllocate = (owner: 'issue' | 'prescribed', units: number) => {
    pendingAllocator = owner;
    allocate(units);
  };
  /** No owner = unconditional; an owner drops only its own pending call. */
  const cancelAllocate = (owner?: 'issue' | 'prescribed') => {
    if (owner != null && pendingAllocator !== owner) return;
    pendingAllocator = undefined;
    allocate.cancel();
  };

  // The issue field: echo the entry immediately (normalised to units),
  // distribute when it settles. Dirty lands with the keystroke, not the
  // debounce — OK must not read as dead while the distribution settles
  // (save() flushes it before reading the draft).
  const onIssueChange = (value: number | undefined) => {
    setDirty(true);
    const units = lensToUnits(value, allocateLens());
    if (units == null) {
      setIssueUnits(undefined);
      cancelAllocate('issue');
      return;
    }
    setIssueUnits(units);
    scheduleAllocate('issue', units);
  };

  // The prescribed quantity drives allocation of the same quantity, capped
  // by the distribution (.62); the prescribed value itself keeps the full
  // request — it's the demand record (AC-Q1–Q3), not the issue figure.
  // Entered through the lens, held and saved as units (.63).
  const onPrescribedChange = (value: number | undefined) => {
    const units = lensToUnits(value, allocateLens());
    setPrescribedQuantity(units);
    setDirty(true);
    if (units != null) scheduleAllocate('prescribed', units);
    else cancelAllocate('prescribed');
  };

  // A manual per-row entry, clamped 0…available (AC-I5 — the client is the
  // only negative guard, and auto-pick raises the stakes). Its reports
  // REPLACE the distribution's (AC-AL13): the split-pack warning when the
  // entry leaves a fractional pack (.58) — and, via onRowClamped below, the
  // applied quantity when the entry was adjusted (.19).
  const setRowPacks = (id: string, value: number | undefined) => {
    const index = lines.findIndex(line => line.id === id);
    if (index < 0) return;
    // The manual entry supersedes a distribution still settling behind the
    // debounce — left pending, it would fire (or be flushed by save) and
    // silently rewrite this row with the auto-pick.
    cancelAllocate();
    // Bounded 0…available, keeping the exact fraction — prescriptions is the
    // partial-pack consumer (rules § allocation).
    const applied = clampManualPacks(value, lines[index].availablePacks, {
      partialPacks: true,
    });
    setLines(index, 'numberOfPacks', applied);
    // The issue field mirrors the actual total after a row edit (the current
    // app derives it from the rows, so it can never disagree).
    setIssueUnits(round9(issuedUnits(lines)));
    setShortfall(0);
    setWarnings(manualEntryMessages(applied, lines[index].packSize));
    setDirty(true);
  };

  // The row field bounds entry to 0…available itself; when it adjusted what
  // was typed it reports the entered/applied pair here (after its onChange,
  // so this overrides the plain manual-entry reports above — and it fires
  // even when the applied value didn't change, e.g. typing past a row already
  // at its availability).
  const onRowClamped = (
    line: DraftLine,
    enteredUnits: number,
    appliedUnits: number
  ) => {
    // Fires even when the applied value didn't change (no onChange, so
    // setRowPacks' cancel didn't run) — the manual intent still supersedes
    // any pending distribution.
    cancelAllocate();
    setShortfall(0);
    setWarnings(
      manualEntryMessages(
        appliedUnits / line.packSize,
        line.packSize,
        enteredUnits
      )
    );
  };

  const applyAbbreviation = () => {
    const entry = abbrevEntry().trim();
    if (!entry) return;
    setNote(expandAbbreviations(entry, abbrevData.latest ?? []));
    setAbbrevEntry('');
    setDirty(true);
  };

  const directionsDisabled = () => allocatedUnits() <= 0;

  // The collapsed Batches trigger's allocation summary (OMS-REG-DIS-03.57):
  // each drawn batch and its quantity, the unit named once at the end —
  // `RS-A : 1,014, RS-B : 6 tablets` — folding to a count + total beyond three
  // batches. Quantities display-rounded (allocation math carries float
  // noise). Hidden while expanded: the grid then shows the figures per row.
  //
  // ALWAYS unit-denominated, whatever the allocate-in lens is (ui-surface S4 —
  // the batch grid is unit-denominated too, so the summary matches the rows it
  // stands in for). Hence the unit is named in BOTH branches: bare figures
  // sitting beside a doses-lens available total would read as doses.
  const BatchSummary = () => {
    const expanded = useAccordionItemExpanded();
    const drawn = () => lines.filter(line => line.numberOfPacks > 0);
    const summary = () => {
      const batches = drawn();
      const total = batches.reduce(
        (sum, line) => sum + line.numberOfPacks * line.packSize,
        0
      );
      // Pluralised on the TOTAL: the name labels the whole summary, not just
      // the entry it trails.
      const unit = getPlural(unitName(), total);
      if (batches.length > 3)
        return `${tPlural('label.batch-count', batches.length)} · ${round(
          total,
          2
        )} ${unit}`;
      const entries = batches.map(
        line =>
          `${line.batch ?? t('label.no-batch')} : ${round(
            line.numberOfPacks * line.packSize,
            2
          )}`
      );
      return `${entries.join(', ')} ${unit}`;
    };
    return (
      <Show when={!expanded() && drawn().length > 0}>
        <span class={styles.batchSummary}>{summary()}</span>
      </Show>
    );
  };

  const saveEnabled = () =>
    canSave({
      itemChosen: itemId() != null,
      dirty: dirty(),
      allocatedUnits: allocatedUnits(),
      prescribedQuantity: prescribedQuantity(),
    });

  const save = async (): Promise<boolean> => {
    const id = itemId();
    if (!id || saving()) return false;
    // A distribution still settling behind the debounce must land before the
    // draft is read — save what the user asked for, not the previous state.
    allocate.flush();
    setSaving(true);
    setSaveError(undefined);
    // Every set-save rejection is non-typed (contract wire trap) — opt into
    // the raw errors and show them in-dialog with input preserved.
    const result = await graphqlFetch(
      SavePrescriptionItemLines,
      {
        storeId: props.storeId,
        input: buildSaveInput(
          props.invoiceId,
          id,
          lines,
          prescribedQuantity(),
          note()
        ),
      },
      { returnGraphqlErrors: true }
    );
    setSaving(false);
    if (result.kind === 'success') {
      props.onSaved();
      return true;
    }
    setSaveError(
      result.kind === 'graphqlError'
        ? result.message
        : t('error.something-wrong')
    );
    return false;
  };

  const onOk = async () => {
    if (await save()) props.onClose();
  };
  // OK & next (add mode): the same save, then a fresh item for rapid entry.
  const onOkNext = async () => {
    if (!(await save())) return;
    cancelAllocate();
    setItemId(undefined);
    setItemInfo(undefined);
    setLines(reconcile([]));
    setPrescribedQuantity(undefined);
    setNote('');
    setIssueUnits(undefined);
    setShortfall(0);
    setWarnings([]);
    setDirty(false);
    // Back to the empty picker, so the caret goes back with it and the next
    // item is typed straight in.
    itemSearch.focus();
  };

  const columns = createMemo((): Column<DraftLine, never>[] => {
    const vaccine = itemInfo()?.isVaccine ?? false;
    const cols: Column<DraftLine, never>[] = [
      { c: { key: 'batch' }, header: () => t('label.batch') },
      {
        c: { key: 'expiryDate' },
        header: () => t('label.expiry'),
        ...getExpiryDateCell(),
      },
    ];
    if (
      vaccine &&
      (prefs().manageVvmStatusForStock || prefs().sortByVvmStatusThenExpiry)
    )
      cols.push({
        c: {
          accessor: line => line.vvmStatus?.description ?? '',
          id: 'vvmStatus',
        },
        header: () => t('label.vvm-status'),
      });
    if (vaccine && prefs().manageVaccinesInDoses)
      cols.push({
        c: { accessor: () => dosesPerUnit(), id: 'dosesPerUnit' },
        header: () => t('label.doses-per-unit'),
        ...getNumberCell(),
      });
    else
      cols.push({
        c: { key: 'packSize' },
        header: () => t('label.pack-size'),
        ...getNumberCell(),
      });
    cols.push(
      {
        c: {
          accessor: line => line.inStorePacks * line.packSize,
          id: 'unitsInStock',
        },
        header: () => t('label.units-in-stock', { unit: unitName() }),
        ...getNumberCell(),
      },
      {
        c: {
          accessor: line => line.availablePacks * line.packSize,
          id: 'unitsAvailable',
        },
        header: () => t('label.units-available', { unit: unitName() }),
        ...getNumberCell(),
      },
      {
        c: {
          accessor: line => line.numberOfPacks * line.packSize,
          id: 'unitsIssued',
        },
        header: () => t('label.units-issued', { unit: unitName() }),
        cell: info => {
          const line = info.row.original;
          return (
            <NumberField
              label={t('label.units-issued', { unit: unitName() })}
              hideLabel
              size="small"
              value={line.numberOfPacks * line.packSize}
              min={0}
              max={line.availablePacks * line.packSize}
              disabled={line.barred.length > 0}
              onChange={units =>
                setRowPacks(
                  line.id,
                  units == null ? undefined : units / line.packSize
                )
              }
              onClamped={(entered, applied) =>
                onRowClamped(line, entered, applied)
              }
            />
          );
        },
      },
      {
        c: {
          accessor: line =>
            line.stockLineOnHold || (line.location?.onHold ?? false),
          id: 'onHold',
        },
        header: () => t('label.on-hold'),
        ...getBooleanCell({ display: 'dot', label: t('label.on-hold') }),
      }
    );
    return cols;
  });

  return (
    <Dialog
      open
      size={workingSize() ? 'full' : 'auto'}
      // `full` for CONSISTENCY, not because this one is cramped (James,
      // 2026-08-04): its 9-column table does fit a card, unlike the other five
      // line editors. But a user moving between the shipment, stocktake,
      // internal-order, requisition and prescription editors meets one surface
      // shape rather than two — and "line editors are sheets" is a rule worth
      // more than a per-modal win here. Recorded in the DESIGN_STANDARDS
      // ledger so the next reader doesn't "correct" it back by measuring.
      //
      // widthRem sizes the PRE-PICK state only (it is inert at `full`): a
      // command-palette-shaped card at the standard create-modal width (the
      // CreateStocktake/CreateInternalOrder family), with a body tall enough to
      // OWN the open suggestions list — the search takes initial focus and the
      // combobox opens on focus, so the list is this state's resting face, and
      // without the reserved height it would dangle past the card onto the
      // scrim. The popup itself matches its trigger's width. The reserved
      // height is likewise dropped once the latch flips.
      widthRem={44}
      minBodyHeightRem={28}
      initialFocus={
        isEdit
          ? prefs().editPrescribedQuantity
            ? prescribedQuantityFocus
            : undefined
          : itemSearch
      }
      onClose={props.onClose}
      testId="add-item-modal"
      title={isEdit ? t('heading.edit-line') : t('heading.add-item')}
      actionsLead={
        <Show when={saveError()}>
          <Alert severity="error" testId="prescription-line-error">
            {saveError()}
          </Alert>
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            confirms="cancel"
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Button
            confirms="plain"
            data-testid="dialog-button-ok"
            disabled={!saveEnabled()}
            loading={saving()}
            onClick={() => void onOk()}
          >
            {t('button.ok')}
          </Button>
          {/* Hidden until a valid entry exists; never in edit mode (the
              outbound S4 footer matrix, reused by D53). */}
          <Show when={!isEdit && saveEnabled()}>
            <Button
              // The CONTINUING confirm: while present and enabled, Enter
              // activates it in preference to plain OK (KB-E2, AC-KB23).
              confirms="continuing"
              data-testid="dialog-button-next-and-ok"
              loading={saving()}
              onClick={() => void onOkNext()}
            >
              {t('button.ok-and-next')}
            </Button>
          </Show>
        </>
      }
    >
      {/* The body groups into titled sections — Item / Quantity / Directions
          — the current app's three areas of this editor. Always open (no
          disclosure): the dialog scrolls rather than folding, so nothing a
          dispenser needs is a click away. Each is a top-level group of this
          dialog, so it wears the ruled group heading, at h3 because the
          dialog's own title holds the h2 (rank mirrors structure, never
          size). */}
      <FormSection title={t('label.item')} headingLevel="h3" heading="group">
        <FieldRow label={t('label.item')}>
          <ItemSearch
            label={t('label.item')}
            hideLabel
            storeId={props.storeId}
            focusTarget={itemSearch}
            value={itemId()}
            // Prefer the full item once the grid fetch lands; until then fall
            // back to the row's own label so a re-opened line shows its item
            // name immediately (not a blank locked box).
            selectedItem={(() => {
              const item = itemInfo();
              if (item)
                return { id: item.id, code: item.code, name: item.name };
              return props.initialItem;
            })()}
            excludeItemIds={props.existingItemIds}
            masterListId={props.programId}
            disabled={isEdit}
            onSelect={item => {
              if (!item) return;
              setItemId(item.id);
              // A quantity typed for the previous item must not distribute
              // over this one's grid while its fetch is still in flight.
              cancelAllocate();
              // The prescribed quantity is the first entry point once the
              // item is chosen (.61); the handle lands when the field mounts.
              if (prefs().editPrescribedQuantity)
                prescribedQuantityFocus.focus();
            }}
          />
        </FieldRow>
      </FormSection>

      <Show when={itemId()}>
        <FormSection
          title={t('label.quantity')}
          headingLevel="h3"
          heading="group"
        >
          {/* The quantity fields ride one wrapping row (the header field-
              cluster pattern — equal shares, wrapping intrinsically when the
              row can't hold them): prescribed quantity — when the preference
              shows it — PRECEDES the issue field (.61). */}
          <FormRow class={styles.quantityRow}>
            <Show when={prefs().editPrescribedQuantity}>
              <NumberField
                label={t('label.prescribed-quantity')}
                class={styles.quantityField}
                data-testid="prescribed-quantity-field"
                ref={prescribedQuantityFocus.ref}
                value={lensValue(prescribedQuantity())}
                min={0}
                decimalLimit={0}
                onChange={onPrescribedChange}
              />
            </Show>
            <NumberField
              label={t('label.issue')}
              class={styles.quantityField}
              data-testid="issue-field"
              ref={issueQuantityFocus.ref}
              value={lensValue(issueUnits())}
              min={0}
              decimalLimit={0}
              disabled={gridData.loading}
              endAdornment={showDosesLens() ? undefined : unitName()}
              onChange={onIssueChange}
            />
            <Show when={showDosesLens()}>
              <Select
                label={t('label.unit')}
                class={styles.quantityField}
                value={lens()}
                options={[
                  { value: 'units', label: t('label.units') },
                  { value: 'doses', label: t('label.doses') },
                ]}
                onValueChange={value =>
                  setLens(value === 'doses' ? 'doses' : 'units')
                }
              />
            </Show>
          </FormRow>

          {/* The warning banners sit between the quantity fields and the batch
            list (ui-surface S4 § layout). The shortfall banner (stock-
            allocation § reporting — nothing narrows silently; the
            prescription has no placeholder) carries the current app's own
            copy: "There is a total of X units available. Unable to allocate
            all Y units."… */}
          <Show when={shortfall() > 0}>
            <Alert severity="warning" testId="prescription-shortfall-warning">
              {t(
                dosesMode()
                  ? 'warning.cannot-create-placeholder-doses'
                  : 'warning.cannot-create-placeholder-units',
                {
                  allocatedQuantity: formatNumber(
                    unitsToLens(allocatedUnits(), allocateLens())
                  ),
                  requestedQuantity: formatNumber(
                    unitsToLens(allocatedUnits() + shortfall(), allocateLens())
                  ),
                }
              )}
            </Alert>
          </Show>

          {/* …and the remaining reported categories, stacked one banner each —
            one per skipped category, each its own sentence at info (expired /
            unusable VVM; held stock is hidden, not reported — .59/.60) — the
            split-pack warning (.58), an adjusted manual entry (.19). */}
          <Show when={warnings().length > 0}>
            <div class={styles.warningStack}>
              <For each={warnings()}>
                {message => {
                  const { text, testId, severity } = banner(message);
                  return (
                    <Alert severity={severity} testId={testId}>
                      {text}
                    </Alert>
                  );
                }}
              </For>
            </div>
          </Show>
          <Show
            when={lines.length > 0}
            fallback={
              <Show when={!gridData.loading}>
                <Alert severity="info">
                  {t('messages.no-stock-available')}
                </Alert>
              </Show>
            }
          >
            {/* The batch grid folds behind a Batches disclosure, closed on
              open (OMS-REG-DIS-03.56) — issuing allocates without it; the
              user expands it for batch detail or per-batch entry. While
              closed, the trigger row summarises the drawn batches
              (OMS-REG-DIS-03.57) so the picked batch — usually one — is
              visible without expanding. */}
            <Accordion collapsible variant="card">
              <AccordionItem value="batches">
                <AccordionTrigger
                  // h4: this disclosure sits INSIDE the Quantity section,
                  // whose heading is the h3 — the outline must say child, not
                  // peer of Item / Quantity / Directions.
                  as="h4"
                  // The available total rides the trigger's end (rather than
                  // its own line above the fields) — always visible, no
                  // vertical cost. UNLIKE the batch summary beside it this
                  // follows the allocate-in lens (it's the Issue field's
                  // headroom); the unit name is pluralised so the two agree.
                  // `label.doses` is already plural.
                  end={
                    <>
                      {t('label.available')}: {formatNumber(availableInLens())}{' '}
                      {dosesMode()
                        ? t('label.doses')
                        : getPlural(unitName(), availableInLens())}
                    </>
                  }
                >
                  {t('label.batches')}
                  {/* Real space so the accessible name doesn't concatenate
                    the label into the summary. */}{' '}
                  <BatchSummary />
                </AccordionTrigger>
                <AccordionContent>
                  <DataTable
                    columns={columns()}
                    rows={[...lines]}
                    rowKey={line => line.id}
                    rowState={line =>
                      line.barred.length > 0 ? 'disabled' : undefined
                    }
                    loading={gridData.loading}
                    showFullScreen={false}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Show>
        </FormSection>

        {/* Directions (AC-R1–R3): unavailable until something is allocated —
            the section keeps its heading either way, so the block never
            disappears without saying why. */}
        <FormSection
          title={t('label.directions')}
          headingLevel="h3"
          heading="group"
        >
          <Show
            when={!directionsDisabled()}
            fallback={
              <Text variant="bodySmall">
                {t('messages.cannot-add-directions')}
              </Text>
            }
          >
            {/* The abbreviation entry and the item-default-directions select
              share one row (the current app's layout): the entry stays
              compact — an abbreviation is a few characters — and the select
              takes the remaining width, the pair wrapping intrinsically when
              the row can't hold both. The row's own label is the
              abbreviation's; the select names itself in its trigger. */}
            <FieldRow label={t('label.abbreviation')}>
              <FormRow class={styles.directionsEntryRow}>
                <TextField
                  label={t('label.abbreviation')}
                  hideLabel
                  width="compact"
                  class={styles.abbreviationField}
                  data-testid="abbreviation-field"
                  value={abbrevEntry()}
                  onInput={e => setAbbrevEntry(e.currentTarget.value)}
                  onBlur={applyAbbreviation}
                  onKeyDown={e => {
                    if (e.key === 'Enter') applyAbbreviation();
                  }}
                />
                <Select
                  label={t('placeholder.item-directions')}
                  hideLabel
                  width="full"
                  value=""
                  options={(itemInfo()?.itemDirections ?? [])
                    .slice()
                    .sort((a, b) => a.priority - b.priority)
                    .map(direction => ({
                      value: direction.id,
                      label: direction.directions,
                    }))}
                  // The trigger carries its own name, since the row's visible
                  // label belongs to the abbreviation entry beside it.
                  placeholder={
                    (itemInfo()?.itemDirections?.length ?? 0) === 0
                      ? t('message.no-directions')
                      : t('placeholder.item-directions')
                  }
                  onValueChange={id => {
                    const chosen = itemInfo()?.itemDirections?.find(
                      direction => direction.id === id
                    );
                    if (!chosen) return;
                    setNote(
                      expandAbbreviations(
                        chosen.directions,
                        abbrevData.latest ?? []
                      )
                    );
                    setDirty(true);
                  }}
                />
              </FormRow>
            </FieldRow>
            <FieldRow label={t('label.directions')}>
              <TextArea
                label={t('label.directions')}
                hideLabel
                width="full"
                rows={2}
                value={note()}
                onInput={e => {
                  setNote(e.currentTarget.value);
                  setDirty(true);
                }}
              />
            </FieldRow>
          </Show>
        </FormSection>
      </Show>
    </Dialog>
  );
};

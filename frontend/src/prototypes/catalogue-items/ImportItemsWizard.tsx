import { createMemo, createSignal, For, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Alert } from '../../ui/elements/feedback/Alert';
import { StatusChip } from '../../ui/elements/feedback/StatusChip';
import { Button } from '../../ui/elements/buttons/Button';
import { CheckboxButton } from '../../ui/elements/buttons/CheckboxButton';
import { TextField } from '../../ui/elements/inputs/TextField';
import { UploadZone } from '../../ui/elements/inputs/UploadZone';
import { RadioGroup } from '../../ui/elements/inputs/RadioGroup';
import { Select } from '../../ui/elements/selectors/Select';
import {
  DataTable,
  type Column,
} from '../../ui/elements/table/DataTable';
import { ArrowRightIcon, CheckIcon, DownloadIcon, FileIcon } from '../../ui/icons';
import { remToPx } from '../../ui/utils/rem';
import styles from './catalogueItems.module.css';

/*
 * Import item list — a four-step wizard.
 *
 * A PAGE, not a Dialog. Import is not a short focused task: it is multi-step,
 * error-heavy, long-running, and it ends in a report the user has to act on.
 * Step 3 is a validation table whose erroring cells are repaired IN PLACE,
 * which wants the full page width and its own scroll region.
 *
 * The steps are deliberately ordered so the destructive decision (what happens
 * to items that already exist) is made BEFORE upload, and nothing is written
 * until the last step's explicit confirm.
 *
 * PROTOTYPE — no file is parsed and nothing is written. Every count is fixed
 * demo data chosen to exercise each outcome (new / update / warning / error /
 * skipped).
 */

const TOTAL_ROWS = 412;
const IMPORTABLE = 395;
const ERROR_ROWS = 14;

/* ── Step 2: column mapping ──────────────────────────────────────────── */

/** The item fields the importer can write. Empty value = don't import. */
const FIELD_OPTIONS = [
  { value: '', label: "Don't import" },
  ...[
    'Item code',
    'Item name',
    'Type',
    'Unit',
    'Default pack size',
    'Strength',
    'VEN category',
    'Category',
    'ATC code',
    'mSupply universal code',
    'Is vaccine',
    'Doses per unit',
    'Master lists',
  ].map(f => ({ value: f, label: f })),
];

interface MappingRow {
  /** Column heading as it appears in the uploaded file. */
  source: string;
  /** First value in that column — the confidence check that it mapped right. */
  sample: string;
  /** The item field it feeds; empty means ignored. */
  target: string;
  /** A required field left unmapped blocks the step. */
  required: boolean;
}

const INITIAL_MAPPING: MappingRow[] = [
  { source: 'item_code', sample: 'AC0034', target: 'Item code', required: true },
  {
    source: 'item_name',
    sample: 'Acetazolamide 250mg tablets',
    target: 'Item name',
    required: true,
  },
  // The deliberate gap: required, and auto-matching missed it.
  { source: 'unit', sample: '', target: '', required: true },
  {
    source: 'pack_size',
    sample: '100',
    target: 'Default pack size',
    required: false,
  },
  { source: 'strength', sample: '250mg', target: 'Strength', required: false },
  { source: 'ven', sample: 'E', target: 'VEN category', required: false },
  {
    source: 'category',
    sample: 'Diuretics',
    target: 'Category',
    required: false,
  },
  { source: 'atc', sample: 'S01EC01', target: 'ATC code', required: false },
  {
    source: 'is_vaccine',
    sample: 'FALSE',
    target: 'Is vaccine',
    required: false,
  },
  {
    source: 'master_list',
    sample: 'National EML 2026',
    target: 'Master lists',
    required: false,
  },
  // Unmapped and not required — ignored, which is not an error.
  { source: 'legacy_ref', sample: 'MOH-4471', target: '', required: false },
];

/* ── Step 3: review rows ─────────────────────────────────────────────── */

type Outcome = 'new' | 'update' | 'warning' | 'error' | 'skipped';

interface ReviewRow {
  /** 1-based row number in the uploaded file, so it can be found there. */
  line: number;
  outcome: Outcome;
  code: string;
  name: string;
  unit: string;
  packSize: string;
  ven: string;
  /** Why this row is flagged — empty for a clean row. */
  note: string;
  /** Which cell is at fault, so the review can offer an input in place. */
  badField?: 'code' | 'unit' | 'packSize';
}

const REVIEW_ROWS: ReviewRow[] = [
  {
    line: 3,
    outcome: 'new',
    code: 'AC0034',
    name: 'Acetazolamide 250mg tablets',
    unit: 'Tablet',
    packSize: '100',
    ven: 'E',
    note: '',
  },
  {
    line: 4,
    outcome: 'error',
    code: 'AM0210',
    name: 'Amoxicillin 250mg capsules',
    unit: '',
    packSize: '1000',
    ven: 'V',
    note: 'Unit "Caps" is not a known unit',
    badField: 'unit',
  },
  {
    line: 5,
    outcome: 'new',
    code: 'AM0211',
    name: 'Amoxicillin 125mg/5mL suspension',
    unit: 'Bottle',
    packSize: '1',
    ven: 'V',
    note: '',
  },
  {
    line: 6,
    outcome: 'warning',
    code: 'BC0001',
    name: 'BCG vaccine 20 dose',
    unit: 'Vial',
    packSize: '10',
    ven: 'V',
    note: 'Marked as a vaccine but no doses per unit, so it will import as 1',
  },
  {
    line: 7,
    outcome: 'update',
    code: 'PA0555',
    name: 'Paracetamol 500mg tablets',
    unit: 'Tablet',
    packSize: '1000',
    ven: 'E',
    note: 'Default pack size 500 → 1000',
  },
  {
    line: 8,
    outcome: 'error',
    code: '',
    name: 'Ceftriaxone 1g injection',
    unit: 'Vial',
    packSize: '10',
    ven: 'V',
    note: 'Item code is empty',
    badField: 'code',
  },
  {
    line: 9,
    outcome: 'error',
    code: 'GL0009',
    name: 'Gloves, examination, latex, medium',
    unit: 'Each',
    packSize: 'not a number',
    ven: 'N',
    note: 'Default pack size must be a whole number',
    badField: 'packSize',
  },
  {
    line: 10,
    outcome: 'skipped',
    code: 'OR0007',
    name: 'Oral rehydration salts sachet',
    unit: 'Each',
    packSize: '1',
    ven: 'V',
    note: 'Already exists and is unchanged',
  },
  {
    line: 11,
    outcome: 'warning',
    code: 'ME0303',
    name: 'Metformin 500mg tablets',
    unit: 'Tablet',
    packSize: '100',
    ven: 'E',
    note: 'Master list "NCD Kit" not found, so it will import without it',
  },
  {
    line: 12,
    outcome: 'new',
    code: 'TE0012',
    name: 'Tetanus toxoid vaccine 10 dose',
    unit: 'Vial',
    packSize: '10',
    ven: 'V',
    note: '',
  },
];

/*
 * Outcome → the StatusChip tone. StatusChip takes a colour VALUE (always a
 * token — colour literals live only in tokens.css). These are import outcomes
 * rather than document statuses, so they read from the semantic severity
 * tokens instead of the --status-* lifecycle set. The chip's LABEL carries the
 * meaning; the colour only reinforces it (never meaning by colour alone).
 */
const OUTCOME_CHIP: Record<Outcome, { label: string; colour: string }> = {
  new: { label: 'New', colour: 'var(--info-main)' },
  update: { label: 'Update', colour: 'var(--success-main)' },
  warning: { label: 'Warning', colour: 'var(--warning-main)' },
  error: { label: 'Error', colour: 'var(--error-main)' },
  skipped: { label: 'Skipped', colour: 'var(--gray-main)' },
};

const FILTERS: { key: Outcome | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'error', label: 'Errors' },
  { key: 'warning', label: 'Warnings' },
  { key: 'new', label: 'New' },
  { key: 'update', label: 'Updates' },
  { key: 'skipped', label: 'Skipped' },
];

/* ── Step 1: what happens to rows that already exist ────────────────── */

const MODE_OPTIONS = [
  {
    value: 'add',
    label: 'Add new items only',
    description:
      'Existing items are listed as skipped and left untouched. Safest, and the right choice for a first load.',
  },
  {
    value: 'upsert',
    label: 'Add new and update existing',
    description:
      'Only the columns present in your file are overwritten. Anything you leave out keeps its current value.',
  },
  {
    value: 'update',
    label: 'Update existing only',
    description:
      'Rows with no match are reported as errors instead of creating items. Use this to bulk-edit a list you exported.',
  },
];

export interface ImportItemsWizardProps {
  /** Leaves the wizard — back to the items list. */
  onExit: () => void;
  facilityCount: number;
}

export const ImportItemsWizard = (props: ImportItemsWizardProps) => {
  const [step, setStep] = createSignal(1);
  const [hasFile, setHasFile] = createSignal(false);
  const [mode, setMode] = createSignal('add');
  const [matchKey, setMatchKey] = createSignal('code');
  const [onError, setOnError] = createSignal('skip');
  const [mapping, setMapping] = createStore(INITIAL_MAPPING);
  const [outcomeFilter, setOutcomeFilter] = createSignal<Outcome | 'all'>('all');
  const [done, setDone] = createSignal(false);

  const unmappedRequired = createMemo(
    () => mapping.filter(m => m.required && m.target === '').length
  );

  const counts = createMemo(() => {
    const by = (o: Outcome) => REVIEW_ROWS.filter(r => r.outcome === o).length;
    return {
      all: TOTAL_ROWS,
      new: 368,
      update: 27,
      warning: 9,
      error: ERROR_ROWS,
      skipped: 3,
      // The demo table is a 10-row sample of the 412; its own tallies drive
      // the chip filters so the visible table and its chips can't disagree.
      sample: {
        new: by('new'),
        update: by('update'),
        warning: by('warning'),
        error: by('error'),
        skipped: by('skipped'),
      },
    };
  });

  const visibleRows = () => {
    const f = outcomeFilter();
    return f === 'all'
      ? REVIEW_ROWS
      : REVIEW_ROWS.filter(r => r.outcome === f);
  };

  /** Can the current step be left? */
  const canContinue = () => {
    if (step() === 1) return hasFile();
    if (step() === 2) return unmappedRequired() === 0;
    return true;
  };

  const footerNote = () => {
    if (step() === 1)
      return hasFile()
        ? 'essential-medicines-2026-q3.csv · 412 rows'
        : 'Choose a file to continue';
    if (step() === 2)
      return unmappedRequired() === 0
        ? 'All required fields mapped'
        : `${unmappedRequired()} required field still unmapped`;
    if (step() === 3)
      return `${IMPORTABLE} of ${TOTAL_ROWS} rows are ready to import · ${ERROR_ROWS} have errors`;
    return '';
  };

  const STEPS = [
    'Choose file',
    'Match columns',
    'Review & fix',
    'Done',
  ] as const;

  /*
   * The review table's columns. An erroring cell becomes a TextField in place
   * so the row can be repaired without leaving the review — the whole reason
   * this step is a page and not a summary.
   */
  const reviewColumns = (): Column<ReviewRow, never, never>[] => [
    {
      c: { key: 'line' },
      header: () => 'Row',
      meta: { align: 'right' },
    },
    {
      c: { id: 'outcome' },
      header: () => 'Result',
      cell: info => {
        const chip = OUTCOME_CHIP[info.row.original.outcome];
        return <StatusChip label={chip.label} colour={chip.colour} />;
      },
    },
    {
      c: { key: 'code' },
      header: () => 'Code',
      cell: info =>
        info.row.original.badField === 'code' ? (
          <TextField
            label="Code"
            hideLabel
            size="small"
            error=" "
            value={info.row.original.code}
            placeholder="Required"
          />
        ) : (
          info.row.original.code
        ),
    },
    // Capped so one long item name can't crowd out its neighbours.
    {
      c: { key: 'name' },
      header: () => 'Name',
      maxSize: remToPx(19),
    },
    /*
     * Note sits HERE — after the identity, before the editable cells — not in
     * last place. As the final column it was pushed past the table's horizontal
     * scroll at laptop width, hiding the one cell that says how to fix the row.
     * Mid-table it also reads in the right order: which row, what happened,
     * which item, why, then the fields to repair. (There is no VEN column for
     * the same reason — it is never implicated in a failure.)
     */
    {
      c: { key: 'note' },
      header: () => 'Note',
      size: remToPx(17),
    },
    {
      c: { key: 'unit' },
      header: () => 'Unit',
      cell: info =>
        info.row.original.badField === 'unit' ? (
          <TextField
            label="Unit"
            hideLabel
            size="small"
            error=" "
            value={info.row.original.unit}
            placeholder="Required"
          />
        ) : (
          info.row.original.unit
        ),
    },
    {
      c: { key: 'packSize' },
      header: () => 'Default pack',
      cell: info =>
        info.row.original.badField === 'packSize' ? (
          <TextField
            label="Default pack"
            hideLabel
            size="small"
            error=" "
            value={info.row.original.packSize}
          />
        ) : (
          info.row.original.packSize
        ),
    },
  ];

  const stepper = (
    <nav class={styles.stepper} aria-label="Import steps">
      <For each={STEPS}>
        {(label, index) => {
          const n = () => index() + 1;
          const isDone = () => n() < step();
          const isActive = () => n() === step();
          return (
            <>
              <Show when={index() > 0}>
                <span
                  class={styles.stepConnector}
                  classList={{ [styles.stepConnectorDone ?? '']: isDone() }}
                  aria-hidden="true"
                />
              </Show>
              <button
                type="button"
                class={styles.step}
                classList={{
                  [styles.stepDone ?? '']: isDone(),
                  [styles.stepActive ?? '']: isActive(),
                }}
                // Steps already passed are navigable; ones ahead are not (the
                // work to reach them hasn't happened). Once the import has
                // run, the whole stepper is inert.
                disabled={n() >= step() || done()}
                aria-current={isActive() ? 'step' : undefined}
                onClick={() => setStep(n())}
              >
                <span class={styles.stepMarker}>
                  <Show when={isDone()} fallback={n()}>
                    <CheckIcon />
                  </Show>
                </span>
                <span class={styles.stepLabel}>{label}</span>
              </button>
            </>
          );
        }}
      </For>
    </nav>
  );

  return (
    <>
      {stepper}

      <div class={styles.wizardBody}>
        {/* ── Step 1 ───────────────────────────────────────────────── */}
        <Show when={step() === 1}>
          <div class={styles.narrowInner}>
            <section class={styles.sheet}>
              <h3 class={styles.sheetTitle}>1 · Choose a file</h3>
              <p class={styles.sheetHint}>
                One row per item, with column headings in the first row. If you
                exported this list from Items, that file already has the right
                columns.
              </p>
              <Show
                when={hasFile()}
                fallback={
                  <UploadZone
                    accept=".csv,.xlsx"
                    multiple={false}
                    onFiles={() => setHasFile(true)}
                  />
                }
              >
                <div class={styles.fileRow}>
                  <span class={styles.fileRowIcon} aria-hidden="true">
                    <FileIcon />
                  </span>
                  <div class={styles.fileRowBody}>
                    <div class={styles.fileRowName}>
                      essential-medicines-2026-q3.csv
                    </div>
                    <div class={styles.fileRowMeta}>
                      412 rows · 11 columns · 86 KB
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => setHasFile(false)}>
                    Replace
                  </Button>
                </div>
              </Show>
              <p class={styles.sheetHint} style={{ 'margin-block-end': '0' }}>
                <Button variant="ghost" icon={<DownloadIcon />}>
                  Download the import template
                </Button>
              </p>
            </section>

            <section class={styles.sheet}>
              <h3 class={styles.sheetTitle}>
                What should happen to rows that already exist?
              </h3>
              <p class={styles.sheetHint}>
                This is the setting that causes the most accidental damage, so
                it is a decision made before upload, never a silent default.
              </p>
              <RadioGroup
                options={MODE_OPTIONS}
                value={mode()}
                onChange={setMode}
              />
              <div style={{ 'margin-block-start': 'var(--space-4)' }}>
                <Select
                  label="Match existing items on"
                  options={[
                    { value: 'code', label: 'Item code' },
                    { value: 'universal', label: 'mSupply universal code' },
                    {
                      value: 'both',
                      label: 'Item code, then universal code',
                    },
                  ]}
                  value={matchKey()}
                  onValueChange={setMatchKey}
                />
              </div>
              <div style={{ 'margin-block-start': 'var(--space-3)' }}>
                <Select
                  label="If a row has an error"
                  options={[
                    {
                      value: 'skip',
                      label: 'Import the valid rows, skip the rest',
                    },
                    { value: 'stop', label: 'Stop and import nothing' },
                  ]}
                  value={onError()}
                  onValueChange={setOnError}
                />
              </div>
            </section>
          </div>
        </Show>

        {/* ── Step 2 ───────────────────────────────────────────────── */}
        <Show when={step() === 2}>
          <div class={styles.wideInner}>
            <section class={styles.sheet}>
              <h3 class={styles.sheetTitle}>
                2 · Match your columns to item fields
              </h3>
              <p class={styles.sheetHint}>
                Ten of your eleven columns matched automatically. Unmapped
                columns are ignored, which is not an error.
              </p>

              <Show when={unmappedRequired() > 0}>
                <div style={{ 'margin-block-end': 'var(--space-4)' }}>
                  <Alert severity="warning">
                    <b>Unit</b> is required for stock items and is not matched
                    yet. All {TOTAL_ROWS} rows will fail until you map it.
                  </Alert>
                </div>
              </Show>

              <div class={styles.mapGrid}>
                <span class={styles.mapHeading}>Column in your file</span>
                <span class={styles.mapHeading}>First value</span>
                <span class={styles.mapHeading} />
                <span class={styles.mapHeading}>Item field</span>
                <span class={styles.mapHeading}>Status</span>

                <For each={mapping}>
                  {(row, index) => (
                    <>
                      <span class={styles.mapSource}>
                        {row.source}
                        <Show when={row.required}>
                          <small class={styles.mapSourceRequired}>
                            Required field
                          </small>
                        </Show>
                      </span>
                      <span class={styles.mapSample}>
                        {row.sample || 'empty'}
                      </span>
                      <span class={styles.mapArrow} aria-hidden="true">
                        <ArrowRightIcon />
                      </span>
                      <Select
                        label={`Item field for ${row.source}`}
                        hideLabel
                        size="small"
                        options={FIELD_OPTIONS}
                        value={row.target}
                        onValueChange={value =>
                          setMapping(index(), 'target', value)
                        }
                      />
                      <span>
                        <Show
                          when={row.target !== ''}
                          fallback={
                            <StatusChip
                              label={row.required ? 'Required' : 'Ignored'}
                              colour={
                                row.required
                                  ? OUTCOME_CHIP.error.colour
                                  : OUTCOME_CHIP.skipped.colour
                              }
                            />
                          }
                        >
                          <StatusChip
                            label="Matched"
                            colour={OUTCOME_CHIP.update.colour}
                          />
                        </Show>
                      </span>
                    </>
                  )}
                </For>
              </div>
            </section>
          </div>
        </Show>

        {/* ── Step 3 ───────────────────────────────────────────────── */}
        <Show when={step() === 3}>
          <div class={styles.wideInner}>
            <div class={styles.countTiles}>
              <div class={`${styles.countTile} ${styles.countTileNew}`}>
                <div class={styles.countTileLabel}>New items</div>
                <div class={styles.countTileValue}>{counts().new}</div>
              </div>
              <div class={`${styles.countTile} ${styles.countTileUpdate}`}>
                <div class={styles.countTileLabel}>Updates</div>
                <div class={styles.countTileValue}>{counts().update}</div>
              </div>
              <div class={`${styles.countTile} ${styles.countTileWarning}`}>
                <div class={styles.countTileLabel}>Warnings</div>
                <div class={styles.countTileValue}>{counts().warning}</div>
              </div>
              <div class={`${styles.countTile} ${styles.countTileError}`}>
                <div class={styles.countTileLabel}>Errors</div>
                <div class={styles.countTileValue}>{counts().error}</div>
              </div>
              <div class={styles.countTile}>
                <div class={styles.countTileLabel}>Skipped</div>
                <div class={styles.countTileValue}>{counts().skipped}</div>
              </div>
            </div>

            <div style={{ 'margin-block-end': 'var(--space-4)' }}>
              <Alert severity="warning">
                <b>{ERROR_ROWS} rows cannot be imported yet.</b> Fix them below,
                or continue and import the other {IMPORTABLE}. The failed rows
                stay downloadable, so you can correct them in your file and
                re-import.
              </Alert>
            </div>

            <div class={styles.chipBar}>
              <For each={FILTERS}>
                {f => {
                  const n = () =>
                    f.key === 'all'
                      ? REVIEW_ROWS.length
                      : counts().sample[f.key];
                  return (
                    <CheckboxButton
                      checked={outcomeFilter() === f.key}
                      onChange={() => setOutcomeFilter(f.key)}
                    >
                      {f.label} <span class={styles.chipCount}>{n()}</span>
                    </CheckboxButton>
                  );
                }}
              </For>
              <span style={{ 'margin-inline-start': 'auto' }}>
                <Button variant="secondary" icon={<DownloadIcon />}>
                  Download error rows
                </Button>
              </span>
            </div>

            <DataTable
              columns={reviewColumns()}
              rows={visibleRows()}
              rowKey={r => String(r.line)}
              // The outcome drives the row's own marking, so a failing row
              // reads at a glance and not only from its chip.
              rowState={r => (r.outcome === 'skipped' ? 'disabled' : undefined)}
              rowTint={r => (r.outcome === 'error' ? 'error' : undefined)}
              rowAccent={r => (r.outcome === 'error' ? 'error' : undefined)}
              emptyMessage="No rows with that result."
            />
          </div>
        </Show>

        {/* ── Step 4 ───────────────────────────────────────────────── */}
        <Show when={step() === 4}>
          <div class={styles.narrowInner}>
            <section class={styles.sheet}>
              <div class={styles.result}>
                <span class={styles.resultIcon} aria-hidden="true">
                  <CheckIcon />
                </span>
                <h3 class={styles.resultTitle}>
                  {IMPORTABLE} items imported
                </h3>
                <p class={styles.resultDetail}>
                  They are in the catalogue now and will reach all{' '}
                  {props.facilityCount} facilities at their next sync.
                </p>

                <div class={styles.resultLines}>
                  <div class={styles.resultLine}>
                    <StatusChip
                      label={OUTCOME_CHIP.new.label}
                      colour={OUTCOME_CHIP.new.colour}
                    />
                    <span>Items created</span>
                    <span class={styles.resultLineValue}>{counts().new}</span>
                  </div>
                  <div class={styles.resultLine}>
                    <StatusChip
                      label="Updated"
                      colour={OUTCOME_CHIP.update.colour}
                    />
                    <span>Items changed</span>
                    <span class={styles.resultLineValue}>
                      {counts().update}
                    </span>
                  </div>
                  <div class={styles.resultLine}>
                    <StatusChip
                      label={OUTCOME_CHIP.skipped.label}
                      colour={OUTCOME_CHIP.skipped.colour}
                    />
                    <span>Already up to date</span>
                    <span class={styles.resultLineValue}>
                      {counts().skipped}
                    </span>
                  </div>
                  <div class={styles.resultLine}>
                    <StatusChip
                      label="Failed"
                      colour={OUTCOME_CHIP.error.colour}
                    />
                    <span>Not imported</span>
                    <span class={styles.resultLineValue}>{ERROR_ROWS}</span>
                  </div>
                </div>

                <div class={styles.resultActions}>
                  <Button onClick={props.onExit}>
                    View the {IMPORTABLE} imported items
                  </Button>
                  <Button variant="secondary" icon={<DownloadIcon />}>
                    Download {ERROR_ROWS} failed rows
                  </Button>
                  <Button variant="secondary">Open import log</Button>
                </div>
              </div>
            </section>
          </div>
        </Show>
      </div>

      {/* Hidden on step 4: once the write has happened there is nothing left
          to cancel, and the result panel carries its own next actions. */}
      <Show when={step() < 4}>
        <div class={styles.wizardFooter}>
          <Button
            variant="secondary"
            disabled={step() === 1}
            onClick={() => setStep(s => Math.max(1, s - 1))}
          >
            Back
          </Button>
          <span class={styles.wizardFooterNote}>{footerNote()}</span>
          <span class={styles.wizardFooterSpacer} />
          <Button variant="secondary" onClick={props.onExit}>
            Cancel
          </Button>
          {/* The primary action NAMES THE NUMBER on the review step. The file
              had 412 rows; importing 395 while believing you imported 412 is
              the failure this label exists to prevent. */}
          <Button
            disabled={!canContinue()}
            onClick={() => {
              if (step() === 3) {
                setDone(true);
                setStep(4);
              } else setStep(s => s + 1);
            }}
          >
            {step() === 3 ? `Import ${IMPORTABLE} items` : 'Continue'}
          </Button>
        </div>
      </Show>
    </>
  );
};

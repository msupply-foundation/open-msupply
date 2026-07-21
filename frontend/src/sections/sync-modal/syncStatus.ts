// Sync-modal status derivations — pure functions over the raw
// SyncStatusFragment. The substrate exposes the raw fragment; deriving what a
// surface DISPLAYS (the phase-visibility matrix, the status-line precedence,
// the duration decomposition, the indicator badge) is this vertical's job
// (spec/sync-modal/contract.md § Substrate). No framework/UI here, so every
// rule below is unit-testable (spec/sync-modal/acceptance.md).

import type { SyncStatusFragment } from '../../api/initialisation.generated';
import type { LocaleKey } from '../../intl';

type V7Status = Extract<
  SyncStatusFragment,
  { __typename: 'FullSyncStatusV7Node' }
>;
type V5V6Status = Extract<
  SyncStatusFragment,
  { __typename: 'FullSyncStatusV5V6Node' }
>;

// The error-variant unions straight from the generated fragment — no widening
// to string (kdd/type-safety); a new schema variant becomes a compile error in
// the exhaustive map (syncErrors.ts) rather than a silent miss.
export type SyncErrorVariant =
  | NonNullable<V7Status['error']>['variantV7']
  | NonNullable<V5V6Status['error']>['variant'];

// What a phase does — the UI picks its marker icon by intent
// (spec/sync-modal/ui-surface.md § Layout).
export type SyncStepKind = 'push' | 'wait' | 'pull' | 'integrate' | 'prepare';

export type SyncStep = {
  // i18n key; the modal resolves it with t() at render, so a language switch
  // re-translates the phase list.
  label: LocaleKey;
  kind: SyncStepKind;
  started: boolean;
  finished: boolean;
  done?: number;
  total?: number;
};

export type SyncError = { variant: SyncErrorVariant; fullError: string };

// A backfill description a run can be linked to — a central-initiated re-send
// of a store transfer's data or a whole table (spec/sync-modal/rules.md §
// backfill). The modal lists these under "Special syncs"; ordinary runs carry
// none. V7 only (the wire's `linkedDescriptions`); the label is resolved with
// its interpolation at render, so a language switch re-translates it.
export type SyncBackfill =
  | { kind: 'all-store-data'; storeName: string }
  | { kind: 'table-name'; tableName: string };

// The two client-side axes of the phase-visibility matrix; the generation axis
// is the status union branch.
export type SyncSurfaceContext = {
  // The sync modal (true) vs the initialisation screen (false).
  operational: boolean;
  // The server-role axis (src/api/serverInfo § isCentralServer).
  centralServer: boolean;
};

export type SyncOverview = {
  isSyncing: boolean;
  error: SyncError | undefined;
  steps: SyncStep[];
  // Idle, error-free, and a successful run exists — the only state in which the
  // last-successful notice shows.
  succeeded: boolean;
  // Staleness thresholds in DAYS since the last successful sync — consumed by
  // the chrome indicator's badge colouring (spec/chrome § sync indicator).
  warningThresholdDays: number;
  errorThresholdDays: number;
  // The most recent successful run, tracked independently of the latest run
  // (spec/sync-modal/rules.md: a failed run never erases it).
  lastSuccessful: { started: string; finished: string } | undefined;
  // Backfill descriptions for the "Special syncs" list — empty for an ordinary
  // run, and always empty on the legacy generation (V7 only).
  backfills: SyncBackfill[];
};

type ProgressPart =
  | {
      started: string;
      finished?: string | null;
      done?: number | null;
      total?: number | null;
    }
  | null
  | undefined;

// AC-S2: a count only where there is something to count — a phase with total
// zero or unreported (e.g. a push with no records) shows none; a known total
// with no done yet reads as 0 / N.
const step = (
  label: LocaleKey,
  kind: SyncStepKind,
  part: ProgressPart
): SyncStep => ({
  label,
  kind,
  started: part != null,
  finished: part?.finished != null,
  done: part?.total ? (part.done ?? 0) : undefined,
  total: part?.total || undefined,
});

// spec/sync-modal/rules.md § Phase visibility — the displayed phases, in
// execution order, per generation (union branch) × surface (operational) ×
// server role (centralServer). Initialisation never pushes and owns the
// prepare-initial phase; a central server has no v6 legs.
export const toSyncOverview = (
  status: SyncStatusFragment | null | undefined,
  context: SyncSurfaceContext
): SyncOverview | undefined => {
  if (status == null) return undefined;
  const { operational, centralServer } = context;

  let steps: SyncStep[];
  let error: SyncError | undefined;
  let backfills: SyncBackfill[] = [];

  if (status.__typename === 'FullSyncStatusV7Node') {
    steps = [
      ...(operational
        ? [
            step('sync-status.push', 'push', status.push),
            step(
              'sync-status.waiting-for-integration',
              'wait',
              status.waitingForIntegration
            ),
          ]
        : []),
      step('sync-status.pull', 'pull', status.pull),
      step('sync-status.integrate', 'integrate', status.integration),
    ];
    error =
      status.error == null
        ? undefined
        : {
            variant: status.error.variantV7,
            fullError: status.error.fullError,
          };
    backfills = status.linkedDescriptions.map(d =>
      d.__typename === 'AllStoreDataDescription'
        ? { kind: 'all-store-data', storeName: d.storeName }
        : { kind: 'table-name', tableName: d.tableName }
    );
  } else {
    steps = [
      ...(!operational
        ? [step('sync-status.prepare', 'prepare', status.prepareInitial)]
        : []),
      ...(operational && !centralServer
        ? [step('sync-status.push-v6', 'push', status.pushV6)]
        : []),
      ...(operational ? [step('sync-status.push', 'push', status.push)] : []),
      step('sync-status.pull-central', 'pull', status.pullCentral),
      step('sync-status.pull-remote', 'pull', status.pullRemote),
      ...(!centralServer
        ? [step('sync-status.pull-v6', 'pull', status.pullV6)]
        : []),
      step('sync-status.integrate', 'integrate', status.integration),
    ];
    error =
      status.error == null
        ? undefined
        : { variant: status.error.variant, fullError: status.error.fullError };
  }

  const lss = status.lastSuccessfulSync;
  const lastSuccessful =
    lss?.finished != null
      ? { started: lss.started, finished: lss.finished }
      : undefined;

  return {
    isSyncing: status.isSyncing,
    error,
    steps,
    succeeded: !status.isSyncing && error == null && lastSuccessful != null,
    warningThresholdDays: status.warningThreshold,
    errorThresholdDays: status.errorThreshold,
    lastSuccessful,
    backfills,
  };
};

// AC-S1: one status line by precedence — syncing, then a non-zero
// records-to-push count, then nothing-to-push. 'waiting' covers the first open
// before any status has arrived.
export type StatusLineKind =
  'waiting' | 'syncing' | 'records-to-push' | 'nothing-to-push';

export const statusLineKind = (
  overview: SyncOverview | undefined,
  pushQueueCount: number | undefined
): StatusLineKind => {
  if (!overview) return 'waiting';
  if (overview.isSyncing) return 'syncing';
  if (pushQueueCount != null && pushQueueCount > 0) return 'records-to-push';
  return 'nothing-to-push';
};

// AC-S3: the last-successful duration lists its non-zero hours and minutes
// followed by EXACT seconds — never approximated. This is the decomposition;
// the notice composes the localised unit strings.
export const syncDurationParts = (
  started: string,
  finished: string
): { hours: number; minutes: number; seconds: number } => {
  const totalSeconds = Math.max(
    0,
    Math.floor(
      (new Date(finished).getTime() - new Date(started).getTime()) / 1000
    )
  );
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
};

export type DurationUnit = { key: LocaleKey; count: number };

// The ordered unit list the notice composes: hours and minutes only when
// non-zero, seconds ALWAYS present (AC-S3). Each unit is a plural key + count;
// the notice resolves them with tPlural at render.
export const durationUnits = (parts: {
  hours: number;
  minutes: number;
  seconds: number;
}): DurationUnit[] => {
  const units: DurationUnit[] = [];
  if (parts.hours > 0) units.push({ key: 'label.hours', count: parts.hours });
  if (parts.minutes > 0)
    units.push({ key: 'label.minutes', count: parts.minutes });
  units.push({ key: 'label.seconds', count: parts.seconds });
  return units;
};

// AC-T1: the Sync-now busy state holds from the click, through the gap before
// the run's first status frame — a STALE pre-run tick carries the SAME
// signature and must not release it — until the run ends. A run has ended once
// a NOT-syncing status arrives whose signature differs from the one captured at
// the click: a new run always carries a fresh `summary.started`, so this
// releases even when the run errors before any in-progress frame is observed,
// and even when a retry re-fails with an identical error. Keyed on the run
// status only — the push-queue count is a separate signal and cannot release
// it.
//
// The signature is a small, STABLE subset of the run — its start stamp, its
// terminal error, and the last-successful stamp — deliberately NOT the whole
// fragment: it must not churn on the per-phase done/total that ticks through a
// run, yet two frames of the SAME run (a stale pre-run redelivery) must still
// hash identically so the busy state holds.
export const syncRunSignature = (
  status: SyncStatusFragment | null | undefined
): string => {
  if (status == null) return '';
  const variant = status.error
    ? status.__typename === 'FullSyncStatusV7Node'
      ? status.error.variantV7
      : status.error.variant
    : '';
  return [
    status.summary.started,
    variant,
    status.error?.fullError ?? '',
    status.lastSuccessfulSync?.finished ?? '',
  ].join(' ');
};

export type TriggerState = { active: boolean; sig: string };

export const IDLE_TRIGGER: TriggerState = { active: false, sig: '' };

// Arm the busy state at the click, snapshotting the current run's signature.
export const armTrigger = (
  status: SyncStatusFragment | null | undefined
): TriggerState => ({ active: true, sig: syncRunSignature(status) });

export const advanceTriggerState = (
  prev: TriggerState,
  status: SyncStatusFragment | null | undefined
): TriggerState => {
  if (!prev.active) return prev;
  if (status?.isSyncing) return prev; // run in progress → hold
  return syncRunSignature(status) !== prev.sig ? IDLE_TRIGGER : prev;
};

// spec/chrome § sync indicator — the badge model (framework-free; the factory
// in syncIndicator.ts formats it into the chrome NavBadge). A non-connection
// latest-run error flags immediately; otherwise the records-to-push count once
// it reaches the display threshold, coloured by days since the last success.
export type SyncBadgeModel =
  | { kind: 'alert' }
  | { kind: 'count'; count: number; tone: 'neutral' | 'warning' | 'error' }
  | undefined;

// Connection errors are deliberately tolerated (transient outages between
// scheduled runs are normal); they surface only through staleness colouring,
// never the alert glyph.
const CONNECTION_VARIANT: SyncErrorVariant = 'CONNECTION_ERROR';

const MS_PER_DAY = 86_400_000;

export const syncIndicatorBadge = (
  overview: SyncOverview | undefined,
  pushQueueCount: number | undefined,
  displayThreshold: number,
  now: Date
): SyncBadgeModel => {
  if (!overview) return undefined;
  if (overview.error && overview.error.variant !== CONNECTION_VARIANT)
    return { kind: 'alert' };

  const count = pushQueueCount ?? 0;
  if (count <= 0 || count < displayThreshold) return undefined;

  // No successful sync on record counts as zero days stale — a brand-new site
  // must not open on an error-red badge.
  const daysStale = overview.lastSuccessful
    ? Math.max(
        0,
        Math.floor(
          (now.getTime() -
            new Date(overview.lastSuccessful.finished).getTime()) /
            MS_PER_DAY
        )
      )
    : 0;

  const tone =
    daysStale >= overview.errorThresholdDays
      ? 'error'
      : daysStale >= overview.warningThresholdDays
        ? 'warning'
        : 'neutral';
  return { kind: 'count', count, tone };
};

import type { SyncStatusFragment } from '../api/initialisation.generated';
import type { LocaleKey } from '../intl';

export type SyncStep = {
  // i18n key for the step's name; SyncProgress resolves it with t() at render.
  label: LocaleKey;
  started: boolean;
  finished: boolean;
  done?: number;
  total?: number;
};

export type SyncOverview = {
  isSyncing: boolean;
  errorMessage: string | undefined;
  steps: SyncStep[];
  succeeded: boolean;
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

// A count only where there's something to count — a phase with total zero or
// unreported shows none; a known total with no done yet reads 0 / N (matches
// the sync modal's phase list).
const step = (label: LocaleKey, part: ProgressPart): SyncStep => ({
  label,
  started: part != null,
  finished: part?.finished != null,
  done: part?.total ? (part.done ?? 0) : undefined,
  total: part?.total || undefined,
});

// The initialisation screen's phase list (spec/sync-modal/rules.md § phase
// visibility, the initialisation rows). A first sync never pushes, so no push
// leg appears; on the legacy generation only a REMOTE site runs the v6 pull leg
// (a central server has none). `centralServer` is the server-role axis
// (src/api/serverInfo); the current generation has no role split.
export const toSyncOverview = (
  status: SyncStatusFragment | null | undefined,
  centralServer: boolean
): SyncOverview | undefined => {
  if (status == null) return undefined;

  const steps =
    status.__typename === 'FullSyncStatusV7Node'
      ? [
          step('sync-status.pull', status.pull),
          step('sync-status.integrate', status.integration),
        ]
      : [
          step('sync-status.prepare', status.prepareInitial),
          step('sync-status.pull-central', status.pullCentral),
          step('sync-status.pull-remote', status.pullRemote),
          ...(centralServer
            ? []
            : [step('sync-status.pull-v6', status.pullV6)]),
          step('sync-status.integrate', status.integration),
        ];

  const errorMessage = status.error?.fullError ?? undefined;
  return {
    isSyncing: status.isSyncing,
    errorMessage,
    steps,
    succeeded:
      !status.isSyncing &&
      errorMessage == null &&
      status.lastSuccessfulSync?.finished != null,
  };
};

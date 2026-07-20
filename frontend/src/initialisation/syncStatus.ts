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

const step = (label: LocaleKey, part: ProgressPart): SyncStep => ({
  label,
  started: part != null,
  finished: part?.finished != null,
  done: part?.done ?? undefined,
  total: part?.total ?? undefined,
});

export const toSyncOverview = (
  status: SyncStatusFragment | null | undefined
): SyncOverview | undefined => {
  if (status == null) return undefined;

  const steps =
    status.__typename === 'FullSyncStatusV7Node'
      ? [
          step('sync-status.pull', status.pull),
          step('sync-status.push', status.push),
          step('sync-status.integrate', status.integration),
        ]
      : [
          step('sync-status.prepare', status.prepareInitial),
          step('sync-status.pull-central', status.pullCentral),
          step('sync-status.pull-remote', status.pullRemote),
          step('sync-status.push', status.push),
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

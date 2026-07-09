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
  | { started: string; finished?: string | null; done?: number | null; total?: number | null }
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
          step('sync.step.pull', status.pull),
          step('sync.step.push', status.push),
          step('sync.step.integration', status.integration),
        ]
      : [
          step('sync.step.prepare-initial', status.prepareInitial),
          step('sync.step.pull-central', status.pullCentral),
          step('sync.step.pull-remote', status.pullRemote),
          step('sync.step.push', status.push),
          step('sync.step.integration', status.integration),
        ];

  const errorMessage = status.error?.fullError ?? undefined;
  return {
    isSyncing: status.isSyncing,
    errorMessage,
    steps,
    succeeded:
      !status.isSyncing && errorMessage == null && status.lastSuccessfulSync?.finished != null,
  };
};

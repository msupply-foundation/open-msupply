import type { SyncStatusFragment } from '../api/initialisation.generated';

export type SyncStep = {
  label: string;
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

const step = (label: string, part: ProgressPart): SyncStep => ({
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
          step('Pull', status.pull),
          step('Push', status.push),
          step('Integration', status.integration),
        ]
      : [
          step('Prepare initial', status.prepareInitial),
          step('Pull central', status.pullCentral),
          step('Pull remote', status.pullRemote),
          step('Push', status.push),
          step('Integration', status.integration),
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

import React, { FC } from 'react';
import {
  SyncStatusFragment,
  SyncStatusQuery,
  SyncStatusWithProgressFragment,
} from '../../api/operations.generated';
import {
  LocaleKey,
  TypedTFunction,
  useTranslation,
  Box,
  AlertIcon,
  StepLabel,
  Step,
  Stepper,
  ErrorWithDetails,
} from '@openmsupply-client/common';
import { mapSyncError } from '../../api/api';

type SyncStatus = SyncStatusQuery['latestSyncStatus'];

interface SyncProgressProps {
  syncStatus?: SyncStatus;
  // Pepare Initial status is only shown in initialisaion mode
  // and Push is only shown  in operational mode
  isOperational: boolean;
}

export const SyncProgress: FC<SyncProgressProps> = ({
  syncStatus,
  isOperational,
}) => {
  const t = useTranslation('app');
  const error =
    syncStatus?.error &&
    mapSyncError(t, syncStatus?.error, 'error.unknown-sync-error');

  return (
    <Box>
      {/* alternativeLabel shows icons on top */}
      <Stepper alternativeLabel>
        {getSteps(t, syncStatus).map(
          ({ label, progress, active, completed }, index) => {
            if (isOperational && index == SyncSteps.PrepareInitial) return null;
            if (!isOperational && index == SyncSteps.Push) return null;
            const isActiveAndError = !!error && active && !completed;

            return (
              <Step key={index} active={active} completed={completed}>
                <StepLabel
                  icon={
                    isActiveAndError && (
                      <AlertIcon sx={{ color: 'error.main' }} />
                    )
                  }
                  error={isActiveAndError}
                  optional={progress && `${progress.done}/${progress.total}`}
                >
                  {label}
                </StepLabel>
              </Step>
            );
          }
        )}
      </Stepper>
      {error && <ErrorWithDetails {...error} />}
    </Box>
  );
};

// This is the order of sync operations on server
enum SyncSteps {
  // Only in initialisation mode
  PrepareInitial,
  // Only in operational mode
  Push,
  PullCentral,
  PullRemote,
  Integrate,
}

const getSteps = (
  t: TypedTFunction<LocaleKey>,
  syncStatus?: SyncStatus
): {
  label: string;
  progress?: { total: number; done: number };
  active: boolean;
  completed: boolean;
}[] => {
  const getProgress = (progress?: SyncStatusWithProgressFragment | null) => {
    if (!progress?.total) return;
    const { total: total, done } = progress;
    return { total, done: done || 0 };
  };

  const getStatus = (
    progress?: SyncStatusWithProgressFragment | SyncStatusFragment | null
  ) => ({
    active: !!progress?.started,
    completed: !!progress?.finished,
  });

  const steps = [];
  steps[SyncSteps.PrepareInitial] = {
    label: t('sync-status.prepare'),
    ...getStatus(syncStatus?.prepareInitial),
  };
  steps[SyncSteps.Push] = {
    label: t('sync-status.push'),
    progress: getProgress(syncStatus?.push),
    ...getStatus(syncStatus?.push),
  };
  steps[SyncSteps.PullCentral] = {
    label: t('sync-status.pull-central'),
    progress: getProgress(syncStatus?.pullCentral),
    ...getStatus(syncStatus?.pullCentral),
  };
  steps[SyncSteps.PullRemote] = {
    label: t('sync-status.pull-remote'),
    progress: getProgress(syncStatus?.pullRemote),
    ...getStatus(syncStatus?.pullRemote),
  };
  steps[SyncSteps.Integrate] = {
    label: t('sync-status.integrate'),
    ...getStatus(syncStatus?.integration),
  };
  return steps;
};

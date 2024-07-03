import React, { FC } from 'react';
import {
  LocaleKey,
  TypedTFunction,
  useTranslation,
  Box,
  AlertIcon,
  ErrorWithDetails,
  HorizontalStepper,
  StepDefinition,
  StepperColour,
  useIsCentralServerApi,
} from '@openmsupply-client/common';
import {
  FullSyncStatusFragment,
  SyncStatusFragment,
  SyncStatusWithProgressFragment,
  mapSyncError,
} from '@openmsupply-client/system';

type SyncStatus = FullSyncStatusFragment | null;

interface SyncProgressProps {
  syncStatus?: SyncStatus;
  // Prepare Initial status is only shown in initialisation mode
  // and Push is only shown  in operational mode
  isOperational: boolean;
  colour?: StepperColour;
}

export const SyncProgress: FC<SyncProgressProps> = ({
  syncStatus,
  isOperational,
  colour = 'primary',
}) => {
  const t = useTranslation('app');
  const isCentralServer = useIsCentralServerApi();
  const error =
    syncStatus?.error &&
    mapSyncError(t, syncStatus?.error, 'error.unknown-sync-error');
  const steps = getSteps(
    t,
    colour,
    isCentralServer,
    syncStatus,
    !!error,
    isOperational
  );

  return (
    <Box display="flex" flexDirection={'column'}>
      <HorizontalStepper steps={steps} colour={colour} />
      {error && <ErrorWithDetails {...error} />}
    </Box>
  );
};

const ProgressIndicator = ({
  progress,
  colour,
}: {
  progress?: Progress;
  colour: StepperColour;
}) => (
  <Box
    display={'flex'}
    justifyContent="center"
    fontSize={12}
    color={`${colour}.light`}
    whiteSpace="nowrap"
  >
    {progress ? `${progress.done} / ${progress.total}` : null}
  </Box>
);

type Progress = {
  total: number;
  done: number;
};

const getSteps = (
  t: TypedTFunction<LocaleKey>,
  colour: StepperColour,
  isCentralServer: boolean,
  syncStatus?: SyncStatus,
  isError?: boolean,
  isOperational?: boolean
): StepDefinition[] => {
  const getProgress = (
    progress?: SyncStatusWithProgressFragment | SyncStatusFragment | null
  ) => {
    if (progress?.__typename === 'SyncStatusNode' || !progress?.total) return;
    const { total, done } = progress;
    return { total, done: done || 0 };
  };

  const getStep = (
    labelKey: LocaleKey,
    progress?: SyncStatusWithProgressFragment | SyncStatusFragment | null
  ): StepDefinition => {
    const completed = !!progress?.finished;
    const active = !completed && !!progress?.started;
    const isActiveAndError = isError && active && !completed;
    const icon = isActiveAndError ? (
      <AlertIcon sx={{ color: 'error.main' }} />
    ) : null;

    return {
      active,
      completed,
      error: isActiveAndError,
      icon,
      label: t(labelKey),
      optional: (
        <ProgressIndicator progress={getProgress(progress)} colour={colour} />
      ),
    };
  };

  // This is the order of sync operations on server.
  // Note that prepareInitial is only run when initialising
  // and push is only run when operational.
  const steps = [];

  if (!isOperational) {
    if (isCentralServer) {
      steps.push(getStep('sync-status.prepare', syncStatus?.prepareInitial));
    }
  }

  if (isOperational) {
    if (isCentralServer) {
      steps.push(getStep('sync-status.push', syncStatus?.push));
    } else {
      steps.push(getStep('sync-status.push', syncStatus?.pushV6));
    }
  }

  if (isCentralServer) {
    steps.push(getStep('sync-status.pull-central', syncStatus?.pullCentral));
    steps.push(getStep('sync-status.pull-remote', syncStatus?.pullRemote));
  } else {
    steps.push(getStep('sync-status.pull', syncStatus?.pullV6));
  }

  steps.push(getStep('sync-status.integrate', syncStatus?.integration));

  return steps;
};

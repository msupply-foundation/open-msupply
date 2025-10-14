import React, { FC } from 'react';
import {
  LocaleKey,
  TypedTFunction,
  useTranslation,
  Box,
  AlertIcon,
  HorizontalStepper,
  StepDefinition,
  StepperColour,
  useIsCentralServerApi,
  useMediaQuery,
  Breakpoints,
  useAppTheme,
  ChevronsDownIcon,
  DownloadIcon,
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
  const t = useTranslation();
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
  const theme = useAppTheme();
  const isExtraSmallScreen = useMediaQuery(
    theme.breakpoints.down(Breakpoints.sm)
  );

  return (
    <Box display="flex" flexDirection={'column'}>
      {!isExtraSmallScreen && (
        <HorizontalStepper steps={steps} colour={colour} />
      )}
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
    let icon;

    if (isActiveAndError === true) {
      icon = <AlertIcon sx={{ color: 'error.main' }} />;
    }
    if (progress !== null && progress !== undefined) {
      switch (progress) {
        case syncStatus?.pushV6:
        case syncStatus?.push:
          icon = <ChevronsDownIcon sx={{ transform: 'rotate(180deg)' }} />;
          break;
        case syncStatus?.pullCentral:
        case syncStatus?.pullRemote:
        case syncStatus?.pullV6:
          icon = <ChevronsDownIcon />;
          break;
        case syncStatus?.integration:
          icon = <DownloadIcon sx={{ fontSize: '18px' }} />;
          break;
        default:
          null;
      }
    } else {
      icon = null;
    }

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
    steps.push(getStep('sync-status.prepare', syncStatus?.prepareInitial));
  }

  if (isOperational) {
    if (!isCentralServer) {
      steps.push(getStep('sync-status.push-v6', syncStatus?.pushV6));
    }
    steps.push(getStep('sync-status.push', syncStatus?.push));
  }

  steps.push(getStep('sync-status.pull-central', syncStatus?.pullCentral));
  steps.push(getStep('sync-status.pull-remote', syncStatus?.pullRemote));

  if (!isCentralServer) {
    steps.push(getStep('sync-status.pull-v6', syncStatus?.pullV6));
  }

  steps.push(getStep('sync-status.integrate', syncStatus?.integration));

  return steps;
};

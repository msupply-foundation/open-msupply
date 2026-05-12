import React, { FC, useEffect, useState } from 'react';
import { intervalToDuration } from 'date-fns';
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
  useIsExtraSmallScreen,
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

  const hasActiveStep = [
    syncStatus?.prepareInitial,
    syncStatus?.pullCentral,
    syncStatus?.pullRemote,
    syncStatus?.pullV6,
    syncStatus?.push,
    syncStatus?.pushV6,
    syncStatus?.integration,
  ].some(s => !!s?.started && !s?.finished);
  const now = useNowEverySecond(hasActiveStep && !error);

  const steps = getSteps(
    t,
    colour,
    isCentralServer,
    syncStatus,
    !!error,
    isOperational,
    now
  );
  const isExtraSmallScreen = useIsExtraSmallScreen();

  return (
    <Box display="flex" flexDirection={'column'}>
      {!isExtraSmallScreen && (
        <HorizontalStepper steps={steps} colour={colour} />
      )}
    </Box>
  );
};

const useNowEverySecond = (active: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
};

const getStepElapsed = (
  progress:
    | SyncStatusWithProgressFragment
    | SyncStatusFragment
    | null
    | undefined,
  now: number
): string | undefined => {
  if (!progress?.started) return undefined;
  const startMs = new Date(progress.started).getTime();
  if (!Number.isFinite(startMs)) return undefined;
  const endMs = progress.finished
    ? new Date(progress.finished).getTime()
    : now;
  const {
    hours = 0,
    minutes = 0,
    seconds = 0,
  } = intervalToDuration({ start: startMs, end: Math.max(startMs, endMs) });
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const ProgressIndicator = ({
  progress,
  elapsed,
  colour,
}: {
  progress?: Progress;
  elapsed?: string;
  colour: StepperColour;
}) => (
  <Box
    display={'flex'}
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    fontSize={12}
    color={`${colour}.light`}
    whiteSpace="nowrap"
  >
    {progress ? <span>{`${progress.done} / ${progress.total}`}</span> : null}
    {elapsed !== undefined ? <span>{elapsed}</span> : null}
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
  isOperational?: boolean,
  now: number = Date.now()
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
        <ProgressIndicator
          progress={getProgress(progress)}
          elapsed={getStepElapsed(progress, now)}
          colour={colour}
        />
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

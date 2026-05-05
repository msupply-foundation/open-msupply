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
  useIsExtraSmallScreen,
  ChevronsDownIcon,
  DownloadIcon,
} from '@openmsupply-client/common';
import {
  FullSyncStatusFragment,
  FullSyncStatusV7Fragment,
  SyncStatusFragment,
  SyncStatusV7Fragment,
  SyncStatusWithProgressFragment,
  SyncStatusWithProgressV7Fragment,
  mapSyncErrorV5V6,
  mapSyncErrorV7,
  useSync,
} from '@openmsupply-client/system';

interface SyncProgressProps {
  // Push and waiting-for-integration are only shown in operational mode.
  isOperational: boolean;
  colour?: StepperColour;
}

/**
 * Fetches sync status once and dispatches to the version-specific renderer
 * based on the data's `__typename`. Renders nothing until data is available.
 */
export const SyncProgress: FC<SyncProgressProps> = ({
  isOperational,
  colour = 'primary',
}) => {
  const { data: syncStatus } = useSync.utils.syncStatus(
    false,
    undefined,
    isOperational
  );

  if (!syncStatus) return null;

  if (syncStatus.__typename === 'FullSyncStatusV7Node') {
    return (
      <SyncProgressV7
        syncStatus={syncStatus}
        isOperational={isOperational}
        colour={colour}
      />
    );
  }
  return (
    <SyncProgressV5V6
      syncStatus={syncStatus}
      isOperational={isOperational}
      colour={colour}
    />
  );
};

interface VersionedProps<T> extends SyncProgressProps {
  syncStatus: T;
}

const SyncProgressV5V6: FC<VersionedProps<FullSyncStatusFragment>> = ({
  syncStatus,
  isOperational,
  colour = 'primary',
}) => {
  const t = useTranslation();
  const isExtraSmallScreen = useIsExtraSmallScreen();

  const error =
    syncStatus?.error &&
    mapSyncErrorV5V6(t, syncStatus.error, 'error.unknown-sync-error');
  const steps = getV5V6Steps(t, colour, syncStatus, !!error, isOperational);

  return (
    <Box display="flex" flexDirection="column">
      {!isExtraSmallScreen && (
        <HorizontalStepper steps={steps} colour={colour} />
      )}
    </Box>
  );
};

const SyncProgressV7: FC<VersionedProps<FullSyncStatusV7Fragment>> = ({
  syncStatus,
  isOperational,
  colour = 'primary',
}) => {
  const t = useTranslation();
  const isExtraSmallScreen = useIsExtraSmallScreen();

  const error =
    syncStatus?.error &&
    mapSyncErrorV7(t, syncStatus.error, 'error.unknown-sync-error');
  const steps = getV7Steps(t, colour, syncStatus, !!error, isOperational);

  return (
    <Box display="flex" flexDirection="column">
      {!isExtraSmallScreen && (
        <HorizontalStepper steps={steps} colour={colour} />
      )}
    </Box>
  );
};

type Progress = { total: number; done: number };

const ProgressIndicator = ({
  progress,
  colour,
}: {
  progress?: Progress;
  colour: StepperColour;
}) => (
  <Box
    display="flex"
    justifyContent="center"
    fontSize={12}
    color={`${colour}.light`}
    whiteSpace="nowrap"
  >
    {progress ? `${progress.done} / ${progress.total}` : null}
  </Box>
);

const getProgress = (
  status?:
    | SyncStatusWithProgressFragment
    | SyncStatusWithProgressV7Fragment
    | SyncStatusFragment
    | SyncStatusV7Fragment
    | null
): Progress | undefined => {
  if (
    !status ||
    status.__typename === 'SyncStatusNode' ||
    status.__typename === 'SyncStatusV7Node' ||
    !status.total
  ) {
    return undefined;
  }
  return { total: status.total, done: status.done || 0 };
};

const buildStep = (
  t: TypedTFunction<LocaleKey>,
  colour: StepperColour,
  labelKey: LocaleKey,
  status:
    | SyncStatusWithProgressFragment
    | SyncStatusWithProgressV7Fragment
    | SyncStatusFragment
    | SyncStatusV7Fragment
    | null
    | undefined,
  iconKind: 'push' | 'pull' | 'integrate' | 'wait',
  isError: boolean
): StepDefinition => {
  const completed = !!status?.finished;
  const active = !completed && !!status?.started;
  const isActiveAndError = isError && active && !completed;

  let icon: React.ReactNode = null;
  if (isActiveAndError) {
    icon = <AlertIcon sx={{ color: 'error.main' }} />;
  } else {
    switch (iconKind) {
      case 'push':
        icon = <ChevronsDownIcon sx={{ transform: 'rotate(180deg)' }} />;
        break;
      case 'pull':
        icon = <ChevronsDownIcon />;
        break;
      case 'integrate':
        icon = <DownloadIcon sx={{ fontSize: '18px' }} />;
        break;
      case 'wait':
        icon = null;
        break;
    }
  }

  return {
    active,
    completed,
    error: isActiveAndError,
    icon,
    label: t(labelKey),
    optional: (
      <ProgressIndicator progress={getProgress(status)} colour={colour} />
    ),
  };
};

const getV5V6Steps = (
  t: TypedTFunction<LocaleKey>,
  colour: StepperColour,
  syncStatus: FullSyncStatusFragment | null | undefined,
  isError: boolean,
  isOperational: boolean
): StepDefinition[] => {
  const steps: StepDefinition[] = [];
  if (isOperational) {
    steps.push(
      buildStep(t, colour, 'sync-status.push', syncStatus?.push, 'push', isError)
    );
  }
  steps.push(
    buildStep(
      t,
      colour,
      'sync-status.pull-central',
      syncStatus?.pullCentral,
      'pull',
      isError
    )
  );
  steps.push(
    buildStep(
      t,
      colour,
      'sync-status.pull-remote',
      syncStatus?.pullRemote,
      'pull',
      isError
    )
  );
  steps.push(
    buildStep(
      t,
      colour,
      'sync-status.integrate',
      syncStatus?.integration,
      'integrate',
      isError
    )
  );
  return steps;
};

const getV7Steps = (
  t: TypedTFunction<LocaleKey>,
  colour: StepperColour,
  syncStatus: FullSyncStatusV7Fragment | null | undefined,
  isError: boolean,
  isOperational: boolean
): StepDefinition[] => {
  const steps: StepDefinition[] = [];
  if (isOperational) {
    steps.push(
      buildStep(t, colour, 'sync-status.push', syncStatus?.push, 'push', isError)
    );
    steps.push(
      buildStep(
        t,
        colour,
        'sync-status.waiting-for-integration',
        syncStatus?.waitingForIntegration,
        'wait',
        isError
      )
    );
  }
  steps.push(
    buildStep(t, colour, 'sync-status.pull', syncStatus?.pull, 'pull', isError)
  );
  steps.push(
    buildStep(
      t,
      colour,
      'sync-status.integrate',
      syncStatus?.integration,
      'integrate',
      isError
    )
  );
  return steps;
};

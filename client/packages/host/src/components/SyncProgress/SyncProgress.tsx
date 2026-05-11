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
  useIsExtraSmallScreen,
  ChevronsDownIcon,
  ChevronDownIcon,
  DownloadIcon,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from '@openmsupply-client/common';
import {
  FullSyncStatusV5V6Fragment,
  FullSyncStatusV7Fragment,
  SyncStatusWithProgressFragment,
  isSyncStatusV7,
  mapSyncError,
} from '@openmsupply-client/system';

type SyncStatus = FullSyncStatusV5V6Fragment | FullSyncStatusV7Fragment;

interface SyncProgressProps {
  syncStatus: SyncStatus;
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
    syncStatus.error &&
    mapSyncError(t, syncStatus.error, 'error.unknown-sync-error');
  const steps = getSteps({
    t,
    colour,
    isCentralServer,
    syncStatus,
    isError: !!error,
    isOperational,
  });
  const isExtraSmallScreen = useIsExtraSmallScreen();

  return (
    <Box display="flex" flexDirection={'column'}>
      {!isExtraSmallScreen && (
        <HorizontalStepper steps={steps} colour={colour} />
      )}
      {isSyncStatusV7(syncStatus) &&
        syncStatus.linkedSyncRequests.length > 0 && (
          <LinkedSyncProcesses
            descriptions={syncStatus.linkedSyncRequests}
          />
        )}
    </Box>
  );
};

const LinkedSyncProcesses = ({
  descriptions,
}: {
  descriptions: string[];
}) => {
  const t = useTranslation();
  return (
    <Accordion sx={{ mt: 1 }}>
      <AccordionSummary expandIcon={<ChevronDownIcon />}>
        <Typography sx={{ fontWeight: 600 }}>
          {t('sync-status.linked-sync-requests', {
            count: descriptions.length,
          })}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box display="flex" flexDirection="column" gap={0.5}>
          {descriptions.map((d, i) => (
            <Typography key={i} variant="body2">
              {d}
            </Typography>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
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

type Step = Partial<Omit<SyncStatusWithProgressFragment, '__typename'>>;

const buildStep = (
  t: TypedTFunction<LocaleKey>,
  colour: StepperColour,
  labelKey: LocaleKey,
  isError: boolean,
  step: Step,
  icon: React.ReactNode
): StepDefinition => {
  const completed = !!step.finished;
  const active = !completed && !!step.started;
  const isActiveAndError = isError && active;

  const progress = step.total
    ? { total: step.total, done: step.done ?? 0 }
    : undefined;

  return {
    active,
    completed,
    error: isActiveAndError,
    icon: isActiveAndError ? <AlertIcon sx={{ color: 'error.main' }} /> : icon,
    label: t(labelKey),
    optional: <ProgressIndicator progress={progress} colour={colour} />,
  };
};

const getSteps = ({
  t,
  colour,
  isCentralServer,
  syncStatus,
  isError,
  isOperational,
}: {
  t: TypedTFunction<LocaleKey>;
  colour: StepperColour;
  isCentralServer: boolean;
  syncStatus: SyncStatus;
  isError: boolean;
  isOperational: boolean;
}): StepDefinition[] => {
  const pullDown = <ChevronsDownIcon />;
  const pushUp = <ChevronsDownIcon sx={{ transform: 'rotate(180deg)' }} />;
  const integrate = <DownloadIcon sx={{ fontSize: '18px' }} />;

  const make = (
    labelKey: LocaleKey,
    step: Step | null | undefined,
    icon: React.ReactNode
  ) => buildStep(t, colour, labelKey, isError, step ?? {}, icon);

  const steps: StepDefinition[] = [];

  if (isSyncStatusV7(syncStatus)) {
    // Push and WaitForIntegration are skipped during initialisation.
    if (isOperational) {
      steps.push(make('sync-status.push', syncStatus.push, pushUp));
      steps.push(
        make(
          'sync-status.waiting-for-integration',
          syncStatus.waitingForIntegration,
          null
        )
      );
    }
    steps.push(make('sync-status.pull', syncStatus.pull, pullDown));
    steps.push(
      make('sync-status.integrate', syncStatus.integration, integrate)
    );
    return steps;
  }
  // V5_V6

  if (!isOperational) {
    steps.push(make('sync-status.prepare', syncStatus?.prepareInitial, null));
  }
  if (isOperational) {
    if (!isCentralServer) {
      steps.push(make('sync-status.push-v6', syncStatus?.pushV6, pushUp));
    }
    steps.push(make('sync-status.push', syncStatus?.push, pushUp));
  }
  steps.push(
    make('sync-status.pull-central', syncStatus?.pullCentral, pullDown)
  );
  steps.push(make('sync-status.pull-remote', syncStatus?.pullRemote, pullDown));
  if (!isCentralServer) {
    steps.push(make('sync-status.pull-v6', syncStatus?.pullV6, pullDown));
  }
  steps.push(make('sync-status.integrate', syncStatus?.integration, integrate));

  return steps;
};

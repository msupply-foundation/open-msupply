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
  ClockIcon,
  DownloadIcon,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
  ArrayElement,
  noOtherVariants,
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
    <Box display="flex" flexDirection={'column'} alignItems="center">
      {!isExtraSmallScreen && (
        <HorizontalStepper steps={steps} colour={colour} />
      )}
      {isSyncStatusV7(syncStatus) &&
        syncStatus.linkedDescriptions.length > 0 && (
          <LinkedSyncProcesses descriptions={syncStatus.linkedDescriptions} />
        )}
    </Box>
  );
};

type LinkedDescriptions = FullSyncStatusV7Fragment['linkedDescriptions'];

// Exhaustive renderer
const renderDescription = (
  t: TypedTFunction<LocaleKey>,
  description: ArrayElement<LinkedDescriptions>
): string => {
  switch (description.__typename) {
    case 'AllStoreDataDescription':
      return t('sync-status.description.all-store-data', {
        storeName: description.storeName,
      });
    case 'TableNameDescription':
      return t('sync-status.description.table-name', {
        tableName: description.tableName,
      });
    default:
      return noOtherVariants(description);
  }
};

const LinkedSyncProcesses = ({
  descriptions,
}: {
  descriptions: LinkedDescriptions;
}) => {
  const t = useTranslation();
  return (
    <Accordion
      disableGutters
      sx={theme => ({
        mt: 3,
        borderRadius: '8px',
        // MUI rounds only the first/last child's outer corners by default; force
        // all four to match and clip the summary/details to the rounded shape.
        '&:first-of-type, &:last-of-type': { borderRadius: '8px' },
        overflow: 'hidden',
        boxShadow: theme.shadows[2],
        // Remove MUI's default top divider pseudo-element.
        '&:before': { display: 'none' },
      })}
    >
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
              {renderDescription(t, d)}
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
    width="9em"
  >
    {progress ? `${progress.done} / ${progress.total}` : null}
  </Box>
);

type Progress = {
  total: number;
  done: number;
};

type Step = Partial<Omit<SyncStatusWithProgressFragment, '__typename'>>;

type RawStep = {
  labelKey: LocaleKey;
  step: Step;
  icon: React.ReactNode;
};

const toStepDefinition = (
  t: TypedTFunction<LocaleKey>,
  colour: StepperColour,
  isError: boolean,
  { labelKey, step, icon }: RawStep,
  index: number,
  furthestStartedIndex: number
): StepDefinition => {
  // Steps always run in order, so anything before the furthest-reached step is
  // complete - even if its own `finished` timestamp never came back (e.g. a
  // push with nothing to send). Deriving from progression keeps the
  // "completed" styling consistent across every passed step, instead of only
  // the step that happened to report a finish time. See issue #12172.
  const isFurthest = index === furthestStartedIndex;
  const finished = !!step.finished;
  const completed = index < furthestStartedIndex || (isFurthest && finished);
  const active = isFurthest && !finished;
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
  const waiting = <ClockIcon sx={{ fontSize: '18px' }} />;
  const integrate = <DownloadIcon sx={{ fontSize: '18px' }} />;

  const make = (
    labelKey: LocaleKey,
    step: Step | null | undefined,
    icon: React.ReactNode
  ): RawStep => ({ labelKey, step: step ?? {}, icon });

  const raws: RawStep[] = [];

  if (isSyncStatusV7(syncStatus)) {
    // Push and WaitForIntegration are skipped during initialisation.
    if (isOperational) {
      raws.push(make('sync-status.push', syncStatus.push, pushUp));
      raws.push(
        make(
          'sync-status.waiting-for-integration',
          syncStatus.waitingForIntegration,
          waiting
        )
      );
    }
    raws.push(make('sync-status.pull', syncStatus.pull, pullDown));
    raws.push(make('sync-status.integrate', syncStatus.integration, integrate));
  } else {
    // V5_V6
    if (!isOperational) {
      raws.push(make('sync-status.prepare', syncStatus?.prepareInitial, null));
    }
    if (isOperational) {
      if (!isCentralServer) {
        raws.push(make('sync-status.push-v6', syncStatus?.pushV6, pushUp));
      }
      raws.push(make('sync-status.push', syncStatus?.push, pushUp));
    }
    raws.push(
      make('sync-status.pull-central', syncStatus?.pullCentral, pullDown)
    );
    raws.push(
      make('sync-status.pull-remote', syncStatus?.pullRemote, pullDown)
    );
    if (!isCentralServer) {
      raws.push(make('sync-status.pull-v6', syncStatus?.pullV6, pullDown));
    }
    raws.push(
      make('sync-status.integrate', syncStatus?.integration, integrate)
    );
  }

  // Furthest-reached step = the last one that has started.
  let furthestStartedIndex = -1;
  raws.forEach((raw, i) => {
    if (raw.step.started) furthestStartedIndex = i;
  });

  return raws.map((raw, i) =>
    toStepDefinition(t, colour, isError, raw, i, furthestStartedIndex)
  );
};

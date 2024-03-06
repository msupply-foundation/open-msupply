import React from 'react';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { ChevronDownIcon } from '@common/icons';
import { useTranslation, useFormatDateTime } from '@common/intl';
import { VerticalStepper } from '../../steppers/VerticalStepper';
import { PaperHoverPopover, PaperPopoverSection } from '../../popover';
import { useIsSmallScreen } from '@common/hooks';
import { styled } from '@mui/material/styles';

interface StatusCrumbsProps<StatusType extends string> {
  statuses: StatusType[];
  statusLog: Record<StatusType, string | null | undefined>;
  statusFormatter: (status: StatusType) => string;
}

const StyledText = styled(Typography)({
  fontWeight: 700,
  fontSize: '12px',
});

const useSteps = <StatusType extends string>({
  statuses,
  statusLog,
  statusFormatter,
}: StatusCrumbsProps<StatusType>) => {
  const { localisedDate } = useFormatDateTime();
  return statuses.map(status => ({
    label: statusFormatter(status),
    description: statusLog[status]
      ? localisedDate(new Date(statusLog[status] ?? ''))
      : '',
  }));
};

export const StatusCrumbs = <StatusType extends string>(
  props: StatusCrumbsProps<StatusType>
): JSX.Element | null => {
  const { statuses, statusLog, statusFormatter } = props;
  const t = useTranslation();
  const isSmallScreen = useIsSmallScreen();

  const steps = useSteps(props);

  const currentStep = statuses.reduce((acc, status, idx) => {
    if (statusLog[status]) return idx;
    return acc;
  }, 0);

  let Crumbs = null;
  if (isSmallScreen) {
    const stepKey = statuses[currentStep];
    if (!stepKey) return null;
    Crumbs = (
      <Box flexDirection="row" display="flex" gap={1} justifyContent="center">
        <StyledText>{t('label.status')}</StyledText>
        <StyledText color={'secondary'}>{statusFormatter(stepKey)}</StyledText>
      </Box>
    );
  } else {
    Crumbs = statuses.map(status => {
      const date = statusLog[status];

      return (
        <StyledText color={date ? 'secondary' : 'gray.main'} key={status}>
          {statusFormatter(status)}
        </StyledText>
      );
    });
  }

  return (
    <PaperHoverPopover
      placement="top"
      width={250}
      Content={
        <PaperPopoverSection label={t('label.order-history')}>
          <VerticalStepper activeStep={currentStep} steps={steps} />
        </PaperPopoverSection>
      }
    >
      <Box
        height="100%"
        display="flex"
        alignItems="center"
        sx={{ cursor: 'help' }}
      >
        <Breadcrumbs
          separator={
            <ChevronDownIcon
              fontSize="small"
              sx={{
                // TODO: Add a ChevronLeftIcon..
                transform: 'rotate(270deg)',
                // These special margins give some space between each crumb. Could have added it to the Typography
                // but this seemed fine
                marginLeft: '5px',
                marginRight: '5px',
              }}
            />
          }
        >
          {Crumbs}
        </Breadcrumbs>
      </Box>
    </PaperHoverPopover>
  );
};

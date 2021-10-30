import React from 'react';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import { useAppTheme } from '../../styles';
import { ChevronDownIcon } from '../icons';
import {
  LocaleKey,
  useTranslation,
  useFormatDate,
} from '../../intl/intlHelpers';
import { VerticalStepper } from './steppers/VerticalStepper';
import { usePopover } from './popover';

interface StatusCrumbsProps<StatusType extends string> {
  statuses: StatusType[];
  statusLog: Record<StatusType, string | null>;
  statusFormatter: (status: StatusType) => LocaleKey;
}

export const StatusCrumbs = <StatusType extends string>({
  statuses,
  statusLog,
  statusFormatter,
}: StatusCrumbsProps<StatusType>): JSX.Element => {
  const t = useTranslation();
  const d = useFormatDate();
  const theme = useAppTheme();
  const { show, hide, Popover } = usePopover();

  const currentStep = statuses.reduce((acc, status, idx) => {
    if (statusLog[status]) return idx;
    return acc;
  }, 0);

  const crumbs = statuses.map(status => {
    const date = statusLog[status];
    const color = date ? 'secondary' : theme.palette.midGrey;

    return (
      <Typography
        key={status}
        color={color}
        sx={{ fontWeight: 700, fontSize: '12px' }}
      >
        {t(statusFormatter(status))}
      </Typography>
    );
  });

  return (
    <>
      <Popover>
        <Box
          gap={2}
          p={3}
          flexDirection="column"
          display="flex"
          justifyContent="center"
          flex={1}
        >
          <Typography fontWeight="700">{t('label.order-history')}</Typography>
          <VerticalStepper
            activeStep={currentStep}
            steps={statuses.map(status => ({
              label: statusFormatter(status),
              description: statusLog[status]
                ? d(new Date(statusLog[status] ?? ''))
                : '',
            }))}
          />
        </Box>
      </Popover>

      <Box
        style={{
          cursor: 'help',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseOver={show}
        onMouseLeave={hide}
        onClick={show}
      >
        <Breadcrumbs
          separator={
            <ChevronDownIcon
              fontSize="small"
              htmlColor={theme.palette.midGrey}
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
          {crumbs}
        </Breadcrumbs>
      </Box>
    </>
  );
};

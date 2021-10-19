import React from 'react';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import { useAppTheme } from '../../styles';
import { ChevronDownIcon } from '../icons';
import { LocaleKey, useTranslation } from '../../intl/intlHelpers';

interface StatusCrumbsProps<StatusType> {
  statuses: StatusType[];
  currentStatus: StatusType;
  statusFormatter: (status: StatusType) => LocaleKey;
}

export const StatusCrumbs = <StatusType extends string>({
  statuses,
  currentStatus,
  statusFormatter,
}: StatusCrumbsProps<StatusType>): JSX.Element => {
  const t = useTranslation();
  const theme = useAppTheme();
  const currentIdx = statuses.findIndex(status => status === currentStatus);

  const crumbs = statuses.map((status, i) => {
    const color = i <= currentIdx ? 'secondary' : theme.palette.midGrey;

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
  );
};

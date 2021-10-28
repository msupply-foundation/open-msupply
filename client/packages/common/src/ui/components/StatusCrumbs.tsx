import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';

import { useAppTheme } from '../../styles';
import { ChevronDownIcon } from '../icons';
import {
  LocaleKey,
  useTranslation,
  useFormatDate,
} from '../../intl/intlHelpers';
import Popper, { PopperProps } from '@mui/material/Popper';

import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';

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

  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>(null);

  const handleClose = () => {
    setOpen(false);
  };

  const handleOpen: React.MouseEventHandler<HTMLDivElement> = e => {
    const getBoundingClientRect = () =>
      ({
        top: e.clientY,
        left: e.clientX,
        bottom: e.clientY,
        right: e.clientX,
        width: 0,
        height: 0,
      } as DOMRect);

    setAnchorEl({ getBoundingClientRect });
    setOpen(true);
  };

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
    <div
      onMouseOver={handleOpen}
      onMouseLeave={handleClose}
      onClick={handleOpen}
    >
      <Popper
        open={open}
        anchorEl={anchorEl}
        transition
        placement="bottom-start"
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={350}>
            <Paper
              sx={{
                width: 240,
                height: 200,
                boxShadow: theme => theme.shadows[7],
              }}
            >
              <Typography sx={{ fontWeight: 'bold' }}>Order History</Typography>
              {statuses.map(status => {
                const isoDate = statusLog[status];
                const dateString = isoDate ? d(new Date(isoDate)) : '';

                return (
                  <Box
                    key={status}
                    display="flex"
                    flexDirection="row"
                    justifyContent="space-between"
                  >
                    <Typography>{t(statusFormatter(status))}</Typography>
                    <Typography key={status}>{dateString}</Typography>
                  </Box>
                );
              })}
            </Paper>
          </Fade>
        )}
      </Popper>
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
    </div>
  );
};

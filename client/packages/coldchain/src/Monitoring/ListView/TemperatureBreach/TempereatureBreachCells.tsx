import React from 'react';
import { useFormatDateTime, useTranslation } from '@common/intl';
import {
  Box,
  CellProps,
  CircleAlertIcon,
  IconButton,
  MessageSquareIcon,
  PaperHoverPopover,
  PaperPopoverSection,
  Typography,
  useTheme,
} from '@openmsupply-client/common';
import { TemperatureBreachFragment } from '../../api/TemperatureBreach';

export const DurationCell = ({
  rowData,
}: CellProps<TemperatureBreachFragment>) => {
  const t = useTranslation('coldchain');
  const { localisedDistance } = useFormatDateTime();
  const duration = !rowData.endDatetime
    ? t('label.ongoing')
    : localisedDistance(rowData.startDatetime, rowData.endDatetime);

  return (
    <Box
      flexDirection="row"
      display="flex"
      flex={1}
      sx={
        !rowData.endDatetime
          ? {
              color: 'error.main',
              fontStyle: 'italic',
            }
          : {}
      }
    >
      <Typography
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: 'inherit',
          fontSize: 'inherit',
        }}
      >
        {duration}
      </Typography>
    </Box>
  );
};

export const IconCell = ({
  acknowledgeBreach,
  rowData,
}: {
  acknowledgeBreach: (breach: TemperatureBreachFragment) => void;
  rowData: TemperatureBreachFragment;
}) => {
  const t = useTranslation('coldchain');
  const theme = useTheme();

  if (!!rowData?.unacknowledged)
    return (
      <IconButton
        onClick={() => acknowledgeBreach(rowData)}
        icon={
          <CircleAlertIcon
            fill={theme.palette.error.main}
            sx={{ color: 'background.white' }}
          />
        }
        label={t('button.acknowledge')}
      ></IconButton>
    );

  if (!!rowData?.comment)
    return (
      <PaperHoverPopover
        width={400}
        Content={
          <PaperPopoverSection
            label={t('label.comment')}
            sx={{ wordBreak: 'break-word' }}
          >
            {String(rowData?.comment)}
          </PaperPopoverSection>
        }
      >
        <MessageSquareIcon sx={{ fontSize: 16 }} color="primary" />
      </PaperHoverPopover>
    );

  return null;
};

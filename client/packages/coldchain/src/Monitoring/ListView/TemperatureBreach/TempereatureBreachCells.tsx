import React from 'react';
import { useFormatDateTime, useTranslation } from '@common/intl';
import {
  Box,
  CircleAlertIcon,
  IconButton,
  MessageSquareIcon,
  PaperHoverPopover,
  PaperPopoverSection,
  Typography,
  useTheme,
} from '@openmsupply-client/common';
import { TemperatureBreachFragment } from '../../api/TemperatureBreach';

export const DurationCell = ({ row: { original } }: { row: { original: TemperatureBreachFragment } }) => {
  const t = useTranslation();
  const { localisedDistance } = useFormatDateTime();
  const duration = !original.endDatetime
    ? t('label.ongoing')
    : localisedDistance(original.startDatetime, original.endDatetime);

  return (
    <Box
      flexDirection="row"
      display="flex"
      flex={1}
      sx={
        !original.endDatetime
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
  const t = useTranslation();
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
          <PaperPopoverSection label={t('label.comment')}>
            {String(rowData?.comment)}
          </PaperPopoverSection>
        }
      >
        <MessageSquareIcon sx={{ fontSize: 16 }} color="primary" />
      </PaperHoverPopover>
    );

  return null;
};

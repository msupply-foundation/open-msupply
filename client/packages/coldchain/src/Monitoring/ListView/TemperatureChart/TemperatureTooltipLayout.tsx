import { useTheme } from '@common/styles';
import { Box, Typography, useFormatDateTime } from '@openmsupply-client/common';
import React from 'react';

type Entry = {
  color: string | undefined;
  id: string;
  name: string;
  value: string;
};

interface TemperatureTooltipLayoutProps {
  entries: (Entry | null)[];
  label: string;
}

export const TemperatureTooltipLayout = ({
  entries,
  label,
}: TemperatureTooltipLayoutProps) => {
  const theme = useTheme();
  const { dayMonthTime } = useFormatDateTime();
  const dateFormatter = (date: string) => dayMonthTime(date);

  return (
    <Box
      sx={{
        margin: 0,
        padding: 2,
        backgroundColor: 'background.white',
        whiteSpace: 'nowrap',
        boxShadow: theme.shadows[3],
        borderRadius: 3,
      }}
    >
      <Typography sx={{ fontWeight: 'bold' }}>
        {dateFormatter(label)}
      </Typography>
      {entries
        .filter(entry => entry !== null)
        .map(entry => (
          <Box display="flex" key={entry?.id} gap={2}>
            <Typography
              sx={{ color: entry?.color, flex: 1, textAlign: 'left' }}
              component="div"
            >
              {entry?.name}
            </Typography>
            <Typography
              key={entry?.id}
              sx={{ flex: 1 }}
              component="div"
              display="flex"
              justifyContent="flex-end"
            >
              {entry?.value}
            </Typography>
          </Box>
        ))}
    </Box>
  );
};

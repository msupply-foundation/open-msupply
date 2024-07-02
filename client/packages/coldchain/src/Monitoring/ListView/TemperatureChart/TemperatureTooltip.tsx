import { useTheme } from '@common/styles';
import {
  Box,
  TooltipProps,
  Typography,
  UNDEFINED_STRING_VALUE,
  useFormatDateTime,
} from '@openmsupply-client/common';
import { useFormatTemperature } from '../../../common';

import React from 'react';

export type Entry = {
  color: string | undefined;
  id: string;
  name: string;
  value: string;
};

// Payload looks something like this
/*
  [
  {
      "name": "Sensor 1",
      "strokeDasharray": "7 2",
      "fill": "#922DD0",
      "stroke": "#922DD0",
      "strokeWidth": 1,
      "dataKey": "temperature",
      "color": "#922DD0",
      "value": 23.5,
      "payload": {
          "datetime": "2024-02-08T04:10:12.000Z",
          "temperature": 23.5
      }
  }
  ]
  */
export const TemperatureTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  const theme = useTheme();
  const { dayMonthTime } = useFormatDateTime();
  const dateFormatter = (date: string) => dayMonthTime(date);
  const formatTemp = useFormatTemperature();

  if (!active || !payload) {
    return null;
  }

  const formatTemperature = (value: number | null | undefined) =>
    !!value ? `${formatTemp(value)}` : UNDEFINED_STRING_VALUE;
  const entries: Entry[] = payload?.map(entry => {
    return {
      name: entry.name ?? '',
      value: formatTemperature(entry.value),
      id: entry.name ?? '' + entry.value,
      color: entry.color,
    };
  });

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
      {entries.map(entry => (
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

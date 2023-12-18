import React from 'react';
import { useTheme } from '@common/styles';
import { CircleAlertIcon } from '@common/icons';
import { BreachDot, Log } from './types';

export const BreachIndicator = ({
  cx,
  cy,
  payload,
  setCurrentBreach,
}: {
  cx: number;
  cy: number;
  payload: Log;
  setCurrentBreach: (breach: BreachDot) => void;
}) => {
  const theme = useTheme();

  if (!payload.breach) return null;
  const { breach } = payload;

  return (
    <CircleAlertIcon
      onClick={event =>
        setCurrentBreach({
          breach,
          position: event.currentTarget.getBoundingClientRect(),
        })
      }
      x={cx - 13.5}
      y={cy - 13.5}
      fill={theme.palette.error.main}
      sx={{ color: 'background.white', cursor: 'pointer' }}
      width={27}
      height={27}
    />
  );
};

import React from 'react';
import { useTheme } from '@common/styles';
import { CircleAlertIcon } from '@common/icons';
import { BreachDot, DataPoint } from './types';

export const BreachIndicator = ({
  cx,
  cy,
  payload,
  setCurrentBreach,
}: {
  cx: number;
  cy: number;
  payload: DataPoint;
  setCurrentBreach: (breach: BreachDot) => void;
}) => {
  const theme = useTheme();

  const { breachId } = payload;
  if (!breachId) return null;

  return (
    <CircleAlertIcon
      onClick={event =>
        setCurrentBreach({
          breachId,
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

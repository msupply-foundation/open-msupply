import React from 'react';
import { TemperatureBreachRowFragment } from '../../api';
import { useTheme } from '@common/styles';
import { CircleAlertIcon } from '@common/icons';
import { DateUtils } from '@common/intl';
import { TemperatureBreachNodeType } from '@common/types';
import { Breach } from './TemperatureChart';

type DotPayload = {
  date: Date;
  temperature: number;
  breach?: TemperatureBreachRowFragment;
  sensorId: string;
};
export const BreachIcon = ({
  cx,
  cy,
  payload,
  setCurrentBreach,
}: {
  cx: number;
  cy: number;
  payload: DotPayload;
  setCurrentBreach: (breach: Breach | null) => void;
}) => {
  const theme = useTheme();

  if (payload.breach === undefined) return null;

  return (
    <CircleAlertIcon
      onClick={event => {
        const boundingClientRect = event.currentTarget.getBoundingClientRect();
        return setCurrentBreach({
          anchor: {
            nodeType: 1,
            getBoundingClientRect: () => boundingClientRect,
          },
          date: payload.date,
          sensorId: payload.sensorId,
          type:
            payload.breach?.type ?? TemperatureBreachNodeType.ColdConsecutive,
          breachId: payload.breach?.id ?? '',
          endDateTime: DateUtils.getDateOrNull(payload.breach?.endDatetime),
          startDateTime:
            DateUtils.getDateOrNull(payload.breach?.startDatetime) ??
            payload.date,
        });
      }}
      x={cx - 13.5}
      y={cy - 13.5}
      fill={
        payload.breach?.acknowledged
          ? theme.palette.gray.main
          : theme.palette.error.main
      }
      sx={{ color: 'background.white', cursor: 'pointer' }}
      width={27}
      height={27}
    />
  );
};

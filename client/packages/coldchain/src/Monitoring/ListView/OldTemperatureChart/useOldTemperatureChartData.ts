import { useMemo } from 'react';
import { useTheme } from '@common/styles';
import { DateUtils } from '@common/intl';
import { Sensor } from './OldTypes';
import { useUrlQueryParams } from '@common/hooks';
import {
  TemperatureChartFragment,
  useTemperatureChart,
} from '../../api/TemperatureChart';
import {
  DatetimeFilterInput,
  InputMaybe,
  TemperatureLogFilterInput,
} from '@common/types';

const MAX_DATA_POINTS = 30;
const BREACH_RANGE = 2;
const BREACH_MIN = 2;
const BREACH_MAX = 8;

const useFilterDates = (
  filterDatetime: InputMaybe<DatetimeFilterInput> | undefined
) => {
  const now = DateUtils.setMilliseconds(new Date(), 0);
  let fromDatetime = DateUtils.addDays(now, -1).toISOString();
  let toDatetime = now.toISOString();

  if (!!filterDatetime && typeof filterDatetime === 'object') {
    const hasAfterOrEqualTo =
      'afterOrEqualTo' in filterDatetime && !!filterDatetime['afterOrEqualTo'];

    if (hasAfterOrEqualTo)
      fromDatetime = String(filterDatetime['afterOrEqualTo']);

    if (
      'beforeOrEqualTo' in filterDatetime &&
      !!filterDatetime['beforeOrEqualTo']
    ) {
      toDatetime = String(filterDatetime['beforeOrEqualTo']);

      // the 'from' date needs to be before the 'to' date
      // if this isn't the case, and if 'from' is not set,
      // then set to a day prior to the 'to' date
      if (fromDatetime >= toDatetime && !hasAfterOrEqualTo) {
        fromDatetime = DateUtils.addDays(
          new Date(toDatetime),
          -1
        ).toISOString();
      }
    }
  }

  return useMemo(
    () => ({ fromDatetime, toDatetime }),
    [fromDatetime, toDatetime]
  );
};

export const useTemperatureChartData = () => {
  const theme = useTheme();
  const { filter } = useUrlQueryParams({
    filters: [
      {
        key: 'datetime',
        condition: 'between',
      },
      {
        key: 'sensor.name',
      },
      {
        key: 'location.code',
      },
      {
        key: 'temperatureBreach.type',
        condition: 'equalTo',
      },
    ],
  });

  // passing the datetime filters as well as the to/from datetimes
  // will result in no data
  const { datetime, ...filterBy } =
    filter?.filterBy as TemperatureLogFilterInput;
  const { fromDatetime, toDatetime } = useFilterDates(datetime);

  const { data, isLoading } = useTemperatureChart.document.chart({
    filterBy,
    numberOfDataPoints: MAX_DATA_POINTS,
    fromDatetime,
    toDatetime,
  });

  let minTemperature = BREACH_MIN;
  let maxTemperature = BREACH_MAX;

  const sensors: Sensor[] =
    data?.sensors?.map(({ points, sensor }, index) => {
      const id = sensor?.id ?? '';
      const name = sensor?.name ?? '';
      const colour =
        theme.palette.chart.lines[index % theme.palette.chart.lines.length];

      return {
        colour,
        id,
        name,
        logs: points.map(({ midPoint, temperature, breachIds }) => {
          if (temperature) {
            minTemperature = Math.min(minTemperature, temperature);
            maxTemperature = Math.max(maxTemperature, temperature);
          }
          const breach = !!breachIds?.length
            ? {
                sensor: { id, name },
                ids: breachIds,
              }
            : null;

          return {
            breach,
            date: DateUtils.getDateOrNull(midPoint)?.getTime() ?? 0,
            sensorId: id,
            temperature: temperature ?? null,
          };
        }),
      };
    }) ?? [];

  const breachConfig = generateBreachConfig(data);

  const yAxisDomain: [number, number] = [
    minTemperature - BREACH_RANGE,
    maxTemperature + BREACH_RANGE,
  ];

  return {
    filter,
    hasData: !!data?.sensors && data?.sensors?.length > 0,
    isLoading,
    sensors,
    breachConfig,
    yAxisDomain,
  };
};

const generateBreachConfig = (data?: TemperatureChartFragment) => {
  if (!data || !data.sensors || data.sensors.length === 0)
    return { cold: [], hot: [] };

  const sensor = data.sensors[0];

  if (!sensor || !sensor.points || sensor.points.length === 0)
    return { cold: [], hot: [] };

  // creating the full range of datetimes, otherwise it isn't showing full width
  return {
    cold: sensor.points.map(({ midPoint }) => ({
      date: new Date(midPoint),
      temperature: BREACH_MIN,
    })),
    hot: sensor.points.map(({ midPoint }) => ({
      date: new Date(midPoint),
      temperature: BREACH_MAX,
    })),
  };
};

import { DateUtils } from '@common/intl';
import { TemperatureLogFragment } from '../../../Monitoring/api';
import { ChartSeries } from './types';
import { FilterBy } from '@common/hooks';

export const NUMBER_OF_HORIZONTAL_LINES = 4;
export const BREACH_MIN = 2;
export const BREACH_MAX = 8;
export const BREACH_RANGE = 2;
export const MAX_DATA_POINTS = 8640;

export const transformData = (
  temperatureLogs: TemperatureLogFragment[],
  colours: string[]
): ChartSeries[] => {
  const sensorData: ChartSeries[] = [];

  const isBreach: Record<string, boolean> = {};

  temperatureLogs.forEach(log => {
    if (!log?.sensor) {
      return;
    }
    const sensorId = log.sensor.id;
    const sensorName = log.sensor.name;
    const sensorIndex = sensorData.findIndex(sensor => sensor.id === sensorId);

    let breachId = undefined;
    if (log.temperatureBreach) {
      if (!isBreach[log.sensor.id]) {
        // only add the breach on the first point for the breach
        breachId = log.temperatureBreach.id;
        isBreach[log.sensor.id] = true;
      }
    } else {
      isBreach[log.sensor.id] = false;
    }

    if (sensorIndex === -1) {
      sensorData.push({
        id: sensorId,
        name: sensorName,
        colour: colours[sensorData.length % colours.length] ?? 'black',
        data: [
          {
            datetime: DateUtils.getDateOrNull(log.datetime),
            temperature: log.temperature ?? null,
            breachId,
          },
        ],
      });
    } else {
      sensorData[sensorIndex]?.data.push({
        datetime: DateUtils.getDateOrNull(log.datetime),
        temperature: log.temperature ?? null,
        breachId,
      });
    }
  });

  return sensorData;
};

export const generateBreachConfig = (startTime: Date, endTime: Date) => {
  return {
    cold: [
      {
        datetime: new Date(startTime),
        temperature: BREACH_MIN,
      },
      {
        datetime: new Date(endTime),
        temperature: BREACH_MIN,
      },
    ],

    hot: [
      {
        datetime: new Date(startTime),
        temperature: BREACH_MAX,
      },
      {
        datetime: new Date(endTime),
        temperature: BREACH_MAX,
      },
    ],
  };
};

export const yAxisTicks = (
  data: TemperatureLogFragment[],
  breachMin?: number,
  breachMax?: number
) => {
  const temperatures = data.map(log => log.temperature).filter(Boolean);
  const minTemperature = Math.min(...temperatures);
  const maxTemperature = Math.max(...temperatures);
  const yAxisDomain: [number, number] = [
    minTemperature - BREACH_RANGE,
    maxTemperature + BREACH_RANGE,
  ];
  const tickSpace =
    (yAxisDomain[1] - yAxisDomain[0]) / (NUMBER_OF_HORIZONTAL_LINES + 1);
  const ticks = Array.from({ length: NUMBER_OF_HORIZONTAL_LINES }).map(
    (_, index) => Math.round((index + 1) * tickSpace)
  );
  ticks.push(Math.round(yAxisDomain[0]));
  ticks.push(breachMin ?? BREACH_MIN);
  ticks.push(breachMax ?? BREACH_MAX);
  ticks.push(Math.round(yAxisDomain[1]));
  ticks.sort((a, b) => (a > b ? 1 : -1));
  return {
    ticks,
    yAxisDomain,
  };
};

export const getDateRangeAndFilter = (
  filterBy: FilterBy | null
): {
  filterBy: FilterBy;
  fromDatetime: Date;
  toDatetime: Date;
} => {
  const now = DateUtils.setMilliseconds(new Date(), 0);
  let fromDatetime = DateUtils.addDays(now, -1);
  let toDatetime = now;
  const filterDatetime = filterBy?.['datetime'];

  if (!!filterDatetime && typeof filterDatetime === 'object') {
    const hasAfterOrEqualTo =
      'afterOrEqualTo' in filterDatetime && !!filterDatetime['afterOrEqualTo'];

    if (hasAfterOrEqualTo)
      fromDatetime = new Date(String(filterDatetime['afterOrEqualTo']));

    if (
      'beforeOrEqualTo' in filterDatetime &&
      !!filterDatetime['beforeOrEqualTo']
    ) {
      toDatetime = new Date(String(filterDatetime['beforeOrEqualTo']));

      // the 'from' date needs to be before the 'to' date
      // if this isn't the case, and if 'from' is not set,
      // then set to a day prior to the 'to' date
      if (fromDatetime >= toDatetime && !hasAfterOrEqualTo) {
        fromDatetime = DateUtils.addDays(new Date(toDatetime), -1);
      }
    }
  }

  return {
    filterBy: {
      ...filterBy,
      datetime: {
        afterOrEqualTo: fromDatetime.toISOString(),
        beforeOrEqualTo: toDatetime.toISOString(),
      },
    },
    fromDatetime,
    toDatetime,
  };
};

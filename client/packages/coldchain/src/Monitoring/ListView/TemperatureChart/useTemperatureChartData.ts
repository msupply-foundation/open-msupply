import { useTheme } from '@common/styles';
import { DateUtils } from '@common/intl';
import { Sensor } from './types';
import { useUrlQueryParams } from '@common/hooks';
import {
  TemperatureChartFragment,
  useTemperatureChart,
} from '../../api/TemperatureChart';
import { TemperatureLogFilterInput } from '@common/types';

const MAX_DATA_POINTS = 30;
const BREACH_RANGE = 2;
const BREACH_MIN = 2;
const BREACH_MAX = 8;

export const useTemperatureChartData = () => {
  const theme = useTheme();
  const { filter } = useUrlQueryParams({
    filters: [
      { key: 'datetime', condition: 'between' },
      {
        key: 'sensor.name',
      },
      {
        key: 'location.name',
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
  let fromDatetime = DateUtils.startOfToday().toISOString();
  let toDatetime = DateUtils.endOfDay(new Date()).toISOString();

  if (!!datetime && typeof datetime === 'object') {
    if ('afterOrEqualTo' in datetime)
      fromDatetime = String(datetime['afterOrEqualTo']);

    if ('beforeOrEqualTo' in datetime)
      toDatetime = String(datetime['beforeOrEqualTo']);
  }

  const { data, isLoading } = useTemperatureChart.document.chart({
    filterBy,
    numberOfDataPoints: MAX_DATA_POINTS,
    fromDatetime,
    toDatetime,
  });

  const sensors: Sensor[] = [];
  let minTemperature = BREACH_MIN;
  let maxTemperature = BREACH_MAX;

  data?.sensors?.forEach(({ points, sensor }) => {
    if (!sensor) return;

    const sensorIndex = sensors.findIndex(s => s.id === sensor.id);
    if (sensorIndex === -1) {
      sensors.push({
        colour:
          theme.palette.chart.lines[
            sensors.length % theme.palette.chart.lines.length
          ],
        id: sensor.id,
        name: sensor.name,
        logs: points.map(({ midPoint, temperature, breachIds }) => {
          if (temperature) {
            minTemperature = Math.min(minTemperature, temperature);
            maxTemperature = Math.max(maxTemperature, temperature);
          }
          const breach = !!breachIds?.length
            ? {
                sensor: { id: sensor.id, name: sensor.name },
                ids: breachIds,
              }
            : null;

          return {
            breach,
            date: DateUtils.getDateOrNull(midPoint)?.getTime() ?? 0,
            sensorId: sensor.id,
            temperature: temperature ?? null,
          };
        }),
      });
    }
  });

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

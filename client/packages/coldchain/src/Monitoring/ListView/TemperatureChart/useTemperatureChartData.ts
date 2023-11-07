import { useTheme } from '@common/styles';
import { useTemperatureLog } from '../../api';
import { DateUtils } from '@common/intl';
import { NumUtils } from '@common/utils';
import { Log, Sensor } from './types';
import { useUrlQueryParams } from '@common/hooks';
import { temperatureLogFilterAndSort } from '../TemperatureLog/TemperatureLogList';

const MAX_DATA_POINTS = 30;
const BREACH_RANGE = 2;

export const useTemperatureChartData = () => {
  const theme = useTheme();
  const { filter, queryParams } = useUrlQueryParams(
    temperatureLogFilterAndSort
  );

  const { data, isLoading } = useTemperatureLog.document.list(queryParams);
  const sensors: Sensor[] = [];
  const logs: Log[] = [];
  let minTemperature = 2;
  let maxTemperature = 2;

  data?.nodes?.forEach(
    ({ datetime, temperature, sensor, temperatureBreach }) => {
      if (!sensor) return;
      let sensorIndex = sensors.findIndex(s => s.id === sensor.id);
      if (sensorIndex === -1) {
        sensors.push({
          colour:
            theme.palette.chart.lines[
              sensors.length % theme.palette.chart.lines.length
            ],
          id: sensor.id,
          name: sensor.name,
          logs: [],
        });
        sensorIndex = sensors.length - 1;
      }

      const date = DateUtils.getDateOrNull(datetime);
      if (date === null) return;

      logs.push({
        date: date.getTime(),
        sensorId: sensor.id,
        temperature,
        breach: temperatureBreach ? { row: temperatureBreach, sensor } : null,
      });
      minTemperature = Math.min(minTemperature, temperature);
      maxTemperature = Math.max(maxTemperature, temperature);
    }
  );
  const numOfDataPoints = Math.min(MAX_DATA_POINTS, logs.length);
  // the fromDate & toDate will come from filters
  // until that is implemented, we will use the first and last log dates
  const sortedLogs = logs.sort((a, b) => a.date - b.date);
  const fromDate = sortedLogs[0]?.date ?? new Date().getTime();
  const toDate =
    sortedLogs[sortedLogs.length - 1]?.date ?? new Date().getTime();

  const chartDuration = toDate - fromDate;
  const periodDuration = chartDuration / numOfDataPoints;

  sensors.forEach(sensor => {
    sensor.logs = Array.from({
      length: numOfDataPoints,
    }).map((_, i) => {
      const periodStart = new Date(fromDate + periodDuration * i).getTime();
      const periodEnd = new Date(fromDate + periodDuration * (i + 1)).getTime();
      const logsInPeriod = logs.filter(
        l =>
          l.date >= periodStart &&
          l.date <= periodEnd &&
          l.sensorId === sensor.id
      );
      const breach = logsInPeriod.filter(l => !!l.breach)[0]?.breach || null;

      return {
        date: periodStart,
        breach,
        sensorId: sensor.id,
        temperature: logsInPeriod.length
          ? NumUtils.round(
              logsInPeriod.reduce((sum, l) => sum + (l.temperature ?? 0), 0) /
                logsInPeriod.length,
              2
            )
          : null,
      };
    });
  });

  // creating the full range of datetimes, otherwise it isn't showing full width
  const breachConfig = {
    cold: Array.from({
      length: numOfDataPoints,
    }).map((_, i) => ({
      date: new Date(fromDate + periodDuration * i),
      temperature: 2,
    })),
    hot: Array.from({
      length: numOfDataPoints,
    }).map((_, i) => ({
      date: new Date(fromDate + periodDuration * i),
      temperature: 8,
    })),
  };
  const yAxisDomain: [number, number] = [
    minTemperature - BREACH_RANGE,
    maxTemperature + BREACH_RANGE,
  ];

  return {
    filter,
    hasData: logs.length > 0,
    isLoading,
    sensors,
    breachConfig,
    yAxisDomain,
  };
};

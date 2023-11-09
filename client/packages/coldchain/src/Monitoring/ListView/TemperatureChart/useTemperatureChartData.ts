import { useTheme } from '@common/styles';
import { useTemperatureLog } from '../../api';
import { DateUtils } from '@common/intl';
import { NumUtils } from '@common/utils';
import { Log, Sensor } from './types';
import { useUrlQueryParams } from '@common/hooks';

const MAX_DATA_POINTS = 30;

export const useTemperatureChartData = () => {
  const theme = useTheme();
  const { filter, queryParams } = useUrlQueryParams({
    initialSort: { key: 'datetime', dir: 'desc' },
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

  const { data, isLoading } = useTemperatureLog.document.list(queryParams);
  const sensors: Sensor[] = [];
  const logs: Log[] = [];

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

  return {
    filter,
    hasData: logs.length > 0,
    isLoading,
    sensors,
    breachConfig,
  };
};

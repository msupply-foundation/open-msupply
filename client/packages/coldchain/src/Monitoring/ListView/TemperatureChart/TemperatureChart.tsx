import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
import {
  Box,
  CartesianGrid,
  ChartTooltip,
  CircularProgress,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Typography,
  XAxis,
  YAxis,
  useTheme,
} from '@openmsupply-client/common';
import React from 'react';
import { useTemperatureLog } from '../../api/TemperatureLog';

type Log = {
  temperature: number;
  date: Date | null;
};

type Sensor = {
  colour: string | undefined;
  id: string;
  name: string;
  logs: Log[];
};

export const TemperatureChart = () => {
  // TODO isError ??
  const { data, isLoading } = useTemperatureLog.document.list();
  const t = useTranslation('coldchain');
  const theme = useTheme();
  const sensors: Sensor[] = [];
  const logs: Log[] = [];
  data?.nodes?.forEach(({ datetime, temperature, sensor }) => {
    if (!sensor) return;
    let sensorIndex = sensors.findIndex(s => s.id === sensor.id);
    if (sensorIndex === -1) {
      sensors.push({
        colour:
          theme.palette.chartLine[
            sensors.length % theme.palette.chartLine.length
          ],
        id: sensor.id,
        name: sensor.name,
        logs: [],
      });
      sensorIndex = sensors.length - 1;
    }

    sensors[sensorIndex]?.logs.push({
      date: DateUtils.getDateOrNull(datetime),
      temperature,
    });
    logs.push({
      date: DateUtils.getDateOrNull(datetime),
      temperature,
    });
  });

  const { dayMonthTime } = useFormatDateTime();
  const dateFormatter = (date: string) => dayMonthTime(date);
  const tooltipLabelFormatter = (date: string) => dateFormatter(date);

  return isLoading ? (
    <CircularProgress />
  ) : (
    <Box flex={1}>
      <Box flex={1} padding={2} sx={{ textAlign: 'center' }}>
        <Typography
          variant="body1"
          fontWeight={700}
          style={{ marginBottom: 10 }}
        >
          {t('heading.chart')}
        </Typography>
      </Box>
      <Box>
        {data?.nodes?.length === 0 ? (
          <Typography width={450}>{t('error.no-data')}</Typography>
        ) : (
          <ResponsiveContainer width="90%" height="90%">
            <ComposedChart>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={dateFormatter}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={value => `${value}°C`}
              />
              <ChartTooltip
                // formatter={tooltipFormatter}
                labelFormatter={tooltipLabelFormatter}
                labelStyle={{ fontWeight: 700 }}
              />
              <Legend
                align="right"
                verticalAlign="top"
                layout="vertical"
                content={({ payload }) => (
                  <ul>
                    {payload?.map((entry, index) => (
                      <li
                        key={`${entry.id}_legend`}
                        style={{
                          display: 'block',
                          marginRight: 10,
                          borderWidth: 0,
                          borderBottomWidth: 1,
                          borderTopWidth: index === 0 ? 1 : 0,
                          borderStyle: 'solid',
                          borderColor: theme.palette.gray.light,
                          padding: 3,
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 32 32"
                          style={{
                            display: 'inline-block',
                            verticalAlign: 'middle',
                            marginRight: 4,
                          }}
                        >
                          <path
                            stroke="none"
                            fill={entry.color}
                            d="M0,8h32v12h-32z"
                          ></path>
                        </svg>
                        <span>{entry.value}</span>
                      </li>
                    ))}
                  </ul>
                )}
                payload={sensors.map(sensor => ({
                  value: sensor.name,
                  type: 'rect',
                  id: sensor.id,
                  color: sensor.colour,
                }))}
              />
              {sensors.map(sensor => (
                <Line
                  data={sensor.logs}
                  key={sensor.id}
                  dataKey="temperature"
                  stroke={sensor.colour}
                  type="monotone"
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Box>
  );
};

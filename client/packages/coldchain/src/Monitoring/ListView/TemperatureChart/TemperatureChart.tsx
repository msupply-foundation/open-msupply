import React from 'react';
import { useFormatDateTime, useTranslation } from '@common/intl';
import {
  Box,
  CartesianGrid,
  ChartTooltip,
  CircularProgress,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  TooltipProps,
  Typography,
  XAxis,
  YAxis,
  useTheme,
} from '@openmsupply-client/common';
import { useTemperatureChartData } from './temperatureUtils';
import { TemperatureTooltipLayout } from './TemperatureTooltipLayout';

const formatTemperature = (value: number | null) =>
  value === null ? '-' : `${value}°C`;

export const TemperatureChart = () => {
  const t = useTranslation('coldchain');
  const theme = useTheme();
  const { hasData, isLoading, sensors } = useTemperatureChartData();
  const { dayMonthTime } = useFormatDateTime();
  const dateFormatter = (date: string) => dayMonthTime(date);

  const TemperatureTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;

    const date = payload[0]?.payload?.date.getTime();
    const entries = sensors.map(sensor => {
      const entry = sensor.logs.find(log => log.date.getTime() === date);
      if (!entry) return null;
      return {
        name: sensor.name,
        value: formatTemperature(entry.temperature),
        id: sensor.id,
        color: sensor.colour,
      };
    });

    return <TemperatureTooltipLayout entries={entries} label={label} />;
  };

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
        {hasData ? (
          <ResponsiveContainer width="90%" height="90%">
            <ComposedChart>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={dateFormatter}
                tick={{ fontSize: 12 }}
                allowDuplicatedCategory={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={formatTemperature}
              />
              <ChartTooltip content={TemperatureTooltip} />
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
        ) : (
          <Typography width={450}>{t('error.no-data')}</Typography>
        )}
      </Box>
    </Box>
  );
};

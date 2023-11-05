import React from 'react';
import { useFormatDateTime, useTranslation } from '@common/intl';
import {
  Area,
  BasicSpinner,
  Box,
  CartesianGrid,
  ChartTooltip,
  ComposedChart,
  Legend,
  Line,
  NothingHere,
  ResponsiveContainer,
  TooltipProps,
  Typography,
  XAxis,
  YAxis,
  useTheme,
} from '@openmsupply-client/common';
import { useTemperatureChartData } from './useTemperatureChartData';
import { TemperatureTooltipLayout } from './TemperatureTooltipLayout';
import { BreachPopover } from './BreachPopover';
import { BreachDot, DotProps } from './types';
import { BreachIndicator } from './BreachIndicator';

export const TemperatureChart = () => {
  const t = useTranslation('coldchain');
  const theme = useTheme();
  const { breachConfig, hasData, isLoading, sensors } =
    useTemperatureChartData();
  const { dayMonthTime } = useFormatDateTime();
  const dateFormatter = (date: string) => dayMonthTime(date);
  const [currentBreach, setCurrentBreach] = React.useState<BreachDot | null>(
    null
  );

  const formatTemperature = (value: number | null) =>
    value === null ? '-' : `${value}${t('label.temperature-unit')}`;

  const TemperatureTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;

    const date = payload[0]?.payload?.date;
    const entries = sensors.map(sensor => {
      const entry = sensor.logs.find(log => log.date === date.getTime());
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

  // shows a breach icon if there is a breach
  // and nothing otherwise
  const TemperatureLineDot = React.useCallback(
    ({ cx, cy, payload }: DotProps) =>
      !payload?.breach ? (
        <></>
      ) : (
        <BreachIndicator
          cx={cx}
          cy={cy}
          payload={payload}
          setCurrentBreach={setCurrentBreach}
        />
      ),
    [setCurrentBreach]
  );

  if (isLoading) {
    return <BasicSpinner />;
  }

  if (!hasData) {
    return <NothingHere body={t('error.no-temperature-logs')} />;
  }

  return (
    <Box flex={1} padding={2} sx={{ textAlign: 'center' }}>
      <Typography variant="body1" fontWeight={700} style={{ marginBottom: 10 }}>
        {t('heading.chart')}
      </Typography>

      <ResponsiveContainer width="90%" height="90%">
        <ComposedChart>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={dateFormatter}
            tick={{ fontSize: 12 }}
            allowDuplicatedCategory={false}
          />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatTemperature} />
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
          <Area
            data={breachConfig.hot}
            type="monotone"
            dataKey="temperature"
            stroke={theme.palette.chart.hot.main}
            fill={theme.palette.chart.hot.light}
            baseValue="dataMax"
          />
          <Area
            data={breachConfig.cold}
            type="monotone"
            dataKey="temperature"
            stroke={theme.palette.chart.cold.main}
            fill={theme.palette.chart.cold.light}
          />
          {sensors.map(sensor => (
            <Line
              data={sensor.logs}
              key={sensor.id}
              dataKey="temperature"
              stroke={sensor.colour}
              type="monotone"
              dot={({ key, ...rest }) => (
                <TemperatureLineDot {...rest} key={`${sensor.id}_${key}`} />
              )}
              strokeWidth={4}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      {currentBreach && (
        <BreachPopover
          breachDot={currentBreach}
          onClose={() => setCurrentBreach(null)}
        />
      )}
    </Box>
  );
};

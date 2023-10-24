import React from 'react';
import { useFormatDateTime, useTranslation } from '@common/intl';
import {
  Area,
  BasicSpinner,
  Box,
  CartesianGrid,
  ChartTooltip,
  CircleAlertIcon,
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
import { useTemperatureChartData } from './useTemperatureChartData';
import { TemperatureTooltipLayout } from './TemperatureTooltipLayout';

import { TemperatureBreachRowFragment } from '../../api';
import { BreachPopper } from './BreachPopper';

const formatTemperature = (value: number | null) =>
  value === null ? '-' : `${value}°C`;

type DotPayload = {
  date: Date;
  temperature: number;
  breach?: TemperatureBreachRowFragment;
  sensorId: string;
};
export type PopperProps = {
  x: number;
  y: number;
  visible: boolean;
  payload?: DotPayload;
};

export const TemperatureChart = () => {
  const t = useTranslation('coldchain');
  const theme = useTheme();
  const { breachConfig, hasData, isLoading, sensors } =
    useTemperatureChartData();
  const { dayMonthTime } = useFormatDateTime();
  const dateFormatter = (date: string) => dayMonthTime(date);
  const [popperProps, setPopperProps] = React.useState<PopperProps>({
    x: 0,
    y: 0,
    visible: false,
  });

  const BreachIcon = (props: {
    cx: number;
    cy: number;
    payload: DotPayload;
  }) => {
    const { cx, cy, payload } = props;
    const theme = useTheme();

    if (payload.breach === undefined) return null;

    return (
      <CircleAlertIcon
        onClick={event =>
          setPopperProps({
            x: event.clientX + 5,
            y: event.clientY + 5,
            visible: true,
            payload,
          })
        }
        x={cx - 13.5}
        y={cy + 13.5}
        fill={theme.palette.error.main}
        sx={{ color: 'background.white', cursor: 'pointer' }}
        width={27}
        height={27}
      />
    );
  };

  const TemperatureTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;

    const date = payload[0]?.payload?.date;
    const entries = sensors.map(sensor => {
      const entry = sensor.logs.find(
        log => log.date.getTime() === date.getTime()
      );
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
    <BasicSpinner />
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
                  dot={props => <BreachIcon {...props} />}
                  strokeWidth={2}
                />
              ))}
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
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <Typography width={450}>{t('error.no-data')}</Typography>
        )}
      </Box>
      <BreachPopper
        {...popperProps}
        onClose={() => setPopperProps({ ...popperProps, visible: false })}
        sensors={sensors}
      />
    </Box>
  );
};

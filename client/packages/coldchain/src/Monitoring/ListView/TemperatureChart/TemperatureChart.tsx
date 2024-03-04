import React, { useEffect } from 'react';
import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
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
  NumUtils,
  ResponsiveContainer,
  TooltipProps,
  Typography,
  XAxis,
  YAxis,
  useTheme,
  useUrlQuery,
} from '@openmsupply-client/common';
import { useTemperatureChartData } from './useTemperatureChartData';
import { TemperatureTooltipLayout } from './TemperatureTooltipLayout';
import { BreachPopover } from './BreachPopover';
import { BreachConfig, BreachDot, DotProps, Sensor } from './types';
import { BreachIndicator } from './BreachIndicator';
import { Toolbar } from '../TemperatureLog/Toolbar';
import { useFormatTemperature } from '../../../common';

const NUMBER_OF_HORIZONTAL_LINES = 4;
const LOWER_THRESHOLD = 2;
const UPPER_THRESHOLD = 8;

const Chart = ({
  breachConfig,
  hasData,
  isLoading,
  sensors,
  yAxisDomain,
}: {
  breachConfig: BreachConfig;
  hasData: boolean;
  isLoading: boolean;
  sensors: Sensor[];
  yAxisDomain: [number, number];
}) => {
  const t = useTranslation('coldchain');
  const theme = useTheme();
  const { dayMonthTime, customDate } = useFormatDateTime();
  const dateFormatter = (date: string) => dayMonthTime(date);
  const [currentBreach, setCurrentBreach] = React.useState<BreachDot | null>(
    null
  );
  const { urlQuery, updateQuery } = useUrlQuery();
  const formatTemp = useFormatTemperature;

  const formatTemperature = (value: number | null) =>
    !!value ? `${formatTemp(NumUtils.round(value, 2))}` : '-';

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

  const tickSpace =
    (yAxisDomain[1] - yAxisDomain[0]) / (NUMBER_OF_HORIZONTAL_LINES + 1);
  const ticks = Array.from({ length: NUMBER_OF_HORIZONTAL_LINES }).map(
    (_, index) => Math.round((index + 1) * tickSpace)
  );
  ticks.push(Math.round(yAxisDomain[0]));
  ticks.push(LOWER_THRESHOLD);
  ticks.push(UPPER_THRESHOLD);
  ticks.push(Math.round(yAxisDomain[1]));
  ticks.sort((a, b) => (a > b ? 1 : -1));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomisedTick = ({ x, y, payload }: any) => {
    const theme = useTheme();
    const textColour =
      payload.value === LOWER_THRESHOLD
        ? theme.palette.chart.cold.main
        : payload.value === UPPER_THRESHOLD
        ? theme.palette.chart.hot.main
        : theme.palette.gray.dark;
    return (
      <g>
        <line x={x} y={y} stroke={theme.palette.gray.dark}></line>
        <text
          x={x}
          y={y}
          fill={textColour}
          textAnchor="end"
          style={{
            fontSize: 12,
            fontWeight:
              payload.value === LOWER_THRESHOLD ||
              payload.value === UPPER_THRESHOLD
                ? 'bold'
                : '',
          }}
        >
          <tspan dy="0.355em">{formatTemperature(payload.value)}</tspan>
        </text>
      </g>
    );
  };

  useEffect(() => {
    if (!urlQuery['datetime']) {
      const from = customDate(
        DateUtils.addDays(new Date(), -1),
        'yyyy-MM-dd HH:mm'
      );
      const to = customDate(new Date(), 'yyyy-MM-dd HH:mm');
      updateQuery({ datetime: { from, to } });
    }
  }, []);

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
          <YAxis ticks={ticks} tick={<CustomisedTick />} domain={yAxisDomain} />
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
                      textAlign: 'left',
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
            baseValue="dataMin"
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

export const TemperatureChart = () => {
  const { breachConfig, filter, hasData, isLoading, sensors, yAxisDomain } =
    useTemperatureChartData();
  return (
    <>
      <Toolbar filter={filter} />
      <Chart
        breachConfig={breachConfig}
        hasData={hasData}
        isLoading={isLoading}
        sensors={sensors}
        yAxisDomain={yAxisDomain}
      />
    </>
  );
};

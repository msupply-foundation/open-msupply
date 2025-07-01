import React, { useCallback, useEffect, useState } from 'react';
import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
import {
  Area,
  BasicSpinner,
  Box,
  CartesianGrid,
  ChartTooltip,
  ComposedChart,
  Dot,
  Legend,
  Line,
  NothingHere,
  ResponsiveContainer,
  Typography,
  UNDEFINED_STRING_VALUE,
  XAxis,
  YAxis,
  useMediaQuery,
  useAppTheme,
  useUrlQuery,
  Breakpoints,
} from '@openmsupply-client/common';
import { BreachPopover } from './BreachPopover';
import { BreachDot, DotProps } from './types';
import { BreachIndicator } from './BreachIndicator';
import { useFormatTemperature } from '../..';
import { TemperatureLogFragment } from '../../../Monitoring/api';
import { Tooltip } from './Tooltip';
import {
  BREACH_MAX,
  BREACH_MIN,
  generateBreachConfig,
  transformData,
  yAxisTicks,
} from './utils';

const ActiveDot = (
  {
    cx,
    cy,
    stroke,
    payload,
    fill,
    r,
    strokeWidth, // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }: any // annoyingly, specifying DotProps here causes a type error
) =>
  payload?.breachId ? (
    <></>
  ) : (
    <Dot
      cx={cx}
      cy={cy}
      r={r}
      stroke={stroke}
      fill={fill}
      strokeWidth={strokeWidth}
    />
  );

export const Chart = ({
  data,
  dataTruncated,
  startTime,
  endTime,
  isLoading,
}: {
  data?: TemperatureLogFragment[];
  dataTruncated: boolean;
  startTime: Date;
  endTime: Date;
  isLoading: boolean;
}) => {
  const t = useTranslation();
  const theme = useAppTheme();
  const isExtraSmallScreen = useMediaQuery(
    theme.breakpoints.down(Breakpoints.sm)
  );

  const { dayMonthTime, customDate } = useFormatDateTime();
  const dateFormatter = (date: Date) => dayMonthTime(date);
  const [currentBreach, setCurrentBreach] = useState<BreachDot | null>(null);
  const { urlQuery, updateQuery } = useUrlQuery();
  const formatTemp = useFormatTemperature();

  const formatTemperature = (value: number | null | undefined) =>
    !!value ? `${formatTemp(value)}` : UNDEFINED_STRING_VALUE;

  useEffect(() => {
    if (!urlQuery['datetime']) {
      const from = customDate(
        DateUtils.addDays(new Date(), -1),
        'yyyy-MM-dd HH:mm'
      );
      const to = customDate(new Date(), 'yyyy-MM-dd HH:mm');
      updateQuery({ datetime: { from, to } });
    }
  }, [customDate, updateQuery, urlQuery]);

  // Renders a breach icon if a breach is detected, otherwise nothing.
  const TemperatureLineDot = useCallback(
    ({ cx, cy, stroke, payload, fill, r, strokeWidth }: DotProps) => {
      return !payload?.breachId ? (
        <Dot
          cx={cx}
          cy={cy}
          r={r * 0.5}
          stroke={stroke}
          fill={fill}
          strokeWidth={strokeWidth}
          clipDot={true}
        />
      ) : (
        <BreachIndicator
          cx={cx}
          cy={cy}
          payload={payload}
          setCurrentBreach={setCurrentBreach}
        />
      );
    },
    [setCurrentBreach]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomisedTick = ({ x, y, payload }: any) => {
    const textColour =
      payload.value === BREACH_MIN
        ? theme.palette.chart.cold.main
        : payload.value === BREACH_MAX
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
              payload.value === BREACH_MIN || payload.value === BREACH_MAX
                ? 'bold'
                : '',
          }}
        >
          <tspan dy="0.355em">{formatTemperature(payload.value)}</tspan>
        </text>
      </g>
    );
  };

  if (isLoading) {
    return <BasicSpinner />;
  }

  if (!data) {
    return <NothingHere body={t('error.no-temperature-logs')} />;
  }

  const series = transformData(data, theme.palette.chart.lines);
  const breachConfig = generateBreachConfig(startTime, endTime);
  const { ticks, yAxisDomain } = yAxisTicks(data, BREACH_MIN, BREACH_MAX);

  return !series.length ? (
    <NothingHere body={t('error.no-temperature-logs')} />
  ) : (
    <Box
      sx={{
        flex: 1,
        py: 2,
        px: isExtraSmallScreen ? 0 : 2,
        textAlign: 'center',
      }}
    >
      <Typography variant="body1" fontWeight={700} style={{ marginBottom: 10 }}>
        {t('heading.chart')}
      </Typography>
      {dataTruncated && (
        <Typography variant="body2" color="error">
          {t('error.too-many-datapoints')}
        </Typography>
      )}
      <ResponsiveContainer
        width={isExtraSmallScreen ? '100%' : '90%'}
        height="90%"
        style={{ marginLeft: isExtraSmallScreen ? '-15px' : 0 }}
      >
        <ComposedChart>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="datetime"
            tickFormatter={(date: string) => dateFormatter(new Date(date))}
            tick={{ fontSize: 12 }}
            type="number"
            tickCount={9}
            domain={[startTime.valueOf(), endTime.valueOf()]}
            allowDuplicatedCategory={false}
          />
          <YAxis ticks={ticks} tick={<CustomisedTick />} domain={yAxisDomain} />
          <Area
            data={breachConfig.hot}
            type="monotone"
            dataKey="temperature"
            stroke={theme.palette.chart.hot.main}
            fill={theme.palette.chart.hot.light}
            baseValue="dataMax"
            isAnimationActive={false}
          />
          <Area
            data={breachConfig.cold}
            type="monotone"
            dataKey="temperature"
            stroke={theme.palette.chart.cold.main}
            fill={theme.palette.chart.cold.light}
            baseValue="dataMin"
            isAnimationActive={false}
          />
          {series.map(sensor => (
            <Line
              key={sensor.id}
              type="monotone"
              dataKey="temperature"
              data={sensor.data}
              name={sensor.name}
              strokeDasharray="7 2"
              connectNulls={false}
              fill={sensor.colour}
              stroke={sensor.colour}
              dot={({ key, ...rest }) => (
                <TemperatureLineDot {...rest} key={`${sensor.id}_${key}`} />
              )}
              activeDot={ActiveDot}
              isAnimationActive={false}
            />
          ))}
          <Legend
            align="right"
            verticalAlign="top"
            layout={isExtraSmallScreen ? 'horizontal' : 'vertical'}
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
            payload={series.map(sensor => ({
              value: sensor.name,
              type: 'rect',
              id: sensor.id,
              color: sensor.colour,
            }))}
          />
          <ChartTooltip content={Tooltip} />
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

import React, { useEffect } from 'react';
import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
import {
  Area,
  BasicSpinner,
  Box,
  CartesianGrid,
  ChartTooltip,
  ComposedChart,
  FilterByWithBoolean,
  Legend,
  Line,
  NothingHere,
  ResponsiveContainer,
  TooltipProps,
  Typography,
  XAxis,
  YAxis,
  useTheme,
  useUrlQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { Entry, TemperatureTooltipLayout } from './TemperatureTooltipLayout';
import { BreachPopover } from './BreachPopover';
import { BreachDot, DotProps, ChartSeries } from './types';
import { BreachIndicator } from './BreachIndicator';
import { Toolbar } from '../TemperatureLog/Toolbar';
import { useFormatTemperature } from '../../../common';
import { TemperatureLogFragment } from '../../api';
import { useTemperatureLogs } from '../../api/TemperatureLog/hooks/document/useTemperatureLogs';

import { scaleTime } from 'd3-scale';
import { Dot, XAxisProps } from 'recharts';

const NUMBER_OF_HORIZONTAL_LINES = 4;
const BREACH_MIN = 2;
const BREACH_MAX = 8;
const BREACH_RANGE = 2;
const MAX_DATA_POINTS = 8640; // 30days for 1 sensor at a 5 minute interval

const transformData = (
  temperatureLogs: TemperatureLogFragment[],
  colours: string[]
): ChartSeries[] => {
  const sensorData: ChartSeries[] = [];

  const isBreach: Record<string, boolean> = {};

  for (let i = 0; i < temperatureLogs.length; i++) {
    const log = temperatureLogs[i];
    if (!log?.sensor) {
      continue;
    }
    const sensorId = log.sensor.id;
    const sensorName = log.sensor.name;
    const sensorIndex = sensorData.findIndex(sensor => sensor.id === sensorId);

    let breachId = undefined;
    if (log.temperatureBreach && !isBreach[log.sensor.id]) {
      breachId = log.temperatureBreach.id;
      isBreach[log.sensor.id] = true;
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
  }

  return sensorData;
};

const generateBreachConfig = (startTime: Date, endTime: Date) => {
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

const yAxisTicks = (
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

const Chart = ({
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
  const t = useTranslation('coldchain');
  const theme = useTheme();
  const { dayMonthTime, customDate } = useFormatDateTime();
  const dateFormatter = (date: Date) => dayMonthTime(date);
  const [currentBreach, setCurrentBreach] = React.useState<BreachDot | null>(
    null
  );
  const { urlQuery, updateQuery } = useUrlQuery();
  const formatTemp = useFormatTemperature();

  const formatTemperature = (value: number | null | undefined) =>
    !!value ? `${formatTemp(value)}` : '-';

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

  // shows a breach icon if there is a breach
  // and nothing otherwise
  const TemperatureLineDot = React.useCallback(
    ({ cx, cy, payload }: DotProps) => {
      return !payload?.breachId ? (
        <></>
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

  if (isLoading) {
    return <BasicSpinner />;
  }

  if (!data) {
    return <NothingHere body={t('error.no-temperature-logs')} />;
  }

  const TemperatureTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) => {
    if (!active || !payload) {
      return null;
    }
    // Payload looks something like this
    /*
    [
    {
        "name": "Sensor 1",
        "strokeDasharray": "7 2",
        "fill": "#922DD0",
        "stroke": "#922DD0",
        "strokeWidth": 1,
        "dataKey": "temperature",
        "color": "#922DD0",
        "value": 23.5,
        "payload": {
            "datetime": "2024-02-08T04:10:12.000Z",
            "temperature": 23.5
        }
    }
    ]
    */

    const entries: Entry[] = payload?.map(entry => {
      return {
        name: entry.name ?? '',
        value: formatTemperature(entry.value),
        id: entry.name ?? '' + entry.value,
        color: entry.color,
      };
    });

    return <TemperatureTooltipLayout entries={entries} label={label} />;
  };

  const series = transformData(data, theme.palette.chart.lines);
  const breachConfig = generateBreachConfig(startTime, endTime);

  const { ticks, yAxisDomain } = yAxisTicks(data, BREACH_MIN, BREACH_MAX);
  const timeScale = scaleTime().domain([startTime, endTime]);
  const xAxisArgs: XAxisProps = {
    domain: timeScale.domain().map(date => date.valueOf()),
    scale: timeScale,
    type: 'number',
    ticks: timeScale.ticks(9).map(date => date.valueOf()),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomisedTick = ({ x, y, payload }: any) => {
    const theme = useTheme();
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

  return (
    <Box flex={1} padding={2} sx={{ textAlign: 'center' }}>
      <Typography variant="body1" fontWeight={700} style={{ marginBottom: 10 }}>
        {t('heading.chart')}
      </Typography>
      {dataTruncated && (
        <Typography variant="body2" color="error">
          {t('error.too-many-datapoints')}
        </Typography>
      )}
      <ResponsiveContainer width="90%" height="90%">
        <ComposedChart>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="datetime"
            tickFormatter={(date: string) => {
              return dateFormatter(new Date(date));
            }}
            tick={{ fontSize: 12 }}
            {...xAxisArgs}
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
              activeDot={({
                cx,
                cy,
                stroke,
                payload,
                fill,
                r,
                strokeWidth,
              }) => {
                if (payload?.breachId) {
                  return <></>;
                }
                return (
                  <Dot
                    cx={cx}
                    cy={cy}
                    r={r}
                    stroke={stroke}
                    fill={fill}
                    strokeWidth={strokeWidth}
                  ></Dot>
                );
              }}
              isAnimationActive={false}
            />
          ))}
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
            payload={series.map(sensor => ({
              value: sensor.name,
              type: 'rect',
              id: sensor.id,
              color: sensor.colour,
            }))}
          />
          <ChartTooltip content={TemperatureTooltip} />
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

const temperatureLogFilterAndSort = {
  initialSort: { key: 'datetime', dir: 'asc' as 'asc' | 'desc' },
  filters: [
    { key: 'datetime', condition: 'between' },
    {
      key: 'sensor.name',
    },
    {
      key: 'location.code',
    },
    {
      key: 'temperatureBreach.type',
      condition: 'equalTo',
    },
  ],
};

const getDateRangeAndFilter = (
  filterBy: FilterByWithBoolean | null
): { filterBy: FilterByWithBoolean; fromDatetime: Date; toDatetime: Date } => {
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

export const TemperatureChart = () => {
  const {
    filter,
    queryParams: { filterBy },
  } = useUrlQueryParams(temperatureLogFilterAndSort);

  const {
    filterBy: updatedFilterBy,
    fromDatetime,
    toDatetime,
  } = getDateRangeAndFilter(filterBy);

  const queryParams = {
    filterBy: updatedFilterBy,
    offset: 0,
    sortBy: { key: 'datetime', direction: 'asc' as 'asc' | 'desc' },
    first: MAX_DATA_POINTS,
  };

  const { data, isLoading } = useTemperatureLogs(queryParams);
  const dataTruncated = (data?.totalCount ?? 0) > (data?.nodes.length ?? 0);
  return (
    <>
      <Toolbar filter={filter} />
      <Chart
        isLoading={isLoading}
        data={data?.nodes ?? []}
        dataTruncated={dataTruncated}
        startTime={fromDatetime}
        endTime={toDatetime}
      />
    </>
  );
};

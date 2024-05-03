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
import { BreachConfig, BreachDot, DotProps, Sensor } from './types';
import { BreachIndicator } from './BreachIndicator';
import { Toolbar } from '../TemperatureLog/Toolbar';
import { useFormatTemperature } from '../../../common';
import { TemperatureLogFragment, useTemperatureLog } from '../../api';

import { scaleTime } from 'd3-scale';
import { Tooltip, XAxisProps } from 'recharts';
import { d } from 'msw/lib/glossary-de6278a9';
import { useTemperatureLogs } from '../../api/TemperatureLog/hooks/document/useTemperatureLogs';

const BREACH_MIN = 2;
const BREACH_MAX = 8;
const MAX_DATA_POINTS = 8640; // 30days for 1 sensor at a 5 minute interval

interface DataPoint {
  datetime: Date | null;
  temperature: number | null;
}

interface ChartSeries {
  id: string;
  name: string;
  colour: string;
  data: DataPoint[];
}

const transformData = (
  temperatureLogs: TemperatureLogFragment[],
  colours: string[]
): ChartSeries[] => {
  const sensorData: ChartSeries[] = [];

  for (let i = 0; i < temperatureLogs.length; i++) {
    const log = temperatureLogs[i];
    if (!log?.sensor) {
      continue;
    }
    const sensorId = log.sensor.id;
    const sensorName = log.sensor.name;
    const sensorIndex = sensorData.findIndex(sensor => sensor.id === sensorId);

    if (sensorIndex === -1) {
      sensorData.push({
        id: sensorId,
        name: sensorName,
        colour: colours[sensorData.length % colours.length] ?? 'black',
        data: [
          {
            datetime: DateUtils.getDateOrNull(log.datetime),
            temperature: log.temperature ?? null,
          },
        ],
      });
    } else {
      sensorData[sensorIndex]?.data.push({
        datetime: DateUtils.getDateOrNull(log.datetime),
        temperature: log.temperature ?? null,
      });
    }
  }

  return sensorData;
};

const generateBreachConfig = (startTime: Date, endTime: Date) => {
  // creating the full range of datetimes, otherwise it isn't showing full width
  return {
    cold: [
      {
        date: new Date(startTime),
        temperature: BREACH_MIN,
      },
      {
        date: new Date(endTime),
        temperature: BREACH_MIN,
      },
    ],

    hot: [
      {
        date: new Date(startTime),
        temperature: BREACH_MAX,
      },
      {
        date: new Date(endTime),
        temperature: BREACH_MAX,
      },
    ],
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
  const { dayMonthTime } = useFormatDateTime();
  const dateFormatter = (date: Date) => dayMonthTime(date);
  const [currentBreach, setCurrentBreach] = React.useState<BreachDot | null>(
    null
  );
  // const { urlQuery, updateQuery } = useUrlQuery();
  const formatTemp = useFormatTemperature();

  const formatTemperature = (value: number | null | undefined) =>
    !!value ? `${formatTemp(value)}` : '-';

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

  if (isLoading) {
    return <BasicSpinner />;
  }

  if (!data) {
    return <NothingHere body={t('error.no-temperature-logs')} />;
  }

  const series = transformData(data, theme.palette.chart.lines);
  const breachConfig = generateBreachConfig(startTime, endTime);

  // With .nice() we extend the domain to make the numbers look nicer e.g. ending in 0 or 5
  const timeScale = scaleTime().domain([startTime, endTime]).nice();

  const xAxisArgs: XAxisProps = {
    domain: timeScale.domain().map(date => date.valueOf()),
    scale: timeScale,
    type: 'number',
    ticks: timeScale.ticks(7).map(date => date.valueOf()),
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
          <YAxis dataKey="temperature" />
          <ChartTooltip content={TemperatureTooltip} />
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
              dot={sensor.data.length < 200}
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
  // console.log(filterBy);
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
    sortBy: { key: 'datetime', isDesc: false, direction: 'asc' },
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

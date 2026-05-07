import React, { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ChartTooltip,
  CircularProgress,
  ComposedChart,
  Legend,
  Line,
  Typography,
  XAxis,
  YAxis,
} from '@common/components';
import {
  Box,
  DateUtils,
  LocaleKey,
  useFormatDateTime,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { useRequest } from '../../../api/hooks';
import { ConsumptionHistoryFragment } from '../../../api';

const getLabelLocaleKey = ({
  payload,
}: {
  payload?: ConsumptionHistoryFragment;
}): LocaleKey => {
  switch (true) {
    case payload?.isHistoric:
      return 'label.consumption';
    case payload?.isCurrent:
      return 'label.current';
    default:
      return 'label.projected';
  }
};

export interface ConsumptionHistoryProps {
  id: string;
  /// Resolved by the parent: forecastMonthlyUsage (when forecasting is in
  /// use) or AMC fallback. `null` means "no projection" (e.g. forecast
  /// failed) — drop the trailing projected month.
  monthlyUsage: number | null;
}

export const ConsumptionHistory = ({
  id,
  monthlyUsage,
}: ConsumptionHistoryProps) => {
  const t = useTranslation();
  const theme = useTheme();
  const { dayMonthShort } = useFormatDateTime();
  const { data, isLoading } = useRequest.line.chartData(id);
  const dateFormatter = (date: string) => dayMonthShort(date);
  const tooltipFormatter = (
    value: number,
    name: string,
    props: {
      payload?: ConsumptionHistoryFragment;
    }
  ): [number, string] => {
    switch (name) {
      case 'consumption':
        return [value, t(getLabelLocaleKey(props))];
      case 'averageMonthlyConsumption':
        return [value, t('label.moving-average')];
      default:
        return [value, name];
    }
  };

  // Drop the server's trailing projected month (it was computed from AMC) and
  // synthesize one from `monthlyUsage` so the bar reflects the forecast value.
  // The historic + current nodes are passed through unchanged.
  const chartData = useMemo<ConsumptionHistoryFragment[]>(() => {
    const serverNodes = data?.consumptionHistory?.nodes ?? [];
    const historicAndCurrent = serverNodes.filter(
      n => n.isHistoric || n.isCurrent
    );
    if (monthlyUsage == null || historicAndCurrent.length === 0) {
      return historicAndCurrent;
    }

    const lastDate = DateUtils.getDateOrNull(
      historicAndCurrent[historicAndCurrent.length - 1]?.date ?? null
    );
    if (!lastDate) return historicAndCurrent;

    // Last day of the next month — matches server's appended projection date.
    const nextMonthLastDay = new Date(
      lastDate.getFullYear(),
      lastDate.getMonth() + 2,
      0
    );

    const projected: ConsumptionHistoryFragment = {
      __typename: 'ConsumptionHistoryNode',
      consumption: Math.round(monthlyUsage),
      averageMonthlyConsumption: monthlyUsage,
      date: nextMonthLastDay.toISOString().slice(0, 10),
      isHistoric: false,
      isCurrent: false,
    };

    return [...historicAndCurrent, projected];
  }, [data, monthlyUsage]);

  if (!data || !data.consumptionHistory) return null;

  const tooltipLabelFormatter = (date: string) => dateFormatter(date);

  const getFillColour = (entry: ConsumptionHistoryFragment): string => {
    switch (true) {
      case entry.isHistoric:
        return theme.palette.gray.light;
      case entry.isCurrent:
        return theme.palette.gray.main;
      default:
        return theme.palette.primary.light;
    }
  };

  return isLoading ? (
    <CircularProgress />
  ) : (
    <Box>
      <Box>
        <Typography
          variant="body1"
          fontWeight={700}
          style={{ marginBottom: 10 }}
        >
          {t('heading.consumption-history')}
        </Typography>
      </Box>
      <Box>
        {chartData.length === 0 ? (
          <Typography width={450}>{t('error.no-data')}</Typography>
        ) : (
          <ComposedChart width={450} height={255} data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickFormatter={dateFormatter}
              tick={{ fontSize: 12 }}
            />
            <YAxis axisLine={false} tick={{ fontSize: 12 }} />
            <ChartTooltip
              formatter={tooltipFormatter}
              labelFormatter={tooltipLabelFormatter}
              labelStyle={{ fontWeight: 700 }}
            />
            <Legend
              payload={[
                {
                  value: t('label.consumption'),
                  type: 'rect',
                  id: '1',
                  color: theme.palette.gray.light,
                },
                {
                  value: t('label.current'),
                  type: 'rect',
                  id: '2',
                  color: theme.palette.gray.main,
                },
                ...(monthlyUsage != null
                  ? [
                      {
                        value: t('label.projected'),
                        type: 'rect' as const,
                        id: '3',
                        color: theme.palette.primary.light,
                      },
                    ]
                  : []),
                {
                  value: t('label.moving-average'),
                  type: 'rect',
                  id: '4',
                  color: theme.palette.secondary.light,
                },
              ]}
            />
            <Bar dataKey="consumption">
              {chartData.map(entry => (
                <Cell key={entry.date} fill={getFillColour(entry)} />
              ))}
            </Bar>
            <Line
              dataKey="averageMonthlyConsumption"
              stroke={theme.palette.secondary.light}
              type="monotone"
              dot={false}
              strokeWidth={2}
            />
          </ComposedChart>
        )}
      </Box>
    </Box>
  );
};

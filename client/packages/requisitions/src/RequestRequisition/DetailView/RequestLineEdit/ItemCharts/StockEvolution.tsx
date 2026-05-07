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
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { useFormatDateTime } from '@common/intl';
import { useRequest } from '../../../api/hooks';

// Server-side constant in util::constants — keep client and server in sync.
const AVG_NUMBER_OF_DAYS_IN_A_MONTH = 365.25 / 12;

const DEFAULT_PROJECTED_DATA_POINTS = 20;

interface ProjectionPoint {
  date: string;
  isHistoric: boolean;
  stockOnHand: number;
  minimumStockOnHand: number;
  maximumStockOnHand: number;
}

export interface StockEvolutionProps {
  id: string;
  /// Resolved by the parent: forecastMonthlyUsage (when forecasting is in
  /// use) or AMC fallback. `null` means "no projection" (e.g. forecast
  /// failed) — render only historic data with no min/max lines.
  monthlyUsage: number | null;
  requestedQuantity: number;
  expectedDeliveryDate?: string | null;
  availableStockOnHand: number;
  minMonthsOfStock: number;
  maxMonthsOfStock: number;
}

export const StockEvolution = ({
  id,
  monthlyUsage,
  requestedQuantity,
  expectedDeliveryDate,
  availableStockOnHand,
  minMonthsOfStock,
  maxMonthsOfStock,
}: StockEvolutionProps) => {
  const t = useTranslation();
  const theme = useTheme();
  const { dayMonthShort } = useFormatDateTime();
  const { data, isLoading } = useRequest.line.chartData(id);

  const dateFormatter = (date: string) => dayMonthShort(date);
  const tooltipFormatter = (value: number, name: string): [number, string] => {
    switch (name) {
      case 'stockOnHand':
        return [value, t('label.stock-level')];
      case 'minimumStockOnHand':
        return [value, t('label.min')];
      case 'maximumStockOnHand':
        return [value, t('label.max')];
      default:
        return [value, name];
    }
  };

  // Walk the historic nodes from the server (ignoring its projected ones)
  // and synthesize the projection client-side from the live draft values.
  // This is deterministic arithmetic: no need to refetch as the user types.
  const chartData = useMemo<ProjectionPoint[]>(() => {
    const serverNodes = data?.stockEvolution?.nodes ?? [];
    const historic = serverNodes.filter(n => n.isHistoric);
    if (historic.length === 0) return [];

    // Min/max reference lines: scale the projection rate by the requisition's
    // min/max months. When monthlyUsage is null (failed forecast), leave at
    // 0 so the dashed lines disappear.
    const min = monthlyUsage != null ? monthlyUsage * minMonthsOfStock : 0;
    const max = monthlyUsage != null ? monthlyUsage * maxMonthsOfStock : 0;

    const historicPoints: ProjectionPoint[] = historic.map(n => ({
      date: n.date,
      isHistoric: true,
      stockOnHand: n.stockOnHand,
      minimumStockOnHand: min,
      maximumStockOnHand: max,
    }));

    if (monthlyUsage == null) return historicPoints;

    const lastHistoricDate = DateUtils.getDateOrNull(
      historic[historic.length - 1]?.date ?? null
    );
    if (!lastHistoricDate) return historicPoints;

    const dailyConsumption = monthlyUsage / AVG_NUMBER_OF_DAYS_IN_A_MONTH;
    let runningSoh = availableStockOnHand;
    const projected: ProjectionPoint[] = [];
    for (let offset = 1; offset <= DEFAULT_PROJECTED_DATA_POINTS; offset++) {
      const date = DateUtils.addDays(lastHistoricDate, offset);
      const isoDate = date.toISOString().slice(0, 10);
      if (expectedDeliveryDate && isoDate === expectedDeliveryDate) {
        runningSoh += requestedQuantity;
      }
      runningSoh -= dailyConsumption;
      if (runningSoh < 0) runningSoh = 0;
      projected.push({
        date: isoDate,
        isHistoric: false,
        stockOnHand: runningSoh,
        minimumStockOnHand: min,
        maximumStockOnHand: max,
      });
    }

    return [...historicPoints, ...projected];
  }, [
    data,
    monthlyUsage,
    requestedQuantity,
    expectedDeliveryDate,
    availableStockOnHand,
    minMonthsOfStock,
    maxMonthsOfStock,
  ]);

  if (!data || !data.stockEvolution) return null;

  const tooltipLabelFormatter = (date: string) => dateFormatter(date);
  const showProjection = monthlyUsage != null;

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
          {t('heading.stock-evolution')}
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
                  value: t('label.past'),
                  type: 'rect',
                  id: '1',
                  color: theme.palette.gray.main,
                },
                ...(showProjection
                  ? [
                      {
                        value: t('label.projected'),
                        type: 'rect' as const,
                        id: '2',
                        color: theme.palette.primary.light,
                      },
                      {
                        value: t('label.min'),
                        type: 'line' as const,
                        id: '3',
                        color: theme.palette.error.main,
                      },
                      {
                        value: t('label.max'),
                        type: 'line' as const,
                        id: '4',
                        color: theme.palette.success.main,
                      },
                    ]
                  : []),
              ]}
            />
            <Bar dataKey="stockOnHand">
              {chartData.map(entry => (
                <Cell
                  key={entry.date}
                  fill={
                    entry.isHistoric
                      ? theme.palette.gray.main
                      : theme.palette.primary.light
                  }
                />
              ))}
            </Bar>
            {showProjection && (
              <>
                <Line
                  dataKey="maximumStockOnHand"
                  stroke={theme.palette.success.main}
                  strokeDasharray="4"
                  dot={false}
                  strokeWidth={2}
                />

                <Line
                  dataKey="minimumStockOnHand"
                  stroke={theme.palette.error.main}
                  dot={false}
                  strokeWidth={2}
                  strokeDasharray="4"
                />
              </>
            )}
          </ComposedChart>
        )}
      </Box>
    </Box>
  );
};

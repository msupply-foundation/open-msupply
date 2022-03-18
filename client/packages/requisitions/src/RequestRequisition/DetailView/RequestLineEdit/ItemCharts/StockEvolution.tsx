import React from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ChartTooltip,
  ComposedChart,
  Legend,
  Line,
  Typography,
  XAxis,
  YAxis,
} from '@common/components';
import { DateUtils } from '@common/utils';
import {
  Box,
  useFormatDate,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftRequestLine } from '../hooks';
import { useRequestFields } from '../../../api';

export interface StockEvolutionProps {
  draftLine: DraftRequestLine | null;
}

type valueWithDate = {
  date: Date;
};
const dateSorter = (a: valueWithDate, b: valueWithDate) => {
  if (DateUtils.isEqual(a.date, b.date)) return 0;
  if (DateUtils.isAfter(a.date, b.date)) return 1;
  return -1;
};

export const StockEvolution: React.FC<StockEvolutionProps> = ({
  draftLine,
}) => {
  const t = useTranslation('replenishment');
  const theme = useTheme();
  const d = useFormatDate();
  const { maxMonthsOfStock, minMonthsOfStock } = useRequestFields([
    'maxMonthsOfStock',
    'minMonthsOfStock',
  ]);

  const data =
    draftLine?.chartData?.stockEvolution.nodes
      .map(node => ({
        date: new Date(node.date),
        value: node.historicStockOnHand ?? node.projectedStockOnHand ?? 0,
        isHistoric: node.historicStockOnHand !== null,
        max: draftLine.itemStats.averageMonthlyConsumption * maxMonthsOfStock,
        min: draftLine.itemStats.averageMonthlyConsumption * minMonthsOfStock,
      }))
      .sort(dateSorter) ?? [];
  const dateFormatter = (date: Date) =>
    d(date, {
      val: { month: 'short', day: '2-digit' },
    });
  const tooltipFormatter = (value: number, name: string) => {
    switch (name) {
      case 'value':
        return [value, t('label.stock-level')];
      case 'min':
        return [value, t('label.min')];
      case 'max':
        return [value, t('label.max')];
      default:
        return [value, name];
    }
  };

  const tooltipLabelFormatter = (date: Date) => d(date);

  return (
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
        <ComposedChart width={450} height={255} data={data}>
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
              {
                value: t('label.projected'),
                type: 'rect',
                id: '2',
                color: theme.palette.primary.light,
              },
              {
                value: t('label.min'),
                type: 'line',
                id: '3',
                color: theme.palette.error.main,
              },
              {
                value: t('label.max'),
                type: 'line',
                id: '4',
                color: theme.palette.success.main,
              },
            ]}
          />
          <Bar dataKey="value">
            {data.map(entry => (
              <Cell
                key={entry.date.toISOString()}
                fill={
                  entry.isHistoric
                    ? theme.palette.gray.main
                    : theme.palette.primary.light
                }
              />
            ))}
          </Bar>
          <Line
            dataKey="max"
            stroke={theme.palette.success.main}
            strokeDasharray="4"
            dot={false}
            strokeWidth={2}
          />

          <Line
            dataKey="min"
            stroke={theme.palette.error.main}
            dot={false}
            strokeWidth={2}
            strokeDasharray="4"
          />
        </ComposedChart>
      </Box>
    </Box>
  );
};

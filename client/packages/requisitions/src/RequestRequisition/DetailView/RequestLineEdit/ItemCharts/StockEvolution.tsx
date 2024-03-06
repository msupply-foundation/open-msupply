import React from 'react';
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
import { Box, useTheme, useTranslation } from '@openmsupply-client/common';
import { useFormatDateTime } from '@common/intl';
import { useRequest } from '../../../api/hooks';

export interface StockEvolutionProps {
  id: string;
  numberOfPacksFromQuantity: (totalQuantity: number) => number;
}

export const StockEvolution: React.FC<StockEvolutionProps> = ({
  id,
  numberOfPacksFromQuantity,
}) => {
  const t = useTranslation('replenishment');
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
  if (!data || !data.stockEvolution) return null;

  const stockEvolution = data.stockEvolution.nodes.map(entry => ({
    ...entry,
    stockOnHand: numberOfPacksFromQuantity(entry.stockOnHand),
    minimumStockOnHand: numberOfPacksFromQuantity(entry.minimumStockOnHand),
    maximumStockOnHand: numberOfPacksFromQuantity(entry.maximumStockOnHand),
  }));
  const tooltipLabelFormatter = (date: string) => dateFormatter(date);

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
        {data.stockEvolution.nodes.length === 0 ? (
          <Typography width={450}>{t('error.no-data')}</Typography>
        ) : (
          <ComposedChart width={450} height={255} data={stockEvolution}>
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
            <Bar dataKey="stockOnHand">
              {stockEvolution.map(entry => (
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
          </ComposedChart>
        )}
      </Box>
    </Box>
  );
};

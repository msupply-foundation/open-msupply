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
import {
  Box,
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
  numberOfPacksFromQuantity: (totalQuantity: number) => number;
}

export const ConsumptionHistory: React.FC<ConsumptionHistoryProps> = ({
  id,
  numberOfPacksFromQuantity,
}) => {
  const t = useTranslation('replenishment');
  const theme = useTheme();
  const { dayMonthShort } = useFormatDateTime();
  const { data, isLoading } = useRequest.line.chartData(id);
  const dateFormatter = (date: string) => dayMonthShort(date);
  const tooltipFormatter = (
    value: number,
    name: string,
    props: {
      payload?: ConsumptionHistoryFragment; // { date: string; isHistoric: boolean; isCurrent: boolean };
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
  if (!data || !data.consumptionHistory) return null;

  const consumptionHistory = data.consumptionHistory.nodes.map(entry => ({
    ...entry,
    averageMonthlyConsumption: numberOfPacksFromQuantity(
      entry.averageMonthlyConsumption
    ),
    consumption: numberOfPacksFromQuantity(entry.consumption),
  }));

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
        {data.consumptionHistory.nodes?.length === 0 ? (
          <Typography width={450}>{t('error.no-data')}</Typography>
        ) : (
          <ComposedChart width={450} height={255} data={consumptionHistory}>
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
                {
                  value: t('label.projected'),
                  type: 'rect',
                  id: '3',
                  color: theme.palette.primary.light,
                },
                {
                  value: t('label.moving-average'),
                  type: 'rect',
                  id: '4',
                  color: theme.palette.secondary.light,
                },
              ]}
            />
            <Bar dataKey="consumption">
              {data.consumptionHistory.nodes?.map(entry => (
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

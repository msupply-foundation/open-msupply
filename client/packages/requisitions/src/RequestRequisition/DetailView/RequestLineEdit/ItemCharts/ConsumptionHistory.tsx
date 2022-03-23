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
// import { DateUtils } from '@common/utils';
import {
  Box,
  useFormatDate,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftRequestLine } from '../hooks';

export interface ConsumptionHistoryProps {
  draftLine: DraftRequestLine | null;
}

export const ConsumptionHistory: React.FC<ConsumptionHistoryProps> = ({
  draftLine,
}) => {
  const t = useTranslation('replenishment');
  const theme = useTheme();
  const d = useFormatDate();
  const data = draftLine?.chartData?.consumptionHistory.nodes ?? [];
  const dateFormatter = (date: string) =>
    d(new Date(date), {
      val: { month: 'short', day: '2-digit' },
    });
  const tooltipFormatter = (
    value: number,
    name: string,
    props: { payload: { date: string } }
  ) => {
    switch (name) {
      case 'consumption':
        if (props.payload.date === '2021-03-01')
          return [value, t('label.requested-quantity')];
        else return [value, t('label.consumption')];
      case 'amc':
        return [value, t('label.moving-average')];
      default:
        return [value, name];
    }
  };
  const tooltipLabelFormatter = (date: string) => d(new Date(date));

  return (
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
        {data.length === 0 ? (
          <Typography width={450}>{t('error.no-data')}</Typography>
        ) : (
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
                  value: t('label.consumption'),
                  type: 'rect',
                  id: '1',
                  color: theme.palette.gray.main,
                },
                {
                  value: t('label.requested-quantity'),
                  type: 'rect',
                  id: '2',
                  color: theme.palette.primary.light,
                },
                {
                  value: t('label.moving-average'),
                  type: 'rect',
                  id: '3',
                  color: theme.palette.secondary.light,
                },
              ]}
            />
            <Bar dataKey="consumption">
              {data.map((entry, index) => (
                <Cell
                  key={entry.date}
                  // fill={DateUtils.isThisMonth(new Date(entry.date)) ? theme.palette.primary.light : theme.palette.gray.main}
                  // hack to cope with mock data.. which is giving 2021 dates only
                  fill={
                    index === data.length - 1
                      ? theme.palette.primary.light
                      : theme.palette.gray.main
                  }
                />
              ))}
            </Bar>
            <Line
              dataKey="amc"
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

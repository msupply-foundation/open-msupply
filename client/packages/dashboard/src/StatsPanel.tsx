import React, { FC } from 'react';
import {
  BarChartIcon,
  Grid,
  InlineSpinner,
  LocaleKey,
  Paper,
  StockIcon,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';

export type Stat = {
  labelKey: LocaleKey;
  value: number;
};
export interface StatsPanelProps {
  isLoading: boolean;
  stats: Stat[];
  titleKey: LocaleKey;
}

export const StatsPanel: FC<StatsPanelProps> = ({
  isLoading,
  stats,
  titleKey,
}) => {
  const t = useTranslation();

  const Statistic: FC<Stat> = ({ labelKey, value }) => (
    <Grid container alignItems="center" style={{ height: 30 }}>
      <Grid item>
        <Typography style={{ fontSize: 24, fontWeight: 'bold' }}>
          {value}
        </Typography>
      </Grid>
      <Grid
        item
        sx={{
          color: 'gray.main',
          fontSize: '12px',
          fontWeight: 500,
          marginLeft: '8px',
        }}
      >
        {t(labelKey)}
      </Grid>
    </Grid>
  );

  return (
    <Paper
      sx={{
        borderRadius: '16px',
        marginTop: '14px',
        marginBottom: '21px',
        boxShadow: theme => theme.shadows[1],
        padding: '14px 24px',
      }}
    >
      <Grid container>
        <Grid alignItems="center" display="flex">
          <Grid item style={{ marginRight: 8 }}>
            <StockIcon
              color="secondary"
              style={{
                height: 16,
                width: 16,
                fill: '#3568d4',
              }}
            />
          </Grid>
          <Grid item>
            <Typography
              color="secondary"
              style={{ fontSize: 12, fontWeight: 500 }}
            >
              {t(titleKey)}
            </Typography>
          </Grid>
        </Grid>
        <Grid container justifyContent="space-between" alignItems="flex-end">
          {isLoading ? (
            <InlineSpinner color="secondary" />
          ) : (
            <Grid item>
              {stats.map(stat => (
                <Statistic key={stat.labelKey} {...stat} />
              ))}
            </Grid>
          )}
          <Grid item>
            <BarChartIcon
              sx={{ height: '50px', width: '125px' }}
              color="secondary"
            />
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  );
};

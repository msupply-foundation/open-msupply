import React, { FC } from 'react';
import {
  BarChartIcon,
  Grid,
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
  stats: Stat[];
  titleKey: LocaleKey;
}

export const StatsPanel: FC<StatsPanelProps> = ({ stats, titleKey }) => {
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
          color: '#8f90a6',
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
      style={{
        borderRadius: 16,
        marginTop: 14,
        marginBottom: 21,
        boxShadow:
          '0 0.5px 2px 0 rgba(96, 97, 112, 0.16), 0 0 1px 0 rgba(40, 41, 61, 0.08)',
        padding: '14px 24px',
      }}
    >
      <Grid container>
        <Grid
          item
          display="flex"
          justifyContent="flex-start"
          alignItems="center"
        >
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
          <Grid item>
            {stats.map(stat => (
              <Statistic key={stat.labelKey} {...stat} />
            ))}
          </Grid>
          <Grid item>
            <BarChartIcon sx={{ height: '50px', width: '125px' }} />
          </Grid>
        </Grid>
      </Grid>
    </Paper>
  );
};

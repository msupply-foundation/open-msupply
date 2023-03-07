import React, { FC } from 'react';
import { Grid, Paper, Tooltip, Typography } from '@mui/material';
import { InlineSpinner, StockIcon } from '../../../';
import { useTranslation } from '@common/intl';

export type Stat = {
  label: string;
  value?: string;
};
export interface StatsPanelProps {
  isError?: boolean;
  isLoading: boolean;
  stats: Stat[];
  title: string;
  width?: number;
}

const Statistic: FC<Stat> = ({ label, value }) => {
  const t = useTranslation();
  return (
    <Grid container alignItems="center" style={{ height: 30 }}>
      <Grid item>
        {value ? (
          <Typography style={{ fontSize: 24, fontWeight: 'bold' }}>
            {value}
          </Typography>
        ) : (
          <Tooltip title={t('messages.no-data-available')}>
            <Typography
              style={{
                cursor: 'help',
                fontSize: 16,
                fontWeight: 'bold',
                paddingTop: 8,
                paddingBottom: 8,
              }}
            >
              {t('messages.not-applicable')}
            </Typography>
          </Tooltip>
        )}
      </Grid>
      <Grid
        item
        sx={{
          color: 'gray.main',
          flex: 1,
          fontSize: '12px',
          fontWeight: 500,
          marginInlineStart: '8px',
        }}
      >
        {label}
      </Grid>
    </Grid>
  );
};

const Content = ({
  isError,
  isLoading,
  stats,
}: {
  isError: boolean;
  isLoading: boolean;
  stats: Stat[];
}) => {
  const t = useTranslation();
  switch (true) {
    case isError:
      return (
        <Typography sx={{ color: 'gray.main', fontSize: 12, marginLeft: 3.2 }}>
          {t('error.no-data')}
        </Typography>
      );
    case isLoading:
      return <InlineSpinner color="secondary" />;
    default:
      return (
        <Grid item>
          {stats.map(stat => (
            <Statistic key={stat.label} {...stat} />
          ))}
        </Grid>
      );
  }
};

export const StatsPanel: FC<StatsPanelProps> = ({
  isError = false,
  isLoading,
  stats,
  title,
  width,
}) => (
  <Paper
    sx={{
      borderRadius: '16px',
      marginTop: '14px',
      marginBottom: '21px',
      boxShadow: theme => theme.shadows[1],
      padding: '14px 24px',
      width: width ? `${width}px` : undefined,
    }}
  >
    <Grid container>
      <Grid alignItems="center" display="flex">
        <Grid item style={{ marginInlineEnd: 8 }}>
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
            {title}
          </Typography>
        </Grid>
      </Grid>
      <Grid container justifyContent="space-between" alignItems="flex-end">
        <Content isError={isError} isLoading={isLoading} stats={stats} />
      </Grid>
    </Grid>
  </Paper>
);

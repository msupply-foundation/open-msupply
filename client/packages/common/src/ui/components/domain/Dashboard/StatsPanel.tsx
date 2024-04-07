import React, { FC } from 'react';
import { Grid, Paper, Tooltip, Typography } from '@mui/material';
import { InlineSpinner, StockIcon } from '../../../';
import { useTranslation } from '@common/intl';
import { ApiException, isPermissionDeniedException } from '@common/types';
import { SimpleLink } from '../../navigation/AppNavLink/SimpleLink';

export type Stat = {
  label: string;
  value?: string;
  link?: string;
};
export interface StatsPanelProps {
  error?: ApiException;
  isError?: boolean;
  isLoading: boolean;
  stats: Stat[];
  title: string;
  width?: number;
  link?: string;
}

const Statistic: FC<Stat> = ({ label, value, link }) => {
  const t = useTranslation();
  return (
    <Grid container alignItems="center" sx={{ marginTop: 1 }}>
      <Grid
        item
        sx={{ minWidth: '43px', display: 'flex', justifyContent: 'flex-end' }}
      >
        {value ? (
          <Typography
            style={{ fontSize: 24, fontWeight: 'bold', lineHeight: 1.2 }}
          >
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
        {link ? <SimpleLink to={link}>{label}</SimpleLink> : label}
      </Grid>
    </Grid>
  );
};

const Content = ({
  error,
  isError,
  isLoading,
  stats,
}: {
  error?: ApiException;
  isError: boolean;
  isLoading: boolean;
  stats: Stat[];
}) => {
  const t = useTranslation();
  const isPermissionDenied = isPermissionDeniedException(error);

  switch (true) {
    case isError:
      return (
        <Typography sx={{ color: 'gray.main', fontSize: 12, marginLeft: 3.2 }}>
          {t(isPermissionDenied ? 'error.no-permission' : 'error.no-data')}
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
  error,
  isError = false,
  isLoading,
  stats,
  title,
  width,
  link,
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
            sx={theme => ({
              fill: theme.palette.secondary.main,
              height: 16,
              width: 16,
            })}
          />
        </Grid>
        <Grid item>
          <Typography
            color="secondary"
            style={{ fontSize: 12, fontWeight: 500 }}
          >
            {link ? <SimpleLink to={link}>{title}</SimpleLink> : title}
          </Typography>
        </Grid>
      </Grid>
      <Grid container justifyContent="space-between" alignItems="flex-end">
        <Content
          isError={isError}
          isLoading={isLoading}
          stats={stats}
          error={error}
        />
      </Grid>
    </Grid>
  </Paper>
);

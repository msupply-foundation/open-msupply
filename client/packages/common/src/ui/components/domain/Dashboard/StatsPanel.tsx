import React, { FC } from 'react';
import { Paper, Tooltip, Typography } from '@mui/material';
import { InlineSpinner, StockIcon } from '../../../';
import { useTranslation } from '@common/intl';
import { ApiException, isPermissionDeniedException } from '@common/types';
import { SimpleLink } from '../../navigation/AppNavLink/SimpleLink';
import { Grid, usePluginProvider } from '@openmsupply-client/common';
import { StatusChip } from '../../panels/StatusChip';
import { filterCoreStats } from './utils';

export type Stat = {
  label: string;
  statContext: string;
  value?: string;
  link?: string;
  extraMessage?: string;
  alertFlag?: boolean;
};
export interface StatsPanelProps {
  error?: ApiException;
  isError?: boolean;
  isLoading: boolean;
  stats: Stat[];
  title: string;
  panelContext: string;
  width?: number;
  link?: string;
  alertFlag?: boolean;
}

export const Statistic = ({
  label,
  value,
  link,
  alertFlag = false,
  extraMessage,
}: Stat) => {
  const t = useTranslation();
  return (
    <Grid container flexDirection={'column'}>
      <Grid container alignItems="center" sx={{ marginTop: 1 }}>
        <Grid
          sx={{ minWidth: '43px', display: 'flex', justifyContent: 'flex-end' }}
        >
          {value ? (
            <Typography
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                lineHeight: 1.2,
              }}
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
      {extraMessage && (
        <Grid
          sx={{
            color: 'gray.main',
            flex: 1,
            fontSize: '12px',
            fontWeight: 500,
            marginInlineStart: '8px',
          }}
        >
          {extraMessage}
        </Grid>
      )}
      {alertFlag && (
        <Grid
          container
          alignItems="center"
          sx={{
            color: 'gray.main',
            flex: 1,
            fontSize: '12px',
            fontWeight: 500,
            marginInlineStart: '28px',
          }}
        >
          <StatusChip
            label={t('label.needs-attention')}
            colour={'red'}
            typographySx={{ fontSize: '12px', fontWeight: 500 }}
          />
        </Grid>
      )}
    </Grid>
  );
};

const Content = ({
  error,
  isError,
  isLoading,
  stats,
  panelContext,
}: {
  error?: ApiException;
  isError: boolean;
  isLoading: boolean;
  stats: Stat[];
  panelContext: string;
}) => {
  const t = useTranslation();
  const isPermissionDenied = isPermissionDeniedException(error);

  const { plugins } = usePluginProvider();

  const statPlugins = plugins.dashboard?.statistic;

  // Filter out core stats that should be hidden based on active plugins
  const visibleCoreStats = filterCoreStats(stats, statPlugins);

  const pluginStatistics =
    statPlugins?.map((plugin, index) => {
      const { Component } = plugin;
      return <Component key={index} panelContext={panelContext} />;
    }) ?? [];

  const statistics = [
    ...visibleCoreStats.map(stat => (
      <Statistic key={stat.statContext} {...stat} />
    )),
    ...pluginStatistics,
  ];

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
      return <Grid>{statistics}</Grid>;
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
  panelContext,
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
    <Grid container flexDirection="column">
      <Grid alignItems="center" display="flex">
        <Grid style={{ marginInlineEnd: 8 }}>
          <StockIcon
            sx={theme => ({
              fill: theme.palette.secondary.main,
              height: 16,
              width: 16,
            })}
          />
        </Grid>
        <Grid>
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
          panelContext={panelContext}
        />
      </Grid>
    </Grid>
  </Paper>
);

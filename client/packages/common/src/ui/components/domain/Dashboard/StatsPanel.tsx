import React from 'react';
import { Paper, SxProps, Theme, Tooltip, Typography } from '@mui/material';
import { InfoOutlineIcon, InlineSpinner, StockIcon } from '../../../';
import { useTranslation } from '@common/intl';
import { ApiException, isPermissionDeniedException } from '@common/types';
import { SimpleLink } from '../../navigation/AppNavLink/SimpleLink';
import { Grid } from '@openmsupply-client/common';
import { StatusChip } from '../../panels/StatusChip';
import { useDashboardStats } from '@openmsupply-client/dashboard/src/hooks';

export type Stat = {
  label: string;
  statContext: string;
  value?: string;
  link?: string;
  extraMessage?: string;
  alertFlag?: boolean;
  labelSx?: SxProps<Theme>;
  infoTooltip?: string;
  /** Cross-front-end e2e hook (e2e/TESTIDS.md § Dashboard); the stat's
   * published id, e.g. `dashboard-stat-distribution.shipments.not-shipped`. */
  testId?: string;
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
  /** Cross-front-end e2e hook (e2e/TESTIDS.md § Dashboard); the panel's
   * published id, e.g. `dashboard-panel-distribution.shipments`. */
  testId?: string;
}

export const Statistic = ({
  label,
  value,
  link,
  alertFlag = false,
  extraMessage,
  labelSx,
  infoTooltip,
  testId,
}: Stat) => {
  const t = useTranslation();
  return (
    <Grid container flexDirection={'column'} data-testid={testId}>
      <Grid container alignItems="center" sx={{ marginTop: 1 }}>
        <Grid
          sx={{ minWidth: '43px', display: 'flex', justifyContent: 'flex-end' }}
        >
          {value ? (
            <Typography
              sx={{
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
          container
          alignItems="center"
          sx={{
            color: 'gray.main',
            flex: 1,
            fontSize: '12px',
            fontWeight: 500,
            marginInlineStart: '8px',
            gap: '4px',
            ...labelSx,
          }}
        >
          {link ? <SimpleLink to={link}>{label}</SimpleLink> : label}
          {infoTooltip && (
            <Tooltip title={infoTooltip}>
              <Grid display="flex" sx={{ cursor: 'help' }}>
                <InfoOutlineIcon sx={{ fontSize: 14 }} color="primary" />
              </Grid>
            </Tooltip>
          )}
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

  const statistics = useDashboardStats(stats, panelContext);

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

export const StatsPanel = ({
  error,
  isError = false,
  isLoading,
  stats,
  title,
  width,
  link,
  panelContext,
  testId,
}: StatsPanelProps) => (
  <Paper
    data-testid={testId}
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

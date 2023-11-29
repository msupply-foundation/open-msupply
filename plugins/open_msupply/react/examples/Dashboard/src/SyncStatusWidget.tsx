import React, { PropsWithChildren } from 'react';
import {
  DateUtils,
  ErrorWithDetails,
  Formatter,
  Grid,
  RadioIcon,
  Typography,
  Widget,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import { mapSyncError, useSync } from '@openmsupply-client/system';

const FormattedSyncDate = ({ date }: { date: Date | null }) => {
  const t = useTranslation('common');
  const { localisedDistanceToNow, relativeDateTime } = useFormatDateTime();

  if (!date) return null;

  const relativeTime = `( ${t('messages.ago', {
    time: localisedDistanceToNow(date),
  })} )`;

  return (
    <Grid display="flex" container gap={1}>
      <Grid item flex={0} style={{ whiteSpace: 'nowrap' }}>
        {Formatter.sentenceCase(relativeDateTime(date))}
      </Grid>
      <Grid item flex={1} style={{ whiteSpace: 'nowrap' }}>
        {relativeTime}
      </Grid>
    </Grid>
  );
};

const Row: React.FC<PropsWithChildren<{ title: string }>> = ({
  title,
  children,
}) => (
  <Grid container paddingBottom={2}>
    <Grid alignItems="center" display="flex">
      <Grid item style={{ marginInlineEnd: 8 }}>
        <RadioIcon
          color="secondary"
          style={{
            height: 16,
            width: 16,
            fill: '#3568d4',
          }}
        />
      </Grid>
      <Grid item>
        <Typography color="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
          {title}
        </Typography>
      </Grid>
    </Grid>
    <Grid paddingLeft={2}>
      <Typography color="gray.main" style={{ fontSize: 12 }} component="div">
        {children}
      </Typography>
    </Grid>
  </Grid>
);

const SyncStatusWidget = () => {
  const { syncStatus } = useSync.utils.syncInfo();
  const t = useTranslation('app');

  return (
    <Widget title={t('heading.synchronise-status')}>
      <Grid
        container
        justifyContent="flex-start"
        flex={1}
        flexDirection="column"
        padding={2}
      >
        {!!syncStatus?.error && (
          <ErrorWithDetails
            {...mapSyncError(t, syncStatus?.error, 'error.unknown-sync-error')}
          />
        )}
        <Row title={t('sync-info.last-sync')}>
          <FormattedSyncDate
            date={DateUtils.getDateOrNull(syncStatus?.summary?.started ?? null)}
          />
        </Row>
        <Row title={t('sync-info.last-successful-sync')}>
          <FormattedSyncDate
            date={DateUtils.getDateOrNull(
              syncStatus?.lastSuccessfulSync?.finished ?? null
            )}
          />
        </Row>
      </Grid>
    </Widget>
  );
};

export default SyncStatusWidget;

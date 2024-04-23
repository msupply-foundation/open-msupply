import React, { FC, CSSProperties } from 'react';
import {
  Grid,
  Typography,
  useIsCentralServerApi,
  useTranslation,
} from '@openmsupply-client/common';
// Version is shared for client and server and is located in repo root package.json
const appVersion = require('../../../../../package.json').version; // eslint-disable-line @typescript-eslint/no-var-requires

interface AppVersionProps {
  SiteInfo?: React.ReactNode;
  style?: CSSProperties;
}

export const AppVersion: FC<AppVersionProps> = ({ SiteInfo, style }) => {
  const t = useTranslation('app');
  const isCentralServer = useIsCentralServerApi();

  return (
    <Grid
      style={{
        flexGrow: 0,
        alignSelf: 'flex-end',
        alignContent: 'flex-end',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
      padding={1}
    >
      <Grid padding={1} paddingBottom={0}>
        <Grid item display="flex" flex={1} gap={1} justifyContent="flex-end">
          <Grid item justifyContent="flex-end" flex={0} display="flex">
            <Typography fontWeight={700}>{t('label.app-version')}</Typography>
          </Grid>
          <Grid item flex={0}>
            <Typography whiteSpace="nowrap">{appVersion}</Typography>
          </Grid>
        </Grid>
        {isCentralServer && (
          <Grid item display="flex" flex={1} gap={1} justifyContent="flex-end">
            <Grid item justifyContent="flex-end" flex={0} display="flex">
              <Typography fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                {t('label.central-server')}
              </Typography>
            </Grid>
          </Grid>
        )}{' '}
      </Grid>
      <Grid padding={1} paddingTop={0}>
        {SiteInfo}
      </Grid>
    </Grid>
  );
};

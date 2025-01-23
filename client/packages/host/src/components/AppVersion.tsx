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
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();

  return (
    <Grid
      style={{
        flexGrow: 0,
        alignSelf: 'flex-end',
        ...style,
      }}
      padding={1}
    >
      <Grid padding={1} paddingBottom={0} display="flex" flexDirection="column">
        <Grid
          display="flex"
          flexDirection="row"
          flex={1}
          gap={1}
          justifyContent="flex-end"
        >
          <Grid>
            <Typography fontWeight={700}>{t('label.app-version')}</Typography>
          </Grid>
          <Grid>
            <Typography whiteSpace="nowrap">{appVersion}</Typography>
          </Grid>
        </Grid>
        {isCentralServer && (
          <Grid display="flex" justifyContent="flex-end" gap={1}>
            <Grid>
              <Typography fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                {t('label.central-server')}
              </Typography>
            </Grid>
          </Grid>
        )}
      </Grid>
      <Grid padding={1} paddingTop={0}>
        {SiteInfo}
      </Grid>
    </Grid>
  );
};

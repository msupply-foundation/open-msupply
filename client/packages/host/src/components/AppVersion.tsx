import React, { FC, CSSProperties } from 'react';
import { Grid, Typography, useTranslation } from '@openmsupply-client/common';
// Version is shared for client and server and is located in repo root package.json
const appVersion = require('../../../../../package.json').version; // eslint-disable-line @typescript-eslint/no-var-requires

interface AppVersionProps {
  style?: CSSProperties;
}

export const AppVersion: FC<AppVersionProps> = ({ style }) => {
  const t = useTranslation('common');
  return (
    <Grid style={{ position: 'absolute', right: 30, bottom: 15, ...style }}>
      <Grid container padding={1} flexDirection="column">
        <Grid item display="flex" flex={1} gap={1}>
          <Grid item justifyContent="flex-end" flex={1} display="flex">
            <Typography fontWeight={700}>{t('label.app-version')}</Typography>
          </Grid>
          <Grid item flex={1}>
            <Typography whiteSpace="nowrap">{appVersion}</Typography>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

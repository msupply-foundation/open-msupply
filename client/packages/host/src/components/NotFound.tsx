import React from 'react';

import {
  Grid,
  Grow,
  Typography,
  UnhappyMan,
  useTranslation,
} from '@openmsupply-client/common';

export const NotFound: React.FC = () => {
  const t = useTranslation();
  return (
    <Grid
      container
      flexDirection="column"
      justifyContent="center"
      alignContent="center"
      sx={{ height: '100%' }}
    >
      <Grid item display="flex" justifyContent="center">
        <Grow in timeout={1000}>
          <div>
            <UnhappyMan />
          </div>
        </Grow>
      </Grid>
      <Grid display="flex" justifyContent="center">
        <Typography variant="h5">{t('heading.404')}</Typography>
      </Grid>
      <Grid
        display="flex"
        justifyContent="center"
        flexDirection="column"
        sx={{ padding: 2, textAlign: 'center' }}
      >
        <Typography>{t('error.something-wrong')}</Typography>
        <Typography>{t('error.404')}</Typography>
      </Grid>
    </Grid>
  );
};
export default NotFound;

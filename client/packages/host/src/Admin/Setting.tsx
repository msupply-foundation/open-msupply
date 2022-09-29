import React from 'react';

import { Grid, Typography } from '@openmsupply-client/common';

interface SettingProps {
  component: JSX.Element;
  icon?: JSX.Element;
  title: string;
}

export const Setting: React.FC<SettingProps> = ({ component, icon, title }) => {
  return (
    <Grid container style={{ paddingBottom: 15 }}>
      <Grid item style={{ width: 50, display: 'flex' }} justifyContent="center">
        {icon}
      </Grid>
      <Grid item flexShrink={0} flexGrow={1}>
        <Typography style={{ fontSize: 16 }}>{title}</Typography>
      </Grid>
      <Grid item display="flex" justifyContent="flex-end">
        {component}
      </Grid>
    </Grid>
  );
};

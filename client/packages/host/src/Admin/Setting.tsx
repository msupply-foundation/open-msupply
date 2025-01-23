import React from 'react';

import {
  Box,
  Grid,
  InfoTooltipIcon,
  Typography,
} from '@openmsupply-client/common';

interface SettingProps {
  component: JSX.Element;
  icon?: JSX.Element;
  infoText?: string;
  title: string;
}

export const Setting: React.FC<SettingProps> = ({
  component,
  icon,
  infoText,
  title,
}) => {
  return (
    <Grid container style={{ paddingBottom: 15 }}>
      <Grid style={{ width: 50, display: 'flex' }} justifyContent="center">
        {icon}
      </Grid>
      <Grid flexShrink={0} flexGrow={1}>
        <Box display={'flex'}>
          <Typography style={{ fontSize: 16 }}>{title}</Typography>
          {infoText ? <InfoTooltipIcon title={infoText} /> : null}
        </Box>
      </Grid>
      <Grid display="flex" justifyContent="flex-end">
        {component}
      </Grid>
    </Grid>
  );
};

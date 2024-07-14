import React, { PropsWithChildren } from 'react';
import { Box, Card, CircularProgress, Grid, Typography } from '@mui/material';
import { SvgIconProps } from '@common/icons';

const Loading = () => (
  <Box display="flex" flex={1} justifyContent="center" alignItems="center">
    <CircularProgress />
  </Box>
);

interface WidgetProps {
  height?: number | string;
  title: string;
  Icon?: (props: SvgIconProps & { stroke?: string }) => JSX.Element;
}

export const Widget: React.FC<PropsWithChildren<WidgetProps>> = ({
  children,
  height = '100%',
  title,
  Icon,
}) => (
  <Card
    sx={{
      borderRadius: '16px',
      height,
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      margin: '11px',
      flex: 1,
      boxShadow: theme => theme.shadows[2],
    }}
  >
    <Grid container alignItems="center">
      {Icon && (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{ width: 48 }}
        >
          <Icon color="primary" />
        </Box>
      )}
      <Typography sx={{ fontSize: '14px', fontWeight: 'bold' }}>
        {title}
      </Typography>
    </Grid>

    <React.Suspense fallback={<Loading />}>{children}</React.Suspense>
  </Card>
);

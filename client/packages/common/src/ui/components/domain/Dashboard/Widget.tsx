import React from 'react';
import { Box, CircularProgress, Paper, Typography } from '@mui/material';

const Loading = () => (
  <Box display="flex" flex={1} justifyContent="center" alignItems="center">
    <CircularProgress />
  </Box>
);

interface WidgetProps {
  children?: React.ReactNode;
  height?: number | string;
  title: string;
}

export const Widget: React.FC<WidgetProps> = ({
  children,
  height = '100%',
  title,
}) => (
  <Paper
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
    <Typography sx={{ fontSize: '14px', fontWeight: 'bold' }}>
      {title}
    </Typography>

    <React.Suspense fallback={<Loading />}>{children}</React.Suspense>
  </Paper>
);

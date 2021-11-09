import React from 'react';
import {
  CircularProgress,
  Paper,
  Box,
  LocaleKey,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';

const Loading = () => (
  <Box display="flex" flex={1} justifyContent="center" alignItems="center">
    <CircularProgress />
  </Box>
);

interface WidgetProps {
  height?: number | string;
  titleKey: LocaleKey;
}

const Widget: React.FC<WidgetProps> = ({
  children,
  height = '100%',
  titleKey,
}) => {
  const t = useTranslation();
  return (
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
        {t(titleKey)}
      </Typography>

      <React.Suspense fallback={<Loading />}>{children}</React.Suspense>
    </Paper>
  );
};

export default Widget;

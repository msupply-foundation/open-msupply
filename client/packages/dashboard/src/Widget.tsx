import React from 'react';
import {
  CircularProgress,
  Paper,
  Box,
  Grid,
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
    <Grid item>
      <Paper style={{ borderRadius: 16, height, padding: 24, width: 400 }}>
        <Typography sx={{ fontSize: '14px', fontWeight: 'bold' }}>
          {t(titleKey)}
        </Typography>

        <React.Suspense fallback={<Loading />}>{children}</React.Suspense>
      </Paper>
    </Grid>
  );
};

export default Widget;

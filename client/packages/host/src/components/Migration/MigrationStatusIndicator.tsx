import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  useTranslation,
} from '@openmsupply-client/common';

export const MigrationStatusIndicator = React.memo<{ version?: string }>(({
  version,
}) => {
  const t = useTranslation();
  return (
    <Box textAlign="center">
      <Typography
        sx={{
          marginTop: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        {t('migration-info.migrations-in-progress')}
        <CircularProgress size={20} />
      </Typography>
      {version && (
        <Box mt={1} fontSize="0.875rem" color="text.secondary">
          {t('label.version')}: {version}
        </Box>
      )}
    </Box>
  );
});

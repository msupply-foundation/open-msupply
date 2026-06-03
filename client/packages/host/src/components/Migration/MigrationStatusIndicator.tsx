import React from 'react';
import {
  Box,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';

export const MigrationStatusIndicator = React.memo<{ version?: string }>(({
  version,
}) => {
  const t = useTranslation();
  return (
    <Box textAlign="center">
      <Typography sx={{ marginTop: 30 }}>
        {t('migration-info.migrations-in-progress')}
      </Typography>
      {version && (
        <Box mt={1} fontSize="0.875rem" color="text.secondary">
          {t('label.version')}: {version}
        </Box>
      )}
    </Box>
  );
});
